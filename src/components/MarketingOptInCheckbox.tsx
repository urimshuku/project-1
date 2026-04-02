interface MarketingOptInCheckboxProps {
  /** Stable id linking label and input (unique per form). */
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Match Studio Space Activities / join form accent (teal), or Host an Activity / venue (gold). */
  variant?: 'default' | 'activities' | 'venue';
}

/**
 * Optional newsletter / studio updates opt-in for forms that collect email.
 */
export function MarketingOptInCheckbox({ id, checked, onChange, variant = 'default' }: MarketingOptInCheckboxProps) {
  const checkedClass =
    variant === 'activities'
      ? 'bg-[#4DA1A9] border-[#4DA1A9]'
      : variant === 'venue'
        ? 'bg-[#d5a220] border-[#d5a220]'
        : 'bg-blue-600 border-blue-600';
  const focusRingClass =
    variant === 'activities'
      ? 'peer-focus:ring-[#4DA1A9]'
      : variant === 'venue'
        ? 'peer-focus:ring-[#d5a220]'
        : 'peer-focus:ring-blue-500';

  return (
    <div className="pt-1">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
        {/*
          `peer` must come before the styled sibling. Input is z-10 and receives clicks; visual is z-0,
          pointer-events-none, so it cannot block toggling.
        */}
        <span className="relative mt-0.5 h-4 w-4 shrink-0">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-describedby={`${id}-hint`}
            className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-0 flex items-center justify-center rounded border border-gray-300 bg-white transition-colors peer-focus:ring-2 peer-focus:ring-offset-0 ${focusRingClass} ${checked ? checkedClass : ''}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className={`h-3 w-3 text-white transition-opacity ${checked ? 'opacity-100' : 'opacity-0'}`}
            >
              <path d="M5 10.5L8.5 14L15 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
        <span className="text-xs text-gray-700 group-hover:text-gray-900 leading-snug">
          Subscribe for updates about Studio Space events, activities and news.
        </span>
      </label>
      <p id={`${id}-hint`} className="mt-0.5 ml-7 text-[11px] leading-tight text-gray-400">
        You can unsubscribe at any time.
      </p>
    </div>
  );
}
