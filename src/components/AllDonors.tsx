import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Donation } from '../lib/types';

interface DonorRow {
  donor_name: string;
  total_amount: number;
  is_anonymous: boolean;
}

const FALLBACK_DONORS: DonorRow[] = [
  { donor_name: 'Anonymous', total_amount: 500, is_anonymous: true },
];

export function AllDonors() {
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchAllDonors();

    const channel = supabase
      .channel('donations-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => fetchAllDonors()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAllDonors() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('donor_name, amount, is_anonymous')
        .order('amount', { ascending: false });

      if (error) throw error;

      const aggregated = (data as Donation[]).reduce((acc, donation) => {
        const name = donation.is_anonymous ? 'Anonymous' : donation.donor_name;
        const existing = acc.find((d) => d.donor_name === name);
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
      }, [] as DonorRow[]);

      aggregated.sort((a, b) => b.total_amount - a.total_amount);
      setDonors(aggregated);
    } catch (error) {
      console.error('Error fetching donors:', error);
    } finally {
      setLoading(false);
    }
  }

  const donorsToShow = donors.length > 0 ? donors : FALLBACK_DONORS;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  return (
    <section
      id="donors"
      className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-100"
      aria-labelledby="donors-heading"
    >
      <h2 id="donors-heading" className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
        Donors
      </h2>
      {donorsToShow.length === 0 ? (
        <p className="text-gray-500 text-sm sm:text-base">No donors yet. Be the first to donate!</p>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {donorsToShow.map((donor, index) => (
            <div
              key={`${donor.donor_name}-${index}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-100"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span
                  className="font-medium w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-white text-xs sm:text-sm flex-shrink-0"
                  style={{ backgroundColor: '#c95b2d' }}
                >
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900 text-sm sm:text-base">
                  {donor.donor_name}
                </span>
              </div>
              <span className="font-semibold text-gray-900 text-sm sm:text-base">
                €{donor.total_amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
