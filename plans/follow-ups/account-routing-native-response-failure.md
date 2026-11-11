# Account recovery test receives non-JSON native output

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from Complete gate CI run `42810848247` on `calummoore/github-status-bar-actions`.
- **Location:** `worker/lifecycle/account-routing.test.ts`, `worker/lifecycle/backend-test-platform.ts`, `worker/test-support/native-runtime.ts`, and `worker/test-support/native-eviction.ts`.
- **Reason:** The failing test and native backend code are unchanged from main. Its original response and cause were not captured, so this branch applies no speculative test change.

- **Terms:**
  - **Native fixture:** The local Worker and Durable Object runtime used by the backend integration tests.
  - **Restart:** The fixture operation that drains work, evicts the old object, and prepares its replacement.
  - **RPC:** A call to a method on the native test object, whose adapter expects a JSON result packet.
- **Background:** The case `replays a lost allocation and resumes its disk through the stored secondary account` tests account-bound allocation recovery and disk retention. The account-routing file has three cases. Its restart helper returns a promise. The lifecycle test guide requires callers to await restart before using the reconstructed object.
- **Problem:** Complete gate failed this case with `SyntaxError: Unexpected token 'E', "Error: The"... is not valid JSON`. Its stack named undici `parseJSONFromBytes`, `successSteps`, and `readAllBytes`. The run reported 2,121 passed tests and one failed test. It did not retain the failed response status, complete body, path, or project call frame.
- **Rerun outcome:** One local run of the unchanged account-routing file passed all three cases with no failures or skips. A source audit matched all 1,354 relevant backend, runner, shared, and dependency paths to the failed CI checkout `bdc6c0a668063056d6f717dc726deadcb808ad4e`. That local pass does not prove the CI failure's cause or a repair.
- **Suspected source:** At the observed version, the test calls `start.restart()` without awaiting it, then polls storage and advances the actor. Restart can still be draining, evicting, or replacing the native object. The native RPC adapter calls `response.json()` before parsing its result packet. These facts identify an overlap risk and a matching JSON failure surface. They do not prove which request failed or why.
- **Impact if no action:** The complete gate can stop on this native response error. Its current stack can hide the underlying runtime response.
- **Root question:** How can this account recovery test complete reliably through native reconstruction without hiding a real failure?
- **Options:**
  - **A.** Capture the exact failing native request, status, and bounded response. Reproduce the suspected ordering with an explicit restart hold or readiness boundary. Fix the established owner, with every assertion and timeout retained. If restart overlap is confirmed, await its existing completion before storage reads. Effort: Medium.
- **Left out:** An unproved one-line await may miss another runtime cause. Better diagnostics alone do not remove nondeterminism. Retries, sleeps, skips, longer timeouts, or weaker assertions hide the problem. Other code fixes are not real choices until the failure source is established.
- **Wider fix:** The deterministic-testing rule and the native fixture's restart contract are already in force. Choose a structural owner only after the failure trace establishes the cause. Add no class test or new gate without approval.
- **Previous examples:** Native fixture drain and restart readiness were recently corrected to wait for complete work. Those fixes do not establish this error's source.
- **Recommendation:** A. It obtains the missing evidence before choosing a deterministic correction.
- **Action:** fix after merge, apply A, because this unchanged native test needs a separate investigation rather than a speculative fix in the pull request action branch.

Keep all secondary-account, lost-result, credential, retention, restart, and branch assertions. Prove any proposed fix with the failing ordering and ten passing runs of the changed asynchronous case. Add no permanent repeat. Preserve safe errors and do not log real credentials.
