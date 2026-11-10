# The report repair test fails intermittently

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, during final merge verification on branch `conductor/boat-native-remote-workspaces-merge-main-73`.
- **Source:** Implementation.
- **Category:** Test.
- **Location:** `worker/chat/runner-repairs.test.ts:23` and `:108`, `worker/chat/native-transport.test-support.ts`, `worker/test-support/native-peers.ts`, and `worker/chat/runner-channel.ts`.
- **Reason:** The test and report-repair behavior are unchanged from primary, and no assertion detail identifies a correction for this merge.

- **Terms:**
  - **Report repair:** A stored request for a complete workspace report after the workspace refuses a report event.
  - **Native fixture:** The production Workspace object in Miniflare, with native storage and controlled runner peers.
- **Background:** The test checks four report kinds: files, changes, start steps, and workspace title. It deletes all agent logins before connecting the runner. Report repair uses the workspace token and needs no agent login. It checks command order, coalesced losses, restart behavior, complete replacement, and fresh command IDs.
- **Problem:** One complete gate marked this case failed. The unchanged test then passed every isolated run. The failing assertion, expected value, and actual value are unavailable.
- **Known failed case:** `worker/chat/runner-repairs.test.ts`, `requests all four workspace reports without a login, coalesces losses, and resets only on complete reports`.
- **Exact known failed-case line:**

```text
   × requests all four workspace reports without a login, coalesces losses, and resets only on complete reports 621ms
```

- **Second known failed case:** On 2026-11-10, the complete gate of branch `calummoore/routines-feature-brainstorm` failed in the companion case of the same file, with 1 failed and 2068 passed tests in 1204 seconds of tests. The branch does not change this test file. Its changes to `worker/chat/runner-refusal.ts` and `worker/chat/runner-delivery.ts` run only when a refusal or a delivery failure finishes a turn, and this case keeps its turn active.

```text
 FAIL  worker/chat/runner-repairs.test.ts > delivers repair commands during an active turn and ignores nonreplaceable refusals
AssertionError: expected [] to deeply equal [ 'files.snapshot' ]
 ❯ worker/chat/runner-repairs.test.ts:108:66
```

  Three isolated reruns of the file passed both cases each time (6/6). So both cases of the file fail only under full-suite load, and no repair command shows by the time `fixture.drain()` returns.
- **Incomplete gate:** The gate was stopped with SIGINT and exited 130 after the failure marker. It printed no assertion body. This run is incomplete and is not a pass.
- **Isolated result:** One reproduction and ten fresh repetitions each ran both tests unchanged. All eleven commands exited 0. The result was 22/22 passing cases, zero failures, and zero skips. The marked case passed 11 times. Its companion passed 11 times. No source, assertion, timeout, retry, or runner setting changed between these runs.
- **Source comparison:** The failing test is byte-identical to primary `27cebd4c58f30241f7682eec1d95bb022b824c23`. Its report helper changes only an event type import. Report-repair production behavior is unchanged. Relevant event-envelope import changes are type-only.
- **Suspected source, unproved:** Async event ordering, native drain or observer completion, or ordered report-command observation under full-suite load. No captured assertion proves a race or a product defect.
- **Impact if no action:** A normal gate can fail intermittently and delay work. Passing isolated runs do not establish that the full gate is reliable.
- **Root question:** How can this no-login report-repair test remain deterministic while preserving its complete contract?
- **Options:**
  - **A.** Investigate in a separate branch. Capture the next failed assertion and relevant completion order before changing behavior. Correct a proven cause with the existing deterministic-test methods. Preserve every assertion and the no-agent-login setup. Effort: Medium.
- **Left out:** No speculative fix is justified without the missing assertion or a reproduced cause. Sleeps, retries, skipped cases, longer timeouts, weaker assertions, and restored agent logins break the standing constraints. A new gate adds no evidence about this failure. There is one actionable approach until the cause is known.
- **Wider fix:** None proposed. The cause is unproved, so no structural or detection change is justified yet.
- **Previous examples:** `plans/follow-ups/org-native-test-under-load.md` records another native integration test that failed under load. A shared cause is unproved.
- **Recommendation:** A. Captured assertion and completion-order evidence can identify a reproducible cause.
- **Action:** fix after merge, apply A, because the test is unchanged and no failure detail justifies a correction in this merge. Keep this test in the unchanged complete gate. No new product decision or runtime fix belongs to this merge without new evidence.
