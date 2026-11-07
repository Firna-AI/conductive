# A member cannot refuse the re-use of their login

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, option B of decision 116. The user chose A now and B as a later follow-up.
- **Location:** the login settings of the account page under `src/shell/account/`, the login resolver in `worker/chat/login-access.ts`, the section "Agent logins in a sandbox" of `docs/protocol/access-and-security.md`, and the login text of the Terms page in `src/marketing/terms.ts` and of the Privacy page in `src/marketing/privacy.ts`.
- **Reason:** the user chose to add the setting later.

- **Terms:**
  - **No re-use:** a setting of a member that stops other members from running messages on that member's login.
  - **Linked session:** the new, empty session that a member's message opens on the member's own login, with a link to the first session (decision 115 A).
- **Background:** With decision 105 F, each session runs on the login of its starter, and other members spend that login. Milestone 7w opens a linked session only when the starter's login cannot be used.
- **Problem:** A member cannot refuse that other members use their login. Anthropic's consumer terms forbid making a Claude account available to anyone else, and its rules for hosted products ask each end user to sign in with their own credentials. An API key owner may let their own team use the key.
- **Impact if no action:** A member's Claude subscription serves the other members of their sessions, which risks Anthropic's terms.
- **Root question:** Whose consent lets other members use a login, and how do Claude subscriptions stay within Anthropic's rules?
- **Options:**
  - **B.** Add the "no re-use" setting for each login: on by default for a Claude subscription, and off for an API key. A message of another member in a session whose login refuses re-use opens a linked session. Effort: Medium.
  - **C.** Add the setting, off by default for every login. Effort: Medium.
- **Left out:** Never re-use any login, because decision 105 F replaced that rule.
- **Wider fix:** B. The default follows the rule of each login kind.
- **Previous examples:** Decision 37, the user's permission to use subscription tokens.
- **Recommendation:** B.
- **Action:** fix after merge, apply B, as the user chose on 7 November 2026 (decision 116).
