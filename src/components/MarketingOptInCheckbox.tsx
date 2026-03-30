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
  const inputClass =
    variant === 'activities'
      ? 'mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 bg-white text-[#4DA1A9] accent-[#4DA1A9] focus:ring-2 focus:ring-[#4DA1A9] focus:ring-offset-0'
      : variant === 'venue'
        ? 'mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 bg-white text-[#d5a220] accent-[#d5a220] focus:ring-2 focus:ring-[#d5a220] focus:ring-offset-0'
        : 'mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 bg-white text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0';

  return (
    <div className="pt-1">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer group">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={`${id}-hint`}
          className={inputClass}
        />
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
