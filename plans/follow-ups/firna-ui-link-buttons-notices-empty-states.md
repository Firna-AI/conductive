# Shared UI lacks link buttons, notices, empty states

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-05, from `calummoore/conductor-alternative-architecture`, Milestone 1 mockups, implementor item 14.
- **Location:** `docs/mockups/src/components/common/`, and the `futex-ai/ui` repository.
- **Reason:** The parts belong in another repository, `futex-ai/ui`, so this branch keeps local copies until the library ships them.

- **Terms:**
  - **`@firna/ui`:** the user's shared React Native and web component library, published from the `futex-ai/ui` repository.
  - **Mokly catalogue:** the mockups of this repository under `docs/mockups`, rendered with React and `@firna/ui` components.
- **Background:** The mockups of this repository use `@firna/ui` for buttons, badges, status dots, inputs, lists, selectors, loaders, and text styles. The library has no link that looks like a button or a tab, no notice, and no empty state. Its `Button` has no link role. The mockups therefore keep local components for these parts under `docs/mockups/src/components/common/`, and the planned web app will keep them as local app components.
- **Problem:** Every Firna app that needs these parts builds its own copy. The accounting mockups keep notices, tags, and page chrome local for the same reason.
- **Impact if no action:** The copies drift apart in look and in accessibility.
- **Root question:** Where do link buttons, link tabs, notices, and empty states live?
- **Options:**
  - **A.** Keep them as local components in each app. Effort: Small.
  - **B.** Add a link button, link tabs, a notice, and an empty state to `@firna/ui`, then replace the local copies in this repository. Effort: Medium.
- **Left out:** A second UI library, because each app already chose `@firna/ui`.
- **Wider fix:** B.
- **Previous examples:** The accounting mockups keep notices, tags, and page chrome local.
- **Recommendation:** B. One shared version keeps the look and the accessibility the same in every app.
- **Action:** fix after merge, apply B, because the library lives in the `futex-ai/ui` repository and has its own release.
