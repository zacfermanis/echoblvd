# System Patterns: Echo Blvd Band Website

## Architecture Overview

### Next.js App Router Structure
```
app/
├── layout.tsx              # Root layout with navigation
├── page.tsx               # Homepage
├── music/
│   └── page.tsx           # Music showcase
├── shows/
│   └── page.tsx           # Tour dates and shows
├── about/
│   └── page.tsx           # Band information
├── contact/
│   └── page.tsx           # Contact form and info
├── components/            # Shared components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   └── sections/         # Page sections
├── lib/                  # Utility functions
└── types/                # TypeScript definitions
```

### Component Architecture

#### Server Components (Default)
- **Layout components**: Navigation, footer, page structure
- **Content components**: Static content display
- **Data fetching**: Server-side data retrieval
- **SEO components**: Meta tags, structured data

#### Client Components (When Needed)
- **Interactive elements**: Forms, buttons, animations
- **State management**: Local component state
- **Browser APIs**: Audio players, scroll effects
- **User interactions**: Hover effects, click handlers

### Data Flow Patterns

#### Static Content
```typescript
// Content stored in markdown/JSON files
// Loaded at build time for optimal performance
const getBandContent = async (): Promise<BandContent> => {
  // Read from content files
  return content;
};
```

#### Dynamic Content
```typescript
// External APIs for shows, social media
// Cached and revalidated periodically
const getUpcomingShows = async (): Promise<Show[]> => {
  // Fetch from external API with caching
  return shows;
};
```

## Design Patterns

### Component Composition
```typescript
// Prefer composition over inheritance
const MusicSection = () => {
  return (
    <Section>
      <SectionHeader title="Latest Music" />
      <AlbumGrid albums={albums} />
      <MusicPlayer tracks={featuredTracks} />
    </Section>
  );
};
```

### Functional Patterns
```typescript
// Pure functions for data transformation
const formatShowDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Immutable data updates
const addShow = (shows: Show[], newShow: Show): Show[] => {
  return [...shows, newShow].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};
```

### Error Handling
```typescript
// Result types for predictable error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

const fetchShows = async (): Promise<Result<Show[], FetchError>> => {
  try {
    const response = await fetch('/api/shows');
    if (!response.ok) {
      return { success: false, error: new FetchError('Failed to fetch shows') };
    }
    const shows = await response.json();
    return { success: true, data: shows };
  } catch (error) {
    return { success: false, error: new FetchError('Network error') };
  }
};
```

## Key Implementation Paths

### Content Management
1. **Static Content**: Markdown files for band bio, about pages
2. **Dynamic Content**: JSON files for shows, music, social links
3. **Media Assets**: Optimized images in public directory
4. **SEO Content**: Meta tags, structured data for each page

### Performance Optimization
1. **Server Components**: Default to RSC for better performance
2. **Image Optimization**: Next.js Image component with WebP
3. **Code Splitting**: Dynamic imports for non-critical components
4. **Caching**: Static generation with ISR for dynamic content

### Accessibility Implementation
1. **Semantic HTML**: Proper heading structure, landmarks
2. **ARIA Labels**: Screen reader support for interactive elements
3. **Keyboard Navigation**: Full keyboard accessibility
4. **Color Contrast**: WCAG AA compliance for text and UI elements

### Testing Strategy
1. **Component Tests**: React Testing Library for UI components
2. **Integration Tests**: Page-level behavior testing
3. **E2E Tests**: Critical user journeys (optional)
4. **Performance Tests**: Core Web Vitals monitoring

## Critical Implementation Details

### SEO Implementation
```typescript
// Metadata for each page
export const metadata: Metadata = {
  title: 'Echo Blvd - Official Website',
  description: 'Official website of Echo Blvd. Listen to our latest music and find upcoming shows.',
  openGraph: {
    title: 'Echo Blvd',
    description: 'Official website of Echo Blvd',
    images: ['/og-image.jpg'],
  },
};
```

### Responsive Design
```typescript
// Mobile-first approach with Tailwind
const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-6">
          Echo Blvd
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl mb-8">
          Official Website
        </p>
      </div>
    </section>
  );
};
```

### Audio Integration
```typescript
// Client component for audio playback
'use client';

const MusicPlayer = ({ tracks }: { tracks: Track[] }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    // Audio implementation
  };

  return (
    <div className="music-player">
      {/* Player UI */}
    </div>
  );
};
```

## Component Relationships

### Layout Hierarchy
```
RootLayout
├── Navigation
├── Page Content (varies by route)
└── Footer
```

### Page Structure Pattern
```
Page Component
├── Hero Section
├── Main Content Sections
└── Call-to-Action Section
```

### Reusable Components
- **Section**: Consistent page section wrapper
- **Button**: Standardized button component
- **Card**: Content card for music, shows, etc.
- **Grid**: Responsive grid layouts
- **Modal**: Overlay components for details

## Performance Patterns

### Image Optimization
```typescript
import Image from 'next/image';

const BandPhoto = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      className="rounded-lg"
      priority={false}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
};
```

### Lazy Loading
```typescript
// Dynamic imports for non-critical components
const NewsletterSignup = dynamic(() => import('./NewsletterSignup'), {
  loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded" />,
  ssr: false
});
```

### Caching Strategy
```typescript
// Static generation with revalidation
export const revalidate = 3600; // Revalidate every hour

const getShows = async (): Promise<Show[]> => {
  // Fetch shows with caching
  return shows;
};
``` 