import { ActivityCarousel } from './ActivityCarousel';
import { ACTIVITIES } from '../lib/activitiesData';
import { Header } from './Header';
import { Footer } from './Footer';
import { ScrollReveal } from './ScrollReveal';
import { EntryDotsCanvas } from './EntryDotsCanvas';

interface ActivitiesPageProps {
  onBackToEntry: () => void;
  onJoinNow?: () => void;
}

export function ActivitiesPage({ onBackToEntry, onJoinNow }: ActivitiesPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <EntryDotsCanvas mouse={null} opacityScale={0.75} speedScale={0.75} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      <Header
        selectedTab="General Donations"
        onTabChange={() => {}}
        onLogoClick={onBackToEntry}
        onJoinNow={onJoinNow}
        logoVariant="activities"
      />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-3 pt-6 pb-6 sm:px-4 sm:pt-8 sm:pb-8 md:pt-10 md:pb-12">
          <button
            type="button"
            onClick={() => {
              onBackToEntry();
              window.scrollTo(0, 0);
            }}
            className="mb-4 sm:mb-6 ml-2 sm:ml-3 inline-flex items-center justify-center p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Back to Home"
          >
            <img
              src={`${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}/arrow-back.svg`}
              alt=""
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain block opacity-35"
            />
          </button>
          <ScrollReveal className="mb-6 sm:mb-8 md:mb-12 text-center max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">
              Studio Space Activities
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Gatherings and events at the studio — book club, films, neighborhood cleaning, and spiritual practices.
            </p>
          </ScrollReveal>

          {ACTIVITIES.map((activity) => (
            <section
              key={activity.id}
              id={activity.id}
              className="mt-10 sm:mt-12 md:mt-16 mb-6 sm:mb-8 md:mb-12"
              aria-labelledby={`${activity.id}-heading`}
            >
              <ScrollReveal>
                <div
                  className="w-8 sm:w-10 h-1 rounded-full mt-14 sm:mt-20 md:mt-24 mb-4 sm:mb-6"
                  style={{ backgroundColor: '#4DA1A9' }}
                  aria-hidden
                />
                <h2
                  id={`${activity.id}-heading`}
                  className="text-2xl sm:text-3xl font-bold text-gray-900"
                >
                  {activity.title}
                </h2>

                <div className="mt-4 sm:mt-6 md:mt-8 mb-6 sm:mb-8">
                  <ActivityCarousel
                    images={activity.images}
                    label={`${activity.title} gallery`}
                  />
                </div>

                <div className="space-y-3 text-gray-600 text-sm sm:text-base leading-relaxed">
                  <p>{activity.description}</p>
                  {activity.listItems && activity.listItems.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 pl-1">
                      {activity.listItems.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </ScrollReveal>
            </section>
          ))}

          <section
            id="workshops"
            className="mt-10 sm:mt-12 md:mt-16 mb-6 sm:mb-8 md:mb-12"
            aria-labelledby="workshops-heading"
          >
            <ScrollReveal>
              <div
                className="w-8 sm:w-10 h-1 rounded-full mt-14 sm:mt-20 md:mt-24 mb-4 sm:mb-6"
                style={{ backgroundColor: '#4DA1A9' }}
                aria-hidden
              />
              <h2
                id="workshops-heading"
                className="text-2xl sm:text-3xl font-bold text-gray-900"
              >
                Workshops
              </h2>
              <div className="mt-4 sm:mt-6 md:mt-8 bg-gray-100 rounded-lg py-8 sm:py-10 px-4 sm:px-6 text-center">
                <p className="text-gray-500 text-sm sm:text-base font-medium">
                  Coming Soon
                </p>
              </div>
            </ScrollReveal>
          </section>
        </div>
      </div>

      <Footer />
      </div>
    </div>
  );
}
