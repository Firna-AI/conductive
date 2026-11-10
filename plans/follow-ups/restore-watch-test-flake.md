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

  Reproduce the failure with the full suite and capture its exact assertion before changing code.
  Inspect asynchronous ordering between `resumeCompletedWorkspace`, its completed-response read, and fake-clock alarm advancement.
  This ordering is a suspected source. It has not been confirmed. Shared fixture state is another possible source.
  Make the test deterministic after the cause is known.
  Keep every existing marker, deadline, sandbox-read, and command-count assertion.
  Add no test retry, sleep, permanent skip, quarantine, or longer timeout.
- **Impact if no action:** The complete gate can fail intermittently and require another full run.
- **Needs:** The repository, Node 24, local D1, and the existing test fakes. No deployed service or real provider account is needed.
- **Done when:** The cause is recorded and the case passes ten selected runs without weakening its checks. The normal full suite also passes. No new gate or runner restriction is added.

## Preview branch observation, 10 November 2026

The complete local gate on `calummoore/preview-port-detection-brainstorm`
finished with 2,013 passes and one failure across 698 files. The failure
was the same named case. Its exact assertion is now captured:

```text
worker/lifecycle/restore-watch.test.ts:82:35
expect(markerCommands(fixture)).toHaveLength(1)
AssertionError: expected [ { sandboxId: 'bx_1', …(2) }, …(1) ] to have a length of 1 but got 2
```

The second restore-marker command was already present before the test's
explicit advance to five seconds after resume. The failed case took
1,704 ms. The whole suite ran 2,014 cases with zero skips. The gate
stopped at the test step, with exit 1.

One unchanged file rerun then passed all 11 cases with zero skips. It took
12.07 seconds. No source, assertion, timeout, retry, or runner setting
changed between the failed suite and this rerun. The test and its named
helper files match base commit `2f329f9d` exactly.

The suspected source remains asynchronous restore-marker completion
around the resume response and fake-clock alarm advancement. The extra
marker count narrows the evidence, but does not prove that cause. Keep
every marker, deadline, sandbox-read, and command-count assertion. This
observation does not resolve the investigation or justify a speculative fix.
