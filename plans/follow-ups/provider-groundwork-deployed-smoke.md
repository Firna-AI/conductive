# Smoke-test provider accounts on the deployed app

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, the live check of the plan `plans/sandbox-provider-groundwork.md`, moved after the merge, branch `calummoore/vercel-sandbox-provider`. Updated on 2026-11-18 by branch `calummoore/follow-up-provider-accounts-deployed-oeos`, which records the results of production use and of one smoke run on that day.
- **Location:** None. The task runs on the deployed app.
- **Reason:** The remaining parts need a browser sign-in, a new permission for Build computer, and the cause of unexplained Worker error records.

- **Terms:**
  - **Provider account:** an account with a sandbox provider. Production has one, `boat`, the app's Boat account.
  - **`org_images`:** the D1 table with one org image record for each org and provider account.
  - **Workspace tools:** the MCP server and the CLI in each sandbox. They call the Worker under `/v1/tools/` with the workspace token, as `docs/protocol/agent-tools.md` says.
  - **Agent shell:** the command tool of an agent. It runs commands in the sandbox without the Terminal tab and without the terminal route of the Worker.
  - **Default login:** the agent login that a new session of a member takes. It can be an org login, as `docs/protocol/org-logins.md#the-default-login` says.
- **Background:**
  - The change on branch `calummoore/vercel-sandbox-provider` prepares the Worker for more than one sandbox provider. Boat stays the only one. It merged into `main` on 10 November 2026 at 07:17:42 UTC, as commit `2f329f9dfae5b16a92bff2c4e18111574ba6749d`.
  - Each D1 record of a sandbox or a saved snapshot stores its provider account. Each provider call uses the client of that account, from `providerForAccount` or `orgProviderForAccount` in `worker/sandbox/client.ts`.
  - For an account that the Worker does not know, the client throws `ProviderAccountError` from `worker/sandbox/accounts.ts`. Its text is `The sandbox provider account is not configured.`
  - The preview proxy and the terminal send the port credential that the client builds.
  - `migrations/202611092100_provider_accounts.sql` adds `provider_account` to ten tables. It rebuilds `workspaces` and `org_deletion_resources`.
  - `migrations/202611092305_org_images.sql` moves the six org image fields of `settings` to `org_images`, then drops them. A Worker from before it cannot use the new schema, as "When a deploy fails" in `docs/automatic-deploys.md` says.
  - The automated tests use a fake Boat server and local D1. No run with the real provider happened before the merge.
  - The repository deploys only `main`, and its deploy token works only for `main`. The destructive migration must not reach the shared deployed D1 alone before the merge, because the Worker on `main` would then fail.
  - So this item planned the whole flow on a real cloud computer after the deploy of the merged Worker and schema, before the public launch.
  - This item has no recorded result of the full check before launch. On 18 November 2026, the project is already in production, and real users and their data use `conductive.build`. The "Status" section of `AGENTS.md` says so.
  - On 18 November 2026, `worker/sandbox/client.ts` and both migration files were byte for byte the same as in the merge commit. So the results of that day test the merged provider client and schema.
  - The results of 18 November 2026 come from production use and from one smoke run:
    - A read-only D1 query at 12:12:43 UTC found 333 workspace rows of the production org created after the merge. Each had `provider_account` `boat`. They show real use of `boat` cloud computers, but no browser screen and no exact idle time.
    - The smoke run used workspace 336, ID `DT48UbJ2ptjOcamuSWSChOoQdU3cuKHlT70YJdZdn6E`, in the production org, ID `X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM`. Cal allowed the run to use the workspace tools as his account, `calummoore`. Its session used Codex with the model `gpt-6.1-sol`.
    - The run had no browser sign-in. The instructions for the run forbade Build computer and each change of an org setting.
    - Cal approved the org secret `Cloudflare (read-only)` for the run. Each D1 query of the run reported `rows_written` 0 and `changed_db` false.
  - Archive keeps the stopped sandbox of a workspace for 14 days, for Restore, as `docs/protocol/workspace-life.md#archive` requires. In that time, the D1 record keeps its `sandbox_id`. After the 14 days, the app deletes the sandbox. The delete can retry, so `sandbox_id` becomes NULL some time after the 14 days.
