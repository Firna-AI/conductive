# Marketing header overflows small phones

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from `calummoore/conductor-feature-parity-list`. Updated 2026-11-09, from `calummoore/conductive-logo-size`, when the site lockup became 30 px high. Updated 2026-11-10 after the user asked for an intermediate size and the lockup became 25 px high.
- **Location:** `docs/mockups/src/components/marketing/SiteHeader.tsx`, `docs/mockups/src/components/marketing/SiteHeader.module.css`, `src/marketing/styles/chrome.css`.
- **Reason:** The site and its mockup now fit a narrow phone in different ways, and the choice between a smaller lockup and a second line is a design trade-off for the user.

- **Source:** Implementation.
- **Category:** Mockup.
- **Terms:**
  - **Marketing mockup:** A visual specification of the public site in `docs/mockups/`.
  - **Site header:** The shared lockup and navigation above each marketing page and each marketing mockup.
  - **Lockup:** The brand tile and the name "Conductive" in one image. Its height is the `lockupHeight` token in `docs/mockups/src/design/metrics.ts`, 25 px.
- **Background:**
  - The phone header shows the lockup, GitHub, and Sign in on one line. Every marketing mockup uses this header.
  - The production site has matching navigation in `src/marketing/components/SiteHeader.astro` and `src/marketing/styles/chrome.css`.
  - On 2026-11-09 the site lockup grew from 20 px to 30 px high, as in the mockups. A plain 30 px lockup wrapped "Sign in" onto two lines at 360 px and cut it off at 320 px.
  - So the site header keeps its links at full size, and the site lockup shrinks to the space beside them. The rules are `flex-shrink: 0` on `.header-nav`, and `min-width: 0`, `max-width: 100%`, and `object-fit: contain` on the lockup. With the 30 px token, Chrome measured 30 px from 375 px up, about 29 px at 360 px, and about 21 px at 320 px. The earlier recorded mockup width was 339 px at a 320 px viewport, with no overflow at 340 px.
  - On 2026-11-10 the user asked for a size between the original 20 px and the proposed 30 px. The agent chose the midpoint, 25 px. Chrome measured the site lockup at 25 px from 360 px up and about 21 px at 320 px. No checked site page scrolls sideways from 320 px up.
  - Each header is at least twice the lockup height, so that the lockup keeps the clear space of half a tile above and below. With the 25 px token, the phone header is 56 px high, and the desktop header 64 px.
- **Problem:** The mockup lockup does not shrink. With the 25 px token at a viewport width of 320 pixels, the mockup header extends to 328 pixels. Its navigation and Sign in link cause 8 pixels of horizontal overflow. The same result occurs on the marketing home mockup and the feature comparison mockup in both colour schemes. Both fit at 360 pixels. Below about 340 px, the site and its visual spec draw the header in different ways.
- **Impact if no action:** The visual spec shows a clipped Sign in link or a page that scrolls sideways on a narrow phone. A later change to either header can follow the wrong side.
- **Root question:** How should the header keep its lockup and all its actions on a narrow phone, on the site and in its mockup?
- **Options:**
  - **A.** Let the shared header wrap its navigation when it does not fit, on the site and in the mockup. Keep each label and the 25 px lockup. A narrow page gains a second line, so the fixed header heights become minimum heights, and the site drops its shrinking lockup. Effort: Small.
  - **B.** Use a compact icon for GitHub on narrow phones, with an accessible name. This keeps one line and the 25 px lockup, but removes the visible word. The width at which the icon replaces the word depends on the text of the links. Effort: Small.
  - **C.** Put secondary links in a native disclosure on phones. This saves width but needs another action to open the links. Effort: Medium.
  - **D.** Make the mockup lockup shrink to the space beside the links, as the site lockup does. Keep each label and one line. The lockup is smaller than 25 px only when the links leave it less room, which on the site is below about 340 px. Effort: Small.
- **Left out:** Change nothing, because it keeps the overflow of the visual spec and the difference from the site. Removing a header action fails the goal of keeping every action available there.
- **Wider fix:** D, or A. Each makes one shared layout adapt to its contents on every marketing page and in the mockups.
- **Previous examples:** `plans/follow-ups/composer-bar-layout-test.md` records another narrow layout with overlapping controls.
- **Recommendation:** D. It keeps one line and every label, it matches the site, and it needs one rule set in the mockup header. A best keeps the full lockup size, at the cost of a second line on narrow phones.
- **Action:** ask the user, because D and A have real trade-offs: D keeps one line with a smaller lockup on narrow phones, and A keeps the full lockup with a second line. The choice also says which side of the difference between the site and its mockup is right.

## Verification

Render the marketing home mockup and the site home page at 320, 360,
375, and 390 CSS pixels in both colour schemes. Inspect the root width,
the right edge of Sign in, and the height of the lockup. The observed
320-pixel result of the mockup with the 25 px token is a client width of
320 and a scroll width of 328. The site keeps a scroll width of 320.
Keep the mockup and production layouts aligned.
