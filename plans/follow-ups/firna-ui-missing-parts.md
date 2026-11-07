# Shared UI lacks parts that the app needs

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-05, from `calummoore/conductor-alternative-architecture`: Milestone 1 mockups, implementor item 14, Milestone 1a restyle, implementor item 4, and Milestone 1b redraw, implementor item 4.
- **Location:** `docs/mockups/src/components/common/`, `docs/mockups/src/design/metrics.ts`, and the `futex-ai/ui` repository.
- **Reason:** The parts belong in another repository, `futex-ai/ui`, so this branch keeps local versions until the library ships them.

- **Terms:**
  - **`@firna/ui`:** the user's shared React Native and web component library, published from the `futex-ai/ui` repository.
  - **Graphite:** the design of this app, which the user chose on 5 November 2026. It is dense: 26 px controls and rows, and 13 px body text.
- **Background:** The mockups of this repository use `@firna/ui` for buttons, inputs, selectors, radio cards, and spinners. The library lacks these parts:
  - a link that looks like a button, and link tabs
  - a notice and an empty state
  - a dense size: its smallest button is 30 px high, with a bold label
  - a small type scale: its body text is 15 px
  - dense list rows
  - a dense menu that can be drawn open without a script, and a menu sheet for phones
  - control sizes that grow to 44 px touch targets on phones
  - a resize handle for side panels
  The mockups therefore keep local versions under `docs/mockups/src/components/common/`, and token CSS in `docs/mockups/src/design/`. The planned web app keeps them as local app components.
- **Problem:** Every Firna app that needs these parts builds its own copy. The accounting mockups keep notices, tags, and page chrome local for the same reason.
- **Impact if no action:** The copies drift apart in look and in accessibility.
- **Root question:** Where do the parts that `@firna/ui` lacks live?
- **Options:**
  - **A.** Keep them as local components and token CSS in each app. Effort: Small.
  - **B.** Add link buttons, link tabs, a notice, an empty state, an extra-small size, a small type scale, dense rows, a dense menu and a phone menu sheet, touch sizes, and a resize handle to `@firna/ui`. Then replace the local versions in this repository. Effort: Medium.
- **Left out:** A second UI library, because each app already chose `@firna/ui`.
- **Wider fix:** B.
- **Previous examples:** The accounting mockups keep notices, tags, and page chrome local.
- **Recommendation:** B. One shared version keeps the look and the accessibility the same in every app.
- **Action:** fix after merge, apply B, as the user chose on 8 November 2026 (decision 119): A now, and B in parallel. A workspace on `futex-ai/ui` adds the parts and publishes them, and Milestone 15n replaces the local copies.
