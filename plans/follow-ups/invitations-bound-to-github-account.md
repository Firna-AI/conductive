# Invitations match a GitHub login, not an account

- **Severity:** High. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #4, branch `conductor/boat-native-remote-workspaces-milestone-15a`, round 2 finding 4 and a new problem of its check. Raised to the user as item 78.
- **Location:** `worker/members/invite-data.ts`, `worker/members/invites.ts`, and `migrations/202611071402_departed_member_invites.sql:6-8`.
- **Reason:** each fix that binds an invitation to the account refuses unknown logins and changes the members protocol, so the user decides.

- **Terms:**
  - **GitHub login:** the user name of a GitHub account, such as `teammate`. An account can rename, and another account can then take the old name.
  - **GitHub ID:** the number of a GitHub account. It never changes.
  - **Departure trigger:** the database trigger that deletes a departed member's pending invitations, from finding 2 of the same review.
- **Background:** An admin invites a person by GitHub login. When a signed-in user accepts, the Worker compares the invitation's login with the login stored for that user at their last sign-in. The departure trigger also matches invitations by the stored login.
- **Problem:** A stored login can be stale. In a reproduction, account 400 accepted an invitation meant for account 500, because both stored records held `teammate`. The departure trigger can also delete a pending invitation for the new owner of a stale login.
- **Impact if no action:** A person who took over a renamed GitHub login can join an org as another person's invitee, and see every workspace of that org.
- **Root question:** How does an invitation admit only the GitHub account that the admin meant?
- **Options:**
  - **A.** Resolve the GitHub ID when an admin creates the invitation, store it, and use it for acceptance and the departure trigger. Refuse a login that GitHub cannot resolve. Effort: Medium.
  - **B.** Resolve the account at creation, and put its ID in a signed invitation identifier. This adds a token format. Effort: Medium.
  - **C.** Let an admin approve the signed-in account before it joins. This adds a step and a new flow. Effort: Large.
  - **D.** A's data change, with the GitHub lookup behind a new members hook. Add `github_id` to `org_invites`, and match acceptance and the departure trigger on `users.github_id`. Refuse a login that has no GitHub account, and answer 502 when GitHub fails. The wiring milestone supplies the hook with the admin's GitHub user token. Effort: Medium.
  - **E.** Let the admin's browser look up the account through GitHub's public API, and send the ID with the login. This changes the fixed invite contract, and the content policy must allow `api.github.com`. Effort: Medium.
  - **F.** Keep the code, name the defect in the members README, and bind each invitation to the account in the wiring milestone, before the acceptance route goes live. Effort: Small.
  - **G.** D, and store the account's display name and avatar on the invitation, so that the members screen shows which account the invitation binds to. This changes a fixed contract and the members mockup. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D. The account ID is the identity everywhere, and the login is only a label.
- **Previous examples:** finding 2 of the same review, an old invitation that survived a removal.
- **Recommendation:** D, with G when the members screens change next. Only G shows the admin which account a login belongs to at invite time.
- **Action:** ask the user, because D refuses unknown logins and changes the members protocol, and G also changes a contract and a mockup.
