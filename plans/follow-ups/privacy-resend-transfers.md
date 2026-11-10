# The Privacy page gives no Resend transfer safeguard

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/betterstack-implementation-brainstorm`, finding 2 of the report on the Privacy page words for Better Stack error reporting.
- **Location:** `src/marketing/privacy.ts:52` (the Resend entry of "Who gets your data"), `src/marketing/privacy.ts:96` (the section "Transfers to other countries"), and `src/marketing/legal-pages.md:30` (the sources for the review of the legal pages).
- **Reason:** The gap exists on `origin/main`, and the error reporting change that found it does not change what Resend gets.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Privacy page:** the public privacy notice at `conductive.build/privacy`. Its text lives in `src/marketing/privacy.ts` and `src/marketing/privacy-uses.ts`. The mockup catalogue shows the same text.
  - **Resend:** the email service that sends the org invitations and the approval emails of Conductive, from `invites@mail.conductive.build`.
  - **Transfer safeguard:** the legal ground for a transfer of personal data to another country, such as an adequacy regulation, a Data Privacy Framework certification, or standard contractual clauses.
- **Background:**
  - "Who gets your data" in `src/marketing/privacy.ts` names Resend. It says that Resend sends the org invitations and the email when an operator approves an account. It says that Resend gets the address and the text of each email.
  - An invitation email holds the invited email address, the org name, the name of the member who invited, and the invitation link. The approval email goes to the primary verified email of the GitHub account.
  - "Transfers to other countries" in the same file starts with a general paragraph. It says that the providers can process data in other countries, including the United States.
  - The section then gives one entry for each of Cloudflare, GitHub, Better Stack, the cloud computer provider, and Anthropic and OpenAI. Each entry states the safeguard that the published terms of that provider give. No entry covers Resend.
  - `src/marketing/legal-pages.md` lists the sources for the review of the legal pages. Its ICO guidance and Article 13 of the UK GDPR ask a notice to give the safeguards of each transfer.
  - That list holds the published terms of each other provider. It holds no terms of Resend.
  - The Resend entry of "Who gets your data" came in commit `af96807f` on 9 November 2026, with no transfer entry.
- **Problem:** The Privacy page names Resend as a recipient of email addresses, but it gives no safeguard for a transfer of that data to another country.
- **Impact if no action:** The page stays incomplete for one recipient. A reader cannot learn how the email data is protected abroad.
- **Root question:** How does the Privacy page describe the transfer safeguards of the email service?
- **Options:**
  - **A.** Read Resend's published data processing terms. Add a Resend entry to "Transfers to other countries" that states only what those terms provide, as the other entries do. Add those terms to the sources for the review in `src/marketing/legal-pages.md`. Effort: Small.
  - **B.** When Resend's published terms do not cover transfers from the UK, ask Resend for an agreement that does. Then apply A. Resend controls the time of its answer. Effort: Medium.
- **Left out:**
  - Change nothing: it fails the goal. The general paragraph names the United States, but it gives no safeguard.
  - Describe the email service by its kind: the "Legal pages" section of `src/marketing/README.md` says that the Privacy page names each outside service that gets user data.
- **Wider fix:** None. The ICO checklist in the sources of `src/marketing/legal-pages.md` already asks for the transfers of each recipient. The legal-pages rule in `AGENTS.md` asks each change of a fact to read both legal pages in full.
- **Previous examples:** `plans/follow-ups/cloud-provider-transfer-agreement.md` records the same kind of gap for the cloud computer provider.
- **Related:** `plans/follow-ups/cloud-provider-transfer-agreement.md`: the same kind of gap for another provider. Each provider needs its own check of its terms, so the two items stay apart.
- **Recommendation:** A. The other entries state what the published terms of each provider give, so one entry and one source close the gap. B applies only when those terms fall short.
- **Action:** fix after merge, apply A, because the gap exists on `origin/main`, and the error reporting change does not change what Resend gets.

When the text of the Privacy page changes, update its effective date in `src/marketing/privacy.ts`. The Terms page needs no change, because no sentence of it names the email service.
