# About Page Feature — Requirements (EARS)

## Summary
Create a highly artistic and stylized About page featuring a hero with the band's horizontal photo `echo_blvd_headshot_full.png` and a rich band description, plus interactive member hotspots over the photo that open individual bios (with separate portraits and multi-paragraph copy).

## Scope
- New About page content/UX and interactive bios
- Accessibility and mobile/desktop parity for interactions
- Image asset handling and performance considerations

## Assumptions
- “Horizontal picture” refers to the band’s wide group photo (four members visible: Jeremy, Tom, Zac, Scott)
- The hero image asset filename is `echo_blvd_headshot_full.png`
- Interactions should be accessible (keyboard/touch/ARIA) and performant
- Joe is currently on hiatus, is not shown in the hero image, shall not have a hotspot, and shall NOT be mentioned anywhere on the About page. His status is tracked only in internal project docs (Memory Bank/Specs).

## Out of Scope (for this feature)
- CMS integration for managing bios/content
- Non-essential animations that significantly affect performance
- Press-kit page or media downloads

---

## EARS Requirements

1) Hero image and band description
- WHEN a visitor opens the About page THEN the system SHALL display a full-width hero section containing the horizontal band photo `echo_blvd_headshot_full.png` and a prominent band description directly beneath or adjacent to it.
- WHEN the About page renders THEN the system SHALL ensure the hero image is responsive, optimized, and preserves focal points across screen sizes.
- WHEN the band description is displayed THEN the system SHALL use an artistic, readable typographic treatment that matches site branding.

Acceptance Criteria
- Hero image loads within performance budget, uses appropriate dimensions and lazy loading where applicable
- Description appears above the fold on desktop and mobile
- Text passes contrast and legibility checks

2) Interactive member hotspots over hero image
- WHEN a user hovers (desktop) or taps (mobile) on a member’s face region in the hero image THEN the system SHALL reveal a visible overlay with the member’s name and instrument and provide a clear affordance to open the bio.
- WHEN a user clicks/activates a member overlay THEN the system SHALL open that member’s bio in a modal or stylized panel.
- WHEN focus is moved via keyboard to a hotspot THEN the system SHALL show the same overlay and allow activation with Enter/Space.

Acceptance Criteria
- Hotspots available for: Jeremy (Bass), Tom (Lead Guitar), Zac (Vocals, Rhythm Guitar, Keyboard), Scott (Drums)
- Hotspots are keyboard-focusable and screen-reader identifiable (ARIA labels)
- Hover/tap overlays include name + instrument and a consistent visual style
- Mobile tap toggles overlay and opens bio without requiring hover

3) Member bios
- WHEN a member bio is opened THEN the system SHALL display: member name, role, separate portrait image, and a few multi-paragraph sections of copy.
- WHEN a member bio is open THEN the system SHALL provide a clear close action and trap focus (if modal) until closed.
- WHEN a screen reader user navigates the bio THEN the system SHALL present headings and content in a logical structure.

Acceptance Criteria
- Portrait image optimized and responsive
- Stylized, artistic presentation (typography, spacing, subtle motion) without harming accessibility
- ESC closes modal (desktop), backdrop click optional, explicit close button always available

4) Hiatus member handling (Joe Waddel)
- WHEN the About page is viewed THEN the system SHALL NOT include any mention of Joe Waddel on the page while he is on hiatus.
- WHEN rendering hotspots THEN the system SHALL NOT render a hotspot for Joe.
- WHEN documenting lineup internally THEN the system SHALL track Joe’s hiatus status only in Memory Bank/Specs (not user-facing).

Acceptance Criteria
- No mention of Joe anywhere on the About page
- No hero hotspot for Joe

5) Accessibility
- WHEN interacting with hotspots and bios THEN the system SHALL meet WCAG 2.1 AA guidance for focus, semantics, and contrast.
- WHEN viewing on mobile THEN the system SHALL provide tap-first interactions with adequate target sizes (≥44x44px).

Acceptance Criteria
- Keyboard-only navigation fully supports opening/closing bios
- Screen-reader labels on hotspots and modal headings
- Sufficient color contrast and focus styles

6) Performance
- WHEN the About page loads THEN the system SHALL keep LCP under target by loading appropriately sized images and deferring non-critical scripts.
- WHEN images are loaded THEN the system SHALL use modern formats where possible and provide width/height to prevent layout shift.

Acceptance Criteria
- CLS targets maintained by reserving image space
- No excessive blocking scripts or reflows from interaction

---

## Proposed Band Description (Initial Copy — editable)
Echo Blvd is a five-piece rock band with classic swagger and alt-rock grit. Boston’s Zac Fermanis fronts local vets Tom Kuhn, Jeremy Buenviaje, and Scott Little. From club to party, they bring tight grooves, raw vocals, and serious energy.

Expanding that spirit, Echo Blvd blends the urgency of 90s alternative with the polish of modern rock—anthemic hooks, wide-screen guitars, and rhythms that refuse to sit still. Onstage they trade in catharsis: honest lyrics, sweat-soaked sets, and a crew-wide chemistry that turns rooms electric. Whether it’s a headline night in a city club or a backyard blowout, the band shows up to move hearts and bodies in equal measure.



---

## Content Inventory
- Hero: `echo_blvd_headshot_full.png` horizontal group photo (4 members visible)
- Member portraits: Jeremy, Tom, Zac, Scott (separate images)
- Copy blocks: page intro, 4 member bios

## Accessibility Checklist (High-level)
- Focusable hotspot controls with visible focus ring
- ARIA labels: "Open bio for {Name}, {Instrument}"
- Modal semantics: role="dialog" with labelledby/ describedby
- Escape to close; background scroll lock when open

## Mobile/Responsive Considerations
- Tap-first hotspot behavior; larger tap targets
- Stacked layout for description and hero when needed
- Portrait images sized for small screens, lazy-loaded

## Analytics/Telemetry (Optional)
- Track bio open events by member name (non-PII) to measure engagement

---

## Acceptance Gate
- Requirements validated by stakeholder review
- Placeholder assets identified and paths planned
- Accessibility and performance criteria acknowledged
