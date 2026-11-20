# Runner connection state that a wake loses

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Wider fix.
- **Added:** 2026-11-20, from finding 1 of the review of branch `calummoore/unable-to-archive-workspace-b6op`.
- **Location:** `worker/chat/runner-connections.ts` (`persist` and `activate`), `worker/chat/runner-connection-store.ts`, and `ActiveRunner` in `worker/chat/types.ts`.
- **Reason:** the branch fixed only the watch deadline of runner work. The class of the defect stays open.

- **Source:** Review. **Category:** code structure.
- **Terms:**
  - **Wake:** the workspace object starts again after hibernation and restores its open runner socket, with no new hello.
  - **Saved runner connection:** the record of the current runner connection that the workspace object keeps in storage, so that a wake can restore it.
- **Background:** `ActiveRunner` holds the state of the current runner connection in memory. `RunnerConnections.persist()` copies a fixed list of its fields into the saved runner connection, and `activate()` copies them back at a wake. Each new field must be added to both lists and to the reader in `runner-connection-store.ts`.
- **Problem:** A field that a change adds to `ActiveRunner` and forgets in those lists lasts only as long as one object instance. The branch met this with the watch deadline of runner work. `ActiveRunner.repositoryMove` is such a field today, so a wake can let the workspace send a second `repository.move` to one connection.
- **Impact if no action:** Each new field of a runner connection can lose its value at a wake, with no test to catch it.
- **Root question:** How does each piece of state of a runner connection last as long as the connection, and not only as long as one object instance?
- **Options:**
  - **A.** Add `repositoryMove` to the saved runner connection, as the branch did for the watch deadline. Effort: Small.
  - **B.** Give the state that a wake must keep one type. `persist()` saves the whole value and `activate()` restores the whole value. One reader accepts older records. Keep handles, such as the peer, outside the type. Mark each field that stays in memory on purpose. Add wake tests for the moved fields. Effort: Medium.
- **Left out:** A test for the class that compares the fields of `ActiveRunner` and the saved record, because it is a new gate and needs the user's approval.
- **Wider fix:** B.
- **Previous examples:** The branch `calummoore/unable-to-archive-workspace-b6op` added `watchUntil` to both lists by hand. Commit `6b82c5176` did the same for the process-start ID.
- **Recommendation:** B, because it removes the two hand-kept lists that cause the class.
- **Action:** fix after merge, apply B, because the refactor touches files outside the diagnostic change of the branch.
