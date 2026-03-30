import { useEffect, useState } from 'react';

interface UnsubscribePageProps {
  onHome: () => void;
}

type Status = 'loading' | 'success' | 'error';

export function UnsubscribePage({ onHome }: UnsubscribePageProps) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')?.trim();
    if (!token) {
      setStatus('error');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anon) {
      setStatus('error');
      return;
    }

    const base = supabaseUrl.replace(/\/$/, '');
    void (async () => {
      try {
        const res = await fetch(`${base}/functions/v1/unsubscribe-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anon}`,
          },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
        {status === 'loading' && (
          <>
            <p className="text-gray-600 text-sm sm:text-base mb-2">Updating your preferences…</p>
            <div
              className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: 'rgba(201, 91, 45, 0.2)', borderTopColor: '#c95b2d' }}
              aria-hidden
            />
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">You’ve been unsubscribed</h1>
            <p className="text-gray-600 text-sm sm:text-base mb-6">
              You won’t receive further emails from Studio Space at this address. You can change your mind anytime
              from a new email link.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
            <p className="text-gray-600 text-sm sm:text-base mb-6">
              This unsubscribe link may have expired. If you still need help, contact us directly.
            </p>
          </>
        )}
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
