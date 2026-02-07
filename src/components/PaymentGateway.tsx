import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import type { Category } from '../lib/types';

interface PaymentGatewayProps {
  category: Category;
  onBack: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [10, 20, 50, 100];

export function PaymentGateway({ category, onBack, onSuccess }: PaymentGatewayProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);

  const amount = selectedAmount || parseFloat(customAmount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('Please select or enter a valid amount');
      return;
    }

    if (!donorName && !isAnonymous) {
      alert('Please enter your name or donate anonymously');
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      alert('Checkout is not configured. Please add Supabase URL and anon key in your environment.');
      return;
    }

    setProcessing(true);

    const baseUrl = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '');
    const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/`;

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-donation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            category_id: category.id,
            donor_name: isAnonymous ? 'Anonymous' : donorName,
            amount: amount,
            is_anonymous: isAnonymous,
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Process donation error:', response.status, errBody);
        throw new Error('Payment failed');
      }

      const data = await response.json();

      const redirectUrl = data.checkoutUrl;
      if (!redirectUrl) {
        throw new Error('No checkout URL received');
      }
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Support {category.name}
          </h2>
          <p className="text-gray-600">{category.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Amount
            </label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(preset);
                    setCustomAmount('');
                  }}
                  className={`py-4 px-4 rounded-lg font-semibold transition-all duration-200 ${
                    selectedAmount === preset
                      ? 'text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor:
                      selectedAmount === preset ? '#c95b2d' : undefined,
                  }}
                >
                  €{preset}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': '#c95b2d' } as any}
                min="1"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              disabled={isAnonymous}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100"
            />
            <label className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Donate anonymously</span>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-gray-600">Donation Amount:</span>
              <span className="font-semibold text-gray-900">€{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold" style={{ color: '#c95b2d' }}>€{amount.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing || amount <= 0}
            className="w-full text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              backgroundColor: processing || amount <= 0 ? '#ccc' : '#c95b2d',
            }}
          >
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Proceed to Secure Checkout
              </>
            )}
          </button>

          <p className="text-xs text-center text-gray-500">
            Payments secured by Stripe. Your donation will be processed securely.
          </p>
        </form>
      </div>
    </div>
  );
}
