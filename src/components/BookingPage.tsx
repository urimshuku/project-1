import { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BookingCalendar } from './BookingCalendar';
import { scrollToTopEaseOut } from '../lib/scrollToTop';
import { EntryDotsCanvas } from './EntryDotsCanvas';
import { supabase } from '../lib/supabase';
import { PERSON_NAME_INPUT_ATTRS, sanitizePersonNameInput } from '../lib/sanitizePersonName';
import { PHONE_INPUT_ATTRS, sanitizePhoneInput } from '../lib/sanitizePhoneInput';

interface BookingPageProps {
  /** Used for header logo and "Back to Home" link — navigates to venue page */
  onBackToEntry: () => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Matches book-venue Zod paths + UI grouping for dates/times. */
type BookingFieldKey =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'activityType'
  | 'groupSize'
  | 'dates'
  | 'schedule'
  | 'notes'
  | '_form';

type BookingFieldErrors = Partial<Record<BookingFieldKey, string>>;

function joinApiMessages(msgs: string[] | undefined): string {
  if (!msgs?.length) return '';
  return [...new Set(msgs.filter(Boolean))].join('; ');
}

function mapApiDetailsToFieldErrors(details: Record<string, string[]>): BookingFieldErrors {
  const out: BookingFieldErrors = {};
  const scheduleParts: string[] = [];
  for (const [key, msgs] of Object.entries(details)) {
    const text = joinApiMessages(msgs);
    if (!text) continue;
    switch (key) {
      case 'fullName':
        out.fullName = text;
        break;
      case 'phone':
        out.phone = text;
        break;
      case 'email':
        out.email = text;
        break;
      case 'activityType':
        out.activityType = text;
        break;
      case 'groupSize':
        out.groupSize = text;
        break;
      case 'dates':
        out.dates = text;
        break;
      case 'perDateTimes':
      case 'startTime':
      case 'endTime':
      case 'startDateTime':
      case 'endDateTime':
        scheduleParts.push(text);
        break;
      case 'notes':
        out.notes = text;
        break;
      default:
        out._form = out._form ? `${out._form} ${text}` : text;
    }
  }
  if (scheduleParts.length) {
    out.schedule = scheduleParts.join(' ');
  }
  return out;
}

function inputErrorRing(hasError: boolean): string {
  return hasError
    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
    : 'border-gray-300 focus:ring-gray-400 focus:border-gray-400';
}

function BookingFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}

/** Today in local time as YYYY-MM-DD — used so past dates stay disabled as the calendar rolls forward. */
function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateTimeLocal(s: string): number | null {
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) return null;
  const [dPart, timePart] = t.split('T');
  const [y, mo, d] = dPart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return new Date(y, mo - 1, d, hh, mm).getTime();
}

