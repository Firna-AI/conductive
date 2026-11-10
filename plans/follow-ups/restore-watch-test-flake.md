# Restore watch test fails in full gate

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, during the Milestone 8o primary merge for PR #64.
- **Location:** the case at `worker/lifecycle/restore-watch.test.ts:65` and its failing check at `:82`, `worker/lifecycle/completed-resume-test-support.ts`, and the alarm driver in `worker/lifecycle/backend-test-support.ts`, which runs `backendPump` from `worker/lifecycle/backend-pump.test-support.ts`.
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

  On 10 November 2026, CI run `42780530781`, attempt 1, ran the complete gate on commit `3503d628` of the branch `calummoore/workspace-open-error`.
  Its app and Worker suite ran 704 files: 2,016 tests passed, 2 failed, and none was skipped.
  This case failed at `worker/lifecycle/restore-watch.test.ts:82:35`:

  ```text
  AssertionError: expected [ { sandboxId: 'bx_1', …(2) }, …(1) ] to have a length of 1 but got 2
  ```

  The check expected 1 marker command and received 2.
  It runs after the completed resume, before the test advances the clock to 5 seconds after the resume.
  So the second marker command was already written at that point.
  The other failure of that run was a timeout, which `plans/follow-ups/tests-time-out-under-machine-load.md` records.

  On the same commit, the unchanged file then passed alone in a local run: 11 of 11 tests, with no skip, in 11.19 seconds.
  The case then passed three more local runs alone, with no failure.
  Each of those runs selected only this case by name, so each reported the 10 other tests of the file as skipped.
  No skip marker, retry, assertion, or timeout changed for these runs.

  The test file and each module that it imports directly equal `main` at `8567cfb6`. So does `worker/lifecycle/backend-pump.test-support.ts`.
  Modules that those imports reach in turn changed on that branch, such as `worker/features/alarms.ts` and the shared native fixture `worker/test-support/native-workspace-entry.ts`.
  That fixture still returns from a manual alarm only after its tracked alarm work ends.
  No evidence ties the failure to those changes, and none rules them out.

  One suspected path: `backendPump` can run the new restore watch, armed 5 seconds ahead, before the completed resume response settles.
  That path would write the second marker command before the check at line 82.
  No failing local trace has shown it.
  A pass alone does not show the cause, and it does not show that load on the CI machine caused the failure.

  Reproduce the failure with the full suite before changing code. Check that it gives the assertion above.
  Inspect asynchronous ordering between `resumeCompletedWorkspace`, its completed-response read, and fake-clock alarm advancement.
  This ordering is a suspected source. It has not been confirmed. Shared fixture state is another possible source.
  Make the test deterministic after the cause is known.
  Keep every existing marker, deadline, sandbox-read, and command-count assertion.
  Add no test retry, sleep, permanent skip, quarantine, or longer timeout.
- **Impact if no action:** The complete gate can fail intermittently and require another full run.
- **Needs:** The repository, Node 24, local D1, and the existing test fakes. No deployed service or real provider account is needed.
- **Done when:** The cause is recorded and the case passes ten selected runs without weakening its checks. The normal full suite also passes. No new gate or runner restriction is added.
