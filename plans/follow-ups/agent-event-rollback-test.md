# Chat commit tests can miss a split commit

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #29, branch `conductor/boat-native-remote-workspaces-milestone-7s`, a problem outside the scope that the round 2 check of finding 3 found.
- **Location:** `worker/chat/durability.test.ts:57`, `worker/chat/retry-queue.test.ts:105`, and the `failCommit` fault of `worker/chat/memory-storage.test-support.ts:44`.
- **Reason:** the test is outside the diff of PR #29.

- **Terms:**
  - **Receipt:** the storage commit that stores one runner event, its effects, and the new cursor together.
  - **Cursor:** the number of the last runner event that the workspace confirmed.
  - **MemoryChatStorage:** the in-memory store of the chat tests in `worker/chat/memory-storage.test-support.ts`.
- **Background:** The workspace must store a runner event and its cursor in one commit, so that a crash never confirms an event that it did not store. The agent event test in `durability.test.ts` sets `failCommit`, which fails every commit, and then checks that nothing was stored.
- **Problem:** Because every commit fails, the test also passes when the event and its cursor commit in two separate commits.
- **Impact if no action:** A change that splits the receipt of an agent event passes the tests. A crash between the two commits can then confirm an event that the workspace never stored.
- **Root question:** How does the test prove that an agent event and its cursor commit together?
- **Options:**
  - **A.** Use the crash fault that PR #29 adds to `MemoryChatStorage`: the commit lands, and then the call throws. Restart, and check the stored event and cursor. Prove that the test fails against a temporary split. Effort: Small.
  - **B.** Fail only the commit that holds the cursor, as the other receipt tests did before PR #29. It misses an event stored after the cursor. Effort: Small.
  - **C.** Replace the `failCommit` flag with one fixture helper that checks both commit boundaries of an action: first the commit fails and the state equals literal values from before, then the commit lands, the call throws, and after a restart the state equals literal values from after. Use it for this test and for the retry permission test. Effort: Medium.
- **Left out:** A test for each runner event type at once, because a test for the class needs the user. It is option E of PR #29 round 2 finding 3.
- **Wider fix:** C. One fixture helper checks both commit boundaries, so no chat test can use the always-failing fault alone.
- **Previous examples:** PR #29 round 2 finding 3, the same gap in the repair, refusal, and file part receipt tests, commit `353b478`, and PR #33 round 1 finding 1, the same gap in the retry permission test. Its check proposed option C.
- **Recommendation:** C. It removes the always-failing fault as a tool that a test can use alone.
- **Action:** fix after merge, apply C, because the helper changes a shared fixture and a test outside the diffs that found the class.
