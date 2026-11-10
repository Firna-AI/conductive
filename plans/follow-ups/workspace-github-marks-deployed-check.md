# Check the GitHub list marks on the deployment

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from branch `calummoore/workspace-status-icons`, the change that shows the GitHub state in the workspace list marks.
- **Location:** `docs/protocol/workspace-life.md`, `docs/protocol/github-banner.md`, `src/shared/github.ts`, `worker/github/workspace-state.ts`, `worker/github/summary-data.ts`, `migrations/202611102114_workspace_github_summary.sql`, `docs/mockups/src/components/workspaces/WorkspaceMark.tsx`, `src/shell/list/WorkspaceRow.tsx`, `src/shell/palette/PaletteList.tsx`, `src/chat/links/LinksContext.tsx`, and `src/app/org-model.ts`.
- **Reason:** The check needs the merged change on the deployment, the real GitHub App with its webhooks, and real checks on a pull request.

- **Terms:**
  - **Workspace:** one task in Conductive, the coding tool at `conductive.build`. A workspace has one repository, its own branch, and its own cloud computer, where agents work.
  - **List mark:** the mark of 3 × 3 cells at the start of each workspace row in the workspace list. The rows of the command palette and the chips of workspace links show the same mark.
  - **GitHub state:** one of four values for the pull request of the workspace branch: checks failed, checks running, checks passed, or merged. A workspace can also have no GitHub state.
  - **Pull request bar:** the bar at the top of the right column of an open workspace. It shows the state of the pull request of the branch.
- **Background:**
  - On 10 November 2026, the user chose that the list mark shows the GitHub state in one full colour. It is red when the checks failed, amber while they run, green when they passed, and purple after the merge. Without a GitHub state, the mark is dim grey. "The list mark" in `docs/protocol/workspace-life.md` states the rules.
  - The motion of the mark shows the agent. A light runs around the outer ring of cells while the agent works, and the mark pulses while the agent needs input. In each other state, the mark is still. An archived workspace shows a fainter grey mark.
  - "The GitHub state" in `docs/protocol/github-banner.md` gives the rules of the state. A failed, cancelled, timed-out, or action-required check is a failure. A queued or running check runs. Each other check counts as passed. A failure wins over a check that runs, and the merge wins over the checks.
  - A draft, a merge conflict, changes requested, and a block do not change the GitHub state. A branch without a pull request, an open pull request without a check, and a pull request closed without a merge have no GitHub state.
  - `githubSummary` in `src/shared/github.ts` gives the state from the stored bar state and its checks. The bar uses the same check rules.
  - The Worker keeps a copy of the state in the nullable D1 column `workspaces.github_summary`. `migrations/202611102114_workspace_github_summary.sql` adds the column without a backfill. So a workspace shows the dim mark until its next GitHub refresh, after a webhook or an open of the workspace.
  - After each GitHub refresh, the Durable Object of the workspace writes the copy from the bar state that it stores at that moment. It writes in the order of its refreshes, so a replay of an older webhook delivery cannot write an older state. A failed write fails the refresh, so that a retry writes the copy again. `worker/github/workspace-state.ts` and `worker/github/summary-data.ts` hold this code.
  - A change of the GitHub state does not change the activity time of the row. The row shows that time as an age, from `updatedAt` of the workspace record.
  - The browser reads the workspace list from D1 again after a wait. `workspacesWait` in `src/app/org-model.ts` gives the wait: 5 seconds while a workspace of the org works, needs input, or starts, and 30 seconds otherwise. On 10 November 2026, the change chose that running checks also give the 5-second wait.
  - The user chose on 10 November 2026 that the pull request bar keeps its neutral merge state in this change. This check looks only at the marks.
  - Each push to `main` deploys the test deployment at `conductive.build`, and the deploy applies the D1 migrations first, as `docs/automatic-deploys.md` says.
  - The tests use fake GitHub servers and a local D1. They do not prove the real webhooks, the migration on the deployed database, or the deployed browser.
- **Task:**
  1. Use a disposable repository of the org that already runs real CI checks on each pull request. Use a disposable workspace on it. Nobody may need either for real work.
  2. Sign in at `https://app.conductive.build` as a member of the org. Create the workspace with a first message that asks for no change, such as `Reply with OK and change nothing.`
  3. In the Terminal of the workspace, commit a change that makes one real check fail, and push the branch with `git push -u origin HEAD`. Select Create pull request in the pull request bar, and create the pull request on GitHub.
  4. Open another workspace of the org, so that the sidebar shows the row of the test workspace while that workspace is not open.
  5. After the check fails on GitHub, confirm that the row mark turns red. Note the time from the end of the run to the change of the colour.
  6. Commit and push a fix. After the checks pass on GitHub, confirm that the row mark turns green.
  7. Merge the pull request on GitHub. Confirm that the row mark turns purple. Without running checks, the list can take up to 30 seconds to read the change.
  8. Optional: confirm the amber mark while the checks run. Confirm that the row of the command palette and a chip of the workspace link show the same colour. Confirm that the row gives the words "Checks failed" to screen readers. Confirm that the time of the row does not jump to the present when only the checks or the merge change.
  9. Save screenshots of the red, green, and purple rows, with the timings. Save them under the git-ignored `.context/` folder of the workspace that runs this check. When a colour does not change, also save the status codes of the recent webhook deliveries of the GitHub App. Record each needed fix in its own follow-up item.
- **Impact if no action:** A broken webhook route, a missing column on the deployed database, or a list read without the copy leaves the marks dim or old. No test shows such a fault.
- **Needs:** The merged change on the test deployment, with the migration applied to its D1 database. A signed-in member of an active org whose cloud computer build includes the test repository, with a connected agent login. The GitHub App must reach that repository. It must send its `push`, `pull_request`, `pull_request_review`, `pull_request_review_thread`, `check_run`, `check_suite`, and `status` webhooks to the deployment. The right to push to and merge in that repository, and its real CI checks. A disposable workspace and a pull request that nobody needs.
- **Done when:** The row of the test workspace turns red after the failed check, green after the passed checks, and purple after the merge. Each change follows a real webhook update. The screenshots and the timings are saved, and each needed fix has its own follow-up item.
