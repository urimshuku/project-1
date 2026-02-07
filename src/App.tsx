import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PaymentGateway } from './components/PaymentGateway';
import { SuccessPage } from './components/SuccessPage';
import { Leaderboard } from './components/Leaderboard';
import { supabase } from './lib/supabase';
import type { Category } from './lib/types';

type Page = 'home' | 'payment' | 'success';

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
    id: 'default-insulation',
    name: 'Insulation',
    description: 'Help us insulate the studio to stay warm in winter and cool in summer.',
    target_amount: 2500,
    current_amount: 0,
    sort_order: 1,
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
    sort_order: 2,
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
    sort_order: 3,
    has_progress_bar: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'default-ac',
    name: 'A/C',
    description: 'Air conditioning for a comfortable working environment year-round.',
    target_amount: 1000,
    current_amount: 0,
    sort_order: 4,
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

  const handlePaymentSuccess = () => {
    setCurrentPage('success');
  };

  const handleBackHome = () => {
    setCurrentPage('home');
    setSelectedCategory(null);
  };

  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
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
        <Header selectedTab={selectedTab} onTabChange={handleTabChange} />
        <div className="mt-8 pt-4 px-4">
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
      <Header selectedTab={selectedTab} onTabChange={handleTabChange} />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Support Our Studio Space Projects
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Choose a project below to see its progress and make a contribution.
          </p>
        </div>

        {categories.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center max-w-2xl mx-auto mb-8">
            <p className="text-blue-800 text-sm">
              Showing demo categories. Run <code className="bg-blue-100 px-1 rounded">supabase db push</code> to use your database and save donations.
            </p>
          </div>
        )}

        {generalCategory && (
          <section
            id={`category-${generalCategory.id}`}
            className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 flex flex-col gap-6 mb-12"
          >
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {generalCategory.name}
              </h2>
              <p className="text-gray-600">{generalCategory.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Total Raised</p>
              <p className="text-4xl font-bold text-gray-900">
                €{generalCategory.current_amount.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => handleDonate(generalCategory)}
              className="w-full text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
              style={{ backgroundColor: '#c95b2d' }}
            >
              Donate Now
            </button>
            <div className="mt-2">
              <Leaderboard categoryId={generalCategory.id} />
            </div>
          </section>
        )}

        {specificCategories.length > 0 && (
          <section aria-labelledby="specific-causes-heading">
            <h2
              id="specific-causes-heading"
              className="text-2xl font-bold text-gray-900 mb-6"
            >
              Specific Causes
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {specificCategories.map((category) => (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 flex flex-col gap-6"
                >
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-600">{category.description}</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-4">
                      <span className="text-3xl font-bold text-gray-900">
                        €{category.current_amount.toLocaleString()}
                      </span>
                      <span className="text-lg text-gray-500">
                        of €{category.target_amount.toLocaleString()} goal
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
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
                    <p className="text-sm text-gray-500 mt-3">
                      {Math.min(
                        (category.current_amount / category.target_amount) * 100,
                        100
                      ).toFixed(1)}
                      % funded
                    </p>
                  </div>
                  <button
                    onClick={() => handleDonate(category)}
                    className="w-full text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: '#c95b2d' }}
                  >
                    Donate Now
                  </button>
                  <div className="mt-2">
                    <Leaderboard categoryId={category.id} />
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
