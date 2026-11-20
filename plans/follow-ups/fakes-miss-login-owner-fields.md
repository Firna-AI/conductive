# Test and dev fakes leave out the new login owner fields

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the fix of review findings 3 and 4 on branch `calummoore/delft-zjk2`.
- **Location:** `src/test-support/fake-core-routes.ts` and the session fakes under `src/chat/dev/`.
- **Reason:** no product path depends on these fakes, and the real Worker sends both fields.

- **Source:** Implementation. **Category:** Test.
- **Background:** The Worker now sends `runLogin` in each automation reply, the owner of the login that the runs use, and `defaultLogin` in the record of an empty session, the owner of the login that its first message would take. The app reads a missing `runLogin` as null, and it uses `defaultLogin` only for an empty session that another member started.
- **Problem:** The shared test fake sends automation replies without `runLogin`, so those tests always read null. The chat dev fake gives its new sessions no `defaultLogin`.
- **Impact if no action:** A test that uses the shared fake cannot catch a wrong automation line for the org login. The chat dev fake cannot show another member's empty session on the org login.
- **Root question:** How do the fakes send the same login owner fields as the Worker?
- **Options:**
  - **A.** Add `runLogin` to the automation replies of `fake-core-routes.ts`, and `defaultLogin` to the sessions of the chat dev fake, with the rule that the Worker uses. Effort: Small.
- **Left out:** None.
- **Wider fix:** A.
- **Previous examples:** None found.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because no product path depends on the fakes.
