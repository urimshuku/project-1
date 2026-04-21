import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

interface ThemeToggleProps {
  className?: string;
}

function FilledMoonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M21 13.15A8.6 8.6 0 1 1 10.85 3a6.8 6.8 0 0 0 8 8 6.7 6.7 0 0 0 2.15-.35 8.9 8.9 0 0 1 0 2.5Z" />
    </svg>
  );
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const nextThemeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextThemeLabel}
      aria-pressed={isDark}
      title={nextThemeLabel}
      className={`theme-toggle relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border p-0.5 shadow-sm transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-page)] motion-reduce:transition-none sm:h-7 sm:w-14 ${className}`}
    >
      <span className="sr-only">{nextThemeLabel}</span>
      <span
        className={`pointer-events-none absolute inset-y-0.5 left-0.5 flex aspect-square items-center justify-center rounded-full bg-white text-gray-950 shadow-md transition-transform duration-300 motion-reduce:transition-none ${
          isDark ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'
        }`}
        aria-hidden
      >
        {isDark ? <FilledMoonIcon className="h-3.5 w-3.5 text-gray-950" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
      <span className="flex w-full items-center justify-between px-1.5 text-[0.6rem] text-[var(--color-toggle-icon)]">
        <Sun className="h-3 w-3" aria-hidden />
        <Moon className="h-3 w-3" aria-hidden />
      </span>
    </button>
  );
}
