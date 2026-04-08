interface StudioImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

/**
 * Reusable image wrapper with warm tint + subtle grain overlays.
 * Overlays are handled in CSS via .studio-image::before/::after.
 */
export function StudioImage({ src, alt, className = '', imgClassName = '' }: StudioImageProps) {
  return (
    <div className={`studio-image ${className}`.trim()}>
      <img src={src} alt={alt} className={`studio-image__img ${imgClassName}`.trim()} />
    </div>
  );
}

