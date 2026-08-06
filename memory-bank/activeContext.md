# Active Context: Echo Blvd Band Website

## Current Work Focus
**Trailblazer scrape API for external consumer site - COMPLETED**
- ✅ Secret-protected `POST /api/trailblazer/scrape`
- ✅ Full Playwright scrape pipeline (hydrate, Show More, network/DOM/MHTML badges)
- ✅ Hybrid browser launch: remote WS → `@sparticuz/chromium` on Vercel → local fallbacks

**Phase 3: Content Implementation - IN PROGRESS**
- ✅ Music showcase page (with YouTube video embed)
- 🔄 Shows/tour dates page (now driven by Supabase)
- 🔄 About band page
- ✅ Contact page with form

## Recent Changes
- ✅ **ADDED: Trailblazer scrape API** at `/api/trailblazer/scrape` with Bearer auth, CORS allowlist, and full structured-badge scrape pipeline under `src/lib/trailblazer/`
- ✅ **ADDED: Dependencies** `playwright-core` + `@sparticuz/chromium`; `serverExternalPackages` in Next config
- ✅ Created Memory Bank structure with core documentation files
- ✅ Defined project requirements and technical specifications
- ✅ Established development patterns and TDD workflow
- ✅ Initialized Next.js 15.4.2 with App Router
- ✅ Configured TypeScript strict mode and Tailwind CSS
- ✅ Set up Jest testing framework with React Testing Library
- ✅ Created project directory structure and basic components
- ✅ Implemented responsive navigation and hero section
- ✅ Created placeholder pages for all routes (music, shows, about, contact)
- ✅ Added sample band content and type definitions
- ✅ Updated social media links to actual Echo Blvd profiles
- ✅ Refined band description to reflect rock music focus
- ✅ Integrated Echo Blvd logo and banner from public folder
- ✅ Updated hero section to use official logo only
- ✅ Updated navigation to use horizontal banner instead of logo
- ✅ Updated tests to reflect new banner-based navigation structure
- ✅ **FIXED: Music page video issues by replacing large MP4 file with YouTube embed**
- ✅ **UPDATED: Music page with correct Echo Blvd video (Lh-VdQjkhBo)**
- ✅ **ENHANCED: Music page with track cards and social media section**
- ✅ **REMOVED: Large video file and Git LFS configuration**
- ✅ **UPDATED: Tests to work with new YouTube iframe structure**
- ✅ **ADDED: Second YouTube video (Times Like These - Foo Fighters cover) to music page**
- ✅ **UPDATED: Interstate Love Song video title to reflect Stone Temple Pilots cover**
- ✅ **REMOVED: All Spotify references and streaming links from music page**
- ✅ **MIGRATED: Custom SVG loader from Webpack to Turbopack config (now using Turbopack for dev/build)**
- ✅ **IMPLEMENTED: Contact page with functional form, email API route, and comprehensive tests**
- ✅ **FIXED: Contact form 500 error with development mode fallback and better error handling**
- ✅ **STANDARDIZED: Social media links across all pages to match main page URLs**
- ✅ **REMOVED: Down arrow from hero section (no functionality)**
- ✅ **ADDED: Third YouTube video (Shimmer - Fuel cover) to music page with proper embed and fallback links**
- ✅ **UPDATED: Music page tests to include all three videos and current content structure**
- ✅ **FIXED: Missing @testing-library/dom dependency causing test failures**
- ✅ **SIMPLIFIED: Next.js config by removing Turbopack-specific SVG loader that was causing build issues**
- ✅ **REORDERED: Music page videos to show most recent first (Shimmer → Interstate Love Song → Times Like These)**
- ✅ **UPDATED: Latest tracks section to feature Shimmer as first track and removed "Coming Soon" tile**
- ✅ **REPLACED: "Streaming links coming soon" with actual YouTube links in track cards**
- ✅ **ADDED: Admin dashboard at `/admin` protected by `ADMIN_PASSWORD`**
- ✅ **IMPLEMENTED: Admin login/logout API with signed, HTTP-only cookie**
- ✅ **MIGRATED: Shows CRUD/API to Supabase (`public.shows`)**
- ✅ **UPDATED: Shows page to load from Supabase via `getUpcomingShows`**
- ✅ **ADDED: Keep-alive API route with optional token gate and Vercel daily cron**

