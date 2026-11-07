# Device command recovery is tested at one step only

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, from PR #23, branch `conductor/boat-native-remote-workspaces-milestone-15f`, the wider fix D of round 1 finding 8. The user sees it as item 111.
- **Location:** the device tests in `worker/devices/`.
- **Reason:** a test for a whole class of defect needs the user, as the testing rules say.

- **Background:** PR #23 tests recovery after a failed write of the workspace state, with a restart and a replay.
- **Problem:** A failure at another step of the publication path has no test.
- **Impact if no action:** A recovery defect at another step can pass the tests.
- **Root question:** How do the tests prove recovery after a failure at any step?
- **Options:**
  - **A.** Keep the one recovery test. Effort: Small.
  - **D.** Fail each step of the publication path in turn, restart the object, replay, and check the final state. Effort: Medium.
- **Left out:** None.
- **Wider fix:** D.
- **Previous examples:** None found.
- **Recommendation:** A, because the one test covers the path that changes the user-visible state.
- **Action:** ask the user, because D is a test for a whole class.
