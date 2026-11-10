# Marketing header overflows small phones

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from `calummoore/conductor-feature-parity-list`.
- **Location:** `docs/mockups/src/components/marketing/SiteHeader.tsx`, `docs/mockups/src/components/marketing/SiteHeader.module.css`.
- **Reason:** The shared header already overflows on `origin/main`, and the feature comparison work does not change it.

- **Source:** Implementation.
- **Category:** Mockup.
- **Terms:**
  - **Marketing mockup:** A visual specification of the public site in `docs/mockups/`.
  - **Site header:** The shared wordmark and navigation above each marketing mockup.
- **Background:** The phone header shows the Conductive wordmark, GitHub, and Sign in on one line. Every marketing mockup uses this header. The production site has matching navigation in `src/marketing/components/SiteHeader.astro` and `src/marketing/styles/chrome.css`.
- **Problem:** At a viewport width of 320 pixels, the header extends to 339 pixels. Its navigation and Sign in link cause 19 pixels of horizontal overflow. The same result occurs on the marketing home mockup and the feature comparison mockups. The header fits at 340 pixels.
- **Impact if no action:** A narrow phone can show a clipped Sign in link or a page that scrolls sideways.
- **Root question:** How should all header actions remain visible on a narrow phone?
- **Options:**
  - **A.** Let the shared header wrap its navigation when it does not fit. Keep each current label and link. A narrow page gains a second line. Effort: Small.
  - **B.** Use a compact icon for GitHub on narrow phones, with an accessible name. This keeps one line but removes the visible word. Effort: Small.
  - **C.** Put secondary links in a native disclosure on phones. This saves width but needs another action to open the links. Effort: Medium.
- **Left out:** Change nothing, because it preserves the clipping. Removing a header action fails the goal of keeping every action available there.
- **Wider fix:** A makes the shared layout adapt to its contents on every marketing page.
- **Previous examples:** `plans/follow-ups/composer-bar-layout-test.md` records another narrow layout with overlapping controls.
- **Recommendation:** A. It preserves the current actions and labels without a new menu.
- **Action:** fix after merge, apply A, because the shared header is outside the comparison mockup change.

## Verification

Render the marketing home mockup at 320 and 340 CSS pixels in both colour
schemes. Inspect the root width and the right edge of Sign in. The observed
320-pixel result is a client width of 320 and a scroll width of 339.
Check the matching production header before changing its styles. Keep the
mockup and production layouts aligned when the production header needs
the same correction.
