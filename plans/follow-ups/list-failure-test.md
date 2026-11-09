# The list failure notice has no test

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/command-palette-mockups`, review round 2, a new problem of the check of finding 6.
- **Location:** `src/shell/list/OrgList.tsx:110`.
- **Reason:** the notice is on `origin/main`, and the command palette branch did not change it.

- **Terms:**
  - **Workspace list:** the list of the workspaces of an org, which the sidebar and the list page show.
- **Background:** When the first read of the sections or the workspaces of an org fails, the list page shows "The workspaces didn't load" with Try again. Try again reads the list again through `org.reload('list')`. The command palette branch added a test for the same notice in the palette, but not for the list page.
- **Problem:** No test makes the read of the list fail, checks the notice, and presses Try again. So a change that drops the notice or sends Try again to another read passes every test.
- **Impact if no action:** The failure notice or its recovery can break without a failing test.
- **Root question:** How do the tests protect the failure notice of the list page and its recovery?
- **Options:**
  - **A.** Add one mounted happy-dom test with the fake HTTP server and the real app models. Make the first list read fail, check the notice, restore the reply, press Try again, and check a new list request and the rows. Effort: Small.
- **Left out:** A test of the model alone, because it misses the wiring of the button. One approach is enough, because the `testing` skill asks for one test of an error path that a caller handles.
- **Wider fix:** None. The `testing` skill already asks for a test of each handled error path.
- **Previous examples:** The palette test of the same notice, added on the command palette branch.
- **Recommendation:** A. One mounted test catches both a missing notice and a wrong retry.
- **Action:** fix after merge, apply A, because the notice is on `origin/main` and outside the diff of the palette.
