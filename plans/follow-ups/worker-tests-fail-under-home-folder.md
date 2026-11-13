# Worker tests fail in a checkout under the home folder

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-12, from branch `calummoore/porto-a8k1`, where the complete gate ran in a Conductive workspace.
- **Location:** `worker/lifecycle/saved-script-execution.test.ts`, `worker/lifecycle/runner-environment.test.ts`, `worker/lifecycle/continue-native.test.ts`, `worker/lifecycle/continue-comparisons.test.ts`, `worker/lifecycle/image-snapshot-privacy.test.ts`, `worker/lifecycle/image-sources/local-materialize.test.ts`, `worker/lifecycle/lifecycle-command-recovery.test.ts`, `worker/features/restored-creation-runner.test.ts`, `worker/features/retained-creation-commands.test.ts`, and `worker/chat/integration/retried-creation-restore.test.ts`.
- **Reason:** The branch that met the failures changes no Worker code, so a separate branch must find the cause.

- **Terms:**
  - **Conductive workspace:** a cloud computer where an agent works on one branch. Its checkout is at `/home/user/code/remote-code`, and its home folder is `/home/user`.
  - **Complete gate:** `npm run check`, which runs the typecheck, the lint, the tests, the builds, and the mockup check.
- **Background:**
  - On 2026-11-12, `npm run check` in a Conductive workspace failed 18 tests in 11 files. The branch changed only the web app, the mockups, and the docs.
  - The same 11 files passed, 34 of 34 tests, from a copy of the same tree at `/tmp/main-wt`. They also passed from a checkout of `origin/main` at that path.
  - Two kinds of failure showed. Some tests assert that a command does not contain the home folder, and the checkout path is under it: `AssertionError: expected '/usr/bin/env -i PATH=/usr/bin:/bin HO…' not to contain '/home/user'`.
  - Other tests run Git and Bash in a case folder under the checkout, and Git got a doubled path: `error: could not lock config file /home/user/code/remote-code/.context/boat-native-remote-workspaces/milestone-5/orchestrator-round-2/saved-bash/local-scripts/case-iwNgfp/code/remote-code/.context/boat-native-remote-workspaces/milestone-5/orchestrator-round-2/saved-bash/local-scripts/case-iwNgfp/system-gitconfig: No such file or directory`. The exit codes were 255 or 2 in place of 0.
  - `worker/marketing/built-site.test.ts` failed too, but `plans/follow-ups/built-site-test-cross-device-rename.md` covers it.
- **Problem:** These tests pass or fail by the path of the checkout. A Conductive workspace cannot run the complete gate green.
- **Impact if no action:** An agent in a Conductive workspace must rerun the failed files from a copy under `/tmp` to prove that a change is safe, and can mistake the failures for a regression.
- **Root question:** How do the Worker tests stay independent of where the repository is checked out?
- **Options:**
  - **A.** Make each test build its case folders and its fake home folder under the system temporary folder, never under the checkout. Effort: Medium.
  - **B.** Keep the folders under the checkout, but make the assertions and the Git setup use paths relative to the case folder, so that the checkout path cannot leak into them. Effort: Medium.
  - **C.** Document that the gate needs a checkout outside the home folder, and run the gate there in Conductive workspaces. Effort: Small.
- **Left out:** A skip of these tests in Conductive workspaces, because it hides real failures.
- **Wider fix:** A. One helper for the case folders of every such test removes the class.
- **Previous examples:** `plans/follow-ups/built-site-test-cross-device-rename.md`, another test that depends on where the checkout is.
- **Recommendation:** A. The tests then pass on every machine with no rule to remember.
- **Action:** fix after merge, apply A, because the failures are outside the diff of the branch that met them.
