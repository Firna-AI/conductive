# Set up the production E2B account

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, a post-merge task of the plan `plans/e2b-backup-provider.md`, branch `calummoore/e2b-backup-sandbox-provider`, pull request #193.
- **Location:** the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`, "The app's E2B account" in `docs/sandbox-provider-accounts.md`, and `image/e2b/build-template.mjs`.
- **Reason:** The deployed Worker needs the merged code, and only the user can change the E2B project and set the secret.

- **Terms:**
  - **Provider account:** an account with a sandbox provider, such as `boat` or `e2b`. Each org runs on one.
  - **E2B template:** the base image of every E2B sandbox, built from `image/e2b/`.
- **Background:**
  - Pull request #193 adds E2B as the second provider. Each org runs on one provider account. A new org gets its account from operator weights, 100% `boat` by default. An operator can choose the account when the operator creates an org.
  - The Worker reads the E2B account from the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`, as JSON text: `{ "e2b": { "kind": "e2b", "apiKey": "<key>", "domain": "<domain>", "templateId": "<template ID>" } }`.
  - The design asks for an E2B project that holds only the app's work, in E2B's EU cluster, with filesystem-only pauses and snapshots, a 51 GB disk, and the Pro plan. Hobby limits a sandbox to 1 hour of running without a pause, and to 20 sandboxes at once.
  - On 19 November 2026, the Conductive E2B project ran on E2B's default cluster, `e2b.app`. Its template `legx77llbioq1vfbvsck` built with 4 CPUs, 8192 MiB, and a 15,085 MiB disk. Filesystem-only snapshots worked. The live check passed every step up to its disk requirement of 51 GB, where it stopped.
- **Task:**
  1. Ask E2B support for the EU cluster and a 51 GB disk for the Conductive project. Move the project to Pro.
  2. Build the template in that project: `node image/e2b/build-template.mjs --name conductive-base`, with `E2B_API_KEY` and the EU `E2B_DOMAIN` in the process environment, never in a command or a file. Note the printed template ID.
  3. Run the live check, `node image/live-check.mjs --provider=e2b`, with the inputs that `image/e2b/live-check.md` gives. It must complete, also its disk requirement.
  4. Write the JSON value to a file outside the repository. Run `npx wrangler secret put SANDBOX_PROVIDER_ACCOUNTS < <file>`, so that the key goes into no command line, and delete the file.
- **Impact if no action:** The deployed app can start no sandbox on E2B, also not for an operator's test org.
- **Needs:** The merged change on production. The EU cluster and the disk from E2B support. The E2B API key of the project.
- **Done when:** The deployed Worker has the E2B account, and the live check completes against its template. Then delete this item.
