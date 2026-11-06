# The stop-queue chat test runs near its time limit

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from the merge of PR #1, branch `conductor/boat-native-remote-workspaces-milestone-15e`. Its agent saw the case time out in its workspace, also when the case ran alone. The complete gate on the merged tree passed.
- **Location:** `worker/chat/stop-queue.test.ts:24`.
- **Reason:** CI and the merged tree pass. Only a slower or busier machine meets it.

- **Background:** The case "keeps post-Stop messages queued until stopped, failed, and finished turns end" runs one loop over three end states. Alone, it takes about 2.7 seconds of its 5-second limit.
- **Problem:** On a busy or slower machine, the case passes its limit, and the complete gate fails. The 15e workspace met this when the desktop tests joined the run.
- **Impact if no action:** The complete gate fails now and then in agent workspaces, and agents lose time on reruns.
- **Root question:** How does each chat case stay well inside its time limit?
- **Options:**
  - **A.** Split the loop into three cases, one for each end state, with `it.each`. Keep every assertion. Effort: Small.
  - **B.** A, and make the chat fixture start faster, for example with one runner connection for each file. Effort: Medium.
- **Left out:** A longer time limit, because it hides a slow test, and a raised limit needs the user.
- **Wider fix:** None. The `testing` skill already sets the rules for slow tests.
- **Previous examples:** Decision 85, the members tests that passed their limit under load.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because only a slower or busier machine meets it.
