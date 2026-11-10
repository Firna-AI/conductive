# Restore watch test fails in full gate

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, during the Milestone 8o primary merge for PR #64.
- **Location:** `worker/lifecycle/restore-watch.test.ts:65` and `:82`, `worker/lifecycle/completed-resume-test-support.ts`, the alarm driver in `worker/lifecycle/backend-test-support.ts`, and `backendPump` in `worker/lifecycle/backend-pump.test-support.ts:3`.
- **Reason:** The unchanged test passed both reruns, so a separate task must identify its nondeterminism.
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
