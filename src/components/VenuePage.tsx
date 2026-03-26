import { Header } from './Header';
import { Footer } from './Footer';
import { FooterQuote } from './FooterQuote';
import { ScrollReveal } from './ScrollReveal';
import { scrollToTopEaseOut } from '../lib/scrollToTop';
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
        onLogoClick={() => scrollToTopEaseOut(550)}
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
              Studio Space — The Space
            </h1>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              A place for presence. Where people gather with intention, in openness, to meet one another and what
              moves in them. Not a venue — a space that holds silence and speech, stillness and exchange.
            </p>
            <div className="mt-8 sm:mt-10 md:mt-12 overflow-hidden rounded-xl sm:rounded-2xl shadow-lg transition-shadow duration-200 ease-out hover:shadow-xl">
              <img
                src={INTRO_IMAGE}
                alt="The studio space"
                className="w-full aspect-[16/9] sm:aspect-[3/2] object-cover border border-gray-100"
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
                Studio Space began from a simple need: a room where people could come together without an agenda. A
                place that wasn’t a café, an office, or a performance hall — somewhere in between, where the only
                requirement was to show up.
              </p>
              <p>
                It exists because we believe that gathering matters. That sitting in a circle, reading together,
                watching a film, or simply sharing silence can change how we see ourselves and each other. The space
                doesn’t promise outcomes; it offers presence.
              </p>
              <p>
                What it stands for is straightforward: openness over exclusivity, intention over habit, and care for
                the place itself. The walls, the light, the way the room holds sound — all of it is part of the
                invitation. Studio Space is run by people who care for it, and it continues because others choose to
                show up and care too.
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

