# Report storage test uses the product part key

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, outside the scope of the review of PR #674 (branch `calummoore/memory-projection-reader-release-jrq9`).
- **Location:** `worker/files/report-storage.test.ts:28-42`
- **Reason:** The test is older than the reader release and outside its files.

**Terms**
- **Report part:** one stored part of a multipart runner file report. `partKey(kind, part)` in `worker/files/report-storage.ts` gives its key, `files:runner:v1:<kind>:<part>`.

**Background:** The test "reads old report parts and removes obsolete chunks on replacement, refusal, and a new stream" stores a part in the old one-value format, then checks that the Worker still reads it. It builds the key with the product's own `partKey`.

**Problem:** If a change renames the part key, the test writes the fixture under the new key too. It then passes, while parts that the previous Worker stored under the old key can no longer be read.

**Impact if no action:** A key change that breaks stored report parts can pass this test.

**Root question:** How does the test pin the stored key of an old part?

**Options:**
- **A.** Write the fixture under the literal key `files:runner:v1:tree:1`. Effort: Small.

**Left out:** None.

**Wider fix:** The bucket reader tests already pin a literal record in `worker/files/test-support/bucket-record.ts`. A wider rule is in `plans/follow-ups/durable-storage-mixed-version-tests.md`.

**Recommendation:** A.

**Action:** fix after merge.
