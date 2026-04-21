type LogoVariant = 'donations' | 'activities' | 'entry' | 'venue';

interface StudioLogoProps {
  variant?: LogoVariant;
  className?: string;
  align?: 'left' | 'center';
}

const ACCENT_BY_VARIANT: Record<Exclude<LogoVariant, 'entry'>, string> = {
  donations: '#c95b2d',
  activities: '#4DA1A9',
  venue: '#d5a220',
};

const LABEL_BY_VARIANT: Record<Exclude<LogoVariant, 'entry'>, string> = {
  donations: 'donations',
  activities: 'activities',
  venue: 'venue',
};

function getStudioLogoAlt(variant: LogoVariant = 'donations') {
  if (variant === 'activities') return 'Studio Space Activities logo';
  if (variant === 'entry') return 'Studio Space logo';
  if (variant === 'venue') return 'Studio Space Venue logo';
  return 'Studio Space Donations logo';
}

export function StudioLogo({ variant = 'donations', className, align = 'left' }: StudioLogoProps) {
  const hasLabel = variant !== 'entry';
  const textX = align === 'center' ? 130 : 4;
  const textAnchor = align === 'center' ? 'middle' : undefined;

  return (
    <svg
      viewBox="0 0 260 130"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={getStudioLogoAlt(variant)}
    >
      <text
        x={textX}
        y="34"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="34"
        fontWeight="600"
        fill="currentColor"
        textAnchor={textAnchor}
      >
        studio
      </text>
      <text
        x={textX}
        y="74"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="34"
        fontWeight="600"
        fill="currentColor"
        textAnchor={textAnchor}
      >
        space.
      </text>
      {hasLabel && (
        <text
          x={textX}
          y="116"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="34"
          fontWeight="600"
          fill={ACCENT_BY_VARIANT[variant]}
          textAnchor={textAnchor}
        >
          {LABEL_BY_VARIANT[variant]}
        </text>
      )}
    </svg>
  );
}
