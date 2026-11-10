# Smoke-test provider accounts on the deployed app

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, the live check of the plan `plans/sandbox-provider-groundwork.md`, moved after the merge, branch `calummoore/vercel-sandbox-provider`.
- **Location:** None. The task runs on the deployed app.
- **Reason:** The check needs the merged Worker and its schema on the deployed app with a real cloud computer, and only a deploy of `main` may change the shared D1 schema.

- **Terms:**
  - **Provider account:** an account with a sandbox provider. Production has one, `boat`, the app's Boat account.
  - **`org_images`:** the D1 table with one org image record for each org and provider account.
- **Background:**
  - The change on branch `calummoore/vercel-sandbox-provider` prepares the Worker for more than one sandbox provider. Boat stays the only one.
  - Each D1 record of a sandbox or a saved snapshot stores its provider account. Each provider call uses the client of that account, from `providerForAccount` or `orgProviderForAccount` in `worker/sandbox/client.ts`.
  - The preview proxy and the terminal send the port credential that the client builds.
  - `migrations/202611092100_provider_accounts.sql` adds `provider_account` to ten tables. It rebuilds `workspaces` and `org_deletion_resources`.
  - `migrations/202611092305_org_images.sql` moves the six org image fields of `settings` to `org_images`, then drops them. A Worker from before it cannot use the new schema, as "When a deploy fails" in `docs/automatic-deploys.md` says.
  - The automated tests use a fake Boat server and local D1. No run with the real provider happened before the merge.
  - The repository deploys only `main`, and its deploy token works only for `main`. The destructive migration must not reach the shared deployed D1 alone before the merge, because the Worker on `main` would then fail.
  - So the whole flow on a real cloud computer runs after the deploy of the merged Worker and schema, and before the public launch.
- **Task:**
  1. Open the `Deploy` run of the merge commit. Check that its migration step applied `202611092100_provider_accounts.sql` and `202611092305_org_images.sql`, that the Worker deploy step passed, and that the health check answered `{"status":"ok"}`.
  2. Start `npx wrangler tail` for the Worker, and keep it open during the next steps.
  3. Sign in at `https://app.conductive.build` with the test account. Open the test org.
  4. As the org admin, press "Build computer" on the Cloud computer tab of the org settings. Check that the build succeeds.
  5. Send a first message from New workspace. Check that the start steps finish and the workspace becomes ready.
  6. Check that the agent answers with the test account's agent login. Send a second message, and check that it answers too.
  7. Open the Terminal tab. Run `pwd` and `ls`, and check that they show the repository folder.
  8. In the terminal, start a web server on port 3000, for example `python3 -m http.server 3000`. Open a port preview by typing `3000`. Check that the page shows in the frame, and that "Open in new tab" opens it on a `*.conductive.page` hostname.
  9. Stop the server. Leave the workspace with no input and no running turn for 30 minutes. Check that the tab shows the stopped state with Resume.
  10. Press Resume. Check that the workspace becomes ready, that the chat and the files stay, that an agent answers a new message, and that the terminal opens again.
  11. Archive the workspace from its row in the workspace list. Check that its chat still shows.
  12. Read the records with `npx wrangler d1 execute DB --remote --config wrangler.jsonc --command "<query>"`, read-only:
      - `SELECT provider_account, sandbox_id, state FROM workspaces WHERE id = '<workspace ID>'` gives `boat`, no `sandbox_id`, and `archived`.
      - `SELECT provider_account, image_name, image_build_id FROM org_images WHERE org_id = '<org ID>'` gives one `boat` row that names the snapshot and the ID of the new build.
  13. Check that no line of the Worker log contains `The sandbox provider account is not configured.` or `no such column`.
- **Impact if no action:** A fault that only the real provider or the deployed schema shows can stop new workspaces, resumes, terminals, or previews for the first users. The fake Boat server cannot show a wrong real route, a wrong port credential, or a missing record in the deployed D1.
- **Needs:** The merged change, deployed to `conductive.build` by the `Deploy` workflow. A test account with app access, the admin of a test org with one repository that has the GitHub App. A Claude or Codex login of that account. The production Boat account in the Worker, through `BOAT_API_KEY` and `BOAT_ORG_ID`. Wrangler access to the deployed D1 and to the Worker logs.
- **Done when:** Every step passes on the deployed app before the public launch. A failed step gets its own follow-up item, and this item stays open until a rerun of that step passes. Then delete this item.
- **Related:** These items check parts of the same flow on the deployed app. One session can run them together, and each keeps its own checks:
  - `plans/follow-ups/first-automatic-deploys-check.md` checks the deploy run and a message.
  - `plans/follow-ups/runner-archive-from-deploy-check.md` checks an image build with the deployed runner archive.
  - `plans/follow-ups/first-build-smoke-test.md` checks the automatic first build of a new org.
  - `plans/follow-ups/agent-instructions-deployed-smoke-test.md` checks agent instructions, with a stop and a resume.
