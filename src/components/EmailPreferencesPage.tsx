import { useEffect, useState } from 'react';

interface EmailPreferencesPageProps {
  onHome: () => void;
}

type LoadStatus = 'loading' | 'ready' | 'error';

export function EmailPreferencesPage({ onHome }: EmailPreferencesPageProps) {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const token = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token')?.trim() ?? '';

  useEffect(() => {
    if (!token) {
      setTokenError(true);
      setLoadStatus('error');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anon) {
      setLoadStatus('error');
      return;
    }

    const base = supabaseUrl.replace(/\/$/, '');
    void (async () => {
      try {
        const res = await fetch(
          `${base}/functions/v1/email-preferences?token=${encodeURIComponent(token)}`,
          {
            headers: { Authorization: `Bearer ${anon}` },
          },
        );
        if (!res.ok) {
          setLoadStatus('error');
          return;
        }
        const data = (await res.json()) as { marketing_opt_in?: boolean };
        setMarketingOptIn(Boolean(data.marketing_opt_in));
        setLoadStatus('ready');
      } catch {
        setLoadStatus('error');
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || submitting) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anon) return;

    setSubmitting(true);
    setSaved(false);
    try {
      const base = supabaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/functions/v1/email-preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({
          token,
          marketingOptIn,
          email_preferences: { events_updates: marketingOptIn },
        }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError || loadStatus === 'error') {
    return (
      <div className="min-h-screen theme-page flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full theme-surface rounded-xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-600 text-sm sm:text-base mb-6">
            Open this page from a link in a recent Studio Space email.
          </p>
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center justify-center text-white font-semibold py-3 px-5 rounded-lg transition-opacity hover:opacity-90 w-full sm:w-auto"
            style={{ backgroundColor: '#c95b2d' }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-page flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full theme-surface rounded-xl shadow-xl p-6 sm:p-8 border border-gray-100">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">Email preferences</h1>
        <p className="text-gray-600 text-sm sm:text-base mb-6 text-center">
          Choose what we can send you. No account needed — this link is your key.
        </p>

        {loadStatus === 'loading' ? (
          <div className="flex justify-center py-8">
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'rgba(201, 91, 45, 0.2)', borderTopColor: '#c95b2d' }}
              aria-hidden
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#c95b2d] focus:ring-[#c95b2d]"
              />
              <span className="text-sm text-gray-800">
                Receive updates about events, activities, and studio news
              </span>
            </label>

            {saved && (
              <p className="text-sm text-green-700" role="status">
                Preferences saved.
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center text-white font-semibold py-3 px-5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#c95b2d' }}
              >
                {submitting ? 'Saving…' : 'Save preferences'}
              </button>
              <button
                type="button"
                onClick={onHome}
                className="inline-flex items-center justify-center font-semibold py-3 px-5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back to home
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
