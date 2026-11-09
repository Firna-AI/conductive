# The Privacy page omits the email provider

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the branch `calummoore/resend-email-setup`.
- **Location:** `src/marketing/privacy.ts:75-105`
- **Reason:** The user must choose between two correct texts for a legal page, and the branch that found the gap only changed the sender domain.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Resend:** the email sending service that sends the invitation emails of the app, through its HTTP API, in `worker/invitation-mailer.ts`.
  - **Privacy page:** the legal page at `/privacy` on the marketing site. Its text lives in `src/marketing/privacy.ts`.
- **Background:**
  - An org admin can invite a person by email. The Worker then sends an invitation email through Resend, from `invites@mail.conductive.build`.
  - Each email gives Resend the invited email address, the org name, the name of the member who invited, and the invitation link.
  - The "Who gets your data" list of the Privacy page names Cloudflare, GitHub, Anthropic, and OpenAI.
  - The list names the cloud computer provider only in general words, because a rule in `CLAUDE.md` keeps that provider's name out of user-facing text. No such rule covers Resend.
  - The list ends with a draft note: "To confirm: the contracts with these providers, and any other recipient".
- **Problem:** The list names no email provider, but each invitation sends personal data to Resend.
- **Impact if no action:** The Privacy page omits a party that gets personal data.
- **Root question:** How does the Privacy page tell people who gets the data of an invitation?
- **Options:**
  - **A.** Add a list item that names Resend and the data that it gets. Effort: Small.
  - **B.** Add the same list item, but write "An email provider" instead of the name. It stays true if the provider changes. Effort: Small.
- **Left out:** Change nothing: it fails the goal, because the page keeps omitting a known recipient. No third approach exists, because the fix is one list item.
- **Wider fix:** None. The `CLAUDE.md` rule for the legal pages already covers this class: a change to a fact in the architecture doc or a protocol doc updates each sentence of the legal pages that restates it.
- **Previous examples:** None found.
- **Recommendation:** A. The page names every other provider, except the one that a repository rule keeps unnamed. B is better if the provider can change.
- **Action:** ask the user, because both texts are correct, and no copy rule picks one.
