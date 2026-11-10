# Account routing replay test fails now and then

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the CI of PR #178 on branch `calummoore/cloudflare-worker-error-tracking`.
- **Location:** `worker/lifecycle/account-routing.test.ts:32`.
- **Reason:** The branch changed no code that this test runs, so one fix in a separate branch reaches every open branch.

- **Terms:**
  - **Complete gate:** `npm run check`. CI runs it on each pull request as the job "Complete gate".
  - **Secondary account:** a second provider account of the app. A workspace stores the account that holds its cloud computer.
- **Background:**
  - The test "replays a lost allocation and resumes its disk through the stored secondary account" checks that a lost allocation replays and resumes through the stored secondary account.
  - Commit `a200a532` on `main`, the model gateway, last changed the file.
  - On 10 November 2026, CI run 42815054593 failed the test on commit `add2da53`. The failure text was `SyntaxError: Unexpected token 'E', "Error: The"... is not valid JSON`, from `parseJSONFromBytes` in undici. The other 2,134 tests passed.
  - The test passed 3 of 3 in local runs on the same commit. A rerun of the failed CI job passed.
  - That pull request changed only `wrangler.jsonc` and Markdown.
  - On 10 November 2026, CI run `42827704425` failed the same case at commit `03d34940`, with the same `SyntaxError: Unexpected token 'E', "Error: The"... is not valid JSON`. The other 2,217 tests passed, with no skips.
  - After a clean merge of main `46769d97`, `npm run test -- worker/lifecycle/account-routing.test.ts` passed all three tests unchanged. The test and its backend hook and fixture files matched main. No source, assertion, timeout, retry, or gate changed.
  - On 10 November 2026, CI run `42824852311` failed the same case on
    `2a2cc2f4`, on branch `calummoore/manage-access-redirect`. The other
    2,183 app and Worker tests passed. The failure was again
    `SyntaxError: Unexpected token 'E', "Error: The"... is not valid JSON`.
  - That branch changes no account routing code or test. After it merged
    main at `08cbe3cd`, the case passed in a targeted run of eight files
    and 25 tests. This was not an unchanged rerun. The cause stays unknown.
- **Problem:** The test read a reply as JSON, but the reply was text that starts with "Error: The". It looks like an error text of the local Workers runtime, not the JSON of a route. A gate run then fails with no change in the code under test.
- **Impact if no action:** A branch can fail its gate on this test and wait for a rerun. A real failure can hide among the flakes.
- **Root question:** How does this test get the same result on every run?
- **Options:**
  - **A.** Reproduce the failure with repeated runs under load. Name the source, then make the test deterministic with an explicit readiness signal or a fixed event order. Keep every assertion. Effort: Medium.
  - **B.** A, and make each helper of the backend fixture that reads a reply as JSON fail with the reply status and text when the reply is not JSON. Each later flake of a fixture test then names its cause. Effort: Medium.
- **Left out:** A retry, a skip, or a longer time limit, because each hides the defect that the test found. Fewer than three approaches are real, because the source is unknown until a reproduction names it. The suspected source is async ordering in the backend fixture of `worker/lifecycle/backend-test-hooks.ts`, or an error of the Worker under test that the runtime turns into a text reply.
- **Wider fix:** B. The fixture names the reply of every non-JSON failure, whatever the test.
- **Previous examples:** `plans/follow-ups/tests-fail-under-load.md`, which `main` applied and deleted in commit `49422f36`, fixed timeouts of tests that use the same backend fixture.
- **Recommendation:** B. The reproduction finds this source, and the fixture change makes the next flake of this kind cheap to find.
- **Action:** fix after merge, apply B, because the test is outside this branch.
