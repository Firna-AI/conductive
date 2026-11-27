# File projection tests simulate their transaction

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, finding 82 and the wider fix of finding 52 of the review of branch `calummoore/object-memory-history-and-files-state-14g5`.
- **Location:** `worker/files/test-support/storage.ts:74-124`, `worker/files/test-support/storage-worker.ts`, and the writer tests that use `createFilesStorage`: `worker/files/bucket-delta.test.ts`, `bucket-write.test.ts`, `bucket-rollback.test.ts`, and the mark and stale cases of `bucket-convert.test.ts`.
- **Reason:** No production write uses the adapter that these tests simulate, and the production chat adapter already has native tests.

**Terms**
- **Projection:** the last file tree and changes list that the workspace Durable Object keeps for the Files API, under `files:state:v1`.
- **Files transaction:** the callback of `FilesStorage.transaction` with `get`, `getMany`, `put`, and `delete`. `durableFilesStorage` runs it in one Durable Object storage transaction. `chatFilesStorage` runs it in the current chat transaction.

**Background:** Every production projection write goes through `chatFilesStorage` inside a chat transaction (`worker/chat/store.ts`). Only tests call `durableFilesStorage.transaction`, through `FilesState.apply` and `WorkspaceFiles.connect`. The test helper `createFilesStorage` runs the transaction callback in Node with a `Map` of staged updates and a `Set` of removals, then sends one batch to SQLite. A review showed that all 74 `worker/files` tests still pass when the native durable transaction hides the order keys from reads; the same change in `chatFilesStorage` fails four native chat tests. `worker/chat/files-projection-commit.test.ts` already runs the connection reset and the repository moves through `chatFilesStorage` in a native chat transaction with commit faults.

**Problem:** The writer tests read staged writes from the Node `Map`, not from SQLite, so a native transaction detail can differ from what they check.

**Impact if no action:** A change to native transaction reads or delete results can pass the writer tests. The chat tests catch the production path.

**Root question:** How do the projection writer tests check bucket writes under native transaction behaviour, through the adapter that production writes use?

**Options:**
- **A.** Run the staged writer cases through `chatFilesStorage` inside `nativeChatStore().store.change`, as `worker/chat/files-projection-commit.test.ts` does. Keep the native standalone cases of `bucket-convert.test.ts`. Effort: Medium.
- **B.** Replace the staged transaction of `createFilesStorage` with a bridge that runs the Node callback inside the live `durableFilesStorage.transaction`, for every caller. The chat tests already have such a bridge in `worker/test-support/native-host-bridge.ts`. Effort: Large.
- **C.** Remove the standalone write path (`WorkspaceFiles.connect` and `disconnect`, `FilesState.beginConnection` and `apply`, `durableFilesStorage.transaction`) and do A. It deletes documented functionality on `main`, so it needs the user. Effort: Large.

**Left out:** A pass-through adapter that writes each put at once has no transaction.

**Wider fix:** B removes the simulation for every caller.

**Related:** `plans/follow-ups/hand-written-chat-store-lint.md`: the same class in the chat tests, a test store that skips native transactions. Its lint matches a `transaction` that returns a direct call, so it does not match the longer staged transaction of `createFilesStorage`.

**Recommendation:** A, then B when another storage detail changes.

**Action:** fix after merge.
