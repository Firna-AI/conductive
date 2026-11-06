# A refused runner event blocks the stream

- **Severity:** High. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #6, branch `conductor/boat-native-remote-workspaces-milestone-7`, round 2 finding 3 and a new problem of its check. Raised to the user as item 76.
- **Location:** `worker/chat/runner-channel.ts:63`, `worker/chat/store.ts`, and the runner contract in `src/shared/runner.ts`.
- **Reason:** the recommended fix caps the event shapes and adds a byte limit, which changes what the chat shows, so the user decides.

- **Terms:**
  - **Runner event:** a numbered event that the agent runner in a cloud computer sends to the workspace Durable Object, such as an answer chunk, a tool update, or a file tree.
  - **Confirm:** the reply that tells the runner that the workspace stored an event. Without it, the runner sends the event again after a reconnect.
- **Background:**
  - The workspace stores each runner event before it confirms it. Cloudflare limits one stored value to 2 MB.
  - A large file tree, a large tool detail, or a long file list can pass that limit. A flat tree of 20,000 paths of 50 characters is about 2 MB, and each runner connection starts with a full tree.
  - The workspace also refuses an invalid event and an event of a turn that is not active.
- **Problem:** A refused event closes the runner connection without a confirm. The runner sends the same event again after each reconnect, so the whole stream stops at that event.
- **Impact if no action:** In a large repository, or after one bad event, the chat of that workspace stops updating until someone resets the runner.
- **Root question:** What happens to a runner event that the workspace cannot store, so that the stream never stops at it?
- **Options:**
  - **A.** A size limit and a recovery reply that lets the runner replace an oversized event. This changes the runner protocol. Effort: Medium.
  - **B.** Store large event payloads in bounded chunks, and rebuild the events on read. It fixes size only, not the other refusals. Effort: Medium.
  - **C.** Store large payloads in object storage, with ordered references in the Durable Object. It needs new infrastructure. Effort: Large.
  - **D.** Give each event that the workspace refuses for a fixed reason a small stored marker and a confirm. The marker names the event and the reason, and holds no payload. The cursor moves on, so later events flow. A refused end of turn still ends the turn. A storage or network failure still closes the connection. The content of a refused event is lost, and the chat shows the marker. Effort: Medium.
  - **E.** D, plus bounds on the event shapes in the runner contract, so that a correct runner never meets D. A full tree, a large tree delta, and a large changes list go as several numbered parts. `tool.detail` and the file list of `turn.completed` get a cap and a count of the rest. The contracts, the fakes, and two protocol docs change, and the caps change what the chat shows. Effort: Medium.
- **Left out:** None.
- **Wider fix:** E. It ends the endless resend for every fixed refusal, and a correct runner stays inside the limits.
- **Previous examples:** finding 1 of PR #3, an unbounded body read.
- **Related:** the history read loads every stored event at once, in `plans/follow-ups/chat-history-read-memory.md`.
- **Recommendation:** E. The runner and the files backend are not built yet, so the caps cost little now.
- **Action:** ask the user, because E caps what the chat shows and D replaces a refused event with a marker.
