# No test covers a failed org image save

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/global-snapshot-simplification`, a new problem of the check of review finding 15.
- **Location:** `worker/lifecycle/image-build-steps.ts:69`.
- **Reason:** the branch did not change this check, so one fix in a separate branch covers it.

- **Terms:**
  - **Org image:** the saved snapshot that every new sandbox of an org starts from. A build saves it in its `snapshot` phase.
- **Background:**
  - In its `snapshot` phase, `advanceBuildStep` in `worker/lifecycle/image-build-steps.ts` saves the build sandbox. When the provider reports the save as `failed`, it throws `Image save failed`, and the build fails at once.
  - The fake providers in `worker/lifecycle/lifecycle-boat-test-support.ts` and `worker/test-support/fake-boat.ts` answer each save and each lookup with the status `ready`.
  - `worker/software-image/recovery.test.ts` covers the same rule for the software image build, with an answer of `failed`.
- **Problem:** No test makes the provider report a failed save of an org image. If someone removes the check, the build waits in its `snapshot` phase until its 60-minute limit, and no test fails.
- **Impact if no action:** A regression can make each failed save wait for the full time limit before the build fails.
- **Root question:** How do the tests prove that a failed org image save fails the build at once?
- **Options:**
  - **A.** Add a case to the org build tests that answers the save with the status `failed`. Assert that the build fails at once, with its saved message, and that its cleanup deletes the build sandbox. Effort: Small.
- **Left out:** A unit test of the step with a stub provider, because the step writes its phase to D1 and the testing rules ask for the entry point that callers use. Only one place can hold the case, so there is no third approach.
- **Wider fix:** None. The `testing` skill already requires a test for each requirement.
- **Previous examples:** `worker/software-image/recovery.test.ts`, the case "fails at once when the provider reports a failed save".
- **Recommendation:** A. It covers the decision at the entry point that callers use.
- **Action:** fix after merge, apply A, because the problem is outside the scope of the branch that found it.
