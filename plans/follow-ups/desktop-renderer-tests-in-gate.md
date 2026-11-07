# The complete gate skips the desktop renderer tests

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-07, from PR #31, branch `conductor/boat-native-remote-workspaces-milestone-15e-window`, a problem outside the scope that the check of round 1 finding 2 found.
- **Location:** `vitest.config.ts:7` and the checks section of `desktop/README.md`.
- **Reason:** the config and the README line are outside the diff of the branch that found it.

- **Terms:**
  - **Renderer tests:** the unit tests under `desktop/renderer/`, the page code of the Mac app. Today this is `services.test.ts`.
- **Background:** The desktop command `test:logic` runs the tests under `desktop/src/` and `desktop/renderer/`. The Mac CI runs it only when a pull request changes the desktop files. The root Vitest config runs only `desktop/src/**/*.test.ts`. The desktop README says that the root gate includes these unit tests once.
- **Problem:** The complete gate does not run `desktop/renderer/services.test.ts`, although the README says that it does.
- **Impact if no action:** A change outside `desktop/` that breaks the renderer services passes the complete gate, and the Mac CI does not run on it.
- **Root question:** How does the complete gate run every desktop unit test once?
- **Options:**
  - **A.** Add `desktop/renderer/**/*.test.ts` to the root Vitest config, so the gate runs the renderer tests with the others. Effort: Small.
  - **B.** Change the README to say that only the Mac CI runs the renderer tests. Effort: Small.
- **Left out:** A separate gate step for `test:logic`, because it runs the `desktop/src` tests twice. A is better on every point.
- **Wider fix:** A.
- **Previous examples:** None found.
- **Recommendation:** A. One more include runs every desktop unit test once, as the README says.
- **Action:** fix after merge, apply A, because the config is outside the diff of the branch that found it.
