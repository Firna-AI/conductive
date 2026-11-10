# One share setting serves every org of the owner

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the options check of decision 4 of the own endpoint plan on branch `calummoore/cli-proxy-setup`.
- **Location:** "Agent logins" in `docs/protocol/tokens-and-secrets.md` and "Agent logins in a sandbox" in `docs/protocol/isolation.md`, and the share setting on the account page in `src/shell/account/LoginShareSetting.tsx`.
- **Reason:** the own endpoint change keeps one share setting for each login, and this item asks only for text that no current requirement states.

- **Terms:**
  - **Share setting:** the setting of each agent login that says whether the messages of other members can run on it. The column is `no_reuse` of `agent_logins`, keyed by user and agent.
- **Background:**
  - "Agent logins" says that a user's agent logins serve all of that user's orgs (decision 21 of 5 November 2026).
  - Each login has one share setting (decision 116 of 7 November 2026). The column has no org.
  - So when a user shares a company key or a gateway for one team, the members of the user's other orgs can spend it too.
  - The protocol, the account page, and the Terms page do not say this.
- **Problem:** An owner who shares a login for one org cannot see that it is also shared in every other org of theirs.
- **Impact if no action:** A member of another org can spend a company key or a gateway that its owner meant for one team.
- **Root question:** How does an owner learn, or limit, which orgs can spend a shared login?
- **Options:**
  - **A.** State it in the protocol and next to the share switch, for example "Members of all your orgs can use it." Effort: Small.
  - **B.** A share setting for each org of the owner. Cost: a migration, a new screen state, and a change to decision 116. Effort: Large.
  - **C.** Keep it unsaid. Effort: Small.
- **Left out:** A share setting for each session. It sets no default, and the owner would have to answer it in each session.
- **Wider fix:** None. A is the direct text, and B changes the model of the setting.
- **Previous examples:** None found.
- **Recommendation:** A. It tells the owner the scope at the point of the choice, at a small cost.
- **Action:** ask the user, because the text on the account page is new user-visible behaviour that no requirement covers.
