import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Donation } from '../lib/types';

interface LeaderboardProps {
  categoryId: string;
}

interface TopDonor {
  donor_name: string;
  total_amount: number;
  is_anonymous: boolean;
}

export function Leaderboard({ categoryId }: LeaderboardProps) {
  const [topDonors, setTopDonors] = useState<TopDonor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchTopDonors();

    const channel = supabase
      .channel(`donations-${categoryId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `category_id=eq.${categoryId}`,
        },
        () => {
          fetchTopDonors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [categoryId]);

  async function fetchTopDonors() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('donor_name, amount, is_anonymous')
        .eq('category_id', categoryId)
        .order('amount', { ascending: false });

      if (error) throw error;

      const aggregated = (data as Donation[]).reduce((acc, donation) => {
        const name = donation.is_anonymous ? 'Anonymous' : donation.donor_name;
        const existing = acc.find(d => d.donor_name === name);

        if (existing) {
          existing.total_amount += donation.amount;
        } else {
          acc.push({
            donor_name: name,
            total_amount: donation.amount,
            is_anonymous: donation.is_anonymous,
          });
        }

        return acc;
      }, [] as TopDonor[]);

      aggregated.sort((a, b) => b.total_amount - a.total_amount);
      setTopDonors(aggregated.slice(0, 5));
    } catch (error) {
      console.error('Error fetching top donors:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded" />
          <div className="h-3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (topDonors.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">Be the first to donate!</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900">Top Contributors</h4>
      </div>

      <div className="space-y-3">
        {topDonors.map((donor, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="font-medium w-6 h-6 flex items-center justify-center rounded-full text-white text-sm"
                style={{ backgroundColor: '#c95b2d' }}
              >
                {index + 1}
              </span>
              <span className="font-medium text-gray-700">
                {donor.donor_name}
              </span>
            </div>
            <span className="font-semibold text-gray-900">
              €{donor.total_amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
