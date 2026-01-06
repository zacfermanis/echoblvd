# Technical Context: Echo Blvd Band Website

## Technology Stack

### Core Framework
- **Next.js 14+**: App Router for modern React development
- **TypeScript**: Strict mode for type safety
- **React 18**: Latest React features and patterns

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **Mobile-first**: Responsive design approach
- **Custom components**: Reusable UI components

### Development Tools
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **TypeScript strict mode**: No `any`, strict null checks
- **Jest/Vitest**: Testing framework (TDD approach)
- **React Testing Library**: Component testing
- **Git LFS**: Large file storage for video and SVG assets

### Performance & Optimization
- **Next.js Image**: Optimized image handling
- **Server Components**: RSC for better performance
- **Dynamic imports**: Code splitting for non-critical components
- **Web Vitals**: LCP, CLS, FID optimization

### Content Management
- **Static content**: Markdown files for band content
- **Dynamic data**: JSON files for shows, music, etc.
- **Image optimization**: WebP format, lazy loading

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Git for version control

### Project Structure
```
echoblvd/
├── app/                    # Next.js App Router
│   ├── (routes)/          # Route groups
│   ├── components/        # Shared components
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript definitions
├── public/               # Static assets
├── content/              # Band content (markdown, JSON)
├── tests/                # Test files
├── memory-bank/          # Project documentation
└── package.json
```

### Key Dependencies
- `next`: React framework
- `react` & `react-dom`: React library
- `typescript`: Type safety
- `tailwindcss`: Styling
- `@types/node`: Node.js types
- `jest` & `@testing-library/react`: Testing

## Development Workflow

### TDD Process (Non-Negotiable)
1. **Red**: Write failing test for desired behavior
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests green

### Code Quality Standards
- **No `any` types**: Use `unknown` if type truly unknown
- **No type assertions**: Unless absolutely necessary
- **Functional patterns**: Prefer pure functions, immutability
- **Small functions**: Single responsibility principle
- **Self-documenting**: Clear naming over comments

### Testing Strategy
- **Behavior-driven**: Test public APIs, not implementation
- **100% coverage**: Through business behavior, not implementation details
- **Real schemas**: Use actual types, not test-specific ones
- **Factory functions**: For test data with optional overrides

## Technical Constraints

### Performance Requirements
- **LCP < 2.5s**: Largest Contentful Paint
- **CLS < 0.1**: Cumulative Layout Shift
- **FID < 100ms**: First Input Delay
- **Mobile-first**: Optimized for mobile devices

### Accessibility Standards
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines
- **Semantic HTML**: Proper heading structure, landmarks
- **Keyboard navigation**: Full keyboard accessibility
- **Screen reader support**: ARIA labels, alt text

### SEO Requirements
- **Meta tags**: Title, description, Open Graph
- **Structured data**: JSON-LD for band information
- **Sitemap**: XML sitemap for search engines
- **Robots.txt**: Search engine crawling instructions

## Deployment Strategy

### Hosting
- **Vercel**: Recommended for Next.js deployment
- **Static export**: Option for static hosting
- **CDN**: Global content delivery

### Environment Variables
- **Development**: Local environment setup
- **Production**: Secure environment configuration
- **Analytics**: Google Analytics, social media tracking
- **Admin**: `ADMIN_PASSWORD` used to protect `/admin` and sign auth cookie
- **Supabase**:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for public reads)
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### Persistence Notes
- Shows content persists in Supabase `public.shows`. Server uses service role for writes.
- For other content (music), still file-based; can migrate later.

### Monitoring
- **Performance**: Core Web Vitals monitoring
- **Errors**: Error tracking and reporting
- **Analytics**: User behavior and engagement metrics 