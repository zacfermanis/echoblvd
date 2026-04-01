import Image from 'next/image';

export interface AmbientPhotoBackgroundProps {
  src: string;
  /** Decorative; use empty string for purely visual backgrounds */
  alt?: string;
  priority?: boolean;
  overlay?: 'light' | 'medium' | 'heavy';
}

const overlayGradients: Record<NonNullable<AmbientPhotoBackgroundProps['overlay']>, string> = {
  light:
    'bg-gradient-to-b from-black/45 via-black/55 to-black/75',
  medium:
    'bg-gradient-to-b from-black/60 via-black/70 to-black/90',
  heavy:
    'bg-gradient-to-b from-black/75 via-black/82 to-black/95',
};

/**
 * Full-viewport photo behind page content with graded overlays and vignette
 * for readable type — typical of professional band / artist sites.
 */
export function AmbientPhotoBackground({
  src,
  alt = '',
  priority = false,
  overlay = 'medium',
}: AmbientPhotoBackgroundProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover object-center"
        sizes="100vw"
        quality={82}
      />
      <div
        className={`absolute inset-0 ${overlayGradients[overlay]}`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_40%,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.35)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}
