# Technical Context: Echo Blvd Band Website

## Development Guide Reference
- This project follows the principles in `.memory-bank/developmentGuide.md`.
- Key mandates: TDD is non-negotiable, behavior-driven tests, TypeScript strict mode, functional patterns.

## Technology Stack

### Core Framework
- **Next.js 15.4.2**: App Router for modern React development
- **TypeScript**: Strict mode for type safety
- **React 19**: Latest React features and patterns

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **Mobile-first**: Responsive design approach
- **Custom components**: Reusable UI components

### Development Tools
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting
- **Jest**: Testing framework (TDD approach)
- **React Testing Library**: Component testing
- **Turbopack**: Next dev/build acceleration

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
├── memory-bank/          # Historical documentation (source)
├── .memory-bank/         # Active memory bank (this folder)
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
1. Red: Write failing test for desired behavior
2. Green: Write minimal code to pass test
3. Refactor: Improve code while keeping tests green

### Code Quality Standards
- No `any` types; use `unknown` only when truly unknown
- Avoid type assertions; justify when necessary
- Prefer pure functions and immutability
- Small, focused functions and components

### Testing Strategy
- Behavior-driven tests using public APIs
- 100% coverage via business behavior
- Real schemas/types in tests where applicable
- Factory functions for test data

## Technical Constraints

### Performance Requirements
- LCP < 2.5s
- CLS < 0.1
- FID < 100ms
- Mobile-first experience

### Accessibility Standards
- WCAG 2.1 AA
- Semantic HTML with proper landmarks
- Keyboard navigation support
- Screen reader support (ARIA, alt text)

### SEO Requirements
- Meta tags: title, description, Open Graph
- Structured data: JSON-LD for band information
- Sitemap and robots.txt

## Deployment Strategy

### Hosting
- **Vercel** recommended for Next.js
- Static export acceptable for simple hosting
- CDN-backed global delivery

### Environment Variables
- Separate dev and prod configs
- Secure secret management in production
- Optional analytics integrations

### Monitoring
- Core Web Vitals monitoring
- Error tracking and reporting
- Analytics for engagement metrics

