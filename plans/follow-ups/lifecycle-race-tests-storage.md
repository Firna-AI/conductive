# The lifecycle race tests use a hand-written store

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #21, branch `conductor/boat-native-remote-workspaces-milestone-5`, round 3 finding 24. The user chose to merge without a third fix round (decision 108).
- **Location:** `worker/lifecycle/backend-test-platform.ts:15`, `worker/lifecycle/platform-test-storage.ts:123`, and `worker/lifecycle/platform-storage.ts:106`.
- **Reason:** decision 108 merged Milestone 5 with this finding open.

- **Background:** The admission and cancel race tests run on `backendPlatform`, whose storage uses hand-written maps, rollback rules, and alarms. It calls the function of `blockConcurrencyWhile` directly.
- **Problem:** Removing the native transaction wrapper in `platform-storage.ts` leaves every result of these tests unchanged.
- **Impact if no action:** A transaction or restart defect of the durable create can pass the tests.
- **Root question:** How does the gate fail when the lifecycle breaks under the rules of the real Durable Object: atomic transactions, the concurrency block, and restarts?
- **Options:**
  - **A.** Move the admission and cancel race cases into the existing real-runtime fixture. Effort: Medium.
  - **D.** Keep the fake for the rules that it copies, and type the native transaction: a transaction class that takes a `DurableObjectTransaction`, so that removing the wrapper fails the typecheck. Run the two D1 checks before the concurrency block. Effort: Medium.
  - **E.** Copy the missing rules into the fake, and prove the copy once. Effort: Medium.
  - **B.** Make native Miniflare storage the default lifecycle fixture, and remove the hand-written storage. It needs a clock seam and changes about 22 test files. Effort: Large.
- **Left out:** A contract suite and a forced storage fault, because the testing rules say they never get a test.
- **Wider fix:** D. The type makes the missing wrapper a typecheck error.
- **Previous examples:** the chat tests, which use a fake for most cases and the real object for restarts.
- **Recommendation:** D, with the regression of `creation-admission-restart` in the real-runtime fixture.
- **Action:** fix after merge, apply D, because the user chose to merge Milestone 5 without a third fix round.
