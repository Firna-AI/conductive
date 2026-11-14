# Tests can still wait with fixed sleeps

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, option E of finding 11 in review round 1 of the branch `calummoore/porto-6ebg` (the terminal control-mode bridge).
- **Location:** `eslint.config.js`, `runner/src/restore-end.test.ts`.
- **Reason:** it adds a lint rule, which the always-on rules leave to the user.

- **Background:** Review round 1 found seven fixed sleeps in the terminal bridge tests, from 300 ms to 8 seconds. The branch replaced them with waits on tmux state. `runner/src/restore-end.test.ts` still has three 50 ms sleeps.
- **Problem:** A fixed sleep makes a test slow, and it can pass or fail on timing instead of on the behaviour.
- **Impact if no action:** New tests can add fixed sleeps again.
- **Root question:** How does the repository keep fixed sleeps out of tests?
- **Options:**
  - **A.** Change nothing, and rely on review. Effort: Small.
  - **B.** Add a `no-restricted-syntax` rule for test files that rejects an awaited `new Promise` around a `setTimeout` above 0 ms, with an `ESLint.lintText` test of the rule, as the `testing` skill describes. Replace the three sleeps of `runner/src/restore-end.test.ts`. Effort: Medium.
- **Left out:** A rule for all code, because production code can need a delay.
- **Wider fix:** B.
- **Previous examples:** Finding 11 of review round 1 of the branch `calummoore/porto-6ebg`.
- **Recommendation:** B. It keeps the class out at a small cost.
- **Action:** ask the user, because it adds a lint rule.
