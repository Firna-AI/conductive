# Verify the Resend transfer disclosure and source

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/betterstack-implementation-brainstorm`, finding 2 of the report on the Privacy page words for Better Stack error reporting.
- **Location:** `src/marketing/privacy-recipients.ts` (the Resend entry of "Who gets your data"), `src/marketing/privacy-transfers.ts` (the Resend transfer entry), and `src/marketing/legal-pages.md` (the sources for the review).
- **Reason:** Main now states a Resend transfer safeguard. The source list still has no Resend terms, and this task has not checked that statement against them.

- **Source:** Implementation. **Category:** Docs or spec.
- **Terms:**
  - **Privacy page:** the public privacy notice at `conductive.build/privacy`. Its text lives in `src/marketing/privacy.ts`, `src/marketing/privacy-uses.ts`, `src/marketing/privacy-recipients.ts`, and `src/marketing/privacy-transfers.ts`. The mockup catalogue shows the same text.
  - **Resend:** the email service that sends Conductive's invitations, approvals, and feedback from `mail.conductive.build`.
  - **Transfer safeguard:** the legal ground for a transfer of personal data to another country, such as an adequacy regulation, a Data Privacy Framework certification, or standard contractual clauses.
- **Background:**
  - "Who gets your data" in `src/marketing/privacy-recipients.ts` names Resend. It now describes invitations, approvals, and feedback, including their recipient addresses and content.
  - An invitation email holds the invited email address, the org name, the name of the member who invited, and the invitation link. The approval email goes to the primary verified email of the GitHub account.
  - "Transfers to other countries" now lives in `src/marketing/privacy-transfers.ts`. Its opening paragraph says that providers can process data abroad, including the United States.
  - Main added a Resend entry in `1da13cc1`. It states that Resend processes email data in the United States and uses standard contractual clauses with the UK Addendum for restricted UK transfers. The same section retains Cloudflare, GitHub, Better Stack, the cloud computer provider, and Anthropic and OpenAI.
  - `src/marketing/legal-pages.md` lists the sources for the review of the legal pages. Its ICO guidance and Article 13 of the UK GDPR ask a notice to give the safeguards of each transfer.
  - The source list still holds no Resend terms. This merge preserves main's public statement without checking or changing its legal claim.
  - The Resend entry of "Who gets your data" came in commit `af96807f` on 9 November 2026, with no transfer entry.
- **Problem:** The Privacy page now states a Resend transfer safeguard, but the review sources still omit Resend's data processing terms. The statement needs the source check that this item originally required.
- **Impact if no action:** The public statement has no recorded source in the legal review notes. A later review cannot check its wording from those notes.
- **Root question:** How does the Privacy page describe the transfer safeguards of the email service?
- **Options:**
  - **A.** Read Resend's published data processing terms. Check the existing Resend transfer entry against them. Correct it if needed, and add those terms to the review sources in `src/marketing/legal-pages.md`. Effort: Small.
  - **B.** When Resend's published terms do not cover transfers from the UK, ask Resend for an agreement that does. Then apply A. Resend controls the time of its answer. Effort: Medium.
- **Left out:**
  - Change nothing: it leaves the existing statement without a recorded source check.
  - Describe the email service by its kind: the "Legal pages" section of `src/marketing/README.md` says that the Privacy page names each outside service that gets user data.
- **Wider fix:** None. The ICO checklist in the sources of `src/marketing/legal-pages.md` already asks for the transfers of each recipient. The legal-pages rule in `AGENTS.md` asks each change of a fact to read both legal pages in full.
- **Previous examples:** `plans/follow-ups/cloud-provider-transfer-agreement.md` records the same kind of gap for the cloud computer provider.
- **Related:** `plans/follow-ups/cloud-provider-transfer-agreement.md`: the same kind of gap for another provider. Each provider needs its own check of its terms, so the two items stay apart.
- **Recommendation:** A. The other entries name published terms, so checking the existing entry and recording its source closes the remaining gap. B applies only when those terms fall short.
- **Action:** fix after merge, apply A, because the remaining source check is separate from integrating the already approved main and error reporting changes.

When the text of the Privacy page changes, update its effective date in `src/marketing/privacy.ts`. The Terms page needs no change, because no sentence of it names the email service.
