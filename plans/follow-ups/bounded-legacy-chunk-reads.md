# Old projection and report part reads build every key

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, wider fix split from finding 1 of the review of PR #674 (branch `calummoore/memory-projection-reader-release-jrq9`).
- **Location:** `readChunks` in `worker/files/storage.ts:95-115` and `partChunkKeys` and its callers in `worker/files/report-storage.ts:30` (`storedPart`, `storedParts`, `storedReportKeys`).
- **Reason:** The reader release had to keep the old-layout reader unchanged, so it fixed the bounded read only for the bucket layout.

**Terms**
- **Projection:** the last file tree and changes list that the workspace Durable Object keeps under `files:state:v1`.
- **Old layout:** each list stored as one JSON text in chunks `files:state:v1:<kind>:<i>`, with the chunk count in the manifest.
- **Report part:** one stored part of a multipart runner file report under `files:runner:v1:<kind>:<part>`, with its chunk count in a part manifest.

**Background:** The bucket reader of `worker/files/bucket-read.ts` reads chunks in batches of 64 keys and stops at the first missing chunk. The old-layout `readChunks` and the report part readers build the whole key list from the stored count first. A review check measured a 128 MB heap crash of the workspace object when a damaged count of about 2,000,000 chunks was stored.

**Problem:** A damaged stored chunk count makes the Worker allocate every key before its first read.

**Impact if no action:** A damaged record can reset the workspace Durable Object instead of giving the invalid file response. Valid data is not affected.

**Root question:** How do all chunk readers of `worker/files/` stop early on damaged counts?

**Options:**
- **A.** Move the batched reader of `bucket-read.ts` to one shared helper, and use it in `readChunks`, `storedPart`, and `storedParts`. Effort: Small.
- **B.** Cap the stored chunk count at parse time. Effort: Small. It adds a new rejection, which needs the user.

**Left out:** None.

**Wider fix:** A is the structural fix: one bounded chunk reader for every chunked value of `worker/files/`.

**Recommendation:** A.

**Action:** fix after merge.
