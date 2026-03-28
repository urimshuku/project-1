import { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { scrollToTopEaseOut } from '../lib/scrollToTop';
import { ACTIVITIES } from '../lib/activitiesData';
import { EntryDotsCanvas } from './EntryDotsCanvas';
import type { ActivitySection } from '../lib/activitiesData';

interface JoinPageProps {
  onBackToActivities: () => void;
}

export function JoinPage({ onBackToActivities }: JoinPageProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [futureActivities, setFutureActivities] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [processingDots, setProcessingDots] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitInfo, setSubmitInfo] = useState<string | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SUCCESS_DURATION_MS = 4000;

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  // Simple "processing" indicator while the request is in flight.
  useEffect(() => {
    if (!isSubmitting || isSuccess) return;
    setProcessingDots(1);
    const id = setInterval(() => {
      setProcessingDots((n) => (n % 3) + 1);
    }, 500);
    return () => clearInterval(id);
  }, [isSubmitting, isSuccess]);

  const toggleActivity = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    setSubmitInfo(null);

    if (selectedIds.size === 0) {
      setSubmitError('Please make at least one selection.');
      return;
    }
    if (!fullName.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      setSubmitError('Join requests are not configured yet.');
      return;
    }

    setIsSubmitting(true);
    setIsSuccess(false);
    setEmailSent(true);
    setProcessingDots(1);
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/join-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          activities: Array.from(selectedIds),
          futureActivities: futureActivities.trim() || undefined,
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

      const resp = data as { emailSent?: boolean; message?: string; alreadySignedUp?: boolean };
      setEmailSent(resp.emailSent !== false);
      if (resp.alreadySignedUp && resp.message) {
        setSubmitInfo(resp.message);
      }
      setIsSuccess(true);

      setFullName('');
      setPhone('');
      setEmail('');
      setFutureActivities('');
      setSelectedIds(new Set());

      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = setTimeout(() => {
        setIsSuccess(false);
        setIsSubmitting(false);
        setEmailSent(true);
        resetTimeoutRef.current = null;
      }, SUCCESS_DURATION_MS);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activities: ActivitySection[] = ACTIVITIES;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <EntryDotsCanvas mouse={null} opacityScale={0.75} speedScale={0.75} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      <Header
        selectedTab="General Donations"
        onTabChange={() => {}}
        onLogoClick={scrollToTopEaseOut}
        logoVariant="activities"
      />
      <div className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto w-full px-3 pt-6 pb-6 sm:px-4 sm:pt-8 sm:pb-8 md:pt-10 md:pb-12 flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="max-w-lg w-full">
              <button
                type="button"
                onClick={() => {
                  onBackToActivities();
                  window.scrollTo(0, 0);
                }}
                className="mb-4 sm:mb-6 ml-2 sm:ml-3 inline-flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity"
                aria-label="Back to Activities"
              >
                <img
                  src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/arrow-back.svg`}
                  alt=""
                  className="w-6 h-6 sm:w-7 sm:h-7 object-contain block opacity-35"
                />
              </button>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-md w-full border border-gray-200 p-4 sm:p-6 md:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Join an Activity
            </h1>
            <p className="text-gray-600 text-sm sm:text-base mb-6">
              Choose the activities you’d like to join and tell us your name. Since these are recurring, we’ll get back to you with more information.
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-gray-900">
                  Activities I’d like to join <span className="text-gray-400 font-normal">(*)</span>
                </legend>
                <ul className="space-y-2">
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(activity.id)}
                          onChange={() => toggleActivity(activity.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#4DA1A9] focus:ring-[#4DA1A9]"
                        />
                        <span className="text-gray-700 group-hover:text-gray-900">
                          {activity.title}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div className="space-y-4">
                <div>
                  <label htmlFor="join-full-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-gray-400 font-normal">(*)</span>
                  </label>
                  <input
                    id="join-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Full name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4DA1A9] focus:border-[#4DA1A9]"
                  />
                </div>
                <div>
                  <label htmlFor="join-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-gray-400 font-normal">(*)</span>
                  </label>
                  <input
                    id="join-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="Phone number"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4DA1A9] focus:border-[#4DA1A9]"
                  />
                </div>
                <div>
                  <label htmlFor="join-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-gray-400 font-normal">(*)</span>
                  </label>
                  <input
                    id="join-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4DA1A9] focus:border-[#4DA1A9]"
                  />
                  <p className="mt-1 text-xs text-gray-500">Already signed up? Use the same email to update your request.</p>
                </div>
              </div>

              <fieldset className="space-y-2">
                <label htmlFor="join-future-activities" className="block text-sm font-semibold text-gray-900">
                  Do you have any future activity ideas? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="join-future-activities"
                  value={futureActivities}
                  onChange={(e) => setFutureActivities(e.target.value)}
                  placeholder="Your ideas..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4DA1A9] focus:border-[#4DA1A9] resize-y min-h-[80px]"
                />
              </fieldset>

              <div className="pt-2 flex flex-col items-center justify-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-lg text-white font-bold shadow-md min-h-[44px] disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4DA1A9] transition-colors duration-300 ease-out"
                  style={{ backgroundColor: isSuccess ? '#9ca3af' : '#4DA1A9' }}
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
                    Your request was saved but the confirmation email could not be sent. We'll still see your request.
                  </p>
                )}
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      </div>
    </div>
  );
}
