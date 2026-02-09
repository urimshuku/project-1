import { useState, useEffect, useLayoutEffect } from 'react';
import { Share2 } from 'lucide-react';
import { Header } from './components/Header';
import { PaymentGateway } from './components/PaymentGateway';
import { SuccessPage } from './components/SuccessPage';
import { AllDonors } from './components/AllDonors';
import { ImageCarousel } from './components/ImageCarousel';
import { supabase } from './lib/supabase';
import type { Category } from './lib/types';

type Page = 'home' | 'payment' | 'success';

// Default categories when Supabase returns none (used on first load or if DB is empty)
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'default-general',
    name: 'General Donations',
    description: 'General support for our studio space. Every euro helps us keep the lights on and the space welcoming.',
    target_amount: 0,
    current_amount: 0,
    sort_order: 0,
    has_progress_bar: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-workshop-tables',
    name: 'Workshop Tables',
    description: 'Tables for workshops and collaborative work in the studio.',
    target_amount: 500,
    current_amount: 500,
    sort_order: 1,
    has_progress_bar: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-insulation',
    name: 'Insulation',
    description: 'Help us insulate the studio to stay warm in winter and cool in summer.',
    target_amount: 2500,
    current_amount: 0,
    sort_order: 2,
    has_progress_bar: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-garden',
    name: 'Garden',
    description: 'Outdoor garden area for breaks and small events.',
    target_amount: 500,
    current_amount: 0,
    sort_order: 3,
    has_progress_bar: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-kitchen',
    name: 'Kitchen',
    description: 'Kitchen upgrade so we can host workshops and community meals.',
    target_amount: 5000,
    current_amount: 0,
    sort_order: 4,
    has_progress_bar: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-essentials',
    name: 'Essentials',
    description: 'Essential comforts for the space: heating, cooling, and basic amenities so everyone can work in comfort year-round.',
    target_amount: 2000,
    current_amount: 0,
    sort_order: 5,
    has_progress_bar: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getInitialPage(): Page {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  if ((pathname.endsWith('success') || pathname.includes('/success')) && params.get('session_id')) {
    return 'success';
  }
  return 'home';
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [selectedTab, setSelectedTab] = useState('General Donations');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchCategories();

    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (currentPage === 'payment') {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [currentPage]);

  // Open payment for a category when visiting a shared link (?donate=categoryId)
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get('donate');
    if (!categoryId) return;
    const category =
      categories.find((c) => c.id === categoryId) ??
      DEFAULT_CATEGORIES.find((c) => c.id === categoryId);
    if (category) {
      setSelectedCategory(category);
      setCurrentPage('payment');
      window.history.replaceState({}, '', window.location.pathname || '/');
    }
  }, [loading, categories]);

  async function fetchCategories() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    setCurrentPage('home');
    setSelectedCategory(null);

    const targetCategory = displayCategories.find((c) => c.name === tab);
    if (targetCategory) {
      const element = document.getElementById(`category-${targetCategory.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleDonate = (category: Category) => {
    setSelectedCategory(category);
    setCurrentPage('payment');
    window.scrollTo(0, 0);
  };

  const getShareUrl = (category: Category) => {
    const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
    return `${base}?donate=${encodeURIComponent(category.id)}`;
  };

  const handleShare = async (e: React.MouseEvent, category: Category) => {
    e.preventDefault();
    const url = getShareUrl(category);
    const title = `Donate to ${category.name} - Studio Space`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url);
          alert('Link copied to clipboard');
        } catch {
          alert(url);
        }
      }
    }
  };

  const handlePaymentSuccess = () => {
    setCurrentPage('success');
  };

  const handleBackHome = () => {
    setCurrentPage('home');
    setSelectedCategory(null);
  };

  const handleGoHome = () => {
    setCurrentPage('home');
    setSelectedCategory(null);
  };

  // Use DB categories when present, but always merge in any default category that's missing (e.g. Workshop Tables)
  const rawCategories =
    categories.length > 0
      ? (() => {
          const byName = new Map(categories.map((c) => [c.name, c]));
          for (const def of DEFAULT_CATEGORIES) {
            if (!byName.has(def.name)) byName.set(def.name, def);
          }
          return Array.from(byName.values()).sort((a, b) => {
            if (a.name === 'General Donations') return -1;
            if (b.name === 'General Donations') return 1;
            if (a.name === 'Workshop Tables') return -1;
            if (b.name === 'Workshop Tables') return 1;
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          });
        })()
      : DEFAULT_CATEGORIES;
  // Always show "Essentials" in UI (in case DB still has "A/C"); use DB amounts, don't hardcode
  const mapped = rawCategories.map((c) =>
    c.name === 'A/C'
      ? {
          ...c,
          name: 'Essentials',
          description:
            'Essential comforts for the space: heating, cooling, and basic amenities so everyone can work in comfort year-round.',
          target_amount: 2000,
          current_amount: c.current_amount,
        }
      : c
  );
  // Remove duplicate names (e.g. both A/C and Essentials showing as Essentials) – keep first
  const seenNames = new Set<string>();
  const displayCategories = mapped
    .filter((c) => {
      if (seenNames.has(c.name)) return false;
      seenNames.add(c.name);
      return true;
    })
    .sort((a, b) => {
      if (a.name === 'General Donations') return -1;
      if (b.name === 'General Donations') return 1;
      if (a.name === 'Workshop Tables') return -1;
      if (b.name === 'Workshop Tables') return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  const generalCategory = displayCategories.find((c) => c.name === 'General Donations');
  const specificCategories = displayCategories.filter((c) => c.name !== 'General Donations');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: 'rgba(201, 91, 45, 0.2)', borderTopColor: '#c95b2d' }}
          />
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'success') {
    return <SuccessPage onBackHome={handleBackHome} />;
  }

  if (currentPage === 'payment' && selectedCategory) {
    return (
      <div className="min-h-screen bg-gray-50 pb-12 overflow-x-hidden">
        <Header selectedTab={selectedTab} onTabChange={handleTabChange} onGoHome={handleGoHome} />
        <div className="mt-4 sm:mt-6 md:mt-8 pt-2 sm:pt-4 px-3 sm:px-4">
          <PaymentGateway
            category={selectedCategory}
            onBack={() => setCurrentPage('home')}
            onSuccess={handlePaymentSuccess}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header selectedTab={selectedTab} onTabChange={handleTabChange} onGoHome={handleGoHome} />

      <div className="max-w-7xl mx-auto px-3 py-6 sm:px-4 sm:py-8 md:py-12">
        <div className="mb-6 sm:mb-8 md:mb-12 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">
            Support Our Studio Space Renovations
          </h1>
          <div className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto space-y-3 sm:space-y-4">
            <p>
              Studio Space is a small community hub where people gather for connection, creative unfolding, and meaningful dialogue.
            </p>
            <p>
              Until now, Studio Space has been run by volunteers, and most gatherings have been offered free of charge. The space now needs renovations so it can continue to exist, grow, and welcome people safely.
            </p>
            <p>
              Your donation helps care for the space and supports cultural, educational, and creative gatherings.
            </p>
            <p>
              Every contribution helps keep this space open for community, reflection, and shared moments. If Studio Space resonates with you, we warmly invite you to support it.
            </p>
            <p>
              To complete the needed renovations, Studio Space is raising <strong>14,327 €</strong>.
            </p>
          </div>
        </div>

        <ImageCarousel />

        {categories.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-center max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8">
            <p className="text-blue-800 text-xs sm:text-sm">
              Showing demo categories. Run <code className="bg-blue-100 px-1 rounded">supabase db push</code> to use your database and save donations.
            </p>
          </div>
        )}

        {specificCategories.length > 0 && (
          <section aria-labelledby="causes-heading" className="mb-6 sm:mb-8 md:mb-12">
            <h2
              id="causes-heading"
              className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6"
            >
              Causes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              {specificCategories.map((category) => {
                const isCompleted =
                  category.current_amount >= category.target_amount && category.target_amount > 0;
                return (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  className={`rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-100 flex flex-col gap-4 sm:gap-6 ${
                    isCompleted
                      ? 'bg-gray-100 opacity-75 pointer-events-none'
                      : 'bg-white'
                  }`}
                >
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">{category.description}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-2 sm:mb-4">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                        €{category.current_amount.toLocaleString()}
                      </span>
                      <span className="text-sm sm:text-base md:text-lg text-gray-500">
                        of €{category.target_amount.toLocaleString()} goal
                      </span>
                    </div>
                    <div className="relative w-full h-2.5 sm:h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full transition-all duration-700 ease-out rounded-full"
                        style={{
                          width: `${Math.min(
                            (category.current_amount / category.target_amount) * 100,
                            100
                          )}%`,
                          backgroundColor: '#c95b2d',
                        }}
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">
                      {category.current_amount >= category.target_amount && category.target_amount > 0 ? (
                        <span className="font-semibold text-green-600">Completed</span>
                      ) : (
                        `${Math.min(
                          (category.current_amount / category.target_amount) * 100,
                          100
                        ).toFixed(1)}% funded`
                      )}
                    </p>
                  </div>
                  <div className="flex items-stretch gap-2">
                    <button
                      type="button"
                      disabled={isCompleted}
                      onClick={() => handleDonate(category)}
                      className="flex-1 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#c95b2d' }}
                    >
                      Donate Now
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, category)}
                      disabled={isCompleted}
                      className="flex-shrink-0 p-2.5 sm:p-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Share link to donate to ${category.name}`}
                    >
                      <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </section>
                );
              })}
            </div>
          </section>
        )}

        {generalCategory && (
          <section
            id={`category-${generalCategory.id}`}
            className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-100 flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8 md:mb-12"
          >
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
                {generalCategory.name}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">{generalCategory.description}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Total Raised</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                €{generalCategory.current_amount.toLocaleString()}
              </p>
            </div>
            <div className="flex items-stretch gap-2">
              <button
                onClick={() => handleDonate(generalCategory)}
                className="flex-1 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{ backgroundColor: '#c95b2d' }}
              >
                Donate Now
              </button>
              <button
                type="button"
                onClick={(e) => handleShare(e, generalCategory)}
                className="flex-shrink-0 p-2.5 sm:p-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                aria-label={`Share link to donate to ${generalCategory.name}`}
              >
                <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </section>
        )}

        <section className="mt-10 sm:mt-12 md:mt-16">
          <AllDonors />
        </section>

        <footer className="mt-12 sm:mt-16 md:mt-20 pb-8 sm:pb-12 text-center">
          <p
            className="text-2xl sm:text-[1.65rem] md:text-[1.65rem] lg:text-[1.65rem] max-w-3xl mx-auto"
            style={{ color: '#c95b2d', fontFamily: "'Reenie Beanie', cursive" }}
          >
            Thank you for being part of making this space continue to exist and grow.
          </p>
          <svg
            className="mx-auto mt-4 w-8 h-8 sm:w-10 sm:h-10"
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
        </footer>
      </div>
    </div>
  );
}

export default App;
