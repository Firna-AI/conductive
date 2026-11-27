# The build card ignores refresh builds

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-27, from branch `calummoore/failed-message-action-kssx`, round 1 check of review finding 5.
- **Location:** `src/app/latest-build.ts:7`, `src/members/BuildCard.tsx:118`
- **Reason:** the problem is on `origin/main` since PR #692, outside the disk hold change.

- **Terms:**
  - **Refresh:** an automatic rebuild of the org image after a push to the default branch, or once a day.
  - **Free storage:** the space that a good build leaves for new workspaces, such as "31.2 GB free of 68.5 GB".
- **Background:** Each good build and each refresh measures and saves its free storage. The admin build card and the member build card show the newest row of kind `build` only.
- **Problem:** After a refresh, new workspaces start from the refreshed image, but the cards still show the figure of the last full build.
- **Impact if no action:** The card can show more or less room than new workspaces really get, until the next full build.
- **Root question:** Which build's figure should the card show for the image that new workspaces start from?
- **Options:**
  - **A.** Show the figure of the newest good build or refresh, the image that new workspaces start from. Effort: Small.
  - **B.** Keep the full build's figure, and add the refresh's figure as a second line. Effort: Medium.
- **Left out:** None.
- **Wider fix:** None.
- **Previous examples:** None found.
- **Recommendation:** A, because the card exists to show the room of the current image.
- **Action:** ask the user, because the card text and its rule in `docs/protocol/org-image.md` change.
