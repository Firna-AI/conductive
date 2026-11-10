# Check deployed Archive and Restore

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from PR #138.
- **Location:** `docs/protocol/workspace-life.md`, `docs/protocol/workspace-menu.md`, `worker/lifecycle/archive-state.ts`, and the Archive and Restore controls under `src/shell/`.
- **Reason:** This check needs the merged feature on the test deployment at `app.conductive.build`.

- **Terms:**
  - **Restore:** The action that returns an archived workspace, with its files and agent sessions, within 14 days of Archive.
  - **Workspace row menu:** The menu opened with a right click or Shift+F10 while a workspace row has focus.
- **Background:** Conductive gives each workspace its own cloud computer. On 10 November 2026, the user chose immediate Archive without a check or question. Archive stops and keeps the cloud computer for 14 days.

  Every member of an active org may Restore. Restore returns the workspace to its section and list place, stopped. Opening it or selecting Resume then starts its cloud computer. After 14 days, Restore ends and the app deletes the computer. The chat stays read-only.

  A computer stops after 30 minutes without workspace activity or a running agent turn. Closing a tab alone does not stop a running turn. The normal app has no manual Stop-computer action.
- **Task:**
  1. Use a dedicated, already-stopped test workspace. Sign in as its owner or an org admin. It must contain an uncommitted file, an unpushed commit, and an agent session.
  2. If a stopped workspace is not ready, prepare those files and the session while it runs. End any running agent turn with Stop. Close its workspace and preview tabs. Leave it without input for at least 30 minutes. Confirm that its row shows stopped before continuing.
  3. Keep another page or workspace open. Open the browser's network panel. Right-click the stopped workspace's row, or press Shift+F10 while that row has focus. Select Archive.
  4. Confirm that no check or question appears. Confirm that no workspace opens and no Resume request occurs. Confirm that the row moves to Archived. Confirm that the current page stays where it was. Confirm that the toast names the workspace and offers Restore.
  5. Restore it from the toast. Confirm that it returns to its section and list place in the stopped state. Confirm that this action starts no cloud computer.
  6. Open it or select Resume. Confirm that its uncommitted file, unpushed commit, and agent session remain available.
  7. Prepare the same stopped precondition again. Keep another page open. On a computer, point to its row and use the Archive shortcut. Restore it from the Archived group. Confirm that neither action opens the workspace or starts its computer.
  8. Open another retained archived test workspace. Confirm that its bar gives the last day of Restore and offers Restore. Confirm that its chat stays read-only and its tools stay unavailable.
  9. Record the Archive and Restore HTTP statuses. Record the error code and message if a request fails. Save the results and screenshots under the git-ignored `.context/` directory of the workspace that runs this check. Record each needed fix in its own follow-up item.
- **Impact if no action:** Local fakes and CI do not confirm the deployed browser, Worker, and cloud computer integration.
- **Needs:** The merged Archive and Restore feature deployed to `app.conductive.build`, an active org, a signed-in tester, dedicated workspaces that nobody needs, and a browser with a network panel. The signed-in Archive tester must be the workspace owner or an org admin. Permission from an owner does not give another member that API role. Never use a needed live workspace for this check.
- **Done when:** Row-menu and hover Archive of a stopped workspace need no start or check. The current page stays unchanged. Toast and Archived-group Restore return the workspace stopped. Resume preserves files, the unpushed commit, and the agent session. The archived bar gives the correct Restore deadline. The results record the HTTP statuses and any failures.
