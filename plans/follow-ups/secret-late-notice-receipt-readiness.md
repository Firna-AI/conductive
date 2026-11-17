# Await the runner receipt of a late notice

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-17, from CI of PR 439 on `calummoore/stops-show-why-a-turn-stopped-ccqn`.
- **Location:** `worker/secrets/late-delivery.test.ts:96`, `worker/secrets/requests.test-support.ts`, and `worker/chat/integration/runner-socket.test-support.ts:35`.
- **Reason:** The unchanged recovered-notice test failed and then passed, so its fix belongs in a separate branch.

- **Source:** Implementation, CI failure outside the diagnostic change.
- **Category:** test.
- **Terms:**
  - **Late notice:** The chat message that tells an agent of a late answer to a secret request and starts or joins a turn.
  - **OuterFakeRunner:** The test runner client that records WebSocket messages in `received` and exposes them through `inbox.next()`.
  - **SocketInbox:** The test helper that resolves a waiting reader when a WebSocket message arrives.
- **Background:** The test `dispatches a recovered late notice to the connected runner` saves a late answer and recovers its notice through `listRequests()`. It checks the saved `sent` state, then immediately searches `active.runner.received` for the notice turn. The fake runner fills that array in its WebSocket message listener. The runner diagnostics change touches neither this test nor the secret notice delivery code. The intervening main merge changed neither those files nor the runner client helper.
- **Problem:** CI run 44099168707 on `b0d79cf3df8815eec22f0d6a880ea84625e0e372` failed at `expect(active.runner.received).toContainEqual(...)`. The assertion reported `expected [ { type: 'welcome', …(3) }, …(3) ] to deep equally contain ObjectContaining{…}`. The expected turn message was `member allowed TOKEN for this session.`, with sender `owner` and session `first-session`. The saved notice already had state `sent`. Fresh CI run 44100448323 on merge `9d5430622dd42e40195004c745819279486ffb81` passed this exact test in 1148 ms. Its shard passed 308 files and 1018 tests, with no skips.
- **Suspected source:** The server can finish sending a turn before the client WebSocket listener records it. `listRequests()` does not await that client receipt. The adjacent resume test awaits `runner.inbox.next()` before checking its notice turn. Reproduce the failing event order before changing the test. The failure log does not prove the cause.
- **Impact if no action:** A passing implementation can receive a red complete gate. Repeated runs cost CI time and make real delivery failures harder to assess.
- **Root question:** How should the test wait for the runner to receive the recovered notice before checking it?
- **Options:**
  - **A.** Await the expected notice turn through the existing inbox in this test. Keep the saved-state, sender, session, and message assertions. Reproduce the race first and record ten passing runs after the fix. Cost: a direct fix that other cases must repeat. Effort: Small.
  - **B.** Add a receipt helper to `OuterFakeRunner` that awaits a matching turn through `SocketInbox`. Use it for the recovered notice and other immediate receipt checks. Keep `received` for history assertions. Reproduce the race first, preserve every existing assertion, and record ten passing runs of each changed asynchronous case. Cost: a shared helper and its callers. Effort: Small.
- **Left out:** A sleep, a retry, or a longer timeout does not prove receipt. Mocking delivery drops the real WebSocket boundary. Changing the product protocol adds behavior that this test does not need. Two useful approaches remain: await receipt directly or put that wait in a shared runner helper.
- **Wider fix:** B. The helper gives tests an explicit client receipt boundary instead of inspecting an array before it is ready.
- **Previous examples:** None confirmed. The adjacent resume test already awaits the runner inbox before checking the notice turn.
- **Related:** `plans/follow-ups/queued-turn-start-at-accept-boundary.md` concerns the same late-notice path but a different cause. It makes computer startup automatic. This item concerns test client receipt after a connected runner receives a send.
- **Recommendation:** B, after reproducing and confirming the suspected event order. It gives the tests a shared receipt boundary without changing product behavior.
- **Action:** fix after merge, apply B, because the flaky test is outside the diagnostics change and needs one fix that reaches all branches.

Failure: https://github.com/Firna-AI/conductive/actions/runs/44099168707/job/134094212365.
Passing recheck: https://github.com/Firna-AI/conductive/actions/runs/44100448323/job/134098730797.
