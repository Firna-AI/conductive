# A member suspension leaves start steps open

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from the branch `calummoore/record-step-times-for-builds-and-2nqj`, review finding 10.
- **Location:** `worker/lifecycle/start-job-records.ts:206`, `worker/members/workspace-receiver.ts:84`
- **Reason:** It needs a member suspension during a start, and it changes only the end time of operator records.

- **Terms:**
  - **Start records:** the `job_steps` and `job_runs` rows of a workspace create or resume, with the begin and the end of each step.
  - **Record meta:** the entry `lifecycle:job-record-meta` in the workspace object storage. It names the start whose records the buffer holds.
- **Background:**
  - A start closes its open steps at its job end. When a lifecycle run ends and finds no start job, `StartJobRecords.end` closes the open steps of the record meta as `failed`, at the end time of that run.
  - A member suspension deletes `lifecycle:start-job` in `worker/members/workspace-receiver.ts`, after the chat queue is idle, so no run is open. It then removes every regular alarm.
- **Problem:** the steps of that start stay open until a later lifecycle run or a later start of the workspace. They then get the time of that later run, which can be days late.
- **Impact if no action:** a suspended start shows steps that last for days, and a query of step lengths counts them.
- **Root question:** when does a start that a suspension removes close its steps?
- **Options:**
  - **A.** Close the open steps in the suspension transaction. Effort: Small. It adds record code to the member receiver.
  - **B.** Keep the end time of the latest run of the start in the record meta. When a run or a new start finds the start job gone, close the open steps at that kept time. Effort: Small.
  - **C.** Send the suspension through the start job storage, so that it calls the job end. Effort: Medium.
- **Left out:** a timer that closes the steps, because the suspension removes the alarms.
- **Wider fix:** B. Any removal of a start job then closes its steps at the last known time.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the record code in one module and gives the right time.
- **Action:** fix after merge, apply B, because the case needs a suspension during a start.
