# Runner report refusals name no failed check

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-23, wider fix of finding 3 of the review of branch `calummoore/memory-runner-part-checks-2hfc` (PR #672).
- **Location:** `worker/files/runner-reports.ts` (`InvalidRunnerReport` and each `invalid()` call), and the refusal tests in `worker/files/runner-part-checks.test.ts`, `worker/chat/runner-file-parts.test.ts`, and `worker/chat/runner-repair-parts.test.ts`.
- **Reason:** It changes every refusal site, which is outside the purpose of the part check change that found it.

**Terms**
- **Refusal:** `RunnerFileReports.accept` throws `InvalidRunnerReport`, and the chat backend refuses the runner event with the reason `invalid`.
- **Part check:** a check of one part of a multipart runner file report: the order, the fields, the paths, the empty-report rule, or the summary totals.

**Background:** Since 23 November 2026, the workspace checks the fields of each report part on arrival and checks path uniqueness, totals, and the empty multipart rule at the last part. Every failed check throws the same `InvalidRunnerReport` with the message "The runner report is invalid."

**Problem:** A refusal test cannot tell which check refused. A review showed that a test of the empty-report rule passed even when the Worker dropped an empty part 1, because the part order check then refused the same event.

**Impact if no action:** Refusal tests can pass for the wrong reason, and a broken check can stay hidden.

**Root question:** How can each refusal test prove which check refused?

**Options:**
- **A.** Give `InvalidRunnerReport` a typed cause, such as `order`, `fields`, `paths`, `empty`, or `summary`. Each `invalid()` call passes its cause. Tests assert the cause. The wire reason stays `invalid`. Effort: Medium.
- **B.** Keep one error and write each refusal test so that only one check can fail. Effort: Small per test, but it does not prevent the class.

**Left out:** A different wire reason for each check: it changes the runner messages and older runners.

**Wider fix:** A is the structural fix for the class.

**Recommendation:** A.

**Action:** fix after merge.
