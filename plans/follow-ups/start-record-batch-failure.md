# A failed start record batch drops good rows

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from the branch `calummoore/record-step-times-for-builds-and-2nqj`, review finding 5.
- **Location:** `worker/lifecycle/start-record-send.ts:49`, `worker/lifecycle/start-record-buffer.ts:185`, `worker/lifecycle/start-record-patches.ts:22`
- **Reason:** The case needs a failed D1 batch, and the rows feed only operator and agent queries, so the fix can follow the merge.

- **Terms:**
  - **Start records:** the `job_steps` and `job_runs` rows of a workspace create or resume. They hold the begin and the end of each step, and one row for each run of the start.
  - **Record buffer:** the start records that wait in the Durable Object storage of the workspace, under the key prefix `lifecycle:job-record:`, until a shown-state write sends them.
  - **Shown-state write:** `persistLifecycleState` in `worker/lifecycle/workspace-data.ts`, the D1 write of the state of a workspace. Its batch also carries up to 50 buffered rows.
- **Background:**
  - On 18 November 2026 Cal chose to record every step and every run of a start in D1. The protocol doc `docs/protocol/step-timing.md` says that a record never fails or holds back the job that it measures.
  - `sendStartRecords` in `start-record-send.ts` adds the buffered rows to the shown-state batch. When that batch fails, it writes the shown state alone and deletes every unsent row from the buffer, with a warning.
  - A step row is an upsert. A closing patch writes the end of the step and keeps the first begin.
- **Problem:** one short D1 error drops good rows too. A dropped open step comes back at its close with a begin equal to its end. A dropped close leaves the D1 row open for good.
- **Impact if no action:** some starts get steps of zero length or steps that never end, and queries count them as real.
- **Root question:** how does a failed batch keep the start records right, while a bad row still never holds back the shown state?
- **Options:**
  - **A.** Let a closing patch change only a step that the buffer still holds. Effort: Small.
  - **B.** Do A. Also send the rows once more in their own batch, and drop them only when that fails too. Effort: Small.
  - **C.** Do A. Also keep unsent rows after a failure, and drop a row only after its second failed send. Effort: Small.
- **Left out:** retry the state and the rows together until they pass, because a bad row would then hold back the state.
- **Wider fix:** C. A row leaves the buffer only after D1 holds its latest copy, or after two failures.
- **Previous examples:** None found.
- **Recommendation:** C. It keeps good rows through a short error and still drops a bad row.
- **Action:** fix after merge, apply C, because the case needs a failed D1 batch, and the rows feed only operator queries.