- **Task:** The steps keep their order from 9 November 2026, so each result maps to one step. Each step gives its status on 18 November 2026. A time without a date is a time of that day, in UTC. The statuses are:
  - **Passed:** the step needs no rerun.
  - **Partial:** one part passed. Run only the rest.
  1. Open the `Deploy` run of the merge commit. Check that its migration step applied `202611092100_provider_accounts.sql` and `202611092305_org_images.sql`, that the Worker deploy step passed, and that the health check answered `{"status":"ok"}`.
     - **Status:** Passed. Run 42774281881 deployed the merge commit and succeeded: `https://github.com/Firna-AI/conductive/actions/runs/42774281881`. Its step "Apply migrations" showed both files with a success mark, and D1 records both as applied on 10 November 2026 at 07:21:35 UTC. Its steps "Deploy Worker" and "Check health" passed, with the Worker version `e9f2b473-aba7-4bc1-9936-9001f9187303`. On 18 November 2026, a GET of `https://app.conductive.build/api/health` with no sign-in answered `{"status":"ok"}`. That route reads no D1 data, so it shows only that the Worker answers.
  2. Start `npx wrangler tail` for the Worker, and keep it open during the next steps.
     - **Status:** Partial. The log read for the backend work of 18 November 2026 is complete. Each browser check still needs its own log read.
       - Live tails ran from 11:56:09 to 11:56:54 UTC, from 12:06:44 to 12:07:29 UTC, and from 12:25:01 to 12:25:47 UTC.
       - At 12:34:38 UTC, a read-only query of Workers Logs read all 963 warn, error, and fatal records from 11:29:07 to 12:34:38 UTC. It used a sample interval of 1 and read every page.
       - Workers Logs can replace the tail, because `wrangler.jsonc` turns them on for every request. Cloudflare keeps them for a limited time only.
  3. Sign in at `https://app.conductive.build` with the test account. Open the test org.
     - **Status:** Partial. The workspace tools, used as Cal in the production org, replaced the sign-in for the tool parts. No browser sign-in happened, so each browser check below still needs one.
  4. As the org admin, press "Build computer" on the Cloud computer tab of the org settings. Check that the build succeeds.
     - **Status:** Partial. Read-only D1 queries showed five succeeded builds of `kind` `build` with `provider_account` `boat` in the production org. They completed from 13 to 18 November 2026. The latest, `YJRn8hGB7HCnXvz7P4hlxwCKPU-3KpNt4e0pafIpOtI`, ran from 12:01:03.852 to 12:02:35.580 UTC, and the run did not start it. So builds with the real provider work after the merge. The browser press of "Build computer" still needs a check, because the instructions for the run forbade that press.
  5. Send a first message from New workspace. Check that the start steps finish and the workspace becomes ready.
     - **Status:** Partial. `create_workspace` with a first message created workspace 336 at 11:29:07.777 UTC and gave the state `ready`. Its first turn ran. The browser part still needs a check, because nobody saw the New workspace page or its start steps.
  6. Check that the agent answers with the default login of the test account. Send a second message, and check that it answers too.
     - **Status:** Passed. Both messages of workspace 336 got a reply. The second send gave `login.type` `org`, `loginAvailable` `true`, and `loginShared` `true`. So the session ran on the org login, which was Cal's default login in that org. The `startedBy` field names the starter of a session, not its login, so it cannot show the login.
  7. Open the Terminal tab. Run `pwd` and `ls`, and check that they show the repository folder.
     - **Status:** Partial. In the agent shell of workspace 336, `pwd` gave `/home/user/code/remote-code`, and `ls` showed the entries of the repository. The Terminal tab still needs a check. It connects through the terminal route of the Worker with the port credential, which the agent shell does not use.
  8. In the terminal, start a web server on port 3000, for example `python3 -m http.server 3000`. Open a port preview by typing `3000`. Check that the page shows in the frame, and that the "Open" link opens it on a `*.conductive.page` hostname.
     - **Status:** Partial. The parts below passed. The frame, the page, and the "Open" link on a `*.conductive.page` hostname still need a check.
       - A server that the agent started on port 3000 answered a GET from inside the sandbox with HTTP 200 and the expected marker text.
       - `open_preview` for port 3000 opened a preview, and `list_previews` listed it. `close_preview` closed it, and the list was then empty.
       - In `worker/previews/ports.ts`, that open used the Boat client of the stored account. The client ran the relay check command and gave the relay port with its port credential. No page load used that credential.
       - The link was the launch address on `app.conductive.build`, as `docs/protocol/section-and-preview-calls.md#previews` requires. A load with no sign-in got HTTP 401.
  9. Stop the server. Leave the workspace with no input and no running turn for 30 minutes. Check that the tab shows the stopped state with Resume.
     - Keep the tab of the workspace open in a browser for this step. An open tab is not activity. A later open of a stopped workspace resumes it with no Resume, as `docs/protocol/stop-and-resume.md` says.
     - **Status:** Partial. The stop itself passed. The tab view with Resume still needs a check.
       - The second reply confirmed that the server stopped. The session was first seen idle, with no running turn, at 11:35:52 UTC.
       - The workspace tools last saw `ready` at 12:23:29 UTC and first saw `stopped` at 12:24:12 UTC. The run used no manual stop and sent no new test input.
       - At 12:24:54 UTC, D1 gave `stopped`, `sandbox_id` `bx_exr2v4zj`, `last_activity_at` 11:53:13.548 UTC, and `stopped_at` 12:23:44.534 UTC. So the stop came 30 minutes and 30.986 seconds after that stored activity time.
       - The run sent no message between 11:33:28 UTC and the natural stop. The source of the activity at 11:53:13.548 UTC is unknown.
  10. Press Resume. Check that the workspace becomes ready, that the chat and the files stay, that an agent answers a new message, and that the terminal opens again.
      - **Status:** Partial. The resume itself passed. The Resume button and the terminal still need a check.
        - A message from `send_message` starts a stopped sandbox, as `docs/protocol/stop-and-resume.md#the-resume` requires. At 12:25:21.752 UTC, the Worker accepted such a message to the same session, on the same org login. The workspace went from `stopped` to `starting`.
        - At 12:25:55 UTC, an agent command found the marker file with its exact bytes and the same `pwd`. It also found all eight evidence files in the ignored folder and a clean Git status. The session kept the context of its first two turns.
        - The third reply held its marker and finished in 30 seconds. The workspace was ready and idle at 12:26:50 UTC.
  11. Archive the workspace from its row in the workspace list. Check that its chat still shows.
      - **Status:** Partial. The Archive itself passed. The Archive from the row and the view of the chat still need a check.
        - `archive_workspace` archived workspace 336 at 12:26:50.922 UTC. Its Restore ends on 2 December 2026 at 12:26:50.922 UTC.
        - At 12:27:07 UTC, `read_session` read all 287 lines of the archived chat: three messages from Cal, three finished replies, and all three markers.
  12. Read the records with `npx wrangler d1 execute DB --remote --config wrangler.jsonc --command "<query>"`, read-only:
      - `SELECT provider_account, sandbox_id, state FROM workspaces WHERE id = '<workspace ID>'` gives `boat`, the `sandbox_id` that the workspace had before the Archive, and `archived`. Run it within 14 days of the Archive. When this item was written, this check expected no `sandbox_id`. That no longer matches the current Archive.
      - `SELECT provider_account, image_name, image_build_id FROM org_images WHERE org_id = '<org ID>'` gives one `boat` row that names the snapshot and the ID of a succeeded build. When this item was written, this check asked for the new build of the Build computer step.
      - **Status:** Passed.
        - The workspace query passed. At 12:28:04 UTC, workspace 336 had `boat`, `sandbox_id` `bx_exr2v4zj`, and `archived`. That is the same sandbox as before the Archive, at 11:54:20 and 12:24:54 UTC. Its `archived_at` was 12:26:50.922 UTC and its stored `stopped_at` was 12:26:51.490 UTC.
        - The org image query passed. At 12:28:04 UTC, the production org had one `boat` row. It named the snapshot `image-mckgp4qrqhwhbj267t5t7cdfy4aiupkpw4vjg3pb5uuwt4rjhlja` and the build `YJRn8hGB7HCnXvz7P4hlxwCKPU-3KpNt4e0pafIpOtI`. A join showed that this build of `kind` `build` succeeded with the same snapshot and `boat`.
  13. Check the Worker log of the times of the steps for a missing provider account and for a missing column:
      - No line contains `The sandbox provider account is not configured.` or `no such column`. These texts were the targets on 9 November 2026. The current warning fields omit raw exception messages, so the absence of these texts alone proves nothing.
      - No warning has `error.kind` `d1` with `error.reason` `no_such_column`. `errorSummary` in `worker/warning-values.ts` gives a D1 error these fields.
      - No warning or reply shows a failed operation of the test workspace or of the build under check. Examples are `workspace_start_failed`, `image_build_failed`, and an HTTP 500 reply with `internal_error`.
      - An `unexpected_error` warning from `worker/unexpected-error.ts` holds no message, and it gives a `ProviderAccountError` the error name `Error`. Its route words, code places, and time can help to rule out both faults.
      - A `workspace_alarm_failed` warning has no route, no code places, and no workspace ID. Use its time and the operation results of the steps.
      - When the log cannot rule out a fault, this step does not pass.
      - **Status:** Partial. The records that name workspace 336 show no error. The records with no known cause still need a check.
        - The query of 12:34:38 UTC found 13 records of workspace 336. They were runner connect, runner disconnect, and turn-end warnings, with no error fields.
        - No record of the window had a `d1` reason, either original text, or the name `ProviderAccountError`.
        - The time of build `YJRn8hGB7HCnXvz7P4hlxwCKPU-3KpNt4e0pafIpOtI`, from 12:01:03 to 12:02:36 UTC, held 27 records, and the counts matched. No record named that build.
        - 263 error records of the window have no known cause, no workspace ID, and no build ID. Seven of them fall in the time of that build. A fixed structural check could not assign them, so they cannot rule out a missing provider account or a missing column.
