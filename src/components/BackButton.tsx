import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

export function BackButton({ onClick, className = '', ariaLabel = 'Back to Home' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-lg p-1.5 text-black opacity-35 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}
      aria-label={ariaLabel}
    >
      <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} aria-hidden />
    </button>
  );
}