## Next Steps
1. **Trailblazer scrape API ops**
   - Set `TRAILBLAZER_SCRAPE_API_KEY` (and preferably `PLAYWRIGHT_WS_ENDPOINT`) in Vercel
   - Optionally set `TRAILBLAZER_SCRAPE_CORS_ORIGINS` for the consumer site origin
   - Confirm Vercel plan allows `maxDuration = 60` for this route
2. **Phase 3: Complete Content Implementation**
   - Expand shows styling (sold out badges, past shows archive)
   - Build about page with band member information
   - ✅ Contact page with form functionality (COMPLETED)

2. **Phase 4: Interactive Features**
   - Add music player component for additional tracks
   - Implement newsletter signup
   - Create social media integration
   - Add image gallery for band photos

3. **Phase 5: Content Management**
   - Add more sample content (tracks, albums, shows)
   - Implement content loading utilities
   - Create reusable UI components
   - Add SEO optimization

## Active Decisions and Considerations

### Technical Decisions Made
- **Next.js 14+ with App Router**: Modern React framework with excellent performance
- **TypeScript strict mode**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first styling for rapid development
- **Server Components by default**: Better performance, use client only when needed
- **TDD workflow**: Test-driven development for all features
- **YouTube embeds for video**: Replaced large MP4 files to avoid deployment issues
- **Development mode email fallback**: Contact form logs data in development when email config is missing

### Design Considerations
- **Mobile-first approach**: Responsive design starting from mobile
- **Band aesthetic**: Design should reflect Echo Blvd's musical style
- **Performance focus**: Fast loading times for music content
- **Accessibility**: WCAG 2.1 AA compliance
- **Video optimization**: Use YouTube embeds instead of self-hosted large files
- **Consistent branding**: All social media links use the same URLs across all pages

### Content Strategy
- **Static content**: Markdown files for band information
- **Dynamic data**: Supabase tables for shows (admin-editable), JSON for music (for now)
- **SEO optimization**: Meta tags, structured data, sitemap
- **Image optimization**: WebP format, lazy loading
- **Video content**: YouTube embeds for better performance and reliability

## Important Patterns and Preferences

### Development Patterns
- **TDD is non-negotiable**: Every feature starts with a failing test
- **Functional programming**: Pure functions, immutability, composition
- **Small, focused components**: Single responsibility principle
- **Self-documenting code**: Clear naming over comments
- **Options objects**: For function parameters with multiple options

### Code Quality Standards
- **No `any` types**: Use `unknown` if type truly unknown
- **No type assertions**: Unless absolutely necessary
- **Behavior-driven testing**: Test public APIs, not implementation
- **100% coverage**: Through business behavior, not implementation details

### Project Organization
- **Feature-based structure**: Organize by feature, not file type
- **Shared components**: Reusable UI components in components/ui
- **Type definitions**: Centralized in types directory
- **Utility functions**: Pure functions in lib directory

## Learnings and Project Insights

### Key Insights
- **Memory Bank approach**: Essential for maintaining context across sessions
- **TDD workflow**: Ensures all code is driven by business requirements
- **Performance-first**: Server Components provide better performance by default
- **Accessibility from start**: Easier to build in than retrofit
- **Video hosting**: YouTube embeds are more reliable than self-hosted large files
- **Development environment handling**: Graceful fallbacks for missing configuration improve developer experience

### Potential Challenges
- **Content management**: Need to establish content workflow early
- **Audio integration**: Music player components will need client-side functionality
- **Image optimization**: Band photos and album art need proper optimization
- **SEO implementation**: Structured data for band information

### Success Factors
- **Clear project structure**: Well-organized codebase for maintainability
- **Performance optimization**: Fast loading times for better user experience
- **Mobile responsiveness**: Majority of users will access on mobile devices
- **SEO optimization**: Important for band discovery and fan acquisition
- **Reliable video delivery**: YouTube embeds ensure consistent playback

## Current Status
- **Phase**: Content implementation (Phase 3)
- **Progress**: Music page complete, Contact page complete, Admin dashboard added for shows management
- **Next milestone**: About page, refine shows UX, persistence strategy for production
- **Blockers**: None currently identified

## Immediate Actions Required
1. Create about page with band information
2. Style shows list; add past shows archive
3. Consider migrating additional content (music) into Supabase