- **Impact if no action:** A fault that only the real provider or the deployed schema shows can stop new workspaces, resumes, terminals, or previews for real users. The fake Boat server cannot show a wrong real route, a wrong port credential, or a missing record in the deployed D1. The results of 18 November 2026 do not cover the browser parts, such as the Terminal tab and a page load through the preview proxy.
- **Needs:**
  - The merged change, deployed to `conductive.build` by the `Deploy` workflow. It went live on 10 November 2026.
  - An account with app access, and a test org with one repository that has the GitHub App. On 18 November 2026, Cal allowed the run to use his account and the production org.
  - A person signed in at `https://app.conductive.build` in a browser, for each browser check that the steps still need.
  - For Build computer, an org admin with a new, explicit permission for that build. The instructions for the run of 18 November 2026 forbade it.
  - A default login of that account for Claude or Codex. An org login serves, and no personal login is needed.
  - A test workspace that nobody needs, because the steps stop and archive it.
  - The production Boat account in the Worker, through `BOAT_API_KEY` and `BOAT_ORG_ID`.
  - Read-only access to the deployed D1 and to the Worker log. Use only the org secret `Cloudflare (read-only)`, through the workspace tool `run_with_secrets` after a member approves. Never use the read-write Cloudflare secret.
- **Done when:** Every step passes on the deployed app. A Partial step passes when the rest of it passes. The timing before the public launch no longer applies, because the app was already in production on 18 November 2026. That changes no check. A failed step gets its own follow-up item, and this item stays open until a rerun of that step passes. Then delete this item.
- **Related:** These items check parts of the same flow on the deployed app. One session can run them together, and each keeps its own checks:
  - `plans/follow-ups/runner-archive-from-deploy-check.md` checks an image build with the deployed runner archive.
  - `plans/follow-ups/first-build-smoke-test.md` checks the automatic first build of a new org.
  - `plans/follow-ups/agent-instructions-deployed-smoke-test.md` checks agent instructions, with a stop and a resume.
