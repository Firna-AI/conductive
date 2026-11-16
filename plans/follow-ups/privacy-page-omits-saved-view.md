# The Privacy page omits the saved view

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from Milestone 2 of the split panes change on branch `calummoore/porto-r3jl`.
- **Location:** `src/marketing/privacy-uses.ts:86-88`, the item "Your orgs", and `src/marketing/privacy-uses.ts:178-179`, the item "Panel sizes".
- **Reason:** The gap is already on `main`, and the legal pages change often there, so one branch that only fixes the legal text conflicts least.

- **Source:** Review.
- **Category:** Docs or spec.
- **Terms:**
  - **Saved view:** the open tabs in their order, the shown tab, the file list, and the tool of one member in one workspace. The Worker stores it for each member.
- **Background:**
  - The Privacy page lists what the service keeps. "Your orgs" lists orgs, members, roles, invites, sections, repositories, workspaces, automations, scripts, and settings. "Panel sizes" says that the browser keeps the sizes of the panels.
  - The Worker also keeps the saved view of each member in each workspace. The split panes change adds the panes and the focused pane to it.
  - The order of the org rail and the last choices of the New workspace dialog may be in the same position. Check each against the Worker before you name it.
- **Problem:** No sentence of the Privacy page says that the server keeps the open tabs and the layout of each member.
- **Impact if no action:** The Privacy page is incomplete about what the service keeps.
- **Root question:** How does the Privacy page name each piece of view state that the server keeps for a member?
- **Options:**
  - **A.** Name the saved view, with its panes, when the split panes change ships. Effort: Small.
  - **B.** Add one item now: the server keeps the open tabs, their order and panes, and the shown tab of each member in each workspace. Update the effective date. Effort: Small.
  - **C.** Do B. Also name each other piece of view state that the Worker keeps for a member, such as the order of the org rail. Effort: Small.
- **Left out:** None.
- **Wider fix:** C. It closes the gap for every piece of view state at once.
- **Previous examples:** "Panel sizes" and "Last workspaces" name the view state that stays in the browser.
- **Recommendation:** C. One change makes the page complete about view state.
- **Action:** fix after merge, apply C, because the gap is on `main` too, and a legal-page change on its own branch conflicts least.
