# File report chat tests have no shared folder

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-24, from branch `calummoore/object-memory-runner-report-limits-0m1g`, the wider fix of review finding 126 of round 8.
- **Location:** `worker/files/README.md:255` and the `worker/chat/runner-*` file report tests.
- **Reason:** The direct fix corrected the command, and the move touches six test files and their imports.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Review.
- **Category:** Test.
- **Location:** See the header.
- **Background:** `worker/files/README.md` gives a hand-written command that lists the chat backend's file report tests by name. The 300-line lint forces test splits, and a split in review finding 51 created a file that the command missed.
- **Problem:** The next split can again create a test file that the documented command does not run.
- **Impact if no action:** A targeted run can skip file report tests silently.
- **Root question:** How does the documented command keep selecting every chat backend file report test when a test file splits?
- **Options:**
  - **A.** Move the six tests into one folder, such as `worker/chat/file-reports/`, and select that folder in the README. Effort: Medium.
- **Left out:** The whole chat folder, which selects 217 test files.
- **Wider fix:** A.
- **Previous examples:** Review finding 126 of the same branch.
- **Related:** None.
- **Recommendation:** A.
- **Action:** fix after merge, apply A, because the direct fix already corrected the command.
