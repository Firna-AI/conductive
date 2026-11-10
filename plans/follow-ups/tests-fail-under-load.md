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
    - On 10 November 2026, the full gate of CI run 42777891130 failed this test at commit `0ba4dc759fbd59fc34639b3e6308bb7455eba562` of the branch `calummoore/waitlist-global-toggle-brainstorm`. That branch changed neither the test nor its restore code. The run had 2,017 passes and one failure.
    - The failure was `AssertionError: expected [ { sandboxId: 'bx_1', …(2) }, …(1) ] to have a length of 1 but got 2` at `worker/lifecycle/restore-watch.test.ts:82:35`. The failing line is `expect(markerCommands(fixture)).toHaveLength(1)`.
    - That line runs after `resumeCompletedWorkspace` from `worker/lifecycle/completed-resume-test-support.ts` returns, and before the explicit `fixture.advanceTo(resumedAt + 5_000, id)`. The test expects the second marker only after that advance. So two marker commands already existed too early.
    - The branch then merged main commit `8567cfb6`, which changed no restore-watch code. An unchanged local run of the file passed all 11 tests, including this one. CI run 42783369766 at commit `3d97dd5c7dbbdc3b875d13555af74553993e194a` then passed 2,023 main tests and 135 runner tests, 2,158 in total, and both Mac jobs. These passes do not establish the cause.
    - The suspected source is the asynchronous order of `resumeCompletedWorkspace`, its completed-response read, and the alarm advance of the backend fixture's fake clock. Shared fixture state is another possible source. Neither is confirmed. Reproduce that order from the captured assertion before any code change.
    - After the merge of main `a1bbd7f8`, a targeted local run on the same day passed all 11 tests of the file again. That merge changed other lifecycle code, but not this test or `completed-resume-test-support.ts`. This pass does not establish the cause either.
    - The runs are https://github.com/Firna-AI/remote-code/actions/runs/42777891130 and https://github.com/Firna-AI/remote-code/actions/runs/42783369766.
  - `worker/chat/runner-repairs.test.ts:23`: "requests all four workspace reports without a login, coalesces losses, and resets only on complete reports".
    - On 10 November 2026, the full gate failed this test again. The local run followed a merge of main `1a9e75a7` into `calummoore/vercel-sandbox-provider`. The test and its report helper matched that main commit. The run had 1,984 passes, one failure, and no skips.
    - The first command-list assertion, at line 30, expected `files.snapshot`, `changes.updated`, `start.updated`, and `workspace.title`. It received an empty list after `fixture.drain()`: `AssertionError: expected [] to deeply equal [ 'files.snapshot', …(3) ]`.
    - An unchanged rerun of `npm run test -- worker/chat/runner-repairs.test.ts` then passed both tests in the file, with no skips. The cause is unproved. The empty list narrows the suspected source to event processing, drain completion, or command observation.
  - `worker/lifecycle/provisioning.test.ts`: "recovers an accepted create after its caller closes and the actor restarts".
  - `worker/lifecycle/disk-retention.test.ts`: "keeps a stopped disk through startup and stop failures without a stale stop after user open".
    - On 10 November 2026, the full gate of CI run 42790127570 failed this test at commit `b4287a509917630e2aaa4985658732587a9424dd` of the branch `calummoore/waitlist-global-toggle-brainstorm`. The run had 2,022 passes and one failure. The gate stopped there, so the runner tests did not run. Both Mac jobs passed.
    - The test took 3,438 ms, and the other test of the file passed. That branch changed no lifecycle code and no lifecycle test. Its only code change in `worker/test-support/` adds the three waitlist switch columns to the sign-up reset statement of `harness.ts`.
    - The failure was `AssertionError: expected [ 'bx_1', 'bx_1', 'bx_1' ] to have a length of 2 but got 3` at `worker/lifecycle/disk-retention.test.ts:86:26`.
    - After the user resume, the test saves `boat.stopIds.length`, calls `actor.advance()`, and expects the same count with `expect(boat.stopIds).toHaveLength(stops)`. A third stop of `bx_1` ran during that advance. This check guards against a stale stop after the user open.
    - The test resumes through `resumeCompletedWorkspace` from `worker/lifecycle/completed-resume-test-support.ts`, as the restore-watch test does. The cause is not confirmed.
    - After the merge of main `a1bbd7f8`, a targeted local run on the same day passed both tests of the file, with no change to them. That merge changed other lifecycle code, but not this test or `completed-resume-test-support.ts`. This pass does not establish the cause.
    - The run is https://github.com/Firna-AI/remote-code/actions/runs/42790127570.

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
