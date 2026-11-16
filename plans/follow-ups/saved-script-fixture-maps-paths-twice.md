# Saved script fixture maps paths twice

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, while checking Milestone 4 of the org skills repository plan.
- **Location:** `worker/lifecycle/saved-script-test-support.ts:47`, `worker/lifecycle/saved-script-test-support.ts:113`.
- **Reason:** The fault is in a test fixture that the org skills change does not touch, and CI does not meet it.

### 1. Saved script fixture maps paths twice

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Test.
- **Location:** `worker/lifecycle/saved-script-test-support.ts:47`.
- **Background:** The saved script fixture runs a saved start script in a temporary folder. It maps each sandbox path, such as `/home/user/code`, to a path in that folder. It applies each mapping with `replaceAll`, one after the other.
- **Problem:** A checkout that lives under `/home/user/code` gives temporary paths that hold `/home/user/code` again. The later mapping then replaces a path that an earlier mapping made. Git then cannot lock its system settings file.
- **Impact if no action:** In a Conductive cloud computer, whose repositories live under `/home/user/code`, two tests of `worker/lifecycle/runner-environment.test.ts` fail. They are the two "uses the owner login in the Git system settings" tests. They fail with `expected [ 255 ] to deeply equal [ +0 ]` and `could not lock config file`. They pass in any other folder and in CI. Agents in such a cloud computer can read the failure as a fault of their own change.
- **Root question:** How does the fixture map each sandbox path once, whatever the path of the checkout?
- **Options:**
  - **A.** Map each path in one pass: match the longest sandbox prefix at the start of the path, and replace it once. Effort: Small.
  - **B.** Put the temporary folder under a path that holds no sandbox prefix, such as a folder under `/tmp`. The fault stays for any other folder that holds a prefix. Effort: Small.
- **Left out:** Skip the two tests in a cloud computer, because a skipped test hides real faults.
- **Wider fix:** A. It removes double mapping for every path.
- **Previous examples:** None found.
- **Recommendation:** A. It fixes the cause, not only this folder.
- **Action:** fix after merge, apply A, because the fault is in a fixture that the change does not touch.
