# A message to a computer that the provider stopped waits five minutes

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, from the smoke test of the deploy of `18753f9` on the primary branch `calummoore/conductor-alternative-architecture`, before the first pull request into `main` (decision 141).
- **Location:** the runner connection of the workspace object in `worker/chat/runner-channel.ts`, the alarm rule in `writeLifecycleState` at `worker/lifecycle/durable-scheduling.ts`, `TURN_HEARTBEAT_MS` at `worker/lifecycle/durable-types.ts:16`, the runner's connection in `runner/src/`, and "The agent runner" in `docs/protocol/chat-and-events.md`.
- **Reason:** the behaviour existed before the reviewed commits, and option B adds a protocol rule.

- **Terms:**
  - **Runner:** the program in the cloud computer that runs the agent turns. It keeps one WebSocket connection to the workspace object.
  - **Provider stop:** a stop that the sandbox provider makes without a call from the app, such as its own auto-stop.
  - **Turn heartbeat:** the alarm of the workspace object that checks a running turn every 5 minutes.
- **Background:** The app stops an idle computer itself after 30 minutes. The provider can also stop it. A stop freezes the computer, so the runner sends no close frame, and the connection looks open to the workspace object. Neither side checks that the connection is still alive. When the connection closes, the workspace object checks the provider within 5 seconds.
- **Problem:** On 8 November 2026, the smoke test stopped a computer through the provider and sent a message 22 seconds later. The workspace still showed Unread, so the object sent the turn to the frozen runner. No turn started. After 5 minutes, the turn heartbeat found the stopped computer and ended the turn as Stopped, with no reply. A resume and a new message then got a reply at once.
- **Impact if no action:** After a provider stop, a message waits up to 5 minutes and ends with no reply, and the user must send it again. Until then, the tab shows a running workspace whose computer is stopped.
- **Root question:** How does the workspace object learn soon that its computer stopped without the app?
- **Options:**
  - **A.** When a sent turn has no `turn.started` after 30 seconds, check the provider at once. If the computer stopped, end the turn as Stopped and show the stopped state. Effort: Small.
  - **B.** Add a liveness rule to the runner connection: the runner sends a ping every 15 seconds, and the workspace object closes a connection that is silent for 45 seconds. The close starts the provider check within 5 seconds. State the rule in "The agent runner" of `docs/protocol/chat-and-events.md`. Effort: Medium.
- **Left out:** A shorter turn heartbeat alone, because it adds a provider call for each running turn and still leaves an idle workspace stale.
- **Wider fix:** B. It finds every frozen runner, also when no turn runs.
- **Previous examples:** None found.
- **Recommendation:** B. The tab shows the stopped state within about a minute, whatever the runner did.
- **Action:** ask the user, because B adds a protocol rule for the runner connection.
