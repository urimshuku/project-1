import { Header } from './Header';
import { BackButton } from './BackButton';
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
    <div className="min-h-screen theme-page flex flex-col relative">
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
          <BackButton
            onClick={() => {
              onBackToEntry();
              window.scrollTo(0, 0);
            }}
            className="mb-4 sm:mb-6 ml-2 sm:ml-3"
          />
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
                Over time, it became a space where many small things happen. Films are watched, books are discussed,
                conversations begin, music is shared, silence is held. None of these define it, yet all of them
                belong.
              </p>
              <p>
                What holds it together is something quieter. A sense of ease. The feeling that you do not have to
                arrive prepared, or leave changed. You can just be here, in your own way, at your own pace.
              </p>
              <p>
                Nothing is promised here. No outcomes, no conclusions, no becoming. Just the possibility of meeting
                life a little more directly.
              </p>
              <p>
                There is a kind of playfulness in that. Not something we try to create, but something that appears
                when there is no pressure. In that sense, it carries the spirit of leela, life expressing itself
                freely, without needing to justify itself.
              </p>
              <p>
                People come and go, each bringing something unseen, something felt. And slowly, a space like this
                takes shape. Not built by design, but by presence.
              </p>
              <p>It continues because it is lived.</p>
              <p>And you are welcome in it.</p>
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
