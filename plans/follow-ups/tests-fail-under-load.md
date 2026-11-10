# Several tests fail now and then under the load of the full gate

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10. It joins four items of earlier branches and two failures of the CI of pull request #90.
- **Location:** the tests below, the native harness of Milestone 5f in `worker/test-support/`, `worker/chat/native-transport.test-support.ts`, `worker/test-support/native-peers.ts`, and the alarm driver of the backend fixture.
- **Reason:** each test fails only under load, passes alone and in repeated runs, and no branch that saw it changed it.

- **Terms:**
  - **Full gate:** `npm run check`, which CI runs on each push and pull request.
  - **Native harness:** the test setup of Milestone 5f that runs the real workspace object in Miniflare, the local Cloudflare runtime.
- **Background:** These tests failed once in a full gate, locally or in CI, and passed in isolation and in ten repeated runs:
  - `worker/lifecycle/runner-environment.test.ts`: a timeout under suite load.
  - `worker/operator/org-native.test.ts`: "fails a queued native image build of another starter without allocating a computer".
  - `worker/lifecycle/restore-watch.test.ts:64`: one marker expected, two received.
  - `worker/chat/runner-repairs.test.ts:23`: "requests all four workspace reports without a login, coalesces losses, and resets only on complete reports".
    - On 10 November 2026, the full gate failed this test again. The local run followed a merge of main `1a9e75a7` into `calummoore/vercel-sandbox-provider`. The test and its report helper matched that main commit. The run had 1,984 passes, one failure, and no skips.
    - The first command-list assertion, at line 30, expected `files.snapshot`, `changes.updated`, `start.updated`, and `workspace.title`. It received an empty list after `fixture.drain()`: `AssertionError: expected [] to deeply equal [ 'files.snapshot', …(3) ]`.
    - An unchanged rerun of `npm run test -- worker/chat/runner-repairs.test.ts` then passed both tests in the file, with no skips. The cause is unproved. The empty list narrows the suspected source to event processing, drain completion, or command observation.
  - `worker/chat/runner-repair-parts.test.ts:39`: "keeps deltas, old tails with valid counts, and partial or repeated full reports from resolving a tree repair".
    - On 10 November 2026, the CI of pull request #162 failed this test at commit `f5e1c290`. That branch changed no worker file. The run had 2,004 passes and this one failure.
    - The assertion at line 39 expected the first refresh command to match `{ type: 'report.refresh', kind: 'files.snapshot' }`. It received `undefined` after `fixture.drain()`: `AssertionError: expected undefined to match object { type: 'report.refresh', …(1) }`.
    - Five unchanged local runs of `npx vitest run worker/chat/runner-repair-parts.test.ts` then passed all six tests of the file. They ran on a merge of that commit with main `a1bbd7f8`, which changed no file under `worker/chat/` or `worker/test-support/`.
    - The symptom matches the `runner-repairs.test.ts` case above: no command after the drain. So the suspected source is the same.
  - `worker/lifecycle/provisioning.test.ts`: "recovers an accepted create after its caller closes and the actor restarts".
  - `worker/lifecycle/disk-retention.test.ts`: "keeps a stopped disk through startup and stop failures without a stale stop after user open".
    - On 10 November 2026, the CI of pull request #164 failed this case at head `929f442e`. The checkout merged that head with main `a1bbd7f8`. The run had 2,048 passes, one failure, and no skips.
    - The assertion at line 86 expected two stop calls for `bx_1`. It received three: `AssertionError: expected [ 'bx_1', 'bx_1', 'bx_1' ] to have a length of 2 but got 3`.
    - After merging main through `ae736ab5`, an unchanged isolated run of `npm run test -- worker/lifecycle/disk-retention.test.ts` passed both tests, with no skips. The lifecycle sources and native harness matched `a1bbd7f8`; only the harness README differed in the transcript branch.
    - No source, assertion, timeout, or retry setting changed for this result. The cause remains unproved. The symptom suggests retention alarm, stop-task handoff, or drain-observation ordering under full-suite load.

  Another full-gate failure came from `worker/operator/suspension-race.test.ts` during the primary integration of PR #106.
  Its case was "cancels an in-flight allocation and cleans its delayed computer after actor recovery".
  It reported `Test timed out in 15000ms`. The full run had 1,968 passed tests and this one failure.
  All three tests in that file then passed in one unchanged isolated rerun.
  This additional case has one isolated rerun, not a ten-run result.
  No source, assertion, or timeout changed.
  The suspected source is the same admission and alarm readiness ordering as the provisioning case.
  The queued-job notification can precede the final alarm schedule.
  A manual advance can then run no phase before the test waits for creation admission.
  This explanation remains an inference from the fixture code.
- **Problem:** A gate run fails on one of these tests now and then, also when the change has nothing to do with it. The pull request then waits for a rerun.
- **Impact if no action:** Every branch and every merge into `main` pays reruns and delay, and a real failure can hide among the known flakes.
- **Root question:** How do these tests give the same result under the load of the full gate as alone?
- **Options:**
  - **A.** Fix each test: find what it waits for, and make it wait for that state, not for time. Effort: Medium.
  - **B.** A, and first find the shared cause in the native harness and the alarm driver, such as real timers, shared Miniflare instances, or event order across sockets. Fix it there once, and add a check that runs each listed test under load. Effort: Medium.
- **Left out:** A longer time limit, a retry, or a skip, because each hides the cause and weakens the gate.
- **Wider fix:** B.
- **Previous examples:** decision 113, and the four items that this item joins: `lifecycle-environment-test-timeout-under-load.md`, `org-native-test-under-load.md`, `restore-watch-test-flake.md`, and `runner-report-repair-test-flake.md`.
- **Recommendation:** B. Six tests in the same harness point at one cause.
- **Action:** fix after merge, apply B.
