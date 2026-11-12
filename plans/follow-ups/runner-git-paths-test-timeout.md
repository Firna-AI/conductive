# A runner Git paths test times out under load

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the Milestone 3b work of the own endpoint plan on branch `calummoore/cli-proxy-setup`.
- **Location:** the test "keeps Git descendants absent below replacement files and links" in `runner/src/git-paths.test.ts:12`.
- **Reason:** the own endpoint change does not touch this test or the Git path code, so its fix belongs to a separate branch that reaches every open branch.

- **Terms:**
  - **Runner:** Conductive's program in each cloud computer. Its tests run with `npm --prefix runner test`, which the complete gate `npm run check` also runs.
  - **Runner harness:** `runnerHarness` in `runner/test-support/harness.ts`. It makes a temporary Git repository for a test.
- **Background:**
  - On 9 November 2026, one run of `npm --prefix runner test` failed this test with: "Error: Test timed out in 5000ms."
  - The test makes a Git repository, commits two folders, and then takes repository snapshots twice: once after a folder becomes a file, and once after it becomes a link. Each step runs Git commands.
  - A focused rerun of the test passed. The next complete runner suite passed, with 131 tests. A later complete gate also passed.
  - Suspected source: resource contention. The machine also ran the pinned `claude` program for other checks at that time, and the test's many Git commands then took longer than the default limit of 5,000 ms.
  - The diff of the own endpoint change does not touch this test, `runner/src/git-paths.ts`, or the harness.
- **Problem:** The test can fail on a loaded machine, so the gate can fail without a defect.
- **Impact if no action:** A gate run, also in CI, can fail now and then, and someone must rerun it.
- **Root question:** How does this test finish within its limit on a loaded machine, without a longer limit?
- **Options:**
  - **A.** Measure the time of each Git command in the test, and remove the slow steps that it does not need, such as a second commit or a second snapshot that checks nothing new. Effort: Small.
  - **B.** Split the test into two tests, one for the file and one for the link, so that each makes less Git work. Effort: Small.
  - **C.** Run the Git commands of the harness with fewer processes, for example one batch of commands. Effort: Medium.
- **Left out:** Raising the time limit or adding a retry. The `testing` skill allows that only with the user's approval, because it hides a slow path.
- **Wider fix:** C, because it makes each harness test faster.
- **Previous examples:** None found.
- **Recommendation:** B. Each half makes half the Git work, and each keeps every assertion.
- **Action:** fix after merge, apply B, because the own endpoint change does not touch this test, and one separate fix reaches every open branch.
