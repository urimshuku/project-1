import { useState } from 'react';
import { MapPin, Phone, Instagram, Loader2 } from 'lucide-react';
import { StudioLogo } from './StudioLogo';
import { buildAppPath } from '../lib/routes';

/** Closed envelope, filled (Heroicons 24 solid “envelope” paths). */
function NewsletterSubscribeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
      <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
    </svg>
  );
}

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Studio+Space/@42.6576438,21.173839,17z/data=!3m1!4b1!4m6!3m5!1s0x13549f002f3d4bd7:0x750c64afcadd83fa!8m2!3d42.6576439!4d21.1787099!16s%2Fg%2F11vsp44gl1?entry=ttu';
const PHONE_RAW = '+38344173202';
const PHONE_DISPLAY = '+383 44 173 202';
const INSTAGRAM_URL = 'https://www.instagram.com/studio____space/';
const FOOTER_ROLLING_EMOJIS = ['🫵🏼', '🎨', '🧘🏼‍♀️', '🪇', '🪩', '🎥', '🪔', '✨', '💃🏻', '🕺🏻', '🎊', '🎵', '💭', '📖', '🎤', '📝', '🎭', '🫖', '🌍'];
const LEGAL_LINKS = [
  { href: '/cookie-policy', label: 'Cookie Policy' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
];

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
    <footer className="theme-surface border-t mt-6 sm:mt-8 md:mt-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10 md:py-12">
        <div className="flex flex-row justify-between items-start gap-3 sm:gap-6 md:gap-8">
          {/* Logo + newsletter */}
          <div className="flex flex-col items-start flex-shrink-0 min-w-0 max-w-full sm:max-w-sm">
            <a
              href={buildAppPath('/')}
              className="flex-shrink-0"
              aria-label="Studio Space home"
            >
              <StudioLogo
                variant="entry"
                className="theme-heading h-12 sm:h-16 md:h-20 w-auto md:origin-top-left md:scale-[1.25]"
              />
            </a>
            <p className="footer-made-with -mt-2 text-xs text-gray-500 sm:mt-2 sm:text-sm" aria-label="A space for creative community">
              <span>A space for</span>
              <span className="footer-emoji-roll" aria-hidden="true">
                <span className="footer-emoji-roll__track">
                  {[...FOOTER_ROLLING_EMOJIS, FOOTER_ROLLING_EMOJIS[0]].map((emoji, index) => (
                    <span key={`${emoji}-${index}`} className="footer-emoji-roll__item">
                      {emoji}
                    </span>
                  ))}
                </span>
              </span>
              <span>.</span>
            </p>

            <div className="mt-4 sm:mt-3 md:mt-7 w-full">
              <h2 className="text-xs font-normal text-gray-500 mb-1">Join our newsletter</h2>
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex w-full max-w-[11.5rem] flex-row items-center gap-1.5 sm:max-w-full sm:gap-2"
              >
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address for newsletter
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Your email"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (newsletterStatus === 'success' || newsletterStatus === 'error') {
                      setNewsletterStatus('idle');
                      setNewsletterMessage(null);
                    }
                  }}
                  disabled={!newsletterConfigured || newsletterStatus === 'loading'}
                  className="theme-input min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs leading-snug placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-focus)] focus:ring-offset-0 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm sm:leading-normal sm:focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={!newsletterConfigured || newsletterStatus === 'loading'}
                  aria-label={newsletterStatus === 'loading' ? 'Subscribing…' : 'Subscribe to newsletter'}
                  aria-busy={newsletterStatus === 'loading'}
                  className="flex-shrink-0 inline-flex items-center justify-center rounded-md bg-gray-900 p-2 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black sm:rounded-lg sm:p-2.5"
                >
                  {newsletterStatus === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" aria-hidden />
                  ) : (
                    <NewsletterSubscribeIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                  )}
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
              <nav
                className="mt-4 hidden flex-wrap gap-x-4 gap-y-1 text-[11px] leading-snug text-gray-500 md:flex"
                aria-label="Legal"
              >
                {LEGAL_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={buildAppPath(link.href)}
                    className="footer-link-underline transition-colors hover:text-gray-900"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 sm:gap-3 md:gap-4 flex-shrink min-w-0">
            {/* Location - Google Maps */}
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline text-right whitespace-nowrap sm:whitespace-normal">
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

            <p className="mt-8 text-right text-[9px] sm:mt-8 sm:text-[11px] text-gray-500 leading-relaxed">
              © 2026 Studio Space. All rights reserved.
              <br />
              Powered by United Human Beings (UHB)
            </p>
          </div>
        </div>
        <nav
          className="mx-auto mt-5 flex max-w-xs flex-wrap justify-center gap-x-3 gap-y-1 text-center text-[9px] leading-snug text-gray-500 sm:text-[11px] md:hidden"
          aria-label="Legal"
        >
          {LEGAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={buildAppPath(link.href)}
              className="footer-link-underline transition-colors hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
