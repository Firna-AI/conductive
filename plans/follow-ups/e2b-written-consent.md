# Get E2B's written consent and transfer terms for the app's use

- **Severity:** High. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-19, a post-merge task of the plan `plans/e2b-backup-provider.md`, branch `calummoore/e2b-backup-sandbox-provider`, pull request #193.
- **Location:** The request to E2B, and the Privacy page in `src/marketing/privacy.ts`.
- **Reason:** Only the user can ask E2B, and the answer comes from E2B.
- **Related:** `plans/follow-ups/workspace-object-region-per-account.md` asks whether the E2B account moves to E2B's EU cluster. After that move, the Privacy page names no United States region for E2B, and the third step falls away.

- **Background:**
  - E2B's terms at `https://e2b.dev/terms`, read on 19 November 2026, list "Prohibited Conduct". Item 2 bars distributing, selling, reselling, licensing, renting, leasing, or otherwise providing access to the Services, unless E2B authorizes it in writing. Item 9 bars developing third-party applications that interact with the Services without E2B's prior written consent.
  - Conductive gives its users workspaces whose sandboxes run in the app's own E2B project. Users get no E2B account and no E2B key. Only the Worker calls the E2B API.
  - The design keeps every real org off E2B until E2B consents. The weight of `e2b` stays at 0%, and operators put only test orgs on E2B.
  - E2B is FoundryLabs, Inc., a company in the United States. On 20 November 2026, the user chose that the E2B account need not run in the EU. The app's E2B project runs in E2B's default cluster, Google Cloud `us-west1`, in the United States.
  - `docs/protocol/provider-accounts.md`, section "Regions", requires this before a real org runs on an account in a new region: the Privacy page names the countries of that region, and, outside the European Economic Area, the protection of the transfer from the UK. Today the Privacy page names only EU countries for cloud computers, and claims no signed E2B protection.
- **Task:**
  1. Write to `support@e2b.dev`, with a copy to `enterprise@e2b.dev`. Describe the use above, and ask for written authorization under items 2 and 9. In the same request, ask for a 51 GB disk, as `plans/follow-ups/e2b-production-account.md` says. Also ask for the documents that `docs/sandbox-provider-accounts.md`, section "Before a real org runs on E2B", lists: a signed data processing agreement, the list of subprocessors, and the protection of personal data that leaves the UK, such as standard contractual clauses with the UK Addendum.
  2. Keep E2B's answer and documents with the operator's records.
  3. When the documents arrive, update the Privacy page in `src/marketing/privacy.ts`, section "Transfers to other countries": name the United States as a place of E2B's cloud computers and saved snapshots, and the transfer protection that the signed documents give. Update the effective date of the page, and the E2B sources in `src/marketing/legal-pages.md`.
  4. When E2B consents and the Privacy page names the United States, real orgs may get a weight on `e2b`. When E2B refuses, keep the weight at 0%, and choose another second provider.
- **Impact if no action:** A real org on E2B can breach E2B's terms, and E2B can then suspend the app's project. Its data would also go to the United States without a notice and a protection that the Privacy page names.
- **Needs:** The user's E2B account.
- **Done when:** E2B's written answer exists, and the Privacy page names the United States with E2B's transfer protection, or E2B refuses. Then delete this item.
