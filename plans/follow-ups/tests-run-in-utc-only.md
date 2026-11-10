# Tests do not catch local-time bugs

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from branch `calummoore/from-conductor-timestamp-and-links`, the blocked wider fix of its review finding 13.
- **Location:** `vitest.config.ts`, `.github/workflows/ci.yml`.
- **Reason:** A change to the runner setup for every test needs the user's approval.

- **Terms:**
  - **Local-time bug:** code that should give a value in UTC but gives it in the time zone of the machine that runs it.
- **Background:**
  - Vitest runs the tests of the app and the Worker. `vitest.config.ts` sets no time zone, so each test runs in the time zone of its machine.
  - The CI runner and the cloud workspaces run in UTC. On a UTC machine, a format that loses `timeZone: 'UTC'` still gives the right words.
  - On 10 November 2026 a review found that `src/marketing/from-conductor/dates.test.ts` could not catch that loss. The fix sets `America/New_York` in that one test, before the test loads the module.
- **Problem:** Every other test that formats or compares a date can hide a local-time bug in the same way.
- **Impact if no action:** A local-time bug can pass the gate and show a wrong time to a user in another time zone.
- **Root question:** How does the test suite catch code that uses the local time zone where UTC is required?
- **Options:**
  - **A.** Set a time zone other than UTC in each test that formats a date, as `dates.test.ts` does. Each new test must remember it. Effort: Small for each test.
  - **B.** Run the whole suite in a fixed time zone other than UTC, for example with `TZ` in the test command or in `vitest.config.ts`. A test that wrongly expects UTC from the machine fails once, and its fix shows the bug. Effort: Medium.
  - **C.** Run the suite twice in CI, once in UTC and once in another time zone. It doubles the test time. Effort: Medium.
- **Left out:** A lint against `Intl.DateTimeFormat` without `timeZone`: some local formats are correct, such as times shown in the app in the user's own zone.
- **Wider fix:** B. It is the default that removes the case for every test, and A is the direct fix that `dates.test.ts` already has.
- **Previous examples:** Review finding 13 of `calummoore/from-conductor-timestamp-and-links`, fixed in commit `c4a5e435` for `dates.test.ts` only.
- **Recommendation:** B. One setting covers every test, and the first run shows which tests rely on UTC.
- **Action:** ask the user, because B changes the runner setup of every test.
