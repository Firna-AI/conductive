# Smoke-test E2B through the deployed app

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, Milestone 9 of the plan `plans/e2b-backup-provider.md`, moved after the merge by e2b decision 223, branch `calummoore/e2b-backup-sandbox-provider`, pull request #193.
- **Location:** None. The task runs on the deployed app.
- **Reason:** On 19 November 2026, the user chose to run the first check of E2B through the app on production, after the merge, with the E2B weight at 0%. A local Worker is not reachable from E2B sandboxes.

- **Terms:**
  - **Computer tools:** the MCP server `computer`, the Cua Driver on display `:0`, which the E2B template installs.
- **Background:**
  - Pull request #193 adds E2B as the second provider, with one provider account for each org. An operator can choose `e2b` when the operator creates an org. Other people see no choice.
  - The live check of `image/e2b/live-check.md` proved the template and the runtime on E2B. It does not cover the app path: the runner's connection to the Worker, the chat, the terminal, and previews through the Worker, and the agents' use of the computer tools.
- **Task:**
  1. As an operator, create a test org on `e2b`. Create a workspace, run a chat turn, and open the terminal and a preview.
  2. Ask a Claude session and a Codex session each to open a page with the computer tools.
  3. Create a second test org on `boat`, and create a workspace there.
  4. Read the Worker logs of the steps for errors.
  5. When an agent used the computer tools on E2B, delete `plans/follow-ups/second-provider-computer-tools.md`, as its "Done when" asks.
- **Impact if no action:** The app path on E2B stays unproven, so a real outage of Boat could meet a broken backup.
- **Needs:** The merged change on production, and the E2B account on the deployed Worker, which the secret `SANDBOX_PROVIDER_ACCOUNTS` got on 20 November 2026. The 51 GB disk and the Pro plan of `plans/follow-ups/e2b-production-account.md` are not needed for a short test with a small repository. The project has a 15 GB disk, and Hobby limits a sandbox to 1 hour of running without a pause. An operator account, and Claude and Codex logins.
- **Done when:** Every step passes. A failed step gets its own follow-up item. Then delete this item.
