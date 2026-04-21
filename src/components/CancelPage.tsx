import { ArrowLeft } from 'lucide-react';

interface CancelPageProps {
  onBackHome: () => void;
}

export function CancelPage({ onBackHome }: CancelPageProps) {
  return (
    <div className="min-h-screen theme-page flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full theme-surface rounded-xl shadow-xl p-6 sm:p-8 border border-gray-100 text-center">
        <div className="mb-4 text-amber-500" aria-hidden>
          <svg className="w-14 h-14 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Payment canceled
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mb-6">
          Your donation was not completed. If you changed your mind, you can try again from the home page.
        </p>
        <button
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-white font-semibold py-3 px-5 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#c95b2d' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
