import { useState, useRef, useEffect } from 'react';
import type { Category } from '../lib/types';
import { PERSON_NAME_INPUT_ATTRS, sanitizePersonNameInput } from '../lib/sanitizePersonName';
import { BackButton } from './BackButton';
import { MarketingOptInCheckbox } from './MarketingOptInCheckbox';

interface PaymentGatewayProps {
  category: Category;
  onBack: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [20, 50, 100, 500];
const MAX_WORDS_OF_SUPPORT = 150;

/** Basic email validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function PaymentGateway({ category, onBack }: PaymentGatewayProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [wordsOfSupport, setWordsOfSupport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const amount = (selectedAmount ?? parseFloat(customAmount)) || 0;
  const formValid =
    amount > 0 &&
    (!!donorName || isAnonymous) &&
    !!email.trim() &&
    isValidEmail(email);

  const formDataRef = useRef({
    category_id: category.id,
    donor_name: donorName,
    email: email.trim(),
    amount,
    is_anonymous: isAnonymous,
    words_of_support: wordsOfSupport.trim().slice(0, MAX_WORDS_OF_SUPPORT) || undefined,
    marketingOptIn,
  });
  useEffect(() => {
    formDataRef.current = {
      category_id: category.id,
      donor_name: isAnonymous ? 'Anonymous' : donorName,
      email: email.trim(),
      amount,
      is_anonymous: isAnonymous,
      words_of_support: wordsOfSupport.trim().slice(0, MAX_WORDS_OF_SUPPORT) || undefined,
      marketingOptIn,
    };
  }, [category.id, donorName, email, isAnonymous, wordsOfSupport, amount, marketingOptIn]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleDonate = async () => {
    setError(null);
    setInfo(null);
    if (!formValid) {
      if (amount <= 0) setError('Please make at least one selection.');
      else if (!donorName && !isAnonymous) setError('Please enter your name or check Donate anonymously.');
      else if (!email.trim()) setError('Please enter your email address.');
      else if (!isValidEmail(email)) setError('Please enter a valid email address.');
      return;
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Checkout is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    setLoading(true);
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const accepturl = `${window.location.origin}${base}/success?paysera=1`;
    const cancelurl = `${window.location.origin}${base}/cancel`;

    const d = formDataRef.current;
    try {
      const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/paysera-pay-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({
          category_id: d.category_id,
          donor_name: d.donor_name,
          email: d.email,
          amount: d.amount,
          is_anonymous: d.is_anonymous,
          words_of_support: d.words_of_support,
          marketingOptIn: d.marketingOptIn,
          accepturl,
          cancelurl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to start payment');
      }
      if (data.payUrl) {
        if (data?.alreadySignedUp && data?.message) {
          setInfo(data.message);
          setTimeout(() => {
            window.location.href = data.payUrl;
          }, 900);
          return;
        }
        window.location.href = data.payUrl;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="max-w-2xl mx-auto px-1 sm:px-0">
        <BackButton onClick={onBack} className="mb-4 sm:mb-6" />
        <div className="theme-surface rounded-xl shadow-xl p-6 border border-gray-100">
          <p className="text-gray-600 mb-2">Checkout is not configured.</p>
          <p className="text-sm text-gray-600">
            Set <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in your <code className="bg-gray-100 px-1 rounded">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-1 sm:px-0">
      <BackButton onClick={onBack} className="mb-4 sm:mb-6" />

      <div className="theme-surface rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-gray-100">
        <div className="mb-5 sm:mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Support {category.name}
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">{category.description}</p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
              Donation Amount <span className="text-gray-400 font-normal">(*)</span>
            </label>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-2 sm:mb-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(preset);
                    setCustomAmount('');
                  }}
                  className={`py-3 sm:py-4 px-2 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                    selectedAmount === preset
                      ? 'text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedAmount === preset ? '#c95b2d' : undefined,
                  }}
                >
                  €{preset}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm sm:text-base">
                €
              </span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Other amount"
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#c95b2d', fontSize: '16px' } as React.CSSProperties}
                min="1"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Full Name
            </label>
            <input
              {...PERSON_NAME_INPUT_ATTRS}
              value={donorName}
              onChange={(e) => setDonorName(sanitizePersonNameInput(e.target.value))}
              disabled={isAnonymous}
              placeholder="Enter your name"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100"
              style={{ fontSize: '16px' }}
            />
            <label className="flex items-center gap-2 mt-1.5 sm:mt-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs sm:text-sm text-gray-600">Donate anonymously</span>
            </label>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Email Address <span className="text-gray-400 font-normal">(*)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              style={{ fontSize: '16px' }}
              autoComplete="email"
            />
            <p className="mt-1 text-xs text-gray-500">Already signed up? Use the same email to update your request.</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
              Words of Support <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={wordsOfSupport}
              onChange={(e) => setWordsOfSupport(e.target.value.slice(0, MAX_WORDS_OF_SUPPORT))}
              placeholder="Leave a short message in support of the space"
              maxLength={MAX_WORDS_OF_SUPPORT}
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              style={{ fontSize: '16px' }}
            />
            <p className="text-xs text-gray-500 mt-1">
              {wordsOfSupport.length}/{MAX_WORDS_OF_SUPPORT} characters
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 sm:p-4">
            <div className="flex justify-between items-center text-xs sm:text-sm mb-1">
              <span className="text-gray-600">Donation Amount:</span>
              <span className="font-semibold text-gray-900">€{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-xl sm:text-2xl font-bold" style={{ color: '#c95b2d' }}>
                €{amount.toFixed(2)}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-blue-700" role="status">
              {info}
            </p>
          )}

          <div className="w-full">
            <MarketingOptInCheckbox
              id="donation-marketing-opt-in"
              checked={marketingOptIn}
              onChange={setMarketingOptIn}
            />
          </div>

          <button
            type="button"
            onClick={handleDonate}
            disabled={loading || amount <= 0}
            className="w-full py-3 sm:py-4 px-4 rounded-lg font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#136c9c' }}
          >
            {loading ? 'Redirecting to payment…' : 'Continue to payment'}
          </button>

          <p className="text-xs text-center text-gray-500">
            You will be redirected to Paysera to complete your donation securely. We do not store card or bank details.
          </p>
        </div>
      </div>
    </div>
  );
}
