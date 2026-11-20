# New workspace Capabilities mockup has six views

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-21, from branch `calummoore/mac-permission-issue-o7fv`, the second merge of `main`.
- **Location:** `docs/mockups/src/entries/app/new-workspace/capabilities/index.mockup.tsx`, `docs/mockups/catalogue.md`.
- **Reason:** The six views come from two changes that merged at once, and moving them changes the catalogue layout beyond the merge.

- **Background:** The mockup catalogue in `docs/mockups/` is the visual spec. `catalogue.md` says that a folder page shows at most five screens. The New workspace Capabilities page has the open control and five variants: `mac-access-on` (Mac access line), and the menu, `search`, and `info` variants of the secret search.
- **Problem:** The page shows six views. No check enforces the rule.
- **Impact if no action:** The page breaks the catalogue rule.
- **Root question:** How does the catalogue show all six views with five screens or fewer on each page?
- **Options:**
  - **A.** Keep the six views on one page. Effort: Small.
  - **B.** Move each variant to a child page with the same slug, as `mac-app/capabilities` does. Each path stays the same, so `docs/mockups/src/paths.ts` does not change. Effort: Medium.
  - **C.** Move one or two variants to a separate page beside it. Their paths change, so `paths.ts` and the docs change too. Effort: Medium.
- **Left out:** Removing a variant, because each view draws a feature.
- **Wider fix:** None. A check that counts views would be a new gate, which needs the user.
- **Previous examples:** `mac-app/capabilities` holds its views as child pages for the same rule.
- **Recommendation:** B. It keeps every path.
- **Action:** fix after merge, apply B.
