# The Mac window test can miss the top navigation

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-08, from PR #46, branch `conductor/boat-native-remote-workspaces-milestone-7w`, a problem outside the scope of its fix round 1. The Mac app job of CI run 42401935324 failed on attempt 1 and passed on attempt 2.
- **Location:** `desktop/tests/frame-navigation.ts:68`, the last check of `expectFrameIsolation`, which `desktop/tests/shell.spec.ts:19` calls.

- **Terms:**
  - **Packaged Mac test:** a Playwright test that starts the built Mac app in Electron. The "Mac app" CI job runs these tests on macOS.
  - **Top navigation:** a link inside a frame that tries to replace the whole page of the Mac window. The app blocks it.
- **Background:** The test puts a sandboxed frame in the Mac window, clicks its `target="_top"` link, and polls a test variable that the main process sets in its `will-navigate` handler. The test expects that the app saw the navigation and blocked it.
- **Problem:** On one CI run, the variable stayed unset until the poll timed out: `Expected: "{\"blocked\":true,\"mainInitiator\":false}"`, `Received: undefined`. The same test passed on the rerun, and the branch changed no Mac code. So the test is flaky. Nobody knows yet whether the click came too early, the event did not fire, or the handler was not attached yet.
- **Impact if no action:** The Mac app job fails now and then on a branch that did not cause it. Each failure costs a rerun and a check of the log, and a real break of the frame boundary can hide behind "a known flake".
- **Root question:** How does the test prove the blocked top navigation without a race?
- **Options:**
  - **A.** Find the race from the trace and the error context of the failed run, and make the test wait for the state that it needs, such as a loaded frame document, before the click. Effort: Small.
  - **B.** Also give the Mac tests one shared helper that attaches a navigation recorder to the main process when the app starts, before any page loads, in place of a handler that each test attaches mid-test. Then every frame and window test waits on the same record. Effort: Medium.
- **Left out:** A retry or a longer time limit, because it hides the race. The testing rules allow it only with the user's approval.
- **Wider fix:** B.
- **Previous examples:** `mac-approval-scroll-flake`, which Milestone 15k fixed.
- **Recommendation:** A. It removes the race at its cause. B pays off only if a second frame test flakes.
- **Action:** fix after merge, apply A, because the flake is outside the scope of PR #46 and blocks no merge.
