# Polling waits use a one-second default deadline

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from branch `calummoore/milan-mq6q`, review round 1.
- **Location:** `eslint.config.js`, `vitest.config.ts`, `src/github/barActions.test.ts`, `src/chat/state/` tests, and `testing/references/eslint-guard.md` in the shared skills repository
- **Reason:** The fix adds a new lint, which the user must approve.

- **Terms:**
  - **Polling deadline:** the longest time that a test waits for an expected state while it checks again and again.
  - **`vi.waitFor`:** a Vitest helper that polls a callback. With no `timeout` option it gives up after 1 second.
- **Background:**
  - The deterministic test rules of the `testing` skill allow a polling deadline only of 10 seconds or more.
  - On 16 November 2026, 52 calls of `vi.waitFor` in 17 test files on `main` gave no `timeout`, so they use the 1-second default. Examples are in `src/github/barActions.test.ts` and `src/chat/state/`.
  - The ESLint guard in `testing/references/eslint-guard.md` of the shared skills catches only `Date.now() + N` deadlines. It does not catch the default of `vi.waitFor`, `vi.waitUntil`, or `expect.poll`.
  - A review of branch `calummoore/milan-mq6q` found two such waits in a new feature test. That branch replaced them with a test entry that waits for the background work of each request, so the test reads once.
- **Problem:** A wait with a 1-second deadline can fail on a slow or busy CI runner although the code is right. Nothing stops a new one.
- **Impact if no action:** Test shards fail now and then on correct code, and someone must rerun them.
- **Root question:** How does the codebase keep every polling wait at or above the 10-second floor?
- **Options:**
  - **A.** Give each of the 52 calls a `timeout` of at least 10,000 ms. Effort: Small.
  - **B.** Do A. Add a `no-restricted-syntax` lint for test files that rejects `vi.waitFor` and `vi.waitUntil` without a `timeout` of at least 10,000. Set `test.expect.poll.timeout` to `10_000` in `vitest.config.ts`. Add the same selector to `testing/references/eslint-guard.md` in the shared skills. Effort: Medium.
- **Left out:** Retry flaky tests: the flaky-test rule forbids retries.
- **Wider fix:** B. The lint catches each new case.
- **Previous examples:** The two waits in `worker/features/user-activity.test.ts` of branch `calummoore/milan-mq6q`, fixed there before the merge.
- **Recommendation:** B. A alone lets new cases in.
- **Action:** ask the user, because B adds a new lint, and the always-on rules reserve that choice for the user.
