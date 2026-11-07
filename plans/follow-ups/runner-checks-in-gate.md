# The complete gate skips the runner's own checks

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-07, from the merge of PR #12, Milestone 7r. The user sees it as item 106.
- **Location:** the `check` script in `package.json`, and `.github/workflows/ci.yml`.
- **Reason:** the fix makes the gate stricter, which the user must approve.

- **Terms:**
  - **Runner:** the agent runner, the Node package in `runner/` that runs the agents in each cloud computer. It has its own typecheck and tests.
- **Background:** The complete gate, `npm run check`, already includes the checks of the Mac app package. It does not include the runner checks.
- **Problem:** Neither the local gate nor CI runs the runner typecheck or the runner tests. The runner reads the shared contracts in `src/shared/`, so a contract change in another milestone can break it.
- **Impact if no action:** A change can break the runner, the program that runs every agent, and every check stays green. This happened on 7 November 2026: the Milestone 7s merge `cbe44cf` added a runner command, and the runner typecheck failed with 3 errors, which no gate reported.
- **Root question:** How does every change prove that the runner still works?
- **Options:**
  - **A.** Add the runner typecheck and tests to `npm run check`, as the Mac app checks are. CI runs them too. About 30 seconds more for each gate. Effort: Small.
  - **B.** Add a separate CI job for the runner, only when `runner/` or the shared contracts change. The local gate of the agents does not run it. Effort: Small.
  - **C.** Change nothing. Effort: Small.
- **Left out:** None.
- **Wider fix:** A.
- **Previous examples:** the Mac app package checks, which the gate already includes, and the Milestone 7s merge above.
- **Recommendation:** A. The runner reads the shared contracts, so a contract change in any milestone can break it.
- **Action:** ask the user, because A makes the gate stricter.
