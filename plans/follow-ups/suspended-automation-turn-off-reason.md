# A suspended org hides why an automation turned off

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/routines-feature-brainstorm`, an item of the report of its second fix round.
- **Location:** `src/shell/automations/AutomationNote.tsx`, `src/shell/automations/AutomationFrame.tsx`, the mockup note in `docs/mockups/src/screens/automationParts.tsx`, and the entries under `app/orgs/suspended/automations/` in `docs/mockups/`.
- **Reason:** The second and last fix round of the review found it, and it is Low.

- **Terms:**
  - **Automation:** a saved prompt that starts an agent run in a new workspace. An automation turns off after three failed runs in a row, when its owner leaves the org, or when its repository stops being a chosen repository of the org.
  - **Turned-off note:** the note of the automation page that says why the automation turned off, such as "This automation turned off" with the reason.
  - **Suspension notice:** the notice that the automation page of a suspended org shows. An operator suspends an org; its automations start no runs and nothing in it can change.
- **Background:**
  - `docs/protocol/automations.md` says that when an automation turns off, "its page says why". It also says that a suspended org still shows its automation pages, with the org notice and no actions.
  - The automation page frame (`AutomationFrame`) draws the suspension notice above every tab and view. The note of the automation (`AutomationNote`) draws no turned-off note in a suspended org.
- **Problem:** In a suspended org, the page of an automation that turned off shows only the suspension notice. It does not say why the automation turned off.
- **Impact if no action:** When the operator lifts the suspension, the automation stays off, and its members did not learn why while they read it.
- **Root question:** How does the automation page of a suspended org say why an automation turned off?
- **Options:**
  - **A.** Show the turned-off note under the suspension notice, without its action, for the owner and for other members. Draw the state in the mockups first. Add a regression. Effort: Small.
  - **B.** Keep only the suspension notice, and add a protocol sentence that a suspended org shows no turned-off note. It changes a requirement, so it needs the user. Effort: Small.
- **Left out:** A combined notice with both texts, because the suspension notice is shared by every page of a suspended org.
- **Wider fix:** None, because the case belongs to one page.
- **Previous examples:** None found.
- **Recommendation:** A. It meets the existing requirement that the page says why the automation turned off.
- **Action:** fix after merge, apply A, because the two fix rounds of the review are used and the item is Low.
