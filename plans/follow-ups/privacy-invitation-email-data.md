# The Privacy page omits the invitation email data

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the branch `calummoore/resend-email-setup`.
- **Location:** `src/marketing/privacy.ts:39-41` (the GitHub account item), `src/marketing/privacy.ts:50-52` (the orgs item), `src/marketing/privacy.ts:75-105` (the "Who gets your data" list), and `docs/architecture/components.md:125-139` (the "External services" list).
- **Reason:** On 9 November 2026, the user chose to merge the change of the sender domain first and to decide the wording of this legal text later.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **Privacy page:** the legal page at `conductive.build/privacy`. Its text lives in `src/marketing/privacy.ts`, and the mockup catalogue shows the same text.
  - **Resend:** the email service that sends the invitation emails, through `worker/invitation-mailer.ts`, from `invites@mail.conductive.build`.
  - **Verified email:** an email address that GitHub has confirmed for an account. The app keeps them in the `user_verified_emails` table.
  - **Legal-pages rule:** a repository rule in `AGENTS.md`. A change to a fact in the architecture doc or a protocol doc also updates each legal-page sentence that restates the fact.
- **Background:**
  - An admin invites a person by email. The Worker stores the invitation, then sends the email through Resend.
  - Each email gives Resend the invited email address, the org name, the name of the member who invited, and the invitation link.
  - At each sign-in, the app reads the verified emails of the GitHub account and stores them. A stored email that matches an invitation shows that invitation to the person.
  - `docs/protocol/orgs-and-members.md` states both facts as requirements.
  - The Privacy page identifies Firna Ltd as the operator and uses its legal contact address.
  - The page has two lists. "What Conductive uses, and why" says what the app keeps. "Who gets your data" names the outside parties that get data.
  - "Who gets your data" names Cloudflare, GitHub, Anthropic, and OpenAI. It names the cloud computer provider only in general words, because a rule in `AGENTS.md` keeps that name out of user-facing text. No such rule covers Resend.
  - The email invitations came in commit `b33e083` on 6 November 2026. The legal-pages rule came on 8 November 2026. So no rule asked that change to update the legal pages.
- **Problem:**
  - "Who gets your data" names no email provider, but each invitation sends personal data to Resend.
  - "What Conductive uses, and why" does not list the verified emails. It also does not say that an invitation holds the email address of the invited person.
  - The "External services" list in `docs/architecture/components.md` does not name Resend either.
- **Impact if no action:** The Privacy page omits one recipient and one kind of stored data. Once the deployed Worker sends from `mail.conductive.build`, real invitation data goes to Resend, and the page does not say so.
- **Root question:** How does the Privacy page tell people what the app does with the email addresses of the invitation feature?
- **Options:**
  - **A.** Name Resend in "Who gets your data", with the data that it gets. Also add the verified emails and the invited email address to "What Conductive uses, and why". Also add Resend to "External services". Effort: Small.
  - **B.** Do the same as A, but write "An email provider" instead of "Resend". This text stays true if the provider changes. Effort: Small.
- **Left out:**
  - Change nothing: it fails the goal, because the page omits a recipient and some stored data.
  - Fix only the recipients list: it fails the goal, because the page still omits the stored verified emails.
  - No third naming approach exists. The page names either the service or its kind.
- **Wider fix:** None. The legal-pages rule now covers this class. It came two days after the email invitations, which explains this gap.
- **Previous examples:** Commit `3f3d7b9`, on 7 November 2026, corrected the legal drafts after the login-sharing feature changed whose login a session uses.
- **Related:** `plans/follow-ups/privacy-invitation-item-stale.md` corrects this item. The Privacy page already names Resend and the verified emails, so two of its gaps are stale.
- **Recommendation:** A. The page names every other outside party, except the cloud computer provider that a repository rule keeps unnamed. B protects the page better if the email provider changes. Both forms identify the recipient of the invitation data.
- **Action:** ask the user, because both texts are correct, and no copy rule picks one.

Example text for option A:

- "Who gets your data": "Resend sends the invitation emails. It gets the invited email address, the org name, the name of the member who invited, and the invitation link."
- The GitHub account item: add "and the verified email addresses of the account. They match you to the invitations that name one of them."
- The orgs item: change "invites" to "invites, with the email address that each invite names".
- `docs/architecture/components.md`, under "External services": "**Resend:** sends the invitation emails, from `invites@mail.conductive.build`."
