# Fake lifecycle fixture can model a restart

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from the branch `calummoore/resuming-agent-on-timeout-fg44`, the wider fix C of review finding 3.
- **Location:** `worker/lifecycle/durable-test-support.ts:98` (`recreate()`), `worker/lifecycle/durable.test.ts:5`, `:108`, `:173`, `worker/lifecycle/durable-start-failure.test.ts:66`, `:107`.
- **Reason:** the tests that use `recreate()` for a restart claim are on `origin/main`, outside the scope of the branch.

- **Terms:**
  - **Lifecycle fixture:** `lifecycleFixture` in `worker/lifecycle/durable-test-support.ts`. It keeps the lifecycle state in a JavaScript variable and the alarm times in a Map.
  - **Native fixture:** the shared test setup that runs the production workspace object with real local storage and real eviction, through `actor.restart()`.
- **Background:** `recreate()` builds a new lifecycle object over the same fake variables. Tests can then claim that state survives a restart while they never touch persistent storage or the object alarm. The branch moved its own four restart tests to the native fixture.
- **Problem:** `recreate()` still lets any test model a restart over the fake store, and three tests on `origin/main` still do.
- **Impact if no action:** A restart test can pass while production storage or alarm recovery fails. On the branch, one such defect showed only in a native test.
- **Root question:** How do lifecycle tests prove behaviour across a restart?
- **Options:**
  - **A.** Delete `recreate()`. Move each test that names or needs a restart to the native fixture, with `actor.restart()` and every assertion. A test that only reads stored state uses `fixture.lifecycle.read()`. Prove the cover of each move under the removal rule of the `testing` skill. Effort: Medium.
- **Left out:** A lint against restart words in fake-fixture tests, because a new lint needs the user and A removes the case. Removing `lifecycleFixture` for all tests, because it moves unit tests of decision logic to the integration level.
- **Wider fix:** A.
- **Previous examples:** Review finding 3 of the branch `calummoore/resuming-agent-on-timeout-fg44`. Commit `da9ee7bfa` moved GitHub tests to native persistence.
- **Recommendation:** A. It removes the fake restart, so no test can claim it.
- **Action:** fix after merge, apply A.
