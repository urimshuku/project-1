interface BackButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

export function BackButton({ onClick, className = '', ariaLabel = 'Back to Home' }: BackButtonProps) {
  const arrowBackSrc = `${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/arrow-back.svg`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      aria-label={ariaLabel}
    >
      <img
        src={arrowBackSrc}
        alt=""
        className="block h-6 w-6 object-contain opacity-35 dark:opacity-70 dark:invert sm:h-7 sm:w-7"
      />
    </button>
  );
}
