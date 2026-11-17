# Run the chat live check in a real sandbox

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open check of the deleted Boat-native remote workspaces plan (first deployment).
- **Location:** `image/live-check.mjs`, `image/live-input.ts`, `image/live-measure.ts`, `image/developer-scripts.md`.
- **Reason:** The check needs a real test Worker, a real sandbox, a stored agent login, and secrets, which no branch check has.

- **Terms:**
  - **Live check:** the developer script `image/live-check.mjs`. It sends chat messages through a real Worker to a real sandbox, checks the replies across a stop and a resume, and compares the first agent start of two placements of the SDK helper.
- **Background:**
  - The first deployment on 8 November 2026 ran a manual smoke test through the deployed app: a workspace start, an agent reply, the Files tab, the terminal, a port preview, and a reply after a stop and a resume.
  - The scripted live check never ran against the deployment. It moved from the plan to the work after the first merge on 8 November 2026.
  - The plan also asked to measure the first agent start after a resume over several runs, with the runner inside and outside the home folder, and to keep the faster place. One run of the live check does this. It forks the sandbox twice, copies the SDK helper into the home folder in one fork and under `/opt` in the other, and resumes each fork `LIVE_RUNS` times. The default and the minimum are 3. It writes `home.jsonl`, `system.jsonl`, and `comparison.json`, which names the faster placement. It does not move the installed runner, which lives under `/opt/conductive`, as `image/install.md` says.
- **Task:**
  1. Read `image/developer-scripts.md`, section "Live check", and "What a real check needs".
  2. Run `npm ci --prefix runner`, then `npm --prefix runner/sdk-helper run build`.
  3. Run `node image/live-check.mjs --prepare`.
  4. Set the `LIVE_*` variables that `node image/live-check.mjs --help` lists: `LIVE_APP_ORIGIN`, `LIVE_MACHINE_ORIGIN`, `LIVE_COOKIE`, `LIVE_ORG_ID`, `LIVE_REPOSITORY_ID`, `LIVE_BOAT_KEY`, `LIVE_BOAT_ORG`, `LIVE_AGENT`, `LIVE_MODEL`, and `LIVE_AGENT_LOGIN`. Put no secret in a saved file or command.
  5. Run `node image/live-check.mjs` once. Record `summary.json` and `comparison.json`.
  6. At once, clean up each sandbox that `cleanupNeeded` of `summary.json` lists. Each fork holds the real agent login of `LIVE_AGENT_LOGIN`.
- **Impact if no action:** A fault that only a real sandbox shows, such as a slow first agent start after a resume, stays unseen until a user reports it.
- **Needs:** A test Worker that sandboxes can reach, a test account with a stored agent login, an org with a published org image that holds the release under test, and Boat credentials.
- **Done when:** The live check passes in a real sandbox, `comparison.json` is recorded, and no sandbox of the check is left. When the home folder placement is faster, a new item asks where the runner should live.
