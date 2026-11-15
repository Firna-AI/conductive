# Mockup temporary tab name has extra space

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from the mockup milestone of the temporary file tabs change on branch `calummoore/oslo-k1ce`.
- **Location:** `docs/mockups/src/components/workspace/TabItem.tsx`, `TabContent`, the hidden span with ", temporary" near line 72.
- **Reason:** Only the mockup catalogue reads this name, and the fix needs a check in a real screen reader or the accessibility tree of Chrome, which the change did not run for the mockups.

- **Source:** Implementation.
- **Category:** Mockup.
- **Terms:**
  - **Temporary tab:** the one file or diff tab of the tab row that the next press on a file replaces. Its title shows in italics.
- **Background:** A screen reader must hear that a tab is temporary, because the italics carry the state only for the eye. The app names the temporary tab with the `aria-label` of its link in `src/files/tabs/FileTabItem.tsx`, which gives "README.md, temporary". The mockup `TabItem` instead adds ", temporary" as visually hidden text in a span after the title span.
- **Problem:** Chrome builds the name of the mockup tab from two inline spans, so it reads "README.md , temporary", with a space before the comma.
- **Impact if no action:** The catalogue gives a name that differs a little from the app, so a reviewer who checks the accessible name of the mockup sees a different text.
- **Root question:** How does the mockup tab give the same accessible name as the app?
- **Options:**
  - **A.** Give the label of the mockup tab an `aria-label` of the title and ", temporary", as the app does, and drop the hidden span. Effort: Small.
  - **B.** Move the hidden text inside the title span, and check the name in Chrome. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. Only this tab adds hidden text to a name.
- **Previous examples:** None found.
- **Recommendation:** A. It uses the same mechanism as the app, so the two names stay equal.
- **Action:** fix after merge, apply A, because only the mockup catalogue reads this name, and the app gives the correct name.
