# Account routing test reads a text error as JSON

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from the branch `calummoore/tool-calls-collapsing-issue`, whose complete gate failed once on this test.
- **Location:** `worker/lifecycle/account-routing.test.ts`, the test "replays a lost allocation and resumes its disk through the stored secondary account", and the backend test harness that it uses from `worker/lifecycle/backend-test-hooks.ts`.
- **Reason:** The branch changed only the chat of the web app and the mockups, and the test passed when it ran again alone.

- **Source:** Implementation. **Category:** Test.
- **Terms:**
  - **Complete gate:** `npm run check`, which CI runs on each pull request.
  - **Secondary account:** a second account at the sandbox provider. The test gives a workspace that account and checks that every provider request uses it.
- **Background:** On 10 November 2026, the complete gate ran on a machine with 4 CPUs and 8 GB of memory, with no other work beside it. The test suite took 944 seconds for 2,007 tests. One test failed: "replays a lost allocation and resumes its disk through the stored secondary account". The failure text was `SyntaxError: Unexpected token 'E', "Error: The"... is not valid JSON`, from `parseJSONFromBytes` in `node_modules/undici/lib/web/infra/index.js:177`, through `node_modules/undici/lib/web/fetch/body.js:445`. The other 2,006 tests passed. Then `npx vitest run worker/lifecycle/account-routing.test.ts` passed all 3 tests of the file.
- **Problem:** A response body in the test, or in the harness under it, was plain text that starts with "Error: The", and a caller read it as JSON. The suspected source is a text error that the local Worker runtime returns under load, for example when a request to a Durable Object does not finish. This is not proved.
- **Impact if no action:** The gate fails now and then with no defect in the code, and a person must rerun it. The parse error also hides the real error text.
- **Root question:** How does this test stay correct on a busy machine, and show the real error when a request fails?
- **Options:**
  - **A.** Reproduce the failure under the load of the whole suite. Find the read that got the text body. Make that read report the status and the text, and wait on the event that the test needs instead of the time that it takes. Effort: Medium.
  - **B.** Run the Worker tests with fewer parallel workers. The gate takes longer, and the test keeps its weak point. Effort: Small.
  - **C.** Change nothing, and rerun a failed gate. Effort: Small.
- **Left out:** A retry or a longer time limit in the test. The `testing` skill needs the user's approval for each, and each hides the cause.
- **Wider fix:** A. A harness read that reports the status and the text of a failed response gives every Worker test the real error. `plans/follow-ups/tests-time-out-under-machine-load.md` records the same class of failure under load.
- **Previous examples:** `plans/follow-ups/tests-time-out-under-machine-load.md` and `plans/follow-ups/lifecycle-environment-test-timeout-under-load.md` record Worker tests that fail only under machine load.
- **Related:** `plans/follow-ups/tests-time-out-under-machine-load.md`, the same class: tests that fail only under machine load. One fix of the harness can serve both.
- **Recommendation:** A. It finds the cause and keeps the gate fast.
- **Action:** fix after merge, apply A, because the branch that found the failure did not change this test or its harness.
