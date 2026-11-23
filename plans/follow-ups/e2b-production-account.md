# Set up the production E2B account

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, a post-merge task of the plan `plans/e2b-backup-provider.md`, branch `calummoore/e2b-backup-sandbox-provider`, pull request #193.
- **Location:** the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`, "The app's E2B account" in `docs/sandbox-provider-accounts.md`, `image/e2b/build-template.mjs`, and the Privacy page in `src/marketing/privacy.ts`.
- **Reason:** Only the user can change the plan and the disk of the E2B project, set the secret, and get E2B's documents.
- **Related:** `plans/follow-ups/workspace-object-region-per-account.md` asks whether the E2B account moves to E2B's EU cluster. When the user chooses that move, the request of the first step also asks for the EU cluster. After that move, the Privacy page names no United States region for E2B, and the sixth step falls away.

- **Terms:**
  - **Provider account:** an account with a sandbox provider, such as `boat` or `e2b`. Each org runs on one.
  - **E2B template:** the base image of every E2B sandbox, built from `image/e2b/`.
- **Background:**
  - Pull request #193 adds E2B as the second provider. Each org runs on one provider account. A new org gets its account from operator weights, 100% `boat` by default. An operator can choose the account when the operator creates an org.
  - The Worker reads the E2B account from the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`, as JSON text: `{ "e2b": { "kind": "e2b", "apiKey": "<key>", "domain": "<domain>", "templateId": "<template ID>" } }`.
  - The design asks for an E2B project that holds only the app's work, with filesystem-only pauses and snapshots, a 51 GB disk, and the Pro plan. Hobby limits a sandbox to 1 hour of running without a pause, and to 20 sandboxes at once.
  - On 19 November 2026, the Conductive E2B project ran on E2B's default cluster, `e2b.app`. Its template `legx77llbioq1vfbvsck` built with 4 CPUs, 8192 MiB, and a 15,085 MiB disk. Filesystem-only snapshots worked. The live check passed every step up to its disk requirement of 51 GB, where it stopped.
  - On 20 November 2026, the user chose that the E2B account need not run in the EU, and that the Worker gets the current project now. `docs/protocol/provider-accounts.md`, section "Regions", holds the region rule. E2B's region table places the default cluster in Google Cloud `us-west1`, in the United States.
  - On 20 November 2026, the secret `SANDBOX_PROVIDER_ACCOUNTS` was set on the Worker `conductive`, with the key of the Conductive project, the domain `e2b.app`, and the template `legx77llbioq1vfbvsck`. The project was still on Hobby, with the 15,085 MiB disk.
  - E2B is FoundryLabs, Inc., a company in the United States. `docs/protocol/provider-accounts.md`, section "Regions", requires this before a real org runs on an account in a new region: the Privacy page names the countries of that region, and, outside the European Economic Area, the protection of the transfer from the UK. Today the Privacy page names only EU countries for cloud computers, and claims no signed E2B protection.
  - On 20 November 2026, the user said that E2B consented to the app's use. So no request for consent remains. The documents and the Privacy page step remain.
- **Task:**
  1. Ask E2B support for a 51 GB disk for the Conductive project. Move the project to Pro.
  2. When the new disk needs a new template, build it in that project: `node image/e2b/build-template.mjs --name conductive-base`, with `E2B_API_KEY` and `E2B_DOMAIN` in the process environment, never in a command or a file. Note the printed template ID.
  3. Run the live check, `node image/live-check.mjs --provider=e2b`, with the inputs that `image/e2b/live-check.md` gives. It must complete, also its disk requirement.
  4. When the template ID changes, write the new JSON value to a file outside the repository. Run `npx wrangler secret put SANDBOX_PROVIDER_ACCOUNTS --name conductive < <file>`, so that the key goes into no command line, and delete the file.
  5. Ask E2B for the documents that `docs/sandbox-provider-accounts.md`, section "Before a real org runs on E2B", lists: a signed data processing agreement, the list of subprocessors, and the protection of personal data that leaves the UK, such as standard contractual clauses with the UK Addendum. The request of the first step can hold this request. Keep E2B's answer and documents with the operator's records.
  6. When the documents arrive, update the Privacy page in `src/marketing/privacy.ts`, section "Transfers to other countries": name the United States as a place of E2B's cloud computers and saved snapshots, and the transfer protection that the signed documents give. Update the effective date of the page, and the E2B sources in `src/marketing/legal-pages.md`.
  7. Keep the weight of `e2b` at 0% in the Providers tab of the operator section until the Privacy page names the United States with E2B's transfer protection. Until then, put only test orgs on `e2b`, with Create org or with Switch account. When E2B refuses the documents, keep the weight at 0%, and choose another second provider.
- **Impact if no action:** Each sandbox on E2B has a 15 GB disk and the Hobby limits, and the live check does not complete. A real org on `e2b` before the Privacy page step sends its data to the United States without a notice and a protection that the Privacy page names.
- **Needs:** The disk, the Pro plan, and the documents from E2B. The E2B API key of the project.
- **Done when:** The live check completes against the template that the Worker uses, and the Privacy page names the United States with E2B's transfer protection, or E2B refuses the documents. Then delete this item.
