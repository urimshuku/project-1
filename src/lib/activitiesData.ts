import type { CarouselImage } from '../components/ActivityCarousel';

const placeholder = (activity: string, n: number) =>
  `https://placehold.co/800x450/e5e7eb/6b7280?text=${encodeURIComponent(activity + ' ' + n)}`;
const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export interface ActivitySection {
  id: string;
  title: string;
  description: string;
  /** Optional list items (e.g. for Classes & Gatherings) */
  listItems?: string[];
  images: CarouselImage[];
}

export const ACTIVITIES: ActivitySection[] = [
  {
    id: 'book-club',
    title: 'Book Club',
    description:
      'A regular gathering for reading and discussion. We choose books together and meet to share reflections and conversation in a relaxed, welcoming setting.',
    images: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
      src: `${base}/images/book-club/book-club-reading-circle-${n}.png`,
      alt: `Book Club reading circle ${n}`,
    })),
  },
  {
    id: 'neighborhood-cleaning',
    title: 'Local Neighborhood Cleaning',
    description:
      'Community clean-up sessions in our neighborhood. We meet to pick up litter, care for shared spaces, and connect with neighbors who want to make the area a better place for everyone.',
    images: [1, 2, 3, 4, 5].map((n) => ({
      src: placeholder('Neighborhood Cleaning', n),
      alt: `Local Neighborhood Cleaning ${n}`,
    })),
  },
  {
    id: 'films-documentaries',
    title: 'Films & Documentaries',
    description:
      'Screening evenings for films and documentaries, followed by optional discussion. A space to watch together and reflect on the stories that move us.',
    images: [1, 2, 3, 4, 5].map((n) => ({
      src: placeholder('Films & Documentaries', n),
      alt: `Films & Documentaries ${n}`,
    })),
  },
  {
    id: 'spiritual-events',
    title: 'Classes & Gatherings',
    description:
      'A range of sessions that invite attention, movement, and shared presence. From yoga and somatic work to talks, moon gatherings, and collective singing, each offering opens a space to engage more consciously with yourself and others. All are welcome.',
    listItems: [
      'Open Conversations',
      'Classical Hatha Yoga',
      'Full moon gatherings',
      'New moon gatherings',
      'Collective singing',
    ],
    images: [1, 2, 3, 4, 5].map((n) => ({
      src: placeholder('Classes & Gatherings', n),
      alt: `Classes & Gatherings ${n}`,
    })),
  },
];
