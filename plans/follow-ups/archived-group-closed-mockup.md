# Mockups never draw the closed Archived group

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from `calummoore/workspace-link-widget-brainstorm`, Milestone 1 of the workspace link chips plan.
- **Location:** `docs/mockups/src/components/workspaces/Sidebar.tsx`, `docs/mockups/src/components/workspaces/ArchivedGroup.tsx`, `src/shell/list/ArchivedGroup.tsx`
- **Reason:** The workspace link chips change only draws chips for archived workspaces, and the states of the list belong to the list mockups.

- **Terms:**
  - **Archived group:** the group at the end of the workspace list that holds the archived workspaces of the org.
- **Background:** In the app, `src/shell/list/ArchivedGroup.tsx` keeps the Archived group closed until the person opens it. A closed group shows the number of its workspaces after its name. The group opens by itself when the open workspace is archived. The mockup part `docs/mockups/src/components/workspaces/ArchivedGroup.tsx` exists, but the mockup `Sidebar` passes the archived workspaces only as an open group. No page of the catalogue draws the closed group with its count.
- **Problem:** The visual spec does not show the usual state of the Archived group.
- **Impact if no action:** A change to the closed group has no picture to check it against.
- **Root question:** Where does the catalogue show the closed Archived group?
- **Options:**
  - **A.** Add one variant to `app/archive` that draws the closed group with its count. Cost: one more screen on that page, within the limit of five. Effort: Small.
  - **B.** Draw the closed group in every list that has archived workspaces, and the open group only where the open workspace is archived, as the app does. Cost: more fixture work in the list screens. Effort: Small.
- **Left out:** Change nothing, because the spec then misses the default state of the group.
- **Wider fix:** None, because this is one missing state.
- **Previous examples:** None found.
- **Recommendation:** B. The mockups then show what the app shows.
- **Action:** fix after merge, apply B, because it is a mockup gap outside the scope of the workspace link chips change.
