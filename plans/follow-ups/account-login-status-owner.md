# The login status of the account has no single owner

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, the wider fix of finding 2 of review round 1 on branch `calummoore/openai-subscription-token-support` (pull request #177).
- **Location:** `src/app/account-model.ts`, `src/app/app-model.ts` (`openApp`), `src/shell/account/AgentList.tsx`, `src/shell/new-workspace/notices.tsx`, `src/chat/state/blockers.ts`, and `src/app/setup-steps.ts`.
- **Reason:** the direct fix reads the login status when the account controls open, and a shared owner reaches the account lifecycle of every view, beyond the files of that branch.

- **Terms:**
  - **AccountModel:** the browser state in `src/app/account-model.ts` that holds the account settings and the status of each agent login.
  - **Login change counter:** the counter in `AccountModel` that each local change of a login raises, so that a reply that started before the change is not applied.
- **Background:**
  - The Worker renews a Codex ChatGPT sign-in alone. When OpenAI refuses a renewal, the Worker saves a cause on the login, and the account page shows "Signed out" and "Sign in again".
  - The browser reads the account once, when the app opens. The direct fix of that branch reads the logins again when the account controls open, and applies a reply only for an agent whose login did not change while the read ran.
  - New workspace, the chat composer, and Get started read the same login status through one rule, `loginUsable`, but no shared owner refreshes it.
- **Problem:** Each view reads its own copy of the login status, and only the account controls refresh it.
- **Impact if no action:** After a refused renewal, New workspace and the chat composer still treat the login as usable until the account page opens or the app reloads. Each new view that reads the status must add its own refresh and its own ordering check.
- **Root question:** How does every view of an open tab show a login status that the server changed?
- **Options:**
  - **A.** Keep the read when the account controls open. Effort: Small.
  - **B.** Give `AccountModel` one watched status source for the account page, Get started, and the composers. It refreshes at each view that needs the status, and it keeps newer local changes when a read finishes. Effort: Medium.
  - **C.** Send the login changes of an account to its browsers through an event stream. It adds a boundary contract. Effort: Large.
- **Left out:** Reload instructions: they leave the recovery controls out of reach during normal use.
- **Wider fix:** B. One owner keeps the status and the ordering rule for every view.
- **Previous examples:** Commit `6c3a1f31` added a refresh after the return from the GitHub App installation. `plans/follow-ups/get-started-reply-order.md` records the related order of the Get started replies.
- **Related:** `plans/follow-ups/sign-in-poll-order.md` changes the same replies of `AccountModel`. B can order its poll replies too.
- **Recommendation:** B. It gives each view the current status, and one place keeps newer local changes.
- **Action:** fix after merge, apply B.
