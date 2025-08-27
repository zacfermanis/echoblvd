# About Page — Design

## Overview
Design a stylized About page that showcases the band via a responsive hero image (`echo_blvd_headshot_full.png`) paired with an evocative description and interactive hotspots for member bios. The interaction must be accessible (keyboard/touch/ARIA) and performant.

## Information Architecture
- Hero
  - Full-width responsive image (`echo_blvd_headshot_full.png`)
  - Band description (rich copy)
- Interactive Hotspots (overlayed on hero)
  - Jeremy (Bass)
  - Tom (Lead Guitar)
  - Zac (Vocals, Rhythm Guitar, Keyboard)
  - Scott (Drums)
- Bio Modal/Panel (one per member)
  - Name + role
  - Portrait image
  - Multi-paragraph bio copy
  - Close action

## UI/UX
- Visual Style
  - High-contrast, editorial typography (display + body pairing)
  - Subtle motion (fade/scale) on hotspot hover/focus and modal open
  - Artistic framing around portrait images (borders, grain/noise overlays, or soft vignette)
- Layout
  - Hero occupies above-the-fold; description nearby (stacked on mobile)
  - Hotspot placements mapped to face coordinates (see Hotspot Mapping)
  - Modal centered on desktop; full-screen sheet on mobile
- Accessibility
  - Hotspots are buttons with ARIA labels, visible focus rings
  - Modal uses `role="dialog"`, `aria-modal="true"`, labelled by member name
  - Focus trap within modal, ESC closes, backdrop click optional
  - Tap-first interactions on mobile (no hover requirement)

## Hotspot Mapping
Use a percent-based overlay system positioned relative to the rendered hero image to avoid layout drift across breakpoints. Example approximate positions (to be adjusted visually during implementation):
- Jeremy: left region (~18% x, 42% y, radius 7%)
- Tom: left-center (~38% x, 40% y, radius 7%)
- Zac: right-center (~60% x, 39% y, radius 7%)
- Scott: right region (~80% x, 41% y, radius 7%)

Implementation approach:
- Wrap hero in a relatively positioned container
- Place absolutely positioned hotspot buttons using percentage `top/left` and `transform: translate(-50%, -50%)`
- Use CSS variables or a config object for coordinates per breakpoint if needed

## Component Architecture
- `AboutPage` (server)
  - Loads static copy and image meta
  - Renders `AboutHero` and `MemberBios` provider shell
- `AboutHero` (server)
  - Renders Next Image for `echo_blvd_headshot_full.png`
  - Renders `Hotspots` (client) with coordinates
  - Renders `BandDescription` (server)
- `Hotspots` (client)
  - Receives coordinates and member metadata
  - Handles hover/focus/tap interactions
  - Emits `openBio(memberId)`
- `BioModal` (client)
  - Receives `memberId` and content
  - Focus trap, keyboard handlers, ARIA attributes
- `BandDescription` (server)
  - Renders approved copy with stylized typography

State management:
- Local state within client components; minimal global state
- Optional context provider to share `openBio` across components

## Data Model
```ts
export type MemberId = "jeremy" | "tom" | "zac" | "scott";

export type MemberMeta = {
  id: MemberId;
  name: string;
  role: string;
  portraitSrc: string;
  bioHtml: string; // sanitized/pre-rendered
};

export type Hotspot = {
  memberId: MemberId;
  xPercent: number; // 0..100
  yPercent: number; // 0..100
  radiusPercent: number; // hit area size
  ariaLabel: string;
};
```

Content source:
- Static TS/MDX for bios initially (no CMS)
- Portraits in `public/` or `app/(assets)` with Next Image

## Error Handling
- If bio fails to load, show a graceful error state in modal with retry
- Ensure modal close action always works (even on error)

## Performance
- Provide intrinsic sizes for hero and portraits to prevent CLS
- Lazy-load portraits; prefetch modal content on first hotspot focus/hover
- Minimize client bundle: keep server components for static copy; isolate interactivity

## Testing Strategy
- Component tests: hotspots are focusable, open correct bios, close on ESC/click
- Accessibility tests: ARIA roles/labels present, focus trap works
- Visual regression (optional): hotspot positions within tolerance

## Diagram
```mermaid
flowchart TD
  A[AboutPage (server)] --> B[AboutHero (server)]
  B --> C[BandDescription (server)]
  B --> D[Hotspots (client)]
  D --> E[BioModal (client)]
```

## Open Questions
- Final hotspot coordinates after visual QA
- Portrait image filenames and dimensions
- Degree of animation allowed without impacting LCP/CLS
