# No test pins the untimed E2B binding

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from the branch `calummoore/record-step-times-for-builds-and-2nqj`, review finding 14.
- **Location:** `worker/sandbox/client.ts:43`, `worker/sandbox/README.md:73`
- **Reason:** The code behaves right today. Only the test is missing, and the two fix rounds of the branch were used.

- **Terms:**
  - **Run totals:** the `job_runs` columns that count the provider calls and the D1 calls of one run of a workspace start, with their times.
- **Background:**
  - A workspace object times the provider calls and the D1 calls of each start run. `providerForAccount` gives the provider itself the untimed D1 binding, so the D1 calls of an E2B client count once, inside its provider time. The sandbox README states this.
  - The start record tests use the Boat provider only. A reviewer gave the E2B client the timed binding, and all 15 related tests still passed.
- **Problem:** no test pins that the D1 calls of an E2B client count once.
- **Impact if no action:** a later change could count E2B D1 time twice in the run totals.
- **Root question:** how do the run totals of an E2B start count each D1 call of the E2B client once?
- **Options:**
  - **A.** Add a regression test with `FakeE2b`. It runs one `create` in an open run and expects one provider call and no D1 call. Effort: Small.
- **Left out:** count nested calls once in the timer, because a call of another queue turn must still count in the run. Time calls at the fetch level, because the totals would then count HTTP requests, not provider calls. A check in the shared provider contract suite, because a test for the class needs the user.
- **Wider fix:** None that is not blocked.
- **Previous examples:** None found.
- **Recommendation:** A. One focused test pins the rule that the README states.
- **Action:** fix after merge, apply A, because the two fix rounds of the branch were used.
