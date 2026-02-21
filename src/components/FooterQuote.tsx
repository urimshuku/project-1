import { useState, useEffect, useRef } from 'react';

const QUOTE = 'Thank you for being part of making this space continue to exist and grow.';
const CHAR_DELAY_MS = 25;

export function FooterQuote() {
  const [charIndex, setCharIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (charIndex >= QUOTE.length) {
      setShowHeart(true);
      return;
    }
    const t = setTimeout(() => setCharIndex((c) => c + 1), CHAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [started, charIndex]);

  return (
    <footer ref={ref} className="mt-12 sm:mt-16 md:mt-20 pb-8 sm:pb-12 text-center relative">
      {/* Invisible spacer: reserves space so footer doesn't move when quote/heart reveal */}
      <div
        className="text-2xl sm:text-[1.65rem] md:text-[1.65rem] max-w-3xl mx-auto invisible select-none"
        style={{ fontFamily: "'Reenie Beanie', cursive" }}
        aria-hidden
      >
        <p>{QUOTE}</p>
        <div className="mt-4 w-8 h-8 sm:w-10 sm:h-10 mx-auto" />
      </div>
      {/* Visible animated content: overlays spacer, doesn't affect layout */}
      <div className="absolute left-0 right-0 top-0 text-center">
        <div className="max-w-3xl mx-auto px-3">
          <p
            className="text-2xl sm:text-[1.65rem] md:text-[1.65rem] lg:text-[1.65rem] max-w-3xl mx-auto"
            style={{ color: '#c95b2d', fontFamily: "'Reenie Beanie', cursive" }}
          >
            {QUOTE.slice(0, charIndex)}
            {charIndex < QUOTE.length && (
              <span
                className="inline-block w-0.5 h-[1em] align-baseline ml-0.5 animate-pulse"
                style={{ backgroundColor: '#c95b2d' }}
                aria-hidden
              />
            )}
          </p>
          {showHeart && (
            <svg
              className="mx-auto mt-4 w-8 h-8 sm:w-10 sm:h-10 heart-slide-up"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="#c95b2d"
              />
            </svg>
          )}
        </div>
      </div>
    </footer>
  );
}
