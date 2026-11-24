# Report part reads build every chunk key

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, wider fix split from finding 1 of the review of PR #674 (branch `calummoore/memory-projection-reader-release-jrq9`).
- **Location:** `partChunkKeys` and its callers in `worker/files/report-storage.ts:30` (`storedPart`, `storedParts`, `storedReportKeys`).
- **Reason:** The projection writer uses bounded reads for old projection chunks. Runner report part reads still build all their keys before the first read.

**Terms**
- **Report part:** one stored part of a multipart runner file report under `files:runner:v1:<kind>:<part>`, with its chunk count in a part manifest.

**Background:** `worker/files/stored-chunks.ts` reads old projection chunks in batches of at most 64 keys. It stops at the first missing chunk. The report part readers still build the full key list from the stored count. A review check of the former projection reader measured a 128 MB heap crash of the workspace object with a damaged count of about 2,000,000 chunks.

**Problem:** A damaged stored chunk count makes the Worker allocate every key before its first read.

**Impact if no action:** A damaged record can reset the workspace Durable Object instead of giving the invalid file response. Valid data is not affected.

**Root question:** How do the report part readers stop early on damaged counts?

**Options:**
- **A.** Use the batched reader in `worker/files/stored-chunks.ts` for the reads of `storedPart` and `storedParts`. Check the key list that `storedReportKeys` builds for cleanup. Effort: Small.
- **B.** Cap the stored chunk count at parse time. Effort: Small. It adds a new rejection, which needs the user.

**Left out:** None.

**Wider fix:** A shares bounded chunk reads between old projections and runner report parts.

**Recommendation:** A.

**Action:** fix after merge.
