# Mac pictures show the removed header Archive

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the review of branch `calummoore/sandbox-time-limit-removal`, during the new capture of its start pictures.
- **Location:** `src/marketing/pictures/mac-dark.webp` and `src/marketing/pictures/mac-light.webp`.
- **Reason:** The branch that found the problem changes only the start pictures, and an earlier change made the Mac pictures stale.

- **Terms:**
  - **Marketing picture:** a still capture of a mockup screen that the public site shows. Git keeps each picture as a file under `src/marketing/pictures/`.
  - **Mac pictures:** the two marketing pictures of the Mac app window, `mac-dark.webp` and `mac-light.webp`. Both layouts of the home page share them.
- **Background:**
  - `npm run marketing:pictures` captures every marketing picture again from the current mockups, as `src/marketing/pictures.md` says.
  - Commit `c02744f0`, "fix(workspaces): move Archive to workspace rows (#124)", removed the Archive button from the workspace header. The workspace list now offers Archive on each row.
  - On 10 November 2026, a capture run on top of commit `7c8bcdec` changed both Mac pictures. The new captures have no Archive icon at the right end of the workspace header. The repository name in the header also gets more room.
  - The same run changed `hero-desktop-light.webp` only by rendering noise, as `plans/follow-ups/marketing-pictures-unstable-capture.md` describes. That file needs no new capture.
- **Problem:** The Mac pictures of the public site show an Archive button in the workspace header. The app no longer has that button.
- **Impact if no action:** The home page keeps showing a header control that the app and the Mac app do not have.
- **Root question:** How do the Mac pictures come to show the current workspace header?
- **Options:**
  - **A.** Run `npm run marketing:pictures` on a branch from `main`. Keep the new `mac-dark.webp` and `mac-light.webp`. Restore each other file that changes only by rendering noise. Check both pictures by eye, then commit them. Effort: Small.
- **Left out:** Keep the pictures, because that fails the goal. Edit the pictures by hand, because option A is better on every point, and the next capture overwrites a hand edit. The check that names stale pictures is option B of `plans/follow-ups/marketing-pictures-go-stale.md`. It prevents the class, but it does not fix these two files.
- **Wider fix:** Option B of `plans/follow-ups/marketing-pictures-go-stale.md`. It waits for the user.
- **Previous examples:** The stale sets that `plans/follow-ups/marketing-pictures-go-stale.md` lists.
- **Related:** `plans/follow-ups/marketing-pictures-go-stale.md` covers the same class. Its check would have named these two pictures.
- **Recommendation:** A. It is the only direct fix, and it takes one capture run of about 70 to 100 seconds.
- **Action:** fix after merge, apply A, because an earlier change outside this branch made the pictures stale.
