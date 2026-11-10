# Provisioning test assumes alarm admission order

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, during fix round 1 of PR #106.
- **Location:** `worker/lifecycle/provisioning.test.ts:29-39`, `worker/lifecycle/backend-test-platform.ts:42-51`, and `worker/lifecycle/backend-start.test-support.ts:33-39`.
- **Reason:** The test matches the primary branch and passed unchanged on rerun. A separate fix can reach every branch.

- **Source:** Implementation.
- **Category:** Test.
- **Terms:**
  - **Native fixture:** The test support that runs the production workspace object in local Miniflare.
  - **Admission:** The work that saves a workspace start and schedules its first alarm.
  - **Alarm:** A saved time that asks the native object to advance its work.
- **Background:** The provisioning test recovers a create after its caller closes and its object restarts. It waits for `nextQueued()`, then makes five fixed calls to `actor.advance()`. It expects the first fetch command to have read four output bytes.
- **Problem:** One complete gate received `stdoutOffset: 0` where line 36 expected `stdoutOffset: 4`. The phase was `fetch`, and the process ID was `1`. The unchanged isolated rerun passed all assertions.

  The failed gate had 1,645 passed tests and this one failure. Its test took 625 ms, so it did not reach the 15-second hang guard. The command `npm run test -- worker/lifecycle/provisioning.test.ts --reporter=verbose` then passed its one test in 1,642 ms. A preceding complete gate also passed the same test.

  The suspected source is admission and alarm ordering. `nextQueued()` resolves from the fixture's observation of the saved job. Admission can still move its alarm from now to now plus 1,000 milliseconds. `backendStart.advance` reads the earlier time, and the dispatcher later reads the changed time. That advance can run zero alarms. The next four advances then leave the output offset at zero. The observed result matches that one-step delay. This ordering explanation remains an inference from the code.
- **Impact if no action:** A correct workspace start can fail the complete gate. A person must diagnose and rerun it.
- **Root question:** How does this test advance the intended start phases without assuming when admission finishes?
- **Options:**
  - **A.** Make this test advance between explicit job and command states instead of counting alarm calls. Keep every result assertion. Effort: Small.
  - **B.** Add an explicit scheduled-start readiness signal to the native fixture. Use it before this test's fixed phase advances. Keep the existing queued notification separate. Effort: Small.
  - **C.** Add a fixture driver for observable start phases and move the test to that driver. This changes more fixture code. Effort: Medium.
- **Left out:** A sleep, retry, or larger timeout would keep the ordering assumption. Removing the offset assertion would lose coverage.
- **Wider fix:** B. The fixture can state when an admitted start has a stable initial schedule.
- **Previous examples:** The native fixture guide already says that its admission notification does not imply the caller's RPC has returned. No earlier failure with this exact offset was found.
- **Recommendation:** B. An explicit signal preserves the test's phase and output checks across native transport ordering.
- **Action:** Fix after merge, apply B. This unchanged test belongs to the shared native fixture work, outside the retained-computer fixes.
