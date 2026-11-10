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

## Restore watch evidence

The original item was added on 9 November 2026 during the primary merge for pull request #64.

- **Location:** `worker/lifecycle/restore-watch.test.ts:65` and `:82`, `worker/lifecycle/completed-resume-test-support.ts`, the alarm driver in `worker/lifecycle/backend-test-support.ts`, and `backendPump` in `worker/lifecycle/backend-pump.test-support.ts:3`.
- **Related:** `plans/follow-ups/disk-retention-stale-stop-test-flake.md` failed in the same CI run and may have the same cause, the pump of `fixture.run`. One fix in the pump can close both. `plans/follow-ups/provisioning-test-flake.md` is a third lifecycle test of the backend fixture that failed in the same branch's CI.

- **Terms:**
  - **Restore watch:** The lifecycle reads sandbox hydration and writes the terminal restore marker when disk restoration ends.
  - **Fake clock:** The backend fixture advances stored alarms through test time without waiting for wall-clock time.
- **Background:** The Restore watch reads hydration after create and resume. An absent hydration field ends the watch and writes one marker. The test checks this for both starts with fake providers and a fake clock.
- **Task:** Investigate `writes the restore marker when hydrated is absent after create and resume` in `worker/lifecycle/restore-watch.test.ts`.
  The full `npm run check` reported this output on 9 November 2026:

  ```text
  worker/lifecycle/restore-watch.test.ts (11 tests | 1 failed)
  writes the restore marker when hydrated is absent after create and resume 3607ms
  ```

  The full run was stopped after that failure. It ended with status 143 before Vitest printed the assertion trace.
  The isolated case then passed once in 2730 ms. The unchanged file then passed all 11 cases in 21.14 seconds.
  No source, assertion, retry, timeout, or runner configuration changed between those runs.
  The test file matched the incoming primary version.

  On 10 November 2026, CI failed the same case in the complete gate of the pull request branch `calummoore/file-selector-list`, at commit `823d4c0`, in run 42756364794, attempt 1. That branch changed no Worker file. The exact assertion:

  ```text
  AssertionError: expected [ { sandboxId: 'bx_1', …(2) }, …(1) ] to have a length of 1 but got 2
   ❯ worker/lifecycle/restore-watch.test.ts:82:35
  ```

  Line 82 is `expect(markerCommands(fixture)).toHaveLength(1)`, directly after `resumeCompletedWorkspace` and before `fixture.advanceTo(resumedAt + 5_000, id)`. So the second marker command came before the test moved the fake clock. The rerun of the failed job, attempt 2, passed this test. It also passed locally in the complete gate on that tree, and alone on `main` at `ab58467`.

  A suspected source: `backendPump.run` in `worker/lifecycle/backend-pump.test-support.ts` runs while the operation of `fixture.run` runs. Each loop moves the fake clock to the next alarm that is due within 60 seconds, until the operation finishes. The Restore watch of the resume is due 5 seconds after the resume. So on a slow machine, the pump can reach that alarm before `resumeCompletedWorkspace` finishes, and the marker comes early. This is not confirmed.

  Reproduce the failure with the full suite before changing code, and confirm or reject the suspected source.
  Inspect asynchronous ordering between `resumeCompletedWorkspace`, its completed-response read, and fake-clock alarm advancement.
  This ordering is a suspected source. It has not been confirmed. Shared fixture state is another possible source.
  Make the test deterministic after the cause is known.
  Keep every existing marker, deadline, sandbox-read, and command-count assertion.
  Add no test retry, sleep, permanent skip, quarantine, or longer timeout.
- **Impact if no action:** The complete gate can fail intermittently and require another full run.
- **Needs:** The repository, Node 24, local D1, and the existing test fakes. No deployed service or real provider account is needed.
- **Done when:** The cause is recorded and the case passes ten selected runs without weakening its checks. The normal full suite also passes. No new gate or runner restriction is added.

On 10 November 2026, CI reported the same assertion at commit `564f0c86`, in run 42781687779, attempt 1.
All Worker code matched main at `8567cfb6`.
The single rerun, attempt 2, passed the test and the complete gate, with 2,187 tests passed.
No source, assertion, timeout, permanent retry, or gate changed between these attempts.
This occurrence has one CI rerun, not a ten-run result.
