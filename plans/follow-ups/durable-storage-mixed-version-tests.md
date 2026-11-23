# No lasting test runs two Worker versions on storage

- **Severity:** Low. **Effort:** Large. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, wider fixes of findings 1 and 5 of the review of branch `calummoore/memory-runner-part-checks-2hfc` (PR #672).
- **Location:** `worker/files/runner-reports.ts`, `worker/files/report-storage.ts`, `worker/files/storage.ts`, and `worker/test-support/test-bundles.ts:60-80`.
- **Reason:** The memory rollout keeps its one-time rollback proofs (an orchestrator call of 23 November 2026). A permanent harness or mutation gate is new scope, outside that rollout.

**Terms**
- **Previous Worker:** the Worker version that was live before a deploy. It runs again after a rollback, and it reads the Durable Object storage that the new version wrote.
- **Mutation testing:** a tool changes conditions in the code on purpose and reports each change that no test catches.

**Background:** Durable Object storage formats, such as the runner report assembly state (`files:runner:v1`) and the file projection (`files:state:v1`), must stay readable by the previous Worker and must read what it wrote. Tests today seed the older format by hand, for example with the shared part writer `reportPartUpdates`. A review of the part check change found two faults that no test caught: a fallback that took the expected fields from the arriving part, and a last-part check that refused every empty report (all 2,764 Worker tests still passed). A fault that a test makes in memory also does not reach the chat tests, because they run a Worker bundle that `worker/test-support/test-bundles.ts` builds separately.

**Problem:** No lasting test runs two Worker versions on the same storage, and no tool measures which conditions of `runner-reports.ts` the tests cover.

**Impact if no action:** A format change that breaks the previous Worker, or an untested condition, can reach production unnoticed. One-time proofs cover only the changes that run them.

**Root question:** Should a later change add a lasting check that two Worker versions can share Durable Object storage, or a mutation test of the report checks?

**Options:**
- **A.** Keep one-time rollback proofs for each storage format change. Effort: Small.
- **B.** Add a harness that builds the Worker of `origin/main` and the branch Worker, and runs both on one storage for each format. Effort: Large.
- **C.** Add mutation testing for `worker/files/runner-reports.ts` in CI. Effort: Medium.

**Left out:** A test for every older Worker version: only the previous Worker must keep working.

**Wider fix:** B covers the class of storage compatibility faults.

**Recommendation:** A for the memory rollout. The orchestrator of the workspace object memory work chose A on 23 November 2026 as an execution call. It adds a one-time handover of a multipart changes report between the two Worker versions in both directions, with a mismatched middle part, to the rollback proof. No gate is added or authorized. Revisit B when another storage format changes.

**Action:** none now. A proposal of B or C needs its own scope decision by the user before any work.
