# About Page — Implementation Tasks

Reference: requirements.md, design.md

## Checklist

1. Content and assets
   - [ ] Confirm hero image path `public/echo_blvd_headshot_full.png` and intrinsic dimensions
   - [ ] Collect portrait images for Jeremy, Tom, Zac, Scott (optimized sizes)
   - [ ] Prepare initial bio copy for each member (multi-paragraph)

2. Data scaffolding
   - [ ] Create `src/app/about/content/members.ts` exporting `MemberMeta[]` and hotspot coords
   - [ ] Ensure bios are stored as sanitized HTML/MDX or structured rich text

3. UI components (server/client split)
   - [ ] `AboutHero` (server): render hero image and `BandDescription`
   - [ ] `Hotspots` (client): render positioned buttons with ARIA labels and open handlers
   - [ ] `BioModal` (client): modal with focus trap, ESC/close, responsive layout
   - [ ] `BandDescription` (server): render approved copy with stylized typography

4. Page integration
   - [ ] Update `src/app/about/page.tsx` to use new components and data
   - [ ] Wire open/close state for modals; ensure deep-link safety (no routing changes needed)

5. Accessibility
   - [ ] Keyboard navigation: tab to hotspots, Enter/Space to open; ESC to close modal
   - [ ] `role="dialog"`, `aria-modal`, labelledby/ describedby; focus trap and return focus on close
   - [ ] Visible focus styles and sufficient color contrast

6. Interaction and visuals
   - [ ] Hover/focus/tap overlay with name + instrument
   - [ ] Subtle motion: fade/scale for overlays and modal (prefers-reduced-motion respected)
   - [ ] Artistic portrait framing/vignette and typography styling per design

7. Performance
   - [ ] Provide width/height for images to prevent CLS; responsive sizes
   - [ ] Lazy-load portraits; prefetch modal content on hotspot focus/hover
   - [ ] Keep client bundle minimal; server components for static copy

8. Tests (TDD)
   - [ ] Write failing tests for hotspots accessibility and modal behavior
   - [ ] Implement to green; add edge cases (ESC, backdrop, focus wrap)
   - [ ] Snapshot/visual tests optional for hotspot positions

9. Content review
   - [ ] Review copy tone and accuracy; ensure no mention of Joe on page (hiatus)
   - [ ] Validate hotspot coordinates visually across breakpoints

10. Documentation
   - [ ] Update Memory Bank `activeContext.md` and `progress.md` upon completion

---

Notes
- No mention of Joe on the About page while on hiatus; tracked only in internal docs.
- Hotspot coordinates are approximate and require visual QA on the actual image.
