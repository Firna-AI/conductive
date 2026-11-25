# Mockup `@` data lacks paths that All files draws

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/object-memory-runner-report-limits-0m1g`, a problem that the round 3 finding checks found outside the scope.
- **Location:** `docs/mockups/src/fixtures/fileMentions.ts:18`.
- **Reason:** The fixture gap is already on `main`, in the complete example that the change did not edit.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/fixtures/fileMentions.ts:18`.
- **Terms:**
  - **`@` data:** The fixture entries that the mockup `@` list of the message box searches.
- **Background:** `docs/protocol/file-mentions.md:37` says that the `@` list reads the tree that All files shows. The mockups keep two hand lists for the complete example: the drawn tree and the `@` data.
- **Problem:** The `@` data lacks `public/checkout-mobile.png`, `public/social-card.png`, and `.context/report.html`. All files draws them when the image tab or the HTML tab is open. So `@report` on the component page finds nothing.
- **Impact if no action:** The catalogue shows an `@` list that misses files that the tree shows.
- **Root question:** How does the complete example keep the `@` data and the drawn tree the same?
- **Options:**
  - **A.** Add the three paths to the `@` data. Effort: Small.
  - **B.** Build the `@` data and the drawn tree from one list of paths, as the large-branch example does in `docs/mockups/src/fixtures/limitedFiles.ts`. Effort: Small.
- **Left out:** A guard that compares the two lists. B removes the second list.
- **Wider fix:** B.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/mockup-mention-states-ignore-no-tree.md` has the same code. No options conflict.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, because the gap is on `main` and is outside the scope of the change that found it.
