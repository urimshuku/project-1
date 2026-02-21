import { MapPin, Phone, Instagram } from 'lucide-react';

const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Studio+Space/@42.6576438,21.173839,17z/data=!3m1!4b1!4m6!3m5!1s0x13549f002f3d4bd7:0x750c64afcadd83fa!8m2!3d42.6576439!4d21.1787099!16s%2Fg%2F11vsp44gl1?entry=ttu';
const PHONE_RAW = '+38344173202';
const PHONE_DISPLAY = '+383 44 173 202';
const INSTAGRAM_URL = 'https://www.instagram.com/studio____space/';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-6 sm:mt-8 md:mt-10">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10 md:py-12">
        <div className="flex flex-row justify-between items-start gap-3 sm:gap-6 md:gap-8">
          {/* Logo + copyright */}
          <div className="flex flex-col items-start flex-shrink-0 min-w-0">
            <a
              href={import.meta.env.BASE_URL || '/'}
              className="flex-shrink-0"
              aria-label="Studio Space Donations home"
            >
              <img
                src={`${import.meta.env.BASE_URL}logo.svg?v=2`}
                alt="Studio Space Donations logo"
                className="h-12 sm:h-16 md:h-20 w-auto"
              />
            </a>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3 text-left">
              © {new Date().getFullYear()} Studio Space.
              <br />
              All rights reserved.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 sm:gap-3 md:gap-4 flex-shrink min-w-0">
            {/* Location - Google Maps */}
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline text-right">
                M55H+CGH, Ymer Prizreni Rd, 10000
              </span>
              <MapPin className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: '#c95b2d' }} aria-hidden />
            </a>

            {/* Phone */}
            <a
              href={`tel:${PHONE_RAW.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline">{PHONE_DISPLAY}</span>
              <Phone className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: '#c95b2d' }} aria-hidden />
            </a>

            {/* Instagram */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors text-xs sm:text-sm md:text-base"
            >
              <span className="footer-link-underline">Follow us on Instagram</span>
              <Instagram className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: '#c95b2d' }} aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
