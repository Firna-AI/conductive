# Restore watch test fails in full gate

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, during the Milestone 8o primary merge for PR #64.
- **Location:** `worker/lifecycle/restore-watch.test.ts:64`, `worker/lifecycle/completed-resume-test-support.ts`, and the alarm driver in `worker/lifecycle/backend-test-support.ts`.
- **Reason:** The unchanged test passed both reruns, so a separate task must identify its nondeterminism.

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

  The complete gate of 10 November 2026 also failed on this case at commit
  `0ba4dc759fbd59fc34639b3e6308bb7455eba562`. The test and its restore code
  were unchanged by that branch. The run passed 2,017 tests and failed this one.
  Its complete assertion is:

  ```text
  FAIL worker/lifecycle/restore-watch.test.ts
  writes the restore marker when hydrated is absent after create and resume
  AssertionError: expected markerCommands(fixture) to have a length of 1 but got 2
  worker/lifecycle/restore-watch.test.ts:82:35
  ```

  The assertion runs after `resumeCompletedWorkspace` returns, before the
  explicit advance to `resumedAt + 5_000`. Two marker commands already exist.
  The run is https://github.com/Firna-AI/remote-code/actions/runs/42777891130.
  No assertion, timeout, retry, or lifecycle implementation changed for this incident.
  The next branch check includes a newer main commit with public product docs.
  That commit changes no restore-watch code. Its result does not establish the cause.
  The local targeted check after that merge passed all 11 tests in the file,
  including this case, without changing its source. The cause remains unconfirmed.

  Use the captured full-suite assertion to reproduce the ordering before changing code.
  Inspect asynchronous ordering between `resumeCompletedWorkspace`, its completed-response read, and fake-clock alarm advancement.
  This ordering is a suspected source. It has not been confirmed. Shared fixture state is another possible source.
  Make the test deterministic after the cause is known.
  Keep every existing marker, deadline, sandbox-read, and command-count assertion.
  Add no test retry, sleep, permanent skip, quarantine, or longer timeout.
- **Impact if no action:** The complete gate can fail intermittently and require another full run.
- **Needs:** The repository, Node 24, local D1, and the existing test fakes. No deployed service or real provider account is needed.
- **Done when:** The cause is recorded and the case passes ten selected runs without weakening its checks. The normal full suite also passes. No new gate or runner restriction is added.
