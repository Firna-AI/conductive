# Check the tab order on the deployment

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge follow-up of the plan of branch `calummoore/tab-drag-and-drop`.
- **Location:** None.
- **Reason:** The check needs the merged change on the test deployment.

- **Terms:**
  - **Tab row:** the row of session tabs and file and diff tabs above the chat of a workspace. "The tab row" in `docs/protocol/agents-and-sessions.md` gives its rules.
- **Background:** The user can drag any tab of the row to any place. The server keeps the order for each member and workspace, so a reload and another device show it. A phone shows only the session tabs. The tests and a smoke test with the fake API of `npm run dev` checked this, but the fake keeps no view across a reload.
- **Task:** On `conductive.build`, open a workspace with two sessions and an open file. Drag the file tab before the second session tab, then reload the page. Open the same workspace on a phone.
- **Impact if no action:** A fault of the real view route, such as an order that the Worker does not keep, stays unseen until a user meets it.
- **Needs:** The merged change on the test deployment, which each push to `main` deploys.
- **Done when:** After the reload, the row shows the file tab before the second session. The phone shows the sessions in the same order as the desktop row.
