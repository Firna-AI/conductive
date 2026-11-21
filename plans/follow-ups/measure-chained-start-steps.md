# Measure the saving of chained start steps

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-21, from branch `calummoore/cut-waits-in-workspace-start-and-resume-fvs3`.
- **Location:** `worker/lifecycle/workspace-alarm.ts`, `worker/lifecycle/start-loop.md`.
- **Reason:** The saving shows only on real starts after the change deploys.

- **Terms:**
  - **Hop:** the time from the end of one start command in the sandbox to the start of the next one.
  - **Step records:** the D1 tables `job_steps` and `job_runs`, which record the begin and end of each start phase and each alarm run.
- **Background:** A workspace start runs its steps in alarm runs of the workspace's Durable Object. Before this change, each hop took 2.3–3.9 s in 4 creates and 4 resumes measured on 17 November 2026, while the commands often took under 1 s. A resume of workspace 253 on 20 November 2026 took 11 alarm runs over 26.7 s, with 15.8 s between runs, including 9 gaps of exactly 1.0 s. The change chains forward phases in one run and polls every 250 ms during the first 5 s of a wait. The expected saving was about 4.5–6 s per create and 1.5–2 s per resume.
- **Task:** After the deploy, measure at least 3 creates and 3 resumes. Read the step records, and for a few starts also the sandbox journal (`sudo journalctl -b`, lines with `conductive-lifecycle` and `exec_detached`). Compare each hop and the gaps between runs with the numbers above.
- **Impact if no action:** Nobody knows whether the saving is real, and the next performance change has no baseline.
- **Needs:** The deployed change, and read access to production D1.
- **Done when:** A report to Cal gives the measured hops and total start times before and after, with the sample count.
