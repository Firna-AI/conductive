# Terminal test keeps its own access-read pause

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from branch `calummoore/npm-run-dev-preview-issue`, the finding check of review finding 3.
- **Location:** `worker/terminal/access.test.ts:169-193` and `:204`, and the helper `holdFirstAccessRead` in `worker/previews/stream-test-support.ts`.
- **Reason:** the copy is in the terminal tests, which the preview branch did not change.

- **Source:** Review. **Category:** Test.
- **Terms:**
  - **Access read:** the D1 query of `readConnectionAccess` in `worker/security/connection-access.ts`. It checks a session, its user, its org membership, and the workspace. Preview and terminal connections both use it.
  - **`holdFirstAccessRead`:** a test helper in `worker/previews/stream-test-support.ts`. It wraps `harness.env.DB`, counts access reads, pauses the first one until the test releases it, and gives a `restore` function.
- **Background:**
  - Tests of streams and sockets pause an access read to check what happens while the read waits.
  - Branch `calummoore/npm-run-dev-preview-issue` added `holdFirstAccessRead`, and moved the three preview batching tests in `worker/previews/batching.test.ts` to it. Each test restores the database in `finally`.
  - The test "expires an idle terminal grant while an access read waits and cannot revive the closed registration" in `worker/terminal/access.test.ts` still builds its own D1 proxy. It finds the access read by the text `connectionNumber` in the query, and it pauses every read until the release.
  - It restores `harness.env.DB` at its last line, not in `finally`.
- **Problem:** The same test pause has a second implementation. When this test fails or times out before its last line, the wrapped database stays in place and pauses the access reads of later tests in the file.
- **Impact if no action:** A change to the access query or to the pause needs two edits. One failure in this test can make later terminal tests fail too.
- **Root question:** How do the terminal tests pause an access read with the same helper as the preview tests?
- **Options:**
  - **A.** Use `holdFirstAccessRead` in the terminal test, and restore in `finally`. The test already imports `barrier` from `worker/previews/stream-test-support.ts`. Check first that the test makes one access read before its release, because the helper pauses only the first read. Keep every assertion. Effort: Small.
  - **B.** Do A, and move the helper to a shared test-support file of the Worker, such as `worker/test-support/`, because two areas then use it. It touches every importer of the helper. Effort: Small.
  - **C.** Let the shared tools harness restore `env.DB` in `resetTools` in `worker/previews/test-support.ts`, as it already restores `dependencies.fetch`. Then no test needs its own restore. It changes a harness that about 25 test files share. Effort: Small.
- **Left out:** Keeping both copies was left out, because it fails the goal.
- **Wider fix:** C, because a timed-out test can then never leave a wrapped database behind.
- **Previous examples:** The three preview batching tests that branch `calummoore/npm-run-dev-preview-issue` moved to the helper.
- **Recommendation:** A. The terminal test already imports from the file of the helper, so one edit removes the copy. Option C protects the codebase best, but it changes a widely shared harness for a failure that has not happened.
- **Action:** fix after merge, apply A, because the copy is outside the preview branch.
