import { useState, useCallback, useEffect } from 'react';

/** ISO date string (YYYY-MM-DD) */
function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Week starts Monday. Returns 0–6. */
function getDayOfWeek(d: Date): number {
  const n = d.getDay();
  return n === 0 ? 6 : n - 1;
}

/** Month grid: only real days of `month`; leading/trailing slots are null (blank cells). */
function getMonthGridCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = getDayOfWeek(first);
  const daysInMonth = last.getDate();
  const total = startPad + daysInMonth;
  const rows = Math.ceil(total / 7);
  const size = rows * 7;
  const out: (Date | null)[] = [];
  for (let i = 0; i < size; i++) {
    if (i < startPad) {
      out.push(null);
    } else if (i < startPad + daysInMonth) {
      out.push(new Date(year, month, i - startPad + 1));
    } else {
      out.push(null);
    }
  }
  return out;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface BookingCalendarProps {
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  /** Minimum selectable date (ISO string). */
  minDate?: string;
  /** Maximum selectable date (ISO string). */
  maxDate?: string;
  /** Dates already reserved (YYYY-MM-DD) — shown greyed and not selectable. */
  blockedDates?: ReadonlySet<string>;
}

export function BookingCalendar({
  selectedDates,
  onChange,
  minDate,
  maxDate,
  blockedDates,
}: BookingCalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const gridCells = getMonthGridCells(viewYear, viewMonth);

  const isBlocked = useCallback(
    (key: string) => Boolean(blockedDates?.has(key)),
    [blockedDates],
  );

  const isDisabled = useCallback(
    (key: string) => {
      if (minDate && key < minDate) return true;
      if (maxDate && key > maxDate) return true;
      if (blockedDates?.has(key)) return true;
      return false;
    },
    [minDate, maxDate, blockedDates],
  );

  const isInDragRange = useCallback(
    (key: string): boolean => {
      if (!dragStart) return false;
      const end = dragEnd ?? dragStart;
      const a = dragStart < end ? dragStart : end;
      const b = dragStart < end ? end : dragStart;
      return key >= a && key <= b;
    },
    [dragStart, dragEnd]
  );

  const isSelected = useCallback(
    (key: string) => selectedDates.includes(key),
    [selectedDates]
  );

  const setSelectionFromRange = useCallback(
    (start: string, end: string) => {
      const a = start < end ? start : end;
      const b = start < end ? end : start;
      const inRange: string[] = [];
      let d = parseKey(a);
      const endD = parseKey(b);
      while (d <= endD) {
        const k = toKey(d);
        if (!isDisabled(k)) inRange.push(k);
        d.setDate(d.getDate() + 1);
      }
      const rest = selectedDates.filter((k) => {
        const inThisRange = k >= a && k <= b;
        return !inThisRange;
      });
      const combined = [...rest, ...inRange];
      const unique = Array.from(new Set(combined)).sort();
      onChange(unique);
    },
    [selectedDates, onChange, isDisabled]
  );

  const toggleOne = useCallback(
    (key: string) => {
      if (isDisabled(key)) return;
      if (selectedDates.includes(key)) {
        onChange(selectedDates.filter((d) => d !== key));
      } else {
        onChange([...selectedDates, key].sort());
      }
    },
    [selectedDates, onChange, isDisabled]
  );

  const handlePointerDown = (e: React.PointerEvent, key: string) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    if (isDisabled(key)) return;
    setDragStart(key);
    setDragEnd(null);
  };

  const handlePointerEnter = (key: string) => {
    if (dragStart !== null && !isDisabled(key)) {
      setDragEnd(key);
    }
  };

  const handlePointerLeaveGrid = () => {
    if (dragStart !== null) {
      setDragEnd(null);
    }
  };

  useEffect(() => {
    const onDocPointerUp = () => {
      if (dragStart !== null) {
        if (dragEnd !== null) {
          setSelectionFromRange(dragStart, dragEnd);
        } else {
          toggleOne(dragStart);
        }
        setDragStart(null);
        setDragEnd(null);
      }
    };
    document.addEventListener('pointerup', onDocPointerUp);
    return () => document.removeEventListener('pointerup', onDocPointerUp);
  }, [dragStart, dragEnd, setSelectionFromRange, toggleOne]);

  const goPrev = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const goNext = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="inline-block">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goPrev}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="Previous month"
        >
          <span className="text-lg leading-none">‹</span>
        </button>
        <span className="text-base font-semibold text-gray-900 min-w-[160px] text-center">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="Next month"
        >
          <span className="text-lg leading-none">›</span>
        </button>
      </div>
      <div
        className="grid grid-cols-7 gap-0.5 sm:gap-1"
        onPointerLeave={handlePointerLeaveGrid}
        role="grid"
        aria-label={`Calendar ${monthLabel}`}
      >
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1"
          >
            {wd}
          </div>
        ))}
        {gridCells.map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={`empty-${viewYear}-${viewMonth}-${i}`}
                className="w-8 h-8 sm:w-10 sm:h-10"
                aria-hidden="true"
              />
            );
          }
          const key = toKey(cell);
          const selected = isSelected(key);
          const blocked = isBlocked(key);
          const disabled = isDisabled(key);
          const inRange = isInDragRange(key);
          const highlighted = selected || (inRange && dragStart !== null);

          const baseCell =
            'w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-sm sm:text-base transition-colors';
          let cellClass = `${baseCell} text-gray-900`;
          if (highlighted) {
            cellClass += ' bg-black text-white cursor-pointer';
          } else if (blocked) {
            cellClass += ' bg-gray-200 text-gray-500 cursor-not-allowed';
          } else if (disabled) {
            cellClass += ' opacity-50 cursor-not-allowed';
          } else {
            cellClass += ' cursor-pointer hover:bg-gray-200';
          }

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              className={cellClass}
              onPointerDown={(e) => handlePointerDown(e, key)}
              onPointerEnter={() => handlePointerEnter(key)}
              aria-label={
                blocked
                  ? `${cell.toLocaleDateString()} (unavailable)`
                  : cell.toLocaleDateString()
              }
              aria-selected={selected}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Click dates to select one by one, or drag to select a range.
        {blockedDates && blockedDates.size > 0 ? ' Grey days are already booked.' : ''}
      </p>
    </div>
  );
}
