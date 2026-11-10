# Software image failures can lose error reports

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from finding 1 of the main integration review of `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/software-image/build.ts:53-104` and `:116-131`, `worker/software-image/steps.ts:59-74`, `:97-117`, and `:126-127`, `worker/software-image/data.ts:103-134`, `worker/software-image/repair.ts:17-23`, and `worker/application-scheduled.ts:31-38`.
- **Reason:** The failure needs an unusual provider or download fault. The fix has the same cost after merge.

- **Source:** Review.
- **Category:** Product bug.
- **Terms:**
  - **Software image:** A saved sandbox image that contains Conductive's own software, without org data or scripts.
  - **Better Stack:** The service that receives Conductive's filtered error reports.
  - **Guarded write:** A database update that succeeds only for the attempt's current phase and revision.
- **Background:** Software image builds run through deploy requests and scheduled repairs. They run only Conductive's setup commands. `docs/protocol/error-reporting.md` requires one report when a catch hides an unexpected failure. A failed outside service is unexpected. The deploy route returns HTTP 200 with the build state, its fixed error text, and its kept output.
- **Problem:** A failed snapshot makes `steps.ts` throw `Error('Software image save failed')`. The catch in `advanceSoftwareImage` saves the failed state, completes cleanup, and returns normally. The repair catch therefore reports nothing. The deploy response is not 5xx, so the request reporter also reports nothing. Failed command states and the outer 60-minute check can end a build without a report too.
- **Impact if no action:** Better Stack receives no event for these failures, even with reporting enabled. The operator must use deployment output. A build that finishes after the deploy wait ends can leave its failure only in D1.
- **Root question:** How does each unexpected failure that ends a software image build give one report?
- **Options:**
  - **A.** Report when the existing catch successfully records a failed build. Extend the existing failed-snapshot test to assert one filtered event. This does not cover failed-command writes or the outer time limit. Effort: Small.
  - **B.** Add one helper that records and reports terminal failures. Use it in the catch and failed app-software command branches. Keep normal attempt changes and transient retries outside it. A later direct failed write can still omit reporting. Effort: Medium.
  - **C.** Return a typed internal failure outcome from advancement. Report it in the deploy and repair adapters. Preserve their current responses. Carry the cause through more callers. Effort: Medium.
  - **D.** Make one data-layer operation the only way to record a failed software image. Remove `failed` from the general write type. Distinguish a replacement from an unexpected failure with its cause. Keep output, offsets, phase, and failed state in one guarded update. Report only after that update succeeds. Move every failed write to this operation. Effort: Medium.
  - **E.** Add a lint for catches that neither rethrow nor report, with a marker for normal results. This adds a new lint and needs user approval. Effort: Large.
  - **F.** Make each unexpected end throw into the existing catch. Save failed-command output before throwing `CommandFailed`. Throw `JobTimeLimit` for the outer limit. Report after the catch's guarded write succeeds. This needs two writes for a failed command. Effort: Medium.
- **Left out:**
  - Change nothing or log only. Neither meets the reporting requirement.
  - Return HTTP 500. The deploy workflow retries 5xx responses until its 15-minute deadline. It then loses the failed result and kept output. The cron path still needs a report.
  - Report from the general writer by matching error text. This loses the original cause and its source frames. D keeps the cause.
  - Report only from the snapshot provider operation. It cannot cover failed setup commands and the time limit.
- **Wider fix:** D. One write operation and its input type prevent an unreported failed-state write. E detects the class but adds a blocked lint.
- **Previous examples:** Org image builds throw on a failed save in `worker/lifecycle/image-build-steps.ts`. Their catch reports in `worker/lifecycle/image-builds.ts`. Only their failure handler calls `failBuild` in `worker/lifecycle/build-data.ts`.
- **Recommendation:** D. It closes every terminal failure path without changing deploy responses or splitting the guarded state write. The first review recommended B. The independent check found that D also covers the outer time limit and prevents future omitted paths.
- **Action:** fix after merge, apply D, because the likelihood is Rare, severity is Medium, and the fix does not get harder after merge.

Keep these contracts when applying D:

- Preserve the deploy response's HTTP 200, `state`, `error`, and `keptOutput`.
- Preserve the saved fixed error text, cleanup, cron continuation, and deploy result.
- Send a report only for the attempt whose guarded failed-state write succeeds.
- Keep `AttemptChanged`, replacements, and planned transient retries silent.
- Keep failed-command output and offsets in the same guarded update as the failed state.
- Give a failed command its `CommandFailed` cause. Use a fixed warning with a typed phase. Send no command output, provider message, credential, or ID in the report.

Move the failed writes in `build.ts` and `steps.ts` to the new operation. These include the catch, outer time limit, replacement, install command, and cleanup command. Give publication its own accepted state.

Extend the existing cases in `worker/software-image/recovery.test.ts`, `build.test.ts`, and `maintenance.test.ts` for failed saves, failed commands, the time limit, and replacements. Keep their state, output, cleanup, and response assertions. Assert one filtered report for each unexpected end and none for a replacement or planned retry. A real regression must fail before the fix. Run each changed asynchronous case ten times. Run the complete gate.
