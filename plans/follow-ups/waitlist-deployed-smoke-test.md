# Check the deployed waitlist and invites

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from branch `calummoore/waitlist-and-invite-system`. The steps of the waitlist switch were added on 2026-11-09, from branch `calummoore/waitlist-global-toggle-brainstorm`.
- **Location:** `docs/protocol/waitlist.md`, `docs/protocol/waitlist-codes.md`, `docs/protocol/sign-ups.md`, and the deployed app at `app.conductive.build`.
- **Reason:** This check needs the merged waitlist and waitlist switch, the deployed Worker settings and migrations, GitHub sign-in, and the real approval email sender.

- **Terms:**
  - **App access:** The right to use Conductive after approval, a code, an accepted org invitation, or open sign-up.
  - **Operator:** A user whose GitHub ID is in the deployed `OPERATOR_GITHUB_IDS` setting.
  - **Waitlist switch:** The operator control on the Invite codes tab that turns the waitlist off and on. The waitlist is on until an operator turns it off.
  - **Open sign-up:** The state while the waitlist is off and sign-ups are not paused.
- **Background:**
  - Except during open sign-up, a new GitHub account waits for app access. An operator can approve it or share an invite code. Each user with access has a personal code with five uses.
  - The sign-up pause stops codes and invitations for waiting users, and it stops open sign-up. Approval still works during the pause.
  - During open sign-up, each new sign-in gets app access at once, with no waitlist screen. A person who already waits gets app access at their next request. A join link then uses no code.
  - The operator page of such a user names the source "Open sign-up" with the operator who last turned the waitlist off.
  - When the waitlist turns on again, nobody loses app access, and the next new account waits.
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
  11. As an operator, turn the waitlist off from the Invite codes tab, while sign-ups are not paused.
  12. Sign in with a new GitHub account. Check that the app opens with no waitlist screen.
  13. Open the operator page of that user. Check that its app access names open sign-up, with the operator who turned the waitlist off.
  14. Turn the waitlist on from the notice of the switch.
  15. Check that the account of step 12 keeps app access.
  16. Sign in with another new GitHub account. Check that it waits.
- **Impact if no action:** Local checks do not prove that the deployed sign-in, operator setting, migrations, and email sender work together, or that the deployed switch opens sign-up and closes it again.
- **Needs:** The deployed change, an operator account, new GitHub test accounts, and access to the primary verified inbox. The switch steps need two more new GitHub test accounts.
- **Done when:** Each step passes on the deployed app. Save the results without personal data or credentials.
