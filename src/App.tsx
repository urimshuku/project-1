import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PaymentGateway } from './components/PaymentGateway';
import { SuccessPage } from './components/SuccessPage';
import { Leaderboard } from './components/Leaderboard';
import { supabase } from './lib/supabase';
import type { Category } from './lib/types';

type Page = 'home' | 'payment' | 'success';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedTab, setSelectedTab] = useState('General Donations');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const targetCategory = categories.find((c) => c.name === tab);
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

  const generalCategory = categories.find((c) => c.name === 'General Donations');
  const specificCategories = categories.filter((c) => c.name !== 'General Donations');

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
