# Two registered mockup parts pass the page limit

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-26, from branch `calummoore/loading-when-pending-p2f2`, review round 2.
- **Location:** `docs/mockups/src/entries/components/workspaces/SectionList.mockup.tsx`, `docs/mockups/src/entries/components/chat/ModelPicker.mockup.tsx`.
- **Reason:** Both entries are already on `main`, and the branch does not change them.

- **Terms:**
  - **Registered part:** a shared mockup part with its own catalogue entry, its own page, and saved variants, as `docs/mockups/registered-parts.md` describes.
- **Background:** `docs/mockups/registered-parts.md` says that each registered part has at most five entries: its own page and four variants.
- **Problem:** The Section list entry and the Model picker entry each have their own page and five variants, six entries in all.
- **Impact if no action:** Their catalogue pages show more mockups than the rule allows, and a later part can copy the larger count.
- **Root question:** How do the registered parts stay within the documented page limit?
- **Options:**
  - **A.** Remove one variant from each entry, and move what it showed into the description of a kept page. Effort: Small.
  - **B.** Raise the documented limit in `docs/mockups/registered-parts.md` and `docs/mockups/catalogue.md`. Effort: Small.
  - **C.** Register each part through a helper whose type allows at most four variants, so a fifth variant fails the typecheck. This adds a build error, so it needs the user's approval. Effort: Medium.
- **Left out:** Change nothing: the entries keep breaking the documented rule.
- **Wider fix:** C, a type that cannot hold a fifth variant. It needs the user's approval, because it adds a build error.
- **Previous examples:** Branch `calummoore/loading-when-pending-p2f2` first added two variants to the Workspace mark entry, and review round 2 removed them.
- **Recommendation:** A. It restores the rule without new tooling.
- **Action:** fix after merge, apply A.
