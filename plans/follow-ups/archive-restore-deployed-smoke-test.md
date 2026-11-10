# Check deployed Archive and Restore

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from PR #138.
- **Location:** `docs/protocol/workspace-life.md`, `worker/lifecycle/archive-state.ts`, and the Archive and Restore controls under `src/shell/`.
- **Reason:** This check needs the merged feature on the test deployment at `app.conductive.build`.

- **Terms:**
  - **Restore:** The action that returns an archived workspace, with its files and agent sessions, within 14 days of Archive.
- **Background:** Conductive gives each workspace its own cloud computer. On 10 November 2026, the user chose immediate Archive without a check or question. Archive stops and keeps the cloud computer for 14 days.

  Every member of an active org may Restore. Restore returns the workspace in its section, stopped. Opening it or selecting Resume then starts its cloud computer. After 14 days, Restore ends and the app deletes the computer. The chat stays read-only.
- **Task:**
  1. Use a dedicated test workspace with an uncommitted file, an unpushed commit, and an agent session. Stop its cloud computer.
  2. Archive it from its row without opening it. Confirm that no check or question appears. Confirm that the row moves to Archived.
  3. Restore it from the toast. Confirm that it returns to its section in the stopped state.
  4. Open it or select Resume. Confirm that its uncommitted file, unpushed commit, and agent session remain available.
  5. Archive it again and restore it from the Archived group. Confirm that this action starts no cloud computer.
  6. Open another retained archived test workspace. Confirm that its bar gives the last day of Restore and offers Restore.
  7. Save the result and any screenshots under the git-ignored `.context/` directory of the workspace that runs this check.
- **Impact if no action:** Local fakes and CI do not confirm the deployed browser, Worker, and cloud computer integration.
- **Needs:** The merged Archive and Restore feature deployed to `app.conductive.build`, a signed-in member, and dedicated test workspaces. Use workspaces whose Archive the owner or an org admin permits.
- **Done when:** Archive of a stopped workspace needs no start or check. Both Restore entry points work. Resume preserves files and agent sessions. The archived bar gives the correct Restore deadline.
