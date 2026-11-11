# The routine page hides a failed repository read

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, a new problem of the check of finding 108 of its second review.
- **Location:** `src/shell/routines/RoutineScreen.tsx:99` and the Repository field of the routine form in `src/shell/routines/RoutineFields.tsx`.
- **Reason:** The case needs a failed first read of the repository list, and the fix rule defers a rare product bug that is not High.

- **Terms:**
  - **Routine page:** the page of one routine, with its form and its Runs list. Its form names the repository of the routine.
  - **Repository list:** the chosen repositories of the org, which the page reads to show the name of each repository.
- **Background:** The page waits while the routine, the repository list, or the sections load. Then it passes `repositories.state === 'ready' ? repositories.value : []` to the form.
- **Problem:** When the first read of the repository list fails, the page shows no load failure. The form gets an empty list, so the Repository field cannot find the name and shows the raw ID of the repository.
- **Impact if no action:** In that rare case, the owner reads an ID in place of the repository name, with no Try again.
- **Root question:** How does the routine page show a failed read of the repository list?
- **Options:**
  - **A.** Show the shared load failure with Try again when the repository list fails before any answer, as the page does for a failed routine read. Effort: Small.
  - **B.** Keep the form, show the repository field as unavailable with Try again, and never show a raw ID. Effort: Small.
- **Left out:** A raw ID as the fallback, because it gives the owner nothing to act on.
- **Wider fix:** None, because the case belongs to one page.
- **Previous examples:** None found.
- **Recommendation:** A. It reuses the load failure that the page already shows for the routine.
- **Action:** fix after merge, apply A, because the case is rare and not High.
