# Share bounded reads for stored file chunks

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, wider fix split from finding 1 of the review of PR #674 (branch `calummoore/memory-projection-reader-release-jrq9`).
- **Location:** `readTreeBucket` and `retainOrder` in `worker/files/bucket-delta.ts`, `readOrderText` in `worker/files/bucket-write.ts`. `partChunkKeys` and its callers in `worker/files/report-storage.ts` (`storedPart`, `storedParts`, `storedReportKeys`). `readBucketList` and its private `readChunks` in `worker/files/bucket-read.ts`.
- **Reason:** Runner report part reads build all their keys before the first read. The bucket projection reader has a separate copy of the batched read and string checks.

**Terms**
- **Report part:** one stored part of a multipart runner file report under `files:runner:v1:<kind>:<part>`, with its chunk count in a part manifest.
- **Projection:** the saved file tree and Changes list that the workspace serves while its cloud computer sleeps.

**Background:** `readStoredChunks` in `worker/files/stored-chunks.ts` reads batches of at most 64 keys. It rejects the first missing or non-string chunk. `readBucketList` in `worker/files/bucket-read.ts` has the same batching and checks. The bucket writer keeps that file identical to the deployed rollback reader. The report part readers build the full key list from the stored count. A check of the former projection reader found that a damaged count of about 2,000,000 chunks exhausted the workspace object's 128 MB heap.

**Problem:** A damaged report part chunk count makes the Worker allocate every key before its first read. The two bounded projection readers keep separate limits and checks.

**Impact if no action:** A damaged report part can reset the workspace Durable Object instead of giving the invalid file response. A change to the projection batch size or chunk checks needs two edits.

**Also in scope (finding 81 of the same branch review, 24 November 2026):** the bucket writer repeats three damage checks of the reader: `readTreeBucket` (`worker/files/bucket-delta.ts`) repeats the bucket text parse of `bucket-read.ts`, `readOrderText` (`worker/files/bucket-write.ts`) repeats the order length check, and `retainOrder` (`bucket-delta.ts`) repeats the symbol and offset checks. When `readBucketList` moves onto `readStoredChunks`, give the reader and the writer one bucket text parser and one order check. Keep the writer damage table in the writer tests.

**Root question:** How can projections and report parts share bounded chunk reads and the bucket damage checks?

**Options:**
- **A.** Use `readStoredChunks` for `readBucketList`, `storedPart`, and `storedParts`. Keep the bucket list order and the existing invalid file response. Check the key list that `storedReportKeys` builds for cleanup. Effort: Small.
- **B.** Use `readStoredChunks` for `readBucketList` and cap the stored report part chunk count at parse time. Effort: Small. The new report part rejection needs the user.

**Left out:** None.

**Wider fix:** A shares bounded chunk reads across both projection layouts and runner report parts.

**Related:** `plans/follow-ups/failing-file-event-blocks-runner-events.md`: the same code. Its option A reads the damage checks of `readTreeBucket`, `retainOrder`, and `readOrderText` as one result for unreadable data. Share those checks first, or in the same change. `plans/follow-ups/tree-delta-skips-damaged-order.md`: the same code. Its option A makes `retainOrder` and `readOrderText` run on each tree delta. Make the second change on top of the first.

**Recommendation:** A.

**Action:** fix after merge.
