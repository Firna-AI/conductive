# The agent event rollback test fails every commit

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #29, branch `conductor/boat-native-remote-workspaces-milestone-7s`, a problem outside the scope that the round 2 check of finding 3 found.
- **Location:** `worker/chat/durability.test.ts:57`.
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
- **Left out:** A test for each runner event type at once, because a test for the class needs the user. It is option E of PR #29 round 2 finding 3.
- **Wider fix:** None. PR #29 brings the crash fault to the receipt tests of its diff, and the `testing` skill already asks for a test of each changed boundary.
- **Previous examples:** PR #29 round 2 finding 3, the same gap in the repair, refusal, and file part receipt tests.
- **Recommendation:** A. One crash fault catches a split in either direction.
- **Action:** fix after merge, apply A, because the test is outside the diff of the branch that found it.
