# The automation page hides a failed repository read

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, a new problem of the check of finding 108 of its second review.
- **Location:** `src/shell/automations/AutomationScreen.tsx:99` and the Repository field of the automation form in `src/shell/automations/AutomationFields.tsx`.
- **Reason:** The case needs a failed first read of the repository list, and the fix rule defers a rare product bug that is not High.

- **Terms:**
  - **Automation page:** the page of one automation, with its form and its Runs list. Its form names the repository of the automation.
  - **Repository list:** the chosen repositories of the org, which the page reads to show the name of each repository.
- **Background:** The page waits while the automation, the repository list, or the sections load. Then it passes `repositories.state === 'ready' ? repositories.value : []` to the form.
- **Problem:** When the first read of the repository list fails, the page shows no load failure. The form gets an empty list, so the Repository field cannot find the name and shows the raw ID of the repository.
- **Impact if no action:** In that rare case, the owner reads an ID in place of the repository name, with no Try again.
- **Root question:** How does the automation page show a failed read of the repository list?
- **Options:**
  - **A.** Show the shared load failure with Try again when the repository list fails before any answer, as the page does for a failed automation read. Effort: Small.
  - **B.** Keep the form, show the repository field as unavailable with Try again, and never show a raw ID. Effort: Small.
- **Left out:** A raw ID as the fallback, because it gives the owner nothing to act on.
- **Wider fix:** None, because the case belongs to one page.
- **Previous examples:** None found.
- **Recommendation:** A. It reuses the load failure that the page already shows for the automation.
- **Action:** fix after merge, apply A, because the case is rare and not High.
