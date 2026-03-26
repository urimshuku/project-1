import { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BookingCalendar } from './BookingCalendar';
import { scrollToTopEaseOut } from '../lib/scrollToTop';
import { EntryDotsCanvas } from './EntryDotsCanvas';

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

export function BookingPage({ onBackToEntry }: BookingPageProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SUCCESS_DURATION_MS = 4000;

  const bookingMinDate = todayIsoLocal();

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  /** Drop any selected days that are now in the past (e.g. after midnight or if state was stale). */
  useEffect(() => {
    setSelectedDates((prev) => prev.filter((k) => k >= bookingMinDate));
  }, [bookingMinDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);

    if (selectedDates.length === 0) {
      setSubmitError('Please select at least one date.');
      return;
    }
    if (selectedDates.some((k) => k < bookingMinDate)) {
      setSubmitError('Please choose only today or future dates.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setSubmitError('Please enter a start and end time.');
      return;
    }
    const sortedDates = [...selectedDates].sort();
    if (sortedDates.length === 1 && startTime >= endTime) {
      setSubmitError('End time must be after start time.');
      return;
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
        body: JSON.stringify({
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
        }),
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

      const resp = data as { emailSent?: boolean };
      setEmailSent(resp.emailSent !== false);
      setIsSuccess(true);

      setSelectedDates([]);
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
              Book the Space
            </h1>
            <p className="text-gray-600 text-base sm:text-lg">
              Choose your date(s), activity, and group size. We’ll get back to you to confirm.
            </p>

            {submitError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {submitError}
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
            {/* Date(s) – calendar */}
            <fieldset className="space-y-3">
              <legend className="text-lg font-semibold text-gray-900">
                Date(s)
              </legend>
              <div className="flex justify-center">
                <BookingCalendar
                  selectedDates={selectedDates}
                  onChange={setSelectedDates}
                  minDate={bookingMinDate}
                />
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-3 w-full min-w-0 max-w-full">
                <div className="w-1/2 sm:w-auto sm:flex-1 min-w-0 max-w-full">
                  <label htmlFor="booking-start-time" className="block text-sm font-medium text-gray-700 mb-1">
                    Start time
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
                    End time
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
            </fieldset>

            {/* Full Name */}
            <div>
              <label htmlFor="booking-name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
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
                Phone
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
                Email Address
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
            </div>

            {/* Type of Activity */}
            <div>
              <label htmlFor="booking-activity" className="block text-sm font-medium text-gray-700 mb-1">
                Type of Activity
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
                Size of Group
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
                Other Requests or Considerations
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
