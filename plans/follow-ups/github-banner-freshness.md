# The GitHub banner depends on each webhook arriving

- **Severity:** Medium. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #15, branch `conductor/boat-native-remote-workspaces-milestone-13`, the wider fixes F of finding 1 and E of finding 4.
- **Location:** `worker/github/`, and the chat store of the workspace Durable Object in `worker/chat/`.
- **Reason:** both fixes reach code outside the branch that found them, and the first needs the wiring of Milestone 15i.

- **Terms:**
  - **Banner snapshot:** the stored state of the pull request bar and the Checks tab of one workspace.
- **Background:** The GitHub banner backend refreshes a workspace's banner snapshot when a GitHub webhook names a branch or a commit that affects it. Its fix routes pushes by a model of branches and commits, re-reads a few times while GitHub reports an unknown merge state, and stores only a changed snapshot. The GitHub state keeps its own event numbers and delivery receipts beside the chat store.
- **Problem:**
  - Each new kind of change, such as a branch protection change or a lost delivery, needs a new field in the model, or the banner stays stale.
  - The GitHub event numbers and receipts live in their own records, which only a test double checks.
- **Impact if no action:** A banner can stay stale after a change that no webhook names, and a storage defect in the GitHub records can pass the tests.
- **Root question:** How does each open tab show the current GitHub state whatever changed, with one tested store for its events?
- **Options:**
  - **A.** Keep the model of branches and commits, and add each new kind of change when it shows up. Effort: Small each time.
  - **B.** While a tab is open on a workspace, re-read its banner on a slow timer, and on each tab open. Effort: Medium.
  - **C.** B, and move the GitHub event numbers and delivery receipts into the chat store, which already has a restart test on real SQLite. Effort: Large.
- **Left out:** None.
- **Wider fix:** C.
- **Previous examples:** findings 1 and 4 of PR #15.
- **Recommendation:** C, after Milestone 15i wires the Durable Object.
- **Action:** fix after merge, apply C, because it changes the chat store and needs the wiring.