function addDaysIso(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  const yy = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mo}-${day}`;
}

function areContiguousCalendarDays(sortedIso: string[]): boolean {
  if (sortedIso.length <= 1) return true;
  for (let i = 1; i < sortedIso.length; i++) {
    if (addDaysIso(sortedIso[i - 1], 1) !== sortedIso[i]) return false;
  }
  return true;
}

/** Split sorted ISO dates into maximal consecutive calendar runs (each run is non-empty). */
function partitionContiguousRuns(sortedIso: string[]): string[][] {
  if (sortedIso.length === 0) return [];
  const runs: string[][] = [];
  let cur: string[] = [sortedIso[0]];
  for (let i = 1; i < sortedIso.length; i++) {
    if (addDaysIso(sortedIso[i - 1], 1) === sortedIso[i]) {
      cur.push(sortedIso[i]);
    } else {
      runs.push(cur);
      cur = [sortedIso[i]];
    }
  }
  runs.push(cur);
  return runs;
}

/** Every calendar day from `fromIso` through `toIso` inclusive (ISO strings, sorted). */
function expandInclusiveDateRange(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  let cur = fromIso;
  while (cur <= toIso) {
    out.push(cur);
    const next = addDaysIso(cur, 1);
    if (next <= cur) break;
    cur = next;
    if (out.length > 800) break;
  }
  return out;
}

/** Full calendar-day list: each contiguous run is expanded to all days between its first and last. */
function expandSelectionToAllCalendarDays(sortedIso: string[]): string[] {
  if (sortedIso.length === 0) return [];
  const runs = partitionContiguousRuns(sortedIso);
  const set = new Set<string>();
  for (const run of runs) {
    for (const iso of expandInclusiveDateRange(run[0], run[run.length - 1])) {
      set.add(iso);
    }
  }
  return Array.from(set).sort();
}

function formatIsoDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTimeLocalPreview(s: string): string {
  const t = parseDateTimeLocal(s);
  if (t === null) return s.trim() || '—';
  return new Date(t).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTimeHm(value: string): string {
  const v = value.trim().slice(0, 5);
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return v;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function parseHm24(value: string): { h: string; m: string } | null {
  const t = value.trim().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const [hs, ms] = t.split(':');
  const hi = Number(hs);
  const mi = Number(ms);
  if (hi < 0 || hi > 23 || mi < 0 || mi > 59) return null;
  return { h: hs, m: ms };
}

interface TimeInput24hProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  'aria-label': string;
  /** compact = per-day row; comfortable = main start/end fields */
  size?: 'compact' | 'comfortable';
}

function TimeInput24h({
  id,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
  size = 'comfortable',
}: TimeInput24hProps) {
  const parsed = parseHm24(value);
  const hVal = parsed?.h ?? '';
  const mVal = parsed?.m ?? '';
  const isCompact = size === 'compact';
  /* Match other booking inputs: px-3 py-2.5 (compact: tighter row in per-day table) */
  const wrapperPad = isCompact ? 'px-1.5 py-1' : 'px-3 py-2.5';
  const text = isCompact ? 'text-sm' : 'text-gray-900';

  /* Centered `-- : --` idle layout; equal slot widths keep HH and MM balanced */
  const slotW = isCompact ? 'w-[2.35rem]' : 'w-[2.65rem]';
  const selectCls = `bg-transparent ${text} tabular-nums text-center ${slotW} shrink-0 outline-none border-none appearance-none cursor-pointer`;
  /* compact: no w-full — full width stacks start/end on separate rows in per-day layout */
  const widthCls = isCompact ? 'w-auto shrink-0' : 'w-full';

  return (
    <div
      className={`booking-time-input flex items-center justify-center gap-x-1 ${widthCls} rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-gray-400 focus-within:border-gray-400 ${wrapperPad} ${className ?? ''}`}
    >
      <select
        id={`${id}-h`}
        aria-label={`${ariaLabel}, hour (24h)`}
        className={selectCls}
        value={hVal}
        onChange={(e) => {
          const nh = e.target.value;
          if (!nh) { onChange(''); return; }
          onChange(`${nh}:${mVal || '00'}`);
        }}
      >
        <option value="">--</option>
        {HOURS_24.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className={`booking-time-sep text-gray-900 select-none shrink-0 self-center ${text}`} aria-hidden>
        :
      </span>
      <select
        id={`${id}-m`}
        aria-label={`${ariaLabel}, minutes`}
        className={selectCls}
        value={mVal}
        onChange={(e) => {
          const nm = e.target.value;
          if (!nm) { onChange(''); return; }
          onChange(`${hVal || '00'}:${nm}`);
        }}
      >
        <option value="">--</option>
        {MINUTES_60.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

/** ISO date + HH:mm → datetime-local shape for API / preview */
function combineDateAndTime(isoDate: string, hhmm: string): string {
  const t = hhmm.trim().slice(0, 5);
  const pad = t.length >= 5 && /^\d{2}:\d{2}$/.test(t) ? t : '00:00';
  return `${isoDate}T${pad}`;
}

/**
 * End clock time before start (e.g. 07:00 vs 09:00) with multiple days means one window from
 * first day @ start through last day @ end — not the same hours on every selected day.
 */
function isFirstDayThroughLastDayWindow(
  sortedIso: string[],
  startHhmm: string,
  endHhmm: string,
): boolean {
  if (sortedIso.length < 2) return false;
  const st = startHhmm.trim().slice(0, 5);
  const et = endHhmm.trim().slice(0, 5);
  if (st < et) return false;
  const t0 = parseDateTimeLocal(combineDateAndTime(sortedIso[0], st));
  const t1 = parseDateTimeLocal(combineDateAndTime(sortedIso[sortedIso.length - 1], et));
  return t0 !== null && t1 !== null && t1 > t0;
}

/** Shared start/end (not per-day): end after start on the clock ⇒ same hours on every selected day (not one long datetime span). */
function isSameHoursEachDayShared(customPerDay: boolean, startTime: string, endTime: string): boolean {
  if (customPerDay) return false;
  const st = startTime.trim().slice(0, 5);
  const et = endTime.trim().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(st) || !/^\d{2}:\d{2}$/.test(et)) return false;
  return st < et;
}

/** Normalize DB date / timestamptz to YYYY-MM-DD for calendar keys. */
function asIsoDateOnly(s: string): string {
  return s.slice(0, 10);
}

export function BookingPage({ onBackToEntry }: BookingPageProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [blockedDateSet, setBlockedDateSet] = useState<ReadonlySet<string>>(() => new Set());
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [customPerDay, setCustomPerDay] = useState(false);
  const [perDayTimes, setPerDayTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  /** Honeypot — must stay empty (bots often fill hidden fields) */
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');
  const [activityType, setActivityType] = useState('');
  const [groupSize, setGroupSize] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [processingDots, setProcessingDots] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<BookingFieldErrors>({});
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SUCCESS_DURATION_MS = 4000;

  const bookingMinDate = todayIsoLocal();
  const sortedSelectedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);
  const calendarIsContiguous = useMemo(
    () => sortedSelectedDates.length > 0 && areContiguousCalendarDays(sortedSelectedDates),
    [sortedSelectedDates],
  );
  const sameHoursEachSelectedDay = useMemo(
    () => isSameHoursEachDayShared(customPerDay, startTime, endTime),
    [customPerDay, startTime, endTime],
  );
  /** One datetime window from first selected day @ start through last @ end (not “9–10 every day”). */
  const showFirstToLastDatetimeWindow = useMemo(() => {
    if (customPerDay || sortedSelectedDates.length < 2) return false;
    if (!startTime.trim() || !endTime.trim()) return false;
    if (sameHoursEachSelectedDay) return false;
    const sdt = combineDateAndTime(sortedSelectedDates[0], startTime);
    const edt = combineDateAndTime(
      sortedSelectedDates[sortedSelectedDates.length - 1],
      endTime,
    );
    const t0 = parseDateTimeLocal(sdt);
    const t1 = parseDateTimeLocal(edt);
    return t0 !== null && t1 !== null && t1 > t0;
  }, [customPerDay, sortedSelectedDates, startTime, endTime, sameHoursEachSelectedDay]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  /** Drop any selected days that are now in the past (e.g. after midnight or if state was stale). */
  useEffect(() => {
    setSelectedDates((prev) => prev.filter((k) => k >= bookingMinDate));
  }, [bookingMinDate]);

  /** Load dates blocked after admin approval; keep in sync via Realtime when enabled on the project. */
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function loadBlocked() {
      const { data, error } = await supabase.from('venue_blocked_dates').select('blocked_date');
      if (cancelled) return;
      if (error) {
        console.warn('venue_blocked_dates:', error.message);
        return;
      }
      const next = new Set((data ?? []).map((r) => asIsoDateOnly(r.blocked_date)));
      setBlockedDateSet(next);
    }

    void loadBlocked();

    const channel = supabase
      .channel('venue_blocked_dates_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'venue_blocked_dates' },
        () => {
          void loadBlocked();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  /** Refetch when the tab is focused — Realtime is optional; approval happens in another tab/window. */
  useEffect(() => {
    if (!supabase) return;
    const refetchBlocked = () => {
      if (document.visibilityState !== 'visible') return;
      void supabase.from('venue_blocked_dates').select('blocked_date').then(({ data, error }) => {
        if (error) {
          console.warn('venue_blocked_dates:', error.message);
          return;
        }
        setBlockedDateSet(new Set((data ?? []).map((r) => asIsoDateOnly(r.blocked_date))));
      });
    };
    document.addEventListener('visibilitychange', refetchBlocked);
    window.addEventListener('focus', refetchBlocked);
    return () => {
      document.removeEventListener('visibilitychange', refetchBlocked);
      window.removeEventListener('focus', refetchBlocked);
    };
  }, []);

  /** Remove selections that became blocked after approval. */
  useEffect(() => {
    if (blockedDateSet.size === 0) return;
    setSelectedDates((prev) => {
      const next = prev.filter((d) => !blockedDateSet.has(d));
      return next.length === prev.length ? prev : next;
    });
    setPerDayTimes((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (blockedDateSet.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [blockedDateSet]);

  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);
  startTimeRef.current = startTime;
  endTimeRef.current = endTime;

  /** When using per-day times, seed new dates from shared times; keep existing rows. */
  useEffect(() => {
    if (!customPerDay) return;
    const sorted = [...selectedDates].sort();
    setPerDayTimes((prev) => {
      const next: Record<string, { start: string; end: string }> = {};
      const defStart = (startTimeRef.current || '10:00').slice(0, 5);
      const defEnd = (endTimeRef.current || '18:00').slice(0, 5);
      for (const d of sorted) {
        next[d] = prev[d] ?? { start: defStart, end: defEnd };
      }
      return next;
    });
  }, [selectedDates, customPerDay]);

  // Simple "processing" indicator while the request is in flight.
  useEffect(() => {
    if (!isSubmitting || isSuccess) return;
    setProcessingDots(1);
    const id = setInterval(() => {
      setProcessingDots((n) => (n % 3) + 1);
    }, 500);
    return () => clearInterval(id);
  }, [isSubmitting, isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFieldErrors({});
    setSubmitInfo(null);
    setIsSuccess(false);
    setEmailSent(true);
    setProcessingDots(1);

    const sortedDates = [...selectedDates].sort();
    const contiguous = sortedDates.length > 0 && areContiguousCalendarDays(sortedDates);
    const st = startTime.trim().slice(0, 5);
    const et = endTime.trim().slice(0, 5);
    const bothHhmm = /^\d{2}:\d{2}$/.test(st) && /^\d{2}:\d{2}$/.test(et);
    const sameHoursDaily = !customPerDay && bothHhmm && st < et;
    const asContinuous =
      contiguous &&
      !customPerDay &&
      !sameHoursDaily &&
      sortedDates.length >= 2 &&
      (() => {
        const startDateTime = combineDateAndTime(sortedDates[0], startTime);
        const endDateTime = combineDateAndTime(sortedDates[sortedDates.length - 1], endTime);
        const t0 = parseDateTimeLocal(startDateTime);
        const t1 = parseDateTimeLocal(endDateTime);
        return t0 !== null && t1 !== null && t1 > t0;
      })();

    const err: BookingFieldErrors = {};

    if (selectedDates.length === 0) {
      err.dates = 'Please select at least one date on the calendar.';
    } else if (selectedDates.some((k) => k < bookingMinDate)) {
      err.dates = 'Please choose only today or future dates.';
    }

    if (customPerDay) {
      for (const d of sortedDates) {
        const row = perDayTimes[d];
        if (!row?.start?.trim() || !row?.end?.trim()) {
          err.schedule = 'Please set a start and end time for each selected date.';
          break;
        }
        if (row.start >= row.end) {
          err.schedule = `End time must be after start time on ${d}.`;
          break;
        }
      }
    } else {
      if (!startTime.trim() || !endTime.trim()) {
        err.schedule = 'Please enter a start and end time.';
      } else if (asContinuous) {
        const startDateTime = combineDateAndTime(sortedDates[0], startTime);
        const endDateTime = combineDateAndTime(sortedDates[sortedDates.length - 1], endTime);
        const t0 = parseDateTimeLocal(startDateTime);
        const t1 = parseDateTimeLocal(endDateTime);
        if (t0 === null || t1 === null) {
          err.schedule = 'Please use valid start and end times.';
        } else if (t1 <= t0) {
          err.schedule = 'End date and time must be after start date and time.';
        }
      } else if (sortedDates.length >= 2) {
        if (st >= et) {
          const startDateTime = combineDateAndTime(sortedDates[0], startTime);
          const endDateTime = combineDateAndTime(sortedDates[sortedDates.length - 1], endTime);
          const t0 = parseDateTimeLocal(startDateTime);
          const t1 = parseDateTimeLocal(endDateTime);
          if (t0 === null || t1 === null) {
            err.schedule = 'Please use valid start and end times.';
          } else if (t1 <= t0) {
            err.schedule =
              'End date and time must be after start date and time (your end time is on the last selected day, not the same clock time on every day).';
          }
        }
      } else if (sortedDates.length === 1 && startTime >= endTime) {
        err.schedule = 'End time must be after start time.';
      }
    }

    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      err.fullName = 'Please enter your full name.';
    } else if (nameTrimmed.length < 2) {
      err.fullName = 'Please enter at least 2 characters for your name.';
    }

    if (!phone.trim()) {
      err.phone = 'Please enter your phone number.';
    }

    if (!activityType.trim()) {
      err.activityType = 'Please enter the type of activity.';
    }

    const size = Number(groupSize);
    if (!groupSize.trim() || Number.isNaN(size) || size < 1) {
      err.groupSize = 'Please enter a valid group size (at least 1).';
    } else if (size > 30) {
      err.groupSize = 'Group size cannot exceed 30 people.';
    }

    if (!email.trim()) {
      err.email = 'Please enter your email address.';
    } else if (!isValidEmail(email)) {
      err.email = 'Please enter a valid email address.';
    }

    if (Object.keys(err).length > 0) {
      setFieldErrors(err);
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setFieldErrors({
        _form:
          'Booking is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and deploy the book-venue Edge Function.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/book-venue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(
          // Per-day times must win over contiguous mode (same calendar selection can be both).
          customPerDay
            ? {
                bookingMode: 'non_continuous',
                dates: sortedDates.length === 1 ? sortedDates[0] : sortedDates,
                perDateTimes: sortedDates.map((d) => ({
                  date: d,
                  startTime: (perDayTimes[d]?.start || '10:00').slice(0, 5),
                  endTime: (perDayTimes[d]?.end || '18:00').slice(0, 5),
                })),
                // Summary fields for any strict validators / logging (first day start, last day end).
                startTime: (perDayTimes[sortedDates[0]]?.start || '10:00').slice(0, 5),
                endTime: (perDayTimes[sortedDates[sortedDates.length - 1]]?.end || '18:00').slice(0, 5),
                fullName: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                activityType: activityType.trim(),
                groupSize: size,
                notes: additionalRequests.trim() || undefined,
                website: websiteHoneypot.trim() || undefined,
              }
            : asContinuous
              ? {
                  bookingMode: 'continuous',
                  startDateTime: combineDateAndTime(sortedDates[0], startTime),
                  endDateTime: combineDateAndTime(sortedDates[sortedDates.length - 1], endTime),
                  fullName: name.trim(),
                  phone: phone.trim(),
                  email: email.trim(),
                  activityType: activityType.trim(),
                  groupSize: size,
                  notes: additionalRequests.trim() || undefined,
                  website: websiteHoneypot.trim() || undefined,
                }
              : {
                  bookingMode: 'non_continuous',
                  dates: sortedDates.length === 1 ? sortedDates[0] : sortedDates,
                  startTime: startTime.slice(0, 5),
                  endTime: endTime.slice(0, 5),
                  fullName: name.trim(),
                  phone: phone.trim(),
                  email: email.trim(),
                  activityType: activityType.trim(),
                  groupSize: size,
                  notes: additionalRequests.trim() || undefined,
                  website: websiteHoneypot.trim() || undefined,
                },
        ),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const details = data?.details as Record<string, string[]> | undefined;
        if (details && typeof details === 'object' && Object.keys(details).length > 0) {
          setFieldErrors(mapApiDetailsToFieldErrors(details));
        } else {
          setFieldErrors({
            _form: (data?.error as string) || `Request failed (${res.status})`,
          });
        }
        return;
      }

      const resp = data as { emailSent?: boolean; message?: string; alreadySignedUp?: boolean };
      setEmailSent(resp.emailSent !== false);
      if (resp.alreadySignedUp && resp.message) {
        setSubmitInfo(resp.message);
      }
      setIsSuccess(true);
      setFieldErrors({});

      setSelectedDates([]);
      setCustomPerDay(false);
      setPerDayTimes({});
      setName('');
      setStartTime('');
      setEndTime('');
      setPhone('');
      setEmail('');
      setWebsiteHoneypot('');
      setActivityType('');
      setGroupSize('');
      setAdditionalRequests('');

      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => {
        setIsSuccess(false);
        setEmailSent(true);
        resetTimeoutRef.current = null;
      }, SUCCESS_DURATION_MS);
    } catch (err) {
      setFieldErrors({
        _form: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <EntryDotsCanvas mouse={null} opacityScale={0.75} speedScale={0.75} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      <Header
        selectedTab="General Donations"
        onTabChange={() => {}}
        onLogoClick={() => scrollToTopEaseOut(550)}
        logoVariant="venue"
      />
      <div className="flex-1">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-6 pb-8 sm:pt-8 sm:pb-12 md:pt-10 md:pb-16">
          <button
            type="button"
            onClick={() => {
              onBackToEntry();
              window.scrollTo(0, 0);
            }}
            className="mb-4 sm:mb-6 ml-2 sm:ml-3 inline-flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Back to Home"
          >
            <img
              src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/arrow-back.svg`}
              alt=""
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain block opacity-35"
            />
          </button>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-100 space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Host an Activity
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Choose dates on the calendar, set your times, add activity details, and we’ll get back to you to confirm.
            </p>

            {fieldErrors._form && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {fieldErrors._form}
              </div>
            )}
            {submitInfo && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800" role="status">
                {submitInfo}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="booking-website-hp">Website</label>
              <input
                id="booking-website-hp"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={websiteHoneypot}
                onChange={(e) => setWebsiteHoneypot(e.target.value)}
              />
            </div>
            {/* Schedule — calendar only */}
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-gray-900">
                When <span className="text-gray-400 font-normal">(*)</span>
              </legend>
              <div className="text-sm text-gray-600 space-y-2">
                <p>Drag across consecutive days for a multi-day stretch, or tap separate days.</p>
                <p>
                  Start time applies to the <span className="whitespace-nowrap">first</span> selected day and end time to
                  the <span className="whitespace-nowrap">last</span> (for one day, both are that same day).
                </p>
              </div>
              <div className="flex justify-center">
                <BookingCalendar
                  selectedDates={selectedDates}
                  onChange={(next) => {
                    setSelectedDates(next);
                    setFieldErrors((prev) => {
                      if (!prev.dates) return prev;
                      const { dates: _d, ...rest } = prev;
                      return rest;
                    });
                  }}
                  minDate={bookingMinDate}
                  blockedDates={blockedDateSet}
                />
              </div>
              <BookingFieldError id="booking-dates-error" message={fieldErrors.dates} />

              <div
                className="rounded-lg border border-gray-200 bg-gray-50/90 px-3 py-2.5 text-sm max-w-md mx-auto w-full"
                aria-live="polite"
              >
                <p className="font-medium text-gray-800 mb-1">Your selection</p>
                {sortedSelectedDates.length === 0 ? (
                  <p className="text-gray-500">No dates selected yet — tap days on the calendar above.</p>
                ) : customPerDay ? (
                  <ul className="space-y-1.5 text-gray-700 list-none pl-0">
                    {sortedSelectedDates.map((d) => {
                      const row = perDayTimes[d];
                      const st = row?.start?.trim();
                      const et = row?.end?.trim();
                      const timeLine =
                        st && et
                          ? `${formatTimeHm(st)} – ${formatTimeHm(et)}`
                          : st || et
                            ? `${formatTimeHm(st || '') || '…'} – ${formatTimeHm(et || '') || '…'}`
                            : 'Set times below';
                      return (
                        <li key={`preview-${d}`} className="text-sm">
                          <span className="text-gray-900">{formatIsoDateLong(d)}</span>
                          <span className="text-gray-400 mx-1.5">·</span>
                          <span className="text-gray-600">{timeLine}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <>
                    {(() => {
                      const runs = partitionContiguousRuns(sortedSelectedDates);

                      if (runs.length === 1 && runs[0].length === 1) {
                        return (
                          <p className="text-gray-700">
                            <span className="text-gray-500">1 day: </span>
                            {formatIsoDateLong(runs[0][0])}
                          </p>
                        );
                      }

                      const hasRange = runs.some((r) => r.length >= 2);
                      const hasOrphans = runs.some((r) => r.length === 1);

                      return (
                        <div className="space-y-1">
                          {runs.map((run, idx) => {
                            const prev = idx > 0 ? runs[idx - 1] : null;
                            const showDivider =
                              hasOrphans &&
                              hasRange &&
                              run.length === 1 &&
                              prev !== null &&
                              prev.length >= 2;

                            const line =
                              run.length >= 2 ? (
                                <p className="text-gray-700">
                                  {formatIsoDateLong(run[0])} – {formatIsoDateLong(run[run.length - 1])}
                                </p>
                              ) : (
                                <p className="text-gray-700">{formatIsoDateLong(run[0])}</p>
                              );

                            return (
                              <div
                                key={run.length >= 2 ? `${run[0]}_${run[run.length - 1]}` : run[0]}
                                className={showDivider ? 'mt-2 pt-2 border-t border-gray-200' : undefined}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {
                      (startTime.trim() || endTime.trim()) && (
                        <div className="mt-2 pt-2 border-t border-gray-200 text-gray-700 text-sm space-y-1">
                          {sameHoursEachSelectedDay ? (
                            <>
                              <p>
                                <span className="text-gray-500">Same hours on each selected day: </span>
                                <span className="text-gray-800">
                                  {formatTimeHm(startTime)}–{formatTimeHm(endTime)}
                                </span>
                              </p>
                            </>
                          ) : (
                            <p>
                              <span className="text-gray-500">First day starts: </span>
                              {formatTimeHm(startTime) || '—'}
                              <span className="text-gray-500"> · Last day ends: </span>
                              {formatTimeHm(endTime) || '—'}
                            </p>
                          )}
                          {showFirstToLastDatetimeWindow &&
                            (() => {
                              const sdt = combineDateAndTime(sortedSelectedDates[0], startTime);
                              const edt = combineDateAndTime(
                                sortedSelectedDates[sortedSelectedDates.length - 1],
                                endTime,
                              );
                              const t0 = parseDateTimeLocal(sdt);
                              const t1 = parseDateTimeLocal(edt);
                              const gapNote =
                                !calendarIsContiguous &&
                                isFirstDayThroughLastDayWindow(
                                  sortedSelectedDates,
                                  startTime,
                                  endTime,
                                );
                              if (t0 !== null && t1 !== null && t1 > t0) {
                                return (
                                  <p className="text-gray-600">
                                    <span className="text-gray-500">Single time window: </span>
                                    {formatDateTimeLocalPreview(sdt)} → {formatDateTimeLocalPreview(edt)}
                                    {gapNote && (
                                      <span className="text-gray-500">
                                        {' '}
                                        (start on first selected day, end on last; unselected days in between are not part
                                        of this request)
                                      </span>
                                    )}
                                  </p>
                                );
                              }
                              if (t0 !== null && t1 !== null && t1 <= t0) {
                                return (
                                  <p className="text-amber-800 text-xs">End must be after start (check times and dates).</p>
                                );
                              }
                              return null;
                            })()}
                        </div>
                      )
                    }
                  </>
                )}
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="booking-custom-per-day"
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={customPerDay}
                  onChange={(e) => {
                    const on = e.target.checked;
                    if (on) {
                      setSelectedDates((prev) => expandSelectionToAllCalendarDays([...prev].sort()));
                    }
                    setCustomPerDay(on);
                  }}
                />
                <label htmlFor="booking-custom-per-day" className="text-sm text-gray-700 cursor-pointer">
                  Set different start/end times for each day
                </label>
              </div>

              {customPerDay ? (
                <div className="border border-gray-200 rounded-lg bg-gray-50/80 overflow-hidden">
                  <p className="text-xs text-gray-600 px-3 pt-2.5 pb-1.5">Times for each selected date:</p>
                  <div className="divide-y divide-gray-200">
                    {[...selectedDates].sort().map((d) => (
                      <div
                        key={d}
                        className="flex flex-nowrap items-center gap-2 px-3 py-2 min-w-0"
                      >
                        <span className="text-sm font-medium text-gray-800 truncate shrink-0 w-[8.5rem]">
                          {formatIsoDateLong(d)}
                        </span>
                        <div className="flex flex-nowrap items-center gap-1.5 ml-auto shrink-0">
                          <TimeInput24h
                            id={`booking-perday-${d}-start`}
                            size="compact"
                            aria-label={`Start time ${d}`}
                            value={perDayTimes[d]?.start ?? ''}
                            onChange={(next) => {
                              setPerDayTimes((prev) => ({
                                ...prev,
                                [d]: { ...prev[d], start: next, end: prev[d]?.end ?? '' },
                              }));
                              setFieldErrors((prev) => {
                                if (!prev.schedule) return prev;
                                const { schedule: _s, ...rest } = prev;
                                return rest;
                              });
                            }}
                          />
                          <span className="text-gray-400 text-xs shrink-0">–</span>
                          <TimeInput24h
                            id={`booking-perday-${d}-end`}
                            size="compact"
                            aria-label={`End time ${d}`}
                            value={perDayTimes[d]?.end ?? ''}
                            onChange={(next) => {
                              setPerDayTimes((prev) => ({
                                ...prev,
                                [d]: { ...prev[d], start: prev[d]?.start ?? '', end: next },
                              }));
                              setFieldErrors((prev) => {
                                if (!prev.schedule) return prev;
                                const { schedule: _s, ...rest } = prev;
                                return rest;
                              });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedDates.length === 0 && (
                    <p className="text-sm text-gray-500 px-3 py-2.5">Select one or more dates above.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-row gap-3 w-full min-w-0 max-w-full">
                  <div className="flex-1 min-w-0">
                    <p id="booking-start-time-label" className="block text-sm font-medium text-gray-700 mb-1">
                      Start time (first day) <span className="text-gray-400 font-normal">(*)</span>
                    </p>
                    <TimeInput24h
                      id="booking-start-time"
                      aria-label="Start time (first day)"
                      value={startTime}
                      onChange={(v) => {
                        setStartTime(v);
                        setFieldErrors((prev) => {
                          if (!prev.schedule) return prev;
                          const { schedule: _s, ...rest } = prev;
                          return rest;
                        });
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p id="booking-end-time-label" className="block text-sm font-medium text-gray-700 mb-1">
                      End time (last day) <span className="text-gray-400 font-normal">(*)</span>
                    </p>
                    <TimeInput24h
                      id="booking-end-time"
                      aria-label="End time (last day)"
                      value={endTime}
                      onChange={(v) => {
                        setEndTime(v);
                        setFieldErrors((prev) => {
                          if (!prev.schedule) return prev;
                          const { schedule: _s, ...rest } = prev;
                          return rest;
                        });
                      }}
                    />
                  </div>
                </div>
              )}
              <BookingFieldError id="booking-schedule-error" message={fieldErrors.schedule} />
            </fieldset>

            {/* Full Name */}
            <div>
              <label htmlFor="booking-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-name"
                {...PERSON_NAME_INPUT_ATTRS}
                value={name}
                onChange={(e) => {
                  setName(sanitizePersonNameInput(e.target.value));
                  setFieldErrors((prev) => {
                    if (!prev.fullName) return prev;
                    const { fullName: _f, ...rest } = prev;
                    return rest;
                  });
                }}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'booking-name-error' : undefined}
                className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 focus:ring-2 ${inputErrorRing(Boolean(fieldErrors.fullName))}`}
                placeholder="Full Name"
              />
              <BookingFieldError id="booking-name-error" message={fieldErrors.fullName} />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="booking-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-phone"
                {...PHONE_INPUT_ATTRS}
                value={phone}
                onChange={(e) => {
                  setPhone(sanitizePhoneInput(e.target.value));
                  setFieldErrors((prev) => {
                    if (!prev.phone) return prev;
                    const { phone: _p, ...rest } = prev;
                    return rest;
                  });
                }}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? 'booking-phone-error' : undefined}
                className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 focus:ring-2 ${inputErrorRing(Boolean(fieldErrors.phone))}`}
                placeholder="Phone number"
              />
              <BookingFieldError id="booking-phone-error" message={fieldErrors.phone} />
            </div>

            {/* Email — required for confirmation */}
            <div>
              <label htmlFor="booking-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.email) return prev;
                    const { email: _em, ...rest } = prev;
                    return rest;
                  });
                }}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? 'booking-email-error booking-email-hint' : 'booking-email-hint'
                }
                className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 focus:ring-2 ${inputErrorRing(Boolean(fieldErrors.email))}`}
                placeholder="you@example.com"
              />
              <BookingFieldError id="booking-email-error" message={fieldErrors.email} />
              <p id="booking-email-hint" className="mt-1 text-xs text-gray-500">
                Already signed up? Use the same email to update your request.
              </p>
            </div>

            {/* Type of Activity */}
            <div>
              <label htmlFor="booking-activity" className="block text-sm font-medium text-gray-700 mb-1">
                Type of Activity <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-activity"
                type="text"
                value={activityType}
                onChange={(e) => {
                  setActivityType(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.activityType) return prev;
                    const { activityType: _a, ...rest } = prev;
                    return rest;
                  });
                }}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.activityType)}
                aria-describedby={fieldErrors.activityType ? 'booking-activity-error' : undefined}
                className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 focus:ring-2 ${inputErrorRing(Boolean(fieldErrors.activityType))}`}
                placeholder="e.g. Book club, Workshop, Film screening"
              />
              <BookingFieldError id="booking-activity-error" message={fieldErrors.activityType} />
            </div>

            {/* Group size */}
            <div>
              <label htmlFor="booking-group-size" className="block text-sm font-medium text-gray-700 mb-1">
                Size of Group <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-group-size"
                type="number"
                min={1}
                max={30}
                value={groupSize}
                onChange={(e) => {
                  setGroupSize(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.groupSize) return prev;
                    const { groupSize: _g, ...rest } = prev;
                    return rest;
                  });
                }}
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.groupSize)}
                aria-describedby={fieldErrors.groupSize ? 'booking-group-size-error' : undefined}
                className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 focus:ring-2 ${inputErrorRing(Boolean(fieldErrors.groupSize))}`}
                placeholder="e.g. 8"
              />
              <BookingFieldError id="booking-group-size-error" message={fieldErrors.groupSize} />
            </div>

            {/* Other Requests or Considerations */}
            <div>
              <label htmlFor="booking-requests" className="block text-sm font-medium text-gray-700 mb-1">
                Other Requests or Considerations <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="booking-requests"
                value={additionalRequests}
                onChange={(e) => {
                  setAdditionalRequests(e.target.value);
                  setFieldErrors((prev) => {
                    if (!prev.notes) return prev;
                    const { notes: _n, ...rest } = prev;
                    return rest;
                  });
                }}
                rows={4}
                aria-invalid={Boolean(fieldErrors.notes)}
                aria-describedby={fieldErrors.notes ? 'booking-requests-error' : undefined}
                className={`w-full rounded-lg border px-3 py-2.5 text-gray-900 focus:ring-2 resize-y ${inputErrorRing(Boolean(fieldErrors.notes))}`}
                placeholder="Any special requirements, times, or notes…"
              />
              <BookingFieldError id="booking-requests-error" message={fieldErrors.notes} />
            </div>

            <div className="flex flex-col items-center justify-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white shadow-md min-w-[140px] min-h-[44px] disabled:cursor-default transition-colors duration-300 ease-out tabular-nums"
                style={{ backgroundColor: isSuccess ? '#9ca3af' : '#d5a220' }}
              >
                {isSuccess
                  ? emailSent
                    ? '✓ Sent'
                    : '✓ Saved (email failed)'
                  : isSubmitting
                    ? '.'.repeat(processingDots)
                    : 'Send request'}
              </button>
              {isSuccess && !emailSent && (
                <p className="text-sm text-amber-700 text-center max-w-xs">
                  Your booking was saved but the confirmation email could not be sent. We'll still see your request.
                </p>
              )}
            </div>
          </form>
          </div>
        </div>
      </div>
      <Footer />
      </div>
    </div>
  );
}
