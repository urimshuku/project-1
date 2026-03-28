import { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BookingCalendar } from './BookingCalendar';
import { scrollToTopEaseOut } from '../lib/scrollToTop';
import { EntryDotsCanvas } from './EntryDotsCanvas';
import { supabase } from '../lib/supabase';

interface BookingPageProps {
  /** Used for header logo and "Back to Home" link — navigates to venue page */
  onBackToEntry: () => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
  return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTimeHm(value: string): string {
  const v = value.trim().slice(0, 5);
  if (!v) return '';
  const [h, m] = v.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return v;
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** ISO date + HH:mm → datetime-local shape for API / preview */
function combineDateAndTime(isoDate: string, hhmm: string): string {
  const t = hhmm.trim().slice(0, 5);
  const pad = t.length >= 5 && /^\d{2}:\d{2}$/.test(t) ? t : '00:00';
  return `${isoDate}T${pad}`;
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SUCCESS_DURATION_MS = 4000;

  const bookingMinDate = todayIsoLocal();
  const sortedSelectedDates = useMemo(() => [...selectedDates].sort(), [selectedDates]);
  const calendarIsContiguous = useMemo(
    () => sortedSelectedDates.length > 0 && areContiguousCalendarDays(sortedSelectedDates),
    [sortedSelectedDates],
  );
  const submitAsContinuous = calendarIsContiguous && !customPerDay;

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

    setSubmitError(null);
    setSubmitInfo(null);
    setIsSuccess(false);
    setEmailSent(true);
    setProcessingDots(1);

    const sortedDates = [...selectedDates].sort();
    const contiguous = sortedDates.length > 0 && areContiguousCalendarDays(sortedDates);
    const asContinuous = contiguous && !customPerDay;

    if (selectedDates.length === 0) {
      setSubmitError('Please select at least one date on the calendar.');
      return;
    }
    if (selectedDates.some((k) => k < bookingMinDate)) {
      setSubmitError('Please choose only today or future dates.');
      return;
    }
    if (customPerDay) {
      for (const d of sortedDates) {
        const row = perDayTimes[d];
        if (!row?.start?.trim() || !row?.end?.trim()) {
          setSubmitError('Please set a start and end time for each selected date.');
          return;
        }
        if (row.start >= row.end) {
          setSubmitError(`End time must be after start time on ${d}.`);
          return;
        }
      }
    } else {
      if (!startTime.trim() || !endTime.trim()) {
        setSubmitError('Please enter a start and end time.');
        return;
      }
      if (asContinuous) {
        const startDateTime = combineDateAndTime(sortedDates[0], startTime);
        const endDateTime = combineDateAndTime(sortedDates[sortedDates.length - 1], endTime);
        const t0 = parseDateTimeLocal(startDateTime);
        const t1 = parseDateTimeLocal(endDateTime);
        if (t0 === null || t1 === null) {
          setSubmitError('Please use valid start and end times.');
          return;
        }
        if (t1 <= t0) {
          setSubmitError('End date and time must be after start date and time.');
          return;
        }
      } else if (sortedDates.length === 1 && startTime >= endTime) {
        setSubmitError('End time must be after start time.');
        return;
      }
    }
    if (!phone.trim()) {
      setSubmitError('Please enter your phone number.');
      return;
    }
    if (!activityType.trim()) {
      setSubmitError('Please enter the type of activity.');
      return;
    }
    const size = Number(groupSize);
    if (!groupSize.trim() || Number.isNaN(size) || size < 1) {
      setSubmitError('Please enter a valid group size (at least 1).');
      return;
    }
    if (!email.trim()) {
      setSubmitError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setSubmitError('Please enter a valid email address.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setSubmitError(
        'Booking is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and deploy the book-venue Edge Function.',
      );
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
          asContinuous
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
            : customPerDay
              ? {
                  bookingMode: 'non_continuous',
                  dates: sortedDates.length === 1 ? sortedDates[0] : sortedDates,
                  perDateTimes: sortedDates.map((d) => ({
                    date: d,
                    startTime: (perDayTimes[d]?.start || '10:00').slice(0, 5),
                    endTime: (perDayTimes[d]?.end || '18:00').slice(0, 5),
                  })),
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
        if (details && typeof details === 'object') {
          const lines = Object.entries(details).flatMap(([key, msgs]) =>
            (msgs || []).map((m) => `${key}: ${m}`),
          );
          setSubmitError(lines.length ? lines.join(' ') : (data?.error as string) || 'Request failed');
        } else {
          setSubmitError((data?.error as string) || `Request failed (${res.status})`);
        }
        return;
      }

      const resp = data as { emailSent?: boolean; message?: string; alreadySignedUp?: boolean };
      setEmailSent(resp.emailSent !== false);
      if (resp.alreadySignedUp && resp.message) {
        setSubmitInfo(resp.message);
      }
      setIsSuccess(true);

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
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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

            {submitError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {submitError}
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
                  onChange={setSelectedDates}
                  minDate={bookingMinDate}
                  blockedDates={blockedDateSet}
                />
              </div>

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
                          <p>
                            <span className="text-gray-500">First day starts: </span>
                            {formatTimeHm(startTime) || '—'}
                            <span className="text-gray-500"> · Last day ends: </span>
                            {formatTimeHm(endTime) || '—'}
                          </p>
                          {submitAsContinuous &&
                            startTime.trim() &&
                            endTime.trim() &&
                            (() => {
                              const sdt = combineDateAndTime(sortedSelectedDates[0], startTime);
                              const edt = combineDateAndTime(
                                sortedSelectedDates[sortedSelectedDates.length - 1],
                                endTime,
                              );
                              const t0 = parseDateTimeLocal(sdt);
                              const t1 = parseDateTimeLocal(edt);
                              const ok = t0 !== null && t1 !== null && t1 > t0;
                              if (ok) {
                                return (
                                  <p className="text-gray-600">
                                    <span className="text-gray-500">Window: </span>
                                    {formatDateTimeLocalPreview(sdt)} → {formatDateTimeLocalPreview(edt)}
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
                        className="flex items-center gap-2 px-3 py-2 min-w-0"
                      >
                        <span className="text-sm font-medium text-gray-800 truncate shrink-0 w-[8.5rem]">
                          {formatIsoDateLong(d)}
                        </span>
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          <input
                            type="time"
                            aria-label={`Start time ${d}`}
                            value={perDayTimes[d]?.start ?? ''}
                            onChange={(e) =>
                              setPerDayTimes((prev) => ({
                                ...prev,
                                [d]: { ...prev[d], start: e.target.value, end: prev[d]?.end ?? '' },
                              }))
                            }
                            className="booking-time-input rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 box-border w-[5.5rem]"
                          />
                          <span className="text-gray-400 text-xs">–</span>
                          <input
                            type="time"
                            aria-label={`End time ${d}`}
                            value={perDayTimes[d]?.end ?? ''}
                            onChange={(e) =>
                              setPerDayTimes((prev) => ({
                                ...prev,
                                [d]: { ...prev[d], start: prev[d]?.start ?? '', end: e.target.value },
                              }))
                            }
                            className="booking-time-input rounded border border-gray-300 bg-white px-1.5 py-1 text-sm text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 box-border w-[5.5rem]"
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
                <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0 max-w-full">
                  <div className="w-1/2 sm:w-auto sm:flex-1 min-w-0 max-w-full">
                    <label htmlFor="booking-start-time" className="block text-sm font-medium text-gray-700 mb-1">
                      Start time (first day) <span className="text-gray-400 font-normal">(*)</span>
                    </label>
                    <input
                      id="booking-start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="booking-time-input w-full max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 box-border"
                    />
                  </div>
                  <div className="w-1/2 sm:w-auto sm:flex-1 min-w-0 max-w-full">
                    <label htmlFor="booking-end-time" className="block text-sm font-medium text-gray-700 mb-1">
                      End time (last day) <span className="text-gray-400 font-normal">(*)</span>
                    </label>
                    <input
                      id="booking-end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="booking-time-input w-full max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 box-border"
                    />
                  </div>
                </div>
              )}
            </fieldset>

            {/* Full Name */}
            <div>
              <label htmlFor="booking-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Full Name"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="booking-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 font-normal">(*)</span>
              </label>
              <input
                id="booking-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="Phone number"
              />
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
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="you@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">Already signed up? Use the same email to update your request.</p>
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
                onChange={(e) => setActivityType(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="e.g. Book club, Workshop, Film screening"
              />
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
                max={2000}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                placeholder="e.g. 8"
              />
            </div>

            {/* Other Requests or Considerations */}
            <div>
              <label htmlFor="booking-requests" className="block text-sm font-medium text-gray-700 mb-1">
                Other Requests or Considerations <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="booking-requests"
                value={additionalRequests}
                onChange={(e) => setAdditionalRequests(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-y"
                placeholder="Any special requirements, times, or notes…"
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white shadow-md min-w-[140px] min-h-[44px] disabled:cursor-default transition-colors duration-300 ease-out"
                style={{ backgroundColor: isSuccess ? '#9ca3af' : '#d5a220' }}
              >
                {isSuccess
                  ? emailSent
                    ? '✓ Sent'
                    : '✓ Saved (email failed)'
                  : isSubmitting
                    ? `Processing${'.'.repeat(processingDots)}`
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
