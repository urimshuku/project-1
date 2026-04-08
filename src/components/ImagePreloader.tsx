import { useEffect } from 'react';
import { ACTIVITIES } from '../lib/activitiesData';

const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const heroImages = [
  `${base}/venue-photo.png`,
  `${base}/images/workshop/workshop-preview.png`,
];

/**
 * Injects <link rel="preload"> into <head> for the first slide of each
 * activity carousel and key hero images.  Browsers fetch these early so
 * the first paint of each section already has pixels ready.
 *
 * Non-first slides use loading="lazy" via StudioImage, so they stay
 * deferred until scrolled into view.
 */
export function ImagePreloader() {
  useEffect(() => {
    const urls: string[] = [
      ...heroImages,
      ...ACTIVITIES.map((a) => a.images[0]?.src).filter(Boolean),
    ];

    const links: HTMLLinkElement[] = [];

    for (const url of urls) {
      if (!url || document.querySelector(`link[rel="preload"][href="${url}"]`)) continue;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      for (const link of links) link.remove();
    };
  }, []);

  return null;
}
