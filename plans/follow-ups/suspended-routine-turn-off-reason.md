# A suspended org hides why a routine turned off

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, an item of the report of its second fix round.
- **Location:** `src/shell/routines/RoutineNote.tsx`, `src/shell/routines/RoutineFrame.tsx`, the mockup note in `docs/mockups/src/screens/routineParts.tsx`, and the entries under `app/orgs/suspended/routines/` in `docs/mockups/`.
- **Reason:** The second and last fix round of the review found it, and it is Low.

- **Terms:**
  - **Routine:** a saved prompt that starts an agent run in a new workspace. A routine turns off after three failed runs in a row, when its owner leaves the org, or when its repository stops being a chosen repository of the org.
  - **Turned-off note:** the note of the routine page that says why the routine turned off, such as "This routine turned off" with the reason.
  - **Suspension notice:** the notice that the routine page of a suspended org shows. An operator suspends an org; its routines start no runs and nothing in it can change.
- **Background:**
  - `docs/protocol/routines.md` says that when a routine turns off, "its page says why". It also says that a suspended org still shows its routine pages, with the org notice and no actions.
  - The routine page frame (`RoutineFrame`) draws the suspension notice above every tab and view. The note of the routine (`RoutineNote`) draws no turned-off note in a suspended org.
- **Problem:** In a suspended org, the page of a routine that turned off shows only the suspension notice. It does not say why the routine turned off.
- **Impact if no action:** When the operator lifts the suspension, the routine stays off, and its members did not learn why while they read it.
- **Root question:** How does the routine page of a suspended org say why a routine turned off?
- **Options:**
  - **A.** Show the turned-off note under the suspension notice, without its action, for the owner and for other members. Draw the state in the mockups first. Add a regression. Effort: Small.
  - **B.** Keep only the suspension notice, and add a protocol sentence that a suspended org shows no turned-off note. It changes a requirement, so it needs the user. Effort: Small.
- **Left out:** A combined notice with both texts, because the suspension notice is shared by every page of a suspended org.
- **Wider fix:** None, because the case belongs to one page.
- **Previous examples:** None found.
- **Recommendation:** A. It meets the existing requirement that the page says why the routine turned off.
- **Action:** fix after merge, apply A, because the two fix rounds of the review are used and the item is Low.
