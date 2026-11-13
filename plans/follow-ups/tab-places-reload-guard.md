# No test keeps tab places through a failed chat load

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Test.
- **Added:** 2026-11-13, from review finding 11 on branch `calummoore/seoul-aki1`.
- **Location:** `src/chat/WorkspaceChat.tsx` (the `useFollowTabs` call), `src/shell/workspace/files/chat-files.tsx` (the `useFollowTabs` call).
- **Reason:** The test needs a failed chat load and a second show in the test kits, which is more than a review fix.

- **Terms:**
  - **TabPlaces:** the store in `src/app/tab-places.ts` that keeps the place of each tab of a workspace and forgets a tab that leaves the list of open tabs.
  - **Unknown list:** the `null` that each call site passes while its tabs load. `TabPlaces` then forgets nothing.
- **Background:**
  - When the app shows a kept chat whose load failed, `ChatController.start` resets the snapshot to no sessions and no view.
  - The chat passes `null` while `load.state` is not `ready`. The files pass `null` while the saved view is null.
  - `src/app/tab-places.test.ts` tests that `null` forgets nothing. No test checks that each call site passes `null` during a load.
- **Problem:** A call site that passes the empty list of a load in place of `null` makes every tab forget its place, and no test fails.
- **Impact if no action:** A later change can make each tab lose its place after a failed load, with no failing check.
- **Root question:** How do the tests prove that a load in progress forgets no place?
- **Options:**
  - **A.** Add mounted tests: a session tab and a file tab keep their places when the chat loads again after a failed load. Effort: Medium.
  - **B.** Give each owner one function that returns the open tabs or `null`, such as `openSessionTabs(snapshot)`, and test the function. Effort: Small.
- **Left out:** A lint for the class, because it adds a gate, which the user must approve.
- **Wider fix:** B. Each call site then uses one tested function.
- **Previous examples:** `viewKnown` in `src/shell/workspace/saved-view.ts` puts the "view known" check in one place for saves.
- **Recommendation:** B, with one mounted case of A for the chat.
- **Action:** fix after merge, apply B, because the guard works today and the gap is only in the tests.
