import { useState } from 'react';
import { MapPin, Phone, Instagram } from 'lucide-react';

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Studio+Space/@42.6576438,21.173839,17z/data=!3m1!4b1!4m6!3m5!1s0x13549f002f3d4bd7:0x750c64afcadd83fa!8m2!3d42.6576439!4d21.1787099!16s%2Fg%2F11vsp44gl1?entry=ttu';
const PHONE_RAW = '+38344173202';
const PHONE_DISPLAY = '+383 44 173 202';
const INSTAGRAM_URL = 'https://www.instagram.com/studio____space/';

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const newsletterConfigured = Boolean(supabaseUrl?.trim() && supabaseAnonKey?.trim());

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterConfigured || newsletterStatus === 'loading') return;
    const email = newsletterEmail.trim();
    if (!email) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter your email.');
      return;
    }

    setNewsletterStatus('loading');
    setNewsletterMessage(null);

    try {
      const base = supabaseUrl!.replace(/\/$/, '');
      const res = await fetch(`${base}/functions/v1/newsletter-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: Record<string, string[]>;
      };

      if (!res.ok) {
        const details = data.details;
        if (details && typeof details === 'object') {
          const lines = Object.entries(details).flatMap(([key, msgs]) =>
            (msgs || []).map((m) => `${key}: ${m}`),
          );
          setNewsletterMessage(lines.length ? lines.join(' ') : data.error || 'Something went wrong.');
        } else {
          setNewsletterMessage(data.error || `Request failed (${res.status})`);
        }
        setNewsletterStatus('error');
        return;
      }

      setNewsletterStatus('success');
      setNewsletterMessage('Thanks — you’re on the list.');
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('error');
      setNewsletterMessage('Network error. Please try again.');
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-6 sm:mt-8 md:mt-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10 md:py-12">
        <div className="flex flex-row justify-between items-start gap-3 sm:gap-6 md:gap-8">
          {/* Logo + newsletter + copyright */}
          <div className="flex flex-col items-start flex-shrink-0 min-w-0 max-w-full sm:max-w-sm">
            <a
              href={import.meta.env.BASE_URL || '/'}
              className="flex-shrink-0"
              aria-label="Studio Space home"
            >
              <img
                src={`${import.meta.env.BASE_URL}logo-entry.svg`}
                alt="Studio Space logo"
                className="h-12 sm:h-16 md:h-20 w-auto"
              />
            </a>

            <div className="mt-4 sm:mt-5 w-full">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Join our newsletter</h2>
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-2 w-full">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address for newsletter
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterStatus === 'success' || newsletterStatus === 'error') {
                      setNewsletterStatus('idle');
                      setNewsletterMessage(null);
                    }
                  }}
                  disabled={!newsletterConfigured || newsletterStatus === 'loading'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-0 disabled:bg-gray-50 disabled:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!newsletterConfigured || newsletterStatus === 'loading'}
                  className="w-full sm:w-auto self-start rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {newsletterStatus === 'loading' ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
              {!newsletterConfigured && (
                <p className="mt-2 text-xs text-gray-400">Newsletter signup is not configured.</p>
              )}
              {newsletterMessage && (
                <p
                  className={`mt-2 text-xs sm:text-sm ${
                    newsletterStatus === 'success' ? 'text-green-700' : 'text-red-600'
                  }`}
                  role={newsletterStatus === 'error' ? 'alert' : 'status'}
                >
                  {newsletterMessage}
                </p>
              )}
            </div>

            <p className="text-[10px] sm:text-xs text-gray-500 mt-4 sm:mt-5 text-left">
              © {new Date().getFullYear()} Studio Space.
              <br />
              All rights reserved.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 sm:gap-3 md:gap-4 flex-shrink min-w-0">
            {/* Location - Google Maps */}
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline text-right">
                M55H+CGH, Ymer Prizreni Rd, 10000
              </span>
              <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0 text-black" aria-hidden />
            </a>

            {/* Phone */}
            <a
              href={`tel:${PHONE_RAW.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline">{PHONE_DISPLAY}</span>
              <Phone className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0 text-black" aria-hidden />
            </a>

            {/* Instagram */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline">Follow us on Instagram</span>
              <Instagram className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0 text-black" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
