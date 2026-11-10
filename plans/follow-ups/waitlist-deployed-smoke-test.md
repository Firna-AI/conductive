# Check the deployed waitlist and invites

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/waitlist-and-invite-system`.
- **Location:** `docs/protocol/waitlist.md`, `docs/protocol/waitlist-codes.md`, and the deployed app at `app.conductive.build`.
- **Reason:** This check needs the merged waitlist, the deployed Worker settings, GitHub sign-in, and the real approval email sender.

- **Terms:**
  - **App access:** The right to use Conductive after approval, a code, or an accepted org invitation.
  - **Operator:** A user whose GitHub ID is in the deployed `OPERATOR_GITHUB_IDS` setting.
- **Background:** A new GitHub account waits for app access. An operator can approve it or share an invite code. Each user with access has a personal code with five uses. The sign-up pause stops codes and invitations for waiting users. Approval still works during the pause.
- **Task:**
  1. Sign in with a new GitHub account that has a primary verified email.
  2. Check that the app shows only the waitlist.
  3. Approve that account from the operator Waitlist tab.
  4. Check that the approval email arrives once and its sign-in link opens the app.
  5. Use an operator invite code with another waiting account.
  6. Use a personal invite code with another waiting account.
  7. Check that each successful use reduces the uses left once.
  8. Pause sign-ups from the operator Invite codes tab.
  9. Check that a waiting account cannot use a code and that the code keeps its uses.
  10. Resume sign-ups and check that the same code can give app access.
- **Impact if no action:** Local checks do not prove that the deployed sign-in, operator setting, migrations, and email sender work together.
- **Needs:** The deployed change, an operator account, new GitHub test accounts, and access to the primary verified inbox.
- **Done when:** Each step passes on the deployed app. Save the results without personal data or credentials.
