# Account deletion has a contract but no route

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the options check of the waitlist plan on branch `calummoore/waitlist-and-invite-system`.
- **Location:** `src/shared/account.ts:10`, `src/test-support/fake-core-routes.ts:41`, and `docs/protocol/orgs-and-members.md:118`.
- **Reason:** The waitlist does not need it, and each option adds or removes behaviour at a boundary, which the user decides.

- **Terms:**
  - **Account:** the record of one person in the app, made at the first GitHub sign-in.
  - **Fake API:** the development fake under `src/test-support/`, which `npm run dev` serves instead of the Worker.
- **Background:**
  - `ACCOUNT_PATHS.deleteAccount` in `src/shared/account.ts` names `POST /api/account/delete`, with the reply type `DeleteAccountResponse`.
  - Only the fake API serves that path, in `src/test-support/fake-core-routes.ts`. No Worker route serves it, and no screen of the web app calls it.
  - "When a member leaves" in `docs/protocol/orgs-and-members.md` says that the last-admin rule "also holds when the last admin deletes their account".
  - The Privacy draft in `src/marketing/privacy.ts` lets a person ask to delete their data.
  - On 9 November 2026 the user chose a waitlist. A person who waits has an account and a stored GitHub token. The waitlist screen offers no Delete account, because no route exists.
- **Problem:** The contract and a protocol rule name an account deletion that the app does not have. A person can only ask for a deletion.
- **Impact if no action:** A person who leaves the app, or who never gets in from the waitlist, keeps their account and their GitHub token until someone deletes them by hand.
- **Root question:** How does a person get their account deleted?
- **Options:**
  - **A.** Keep deletion a request. Remove the unused path, its reply type, and the fake route, and change the protocol rule to name a deletion on request. Effort: Small.
  - **B.** An operator action that deletes an account on request, on the page of a user in the operator section. It reuses the last-admin rule. Effort: Medium.
  - **C.** A self-service Delete account on the Account page and on the waitlist screen, with a confirm step. It needs the rules for the orgs, the workspaces, and the stored secrets of the person. Effort: Large.
- **Left out:** A deletion that runs on its own after a time, because it adds behaviour that no request asked for.
- **Wider fix:** None, because this is a missing feature, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** B. It meets the request rule of the Privacy draft with one action in the operator section. C gives people the most control.
- **Action:** ask the user, because each option adds or removes behaviour at a boundary.
