import Image from 'next/image';

export interface AmbientPhotoBackgroundProps {
  src: string;
  /** Decorative; use empty string for purely visual backgrounds */
  alt?: string;
  priority?: boolean;
  overlay?: 'light' | 'medium' | 'heavy';
  /**
   * Show only the bottom portion of the image (top is clipped). E.g. `2/3` keeps the lower two-thirds
   * — useful when the top of the frame has unwanted elements (screens, ceiling).
   */
  visibleImageHeightFraction?: number;
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
  visibleImageHeightFraction,
}: AmbientPhotoBackgroundProps) {
  const fraction =
    visibleImageHeightFraction !== undefined &&
    visibleImageHeightFraction > 0 &&
    visibleImageHeightFraction <= 1
      ? visibleImageHeightFraction
      : null;

  const imageNode = (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      className="object-cover object-center"
      sizes="100vw"
      quality={82}
    />
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {fraction !== null ? (
        <div
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
          style={{ height: `${(100 / fraction).toFixed(4)}%` }}
        >
          {imageNode}
        </div>
      ) : (
        imageNode
      )}
      <div
        className={`absolute inset-0 ${overlayGradients[overlay]}`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_40%,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.35)_0%,transparent_18%,transparent_82%,rgba(0,0,0,0.35)_100%)]" />
    </div>
  );
}
