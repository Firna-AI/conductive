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
    - The case is "writes the restore marker when hydrated is absent after create and resume". It starts at line 65, and its failing check is at line 82. The restore watch reads sandbox hydration after create and resume. An absent hydration field ends the watch and writes one restore marker. The case uses `worker/lifecycle/completed-resume-test-support.ts` and `backendPump` from `worker/lifecycle/backend-pump.test-support.ts`, which `worker/lifecycle/backend-test-support.ts` runs to advance stored alarms in test time.
    - On 9 November 2026, the full gate of the Milestone 8o primary merge for PR #64 failed this case after 3,607 ms. The run stopped with status 143 before Vitest printed the assertion. The case then passed alone once in 2,730 ms. The unchanged file then passed all 11 cases in 21.14 seconds. No source, assertion, retry, timeout, or runner configuration changed between those runs. The test file matched the incoming primary version.
    - On 10 November 2026, CI run `42780530781`, attempt 1, of PR #148 failed this case on commit `3503d628`. The app and Worker suite ran 704 files: 2,016 passed, 2 failed, and none was skipped. The check at line 82:35 failed with `AssertionError: expected [ { sandboxId: 'bx_1', …(2) }, …(1) ] to have a length of 1 but got 2`. It runs after the completed resume, before the test advances the clock 5 seconds. So the second marker command was already written. The other failure of that run, a timeout, is in `plans/follow-ups/tests-time-out-under-machine-load.md`.
    - The unchanged file then passed alone in a local run on the same commit: 11 of 11, with no skip, in 11.19 seconds. The case then passed three local runs that selected it by name, so each run reported the 10 other tests as skipped. These are three selected runs, not a ten-run result. No skip marker, retry, assertion, or timeout changed.
    - The test file, its direct imports, and `worker/lifecycle/backend-pump.test-support.ts` matched main `8567cfb6`. Modules that those imports reach in turn differed on that branch, such as `worker/features/alarms.ts` and `worker/test-support/native-workspace-entry.ts`. That native fixture still returned from a manual alarm only after its tracked alarm work ended. No evidence ties the failure to those differences, and none rules them out.
    - The suspected source is unconfirmed: the asynchronous ordering between `resumeCompletedWorkspace`, its completed-response read, and fake-clock alarm advancement. One path: `backendPump` can run the new restore watch, armed 5 seconds ahead, before the completed resume response settles. That path would write the second marker command before line 82. No failing local trace has shown it. Shared fixture state is another possible source. A pass alone shows neither the cause nor that machine load caused the failure.
    - A fix of this case keeps every marker, deadline, sandbox-read, and command-count assertion.
  - `worker/chat/runner-repairs.test.ts:23`: "requests all four workspace reports without a login, coalesces losses, and resets only on complete reports".
    - On 10 November 2026, the full gate failed this test again. The local run followed a merge of main `1a9e75a7` into `calummoore/vercel-sandbox-provider`. The test and its report helper matched that main commit. The run had 1,984 passes, one failure, and no skips.
    - The first command-list assertion, at line 30, expected `files.snapshot`, `changes.updated`, `start.updated`, and `workspace.title`. It received an empty list after `fixture.drain()`: `AssertionError: expected [] to deeply equal [ 'files.snapshot', …(3) ]`.
    - An unchanged rerun of `npm run test -- worker/chat/runner-repairs.test.ts` then passed both tests in the file, with no skips. The cause is unproved. The empty list narrows the suspected source to event processing, drain completion, or command observation.
  - `worker/lifecycle/provisioning.test.ts`: "recovers an accepted create after its caller closes and the actor restarts".
  - `worker/lifecycle/disk-retention.test.ts`: "keeps a stopped disk through startup and stop failures without a stale stop after user open".

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
