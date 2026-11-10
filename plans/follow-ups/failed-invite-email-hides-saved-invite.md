# A failed invite email hides the saved invitation

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, item 3 of the diagnosis of a failed org invitation, branch `calummoore/member-invite-failure`.
- **Location:** `src/members/membersStore.ts:164`, `src/members/InviteSection.tsx:99`, and the invite case of `src/members/MembersTab.dom.test.tsx:142`.
- **Reason:** The fix is in the members screen, outside the Worker fix that restores invitation emails.

- **Terms:**
  - **Members tab:** the org settings tab in `src/members/` where an admin invites people and sees the members and the saved invitations.
  - **Members store:** `createMembersStore` in `src/members/membersStore.ts`. It holds the loaded members and invitations and runs each change.
- **Background:**
  - The invite route saves the invitation first. Then it sends the email. When the email fails, the route returns `502 invite_email_failed`, and the invitation stays saved.
  - The invited person can still accept the saved invitation. They sign in with a GitHub account that lists the invited email as verified.
  - The members list shows each saved invitation with a Cancel button.
  - On a failed change, the members store records only the failure. It does not load the list again.
- **Problem:** After a failed email, the list shows no row for the saved invitation until the page loads again. The notice says "The invite to <email> failed", so the admin thinks that nothing was saved.
- **Impact if no action:** The admin does not know that the person can still accept. The admin can cancel the invitation only after a reload.
- **Root question:** How does an admin learn that the invitation was saved when its email fails?
- **Options:**
  - **A.** Load the members list again after an `invite_email_failed` error, so that the saved invitation shows with its Cancel button. Keep the failure notice. Effort: Small.
  - **B.** Do A, and also change the notice to say that the invitation is saved and that the person can accept it after they sign in. This changes user-facing text, so it needs the user's approval. Effort: Small.
- **Left out:** The invitation in the body of the error reply, added to the list by the store. It changes the API error shape, and A gives the same result with no API change.
- **Wider fix:** None. No other change of the members tab leaves a saved record after a failure.
- **Previous examples:** None found.
- **Recommendation:** A. It shows the true state with no change to the API or the text.
- **Action:** fix after merge, apply A, because the fix is in the members screen, outside the Worker fix that restores invitation emails.

The existing invite case of `src/members/MembersTab.dom.test.tsx` fails an invite with a `500 internal_error`. Add a `502 invite_email_failed` reply to that case, and expect the saved invitation in the list after the failure. The error code is in `worker/invitation-mailer.ts`.
