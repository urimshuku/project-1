import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StudioImage } from './StudioImage';

export interface CarouselImage {
  src: string;
  alt: string;
}

interface ActivityCarouselProps {
  images: CarouselImage[];
  /** Optional label for aria */
  label?: string;
}

/**
 * Manual carousel: arrows and dots, no autoplay. Calm transitions.
 * Reusable for each activity section.
 */
export function ActivityCarousel({ images, label = 'Gallery' }: ActivityCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const count = images.length;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? count - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === count - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNext();
    if (distance < -minSwipeDistance) goToPrevious();
  };

  if (count === 0) return null;

  return (
    <div
      className="w-full max-w-4xl mx-auto"
      role="region"
      aria-label={label}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg transition-shadow duration-200 ease-out hover:shadow-xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((image, i) => (
            <div key={i} className="min-w-full">
              <div className="relative w-full aspect-video bg-gray-200 flex items-center justify-center overflow-hidden">
                {image.src ? (
                  <StudioImage
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full"
                    imgClassName="object-cover"
                  />
                ) : (
                  <span className="carousel-caption--subtle">
                    Studio Space Photo {i + 1}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={goToPrevious}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200 hover:scale-110 z-10"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
        </button>
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 sm:p-3 shadow-lg transition-all duration-200 hover:scale-110 z-10"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
