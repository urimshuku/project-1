interface HeaderProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  onGoHome?: () => void;
}

export function Header({ selectedTab, onTabChange, onGoHome }: HeaderProps) {
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onTabChange('General Donations');
    onGoHome?.();
    window.scrollTo(0, 0);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center">
        <a
          href={`${import.meta.env.BASE_URL}`}
          className="flex-shrink-0"
          onClick={handleLogoClick}
          aria-label="Return to home"
        >
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="Studio Space Donations logo"
            className="h-12 sm:h-16 md:h-24 w-auto"
          />
        </a>
      </div>
    </header>
  );
}
