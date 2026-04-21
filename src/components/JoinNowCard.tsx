import { useState } from 'react';
import type { ActivitySection } from '../lib/activitiesData';

interface JoinNowCardProps {
  activities: ActivitySection[];
  onClose: () => void;
}

export function JoinNowCard({ activities, onClose }: JoinNowCardProps) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleActivity = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder: in a real app you would send to an API
    console.log({
      name,
      surname,
      activities: Array.from(selectedIds),
    });
    alert('Thank you! We’ll be in touch soon.');
    onClose();
  };

  return (
    <div
      className="theme-surface rounded-xl sm:rounded-2xl shadow-md max-w-lg w-full border border-gray-200"
      role="region"
      aria-labelledby="join-now-title"
    >
      <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 id="join-now-title" className="text-xl sm:text-2xl font-bold text-gray-900">
              Join an Activity
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 text-sm sm:text-base mb-6">
            Choose the activities you’d like to join and tell us your name. We’ll get back to you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-900">
                Activities I’d like to join
              </legend>
              <ul className="space-y-2">
                {activities.map((activity) => (
                  <li key={activity.id}>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(activity.id)}
                        onChange={() => toggleActivity(activity.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#4DA1A9] focus:ring-[#4DA1A9]"
                      />
                      <span className="text-gray-700 group-hover:text-gray-900">{activity.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="join-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="join-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="First name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4DA1A9] focus:border-[#4DA1A9]"
                />
              </div>
              <div>
                <label htmlFor="join-surname" className="block text-sm font-medium text-gray-700 mb-1">
                  Surname
                </label>
                <input
                  id="join-surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  required
                  placeholder="Surname"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#4DA1A9] focus:border-[#4DA1A9]"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg text-white font-bold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4DA1A9]"
                style={{ backgroundColor: '#4DA1A9' }}
              >
                Send request
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
