import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SupportEntry {
  id: string;
  donor_name: string;
  is_anonymous: boolean;
  words_of_support: string;
  created_at: string;
}

export function WordsOfSupport() {
  const [entries, setEntries] = useState<SupportEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchEntries();

    const channel = supabase
      .channel('words-of-support')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => fetchEntries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchEntries() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('id, donor_name, is_anonymous, words_of_support, created_at')
        .not('words_of_support', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data ?? []).filter(
        (row): row is SupportEntry =>
          typeof row.words_of_support === 'string' && row.words_of_support.trim().length > 0
      );
      setEntries(list);
    } catch (error) {
      console.error('Error fetching words of support:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-10 sm:mt-12 md:mt-16" aria-label="Words of Support">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Words of Support</h2>
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-100">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="words-of-support" aria-labelledby="words-of-support-heading">
      <h2 id="words-of-support-heading" className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
        Words of Support
      </h2>
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-100">
        {entries.length === 0 ? (
          <p className="text-gray-500 text-sm sm:text-base">
            No messages yet. Leave a note when you donate to show your support.
          </p>
        ) : (
          <ul className="space-y-4 sm:space-y-5">
            {entries.map((entry) => (
              <li key={entry.id} className="border-b border-gray-100 last:border-0 pb-4 sm:pb-5 last:pb-0">
                <p className="text-gray-900 text-sm sm:text-base leading-relaxed italic">
                  &ldquo;{entry.words_of_support}&rdquo;
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mt-2">
                  — {entry.is_anonymous ? 'Anonymous' : entry.donor_name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
