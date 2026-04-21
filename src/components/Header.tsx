import { Heart, Calendar } from 'lucide-react';
import { scrollToTopEaseOut } from '../lib/scrollToTop';
import { StudioLogo } from './StudioLogo';

interface HeaderProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onGoHome?: () => void;
  onDonateNow?: () => void;
  /** When provided, show black "Host now" button with calendar icon (e.g. on entry page) */
  onBookNow?: () => void;
  /** Optional: show \"Join Now\" button (e.g. on activities page) */
  onJoinNow?: () => void;
  /**
   * Logo variant:
   * - 'donations' → Studio Space Donations logo
   * - 'activities' → Studio Space Activities logo
   * - 'entry' → Studio Space (no donations)
   * - 'venue' → Studio Space Venue logo
   */
  logoVariant?: 'donations' | 'activities' | 'entry' | 'venue';
  /** When provided, called on logo click instead of default home/scroll (e.g. scroll to top on current page) */
  onLogoClick?: () => void;
}

export function Header({ onTabChange, onGoHome, onDonateNow, onBookNow, onJoinNow, logoVariant = 'donations', onLogoClick }: HeaderProps) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const actionButtonClass =
    'flex items-center gap-1 sm:gap-2 text-white font-bold py-1.5 sm:py-2.5 px-2 sm:px-4 rounded-md sm:rounded-lg text-xs sm:text-base transition-all duration-200 shadow-md hover:shadow-xl hover:scale-105 active:scale-100';
  const actionIconClass = 'w-2.5 h-2.5 sm:w-3.5 sm:h-3.5';

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onLogoClick) {
      onLogoClick();
      return;
    }
    onTabChange('General Donations');
    onGoHome?.();
    scrollToTopEaseOut();
  };

  return (
    <header className="theme-surface sticky top-0 z-50 border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        {/* Left: logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <a
            href={base || '/'}
            className="theme-heading flex-shrink-0"
            onClick={handleLogoClick}
            aria-label="Return to home"
          >
            <StudioLogo
              variant={logoVariant}
              className={`h-14 sm:h-16 md:h-24 w-auto ${logoVariant === 'entry' ? 'object-contain object-[center_30%]' : ''}`}
            />
          </a>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {onJoinNow && (
            <button
              type="button"
              onClick={onJoinNow}
              className={actionButtonClass}
              style={{ backgroundColor: '#4DA1A9' }}
              aria-label="Join Now"
            >
              <svg
                viewBox="0 0 24 24"
                className={actionIconClass}
                aria-hidden
              >
                {/* Extra-thick filled plus sign */}
                <path
                  d="M9 2a3 3 0 0 1 6 0v7h7a3 3 0 0 1 0 6h-7v7a3 3 0 0 1-6 0v-7H2a3 3 0 0 1 0-6h7V2Z"
                  fill="currentColor"
                />
              </svg>
              Join Now
            </button>
          )}
          {onBookNow && (
            <button
              type="button"
              onClick={onBookNow}
              className={actionButtonClass}
              style={{ backgroundColor: '#d5a220' }}
              aria-label="Host Now"
            >
              <Calendar className={`${actionIconClass} fill-white text-white`} aria-hidden />
              Host Now
            </button>
          )}
          {onDonateNow && (
            <button
              type="button"
              onClick={onDonateNow}
              className={actionButtonClass}
              style={{ backgroundColor: '#c95b2d' }}
              aria-label="Donate now"
            >
              <Heart className={`${actionIconClass} fill-current`} aria-hidden />
              Donate Now
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
