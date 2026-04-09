import { Header } from './Header';
import { Footer } from './Footer';
import { FooterQuote } from './FooterQuote';
import { ScrollReveal } from './ScrollReveal';
import { EntryDotsCanvas } from './EntryDotsCanvas';

interface VenuePageProps {
  onBackToEntry: () => void;
  onBookNow?: () => void;
}

const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const INTRO_IMAGE = `${base}/venue-photo.png`;

export function VenuePage({ onBackToEntry, onBookNow }: VenuePageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      <EntryDotsCanvas mouse={null} opacityScale={0.75} speedScale={0.75} />
      <div className="relative z-10 flex flex-col flex-1 min-h-0">
      <Header
        selectedTab="General Donations"
        onTabChange={() => {}}
        onLogoClick={onBackToEntry}
        onBookNow={onBookNow}
        logoVariant="venue"
      />
      <div className="flex-1">
        {/* Introduction */}
        <section
          className="max-w-7xl mx-auto px-3 pt-6 pb-6 sm:px-4 sm:pt-8 sm:pb-8 md:pt-10 md:pb-12"
          aria-labelledby="venue-intro-heading"
        >
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
          <ScrollReveal className="max-w-3xl mx-auto text-center space-y-6 sm:space-y-8">
            <h1
              id="venue-intro-heading"
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900"
            >
              Welcome to Studio Space
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              Our cozy 45 sqm studio is designed for connection, creative unfolding, free expression, and meaningful
              dialogue. Perfect for workshops, exhibitions, discussions, screenings, yoga, and meditation sessions.
              <br />
              <br />
              A space to gather in stillness, truth, and openness.
            </p>
            <div className="mt-8 sm:mt-10 md:mt-12 overflow-hidden rounded-xl sm:rounded-2xl shadow-lg transition-shadow duration-200 ease-out hover:shadow-xl">
              <img
                src={INTRO_IMAGE}
                alt="The studio space"
                className="w-full aspect-[16/9] sm:aspect-[3/2] object-cover border border-gray-100"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </ScrollReveal>
        </section>

        {/* Story */}
        <section
          className="max-w-7xl mx-auto px-3 pt-10 sm:px-4 sm:pt-12 md:pt-16 pb-6 sm:pb-8 md:pb-12"
          aria-labelledby="venue-story-heading"
        >
          <ScrollReveal>
            <div className="w-8 sm:w-10 h-1 rounded-full mb-6 sm:mb-8" style={{ backgroundColor: '#d5a220' }} aria-hidden />
            <h2
              id="venue-story-heading"
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8"
            >
              The Story
            </h2>
            <div className="max-w-3xl space-y-4 sm:space-y-5 text-base sm:text-lg text-gray-600 leading-relaxed">
              <p>
                Studio Space began from a simple need: a room where people could come together without an agenda. Not
                a cafe, not a workplace, not a performance hall, but a space in between, where the only thing needed
                is your presence.
              </p>
              <p>
                It exists from a simple understanding: that to sit together, to listen, to observe, can change the way
                we experience ourselves and others. Whether through a film, a book, a conversation, or silence,
                something begins to open when we are simply willing to be here.
              </p>
              <p>
                Nothing is promised here. No outcomes, no conclusions. Only the possibility of being a little more
                present, a little more aware, a little more alive.
              </p>
              <p>
                What it stands for is simple: openness instead of separation, attention instead of habit, and a certain
                care for the space itself. The walls, the light, the way sound moves in the room, all of it matters.
              </p>
              <p>
                Studio Space is held by those who care for it. It continues because others choose to come, to sit, and
                to be part of it.
              </p>
            </div>
          </ScrollReveal>
        </section>

        <FooterQuote color="#d5a220" />
      </div>
      <Footer />
      </div>
    </div>
  );
}

