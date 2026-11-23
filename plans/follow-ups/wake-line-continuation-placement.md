# Wake line stays with the previous turn

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from implementation item 9 during watch chat verification on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Updated:** 2026-11-23, from the review of `calummoore/agent-scheduling-wake-future-nlp0`.
- **Location:** `src/shared/transcript/fold-turns.ts`, `src/shared/transcript/fold-items.ts`, `src/shared/transcript/transcript-lookups.ts`, and `worker/chat/continuation.ts`.
- **Reason:** This display defect needs an unusual command-arrival race, and its correction costs the same after merge.

- **Terms:**
  - **Wake line:** the app line that supplies agent input when a watched turn ends or a scheduled wake-up fires.
  - **Hidden message:** the ordinary agent message that carries that line, without a member bubble.
  - **Continuation:** a new turn that takes unanswered input from a finished turn.
  - **Known turn:** the transcript's record of a turn and its input message IDs.
- **Background:** A wake can join a running turn. The Worker sends its command and records `message.sent` before the runner acknowledges it. A finished turn can leave that command unanswered. The Worker then moves its pending command and current message mapping to a continuation. The wake must follow its hidden message into that turn.
- **Problem:** The runner can end the old turn before it handles the wake command. Both known turns retain the hidden ID after the continuation starts. The fold and the exported lookup select the first known turn. The wake line keeps its old place. A continuation can also fail before `turn.started`. Its `turn.failed` event can identify the hidden input by `retryMessageId`.
- **Impact if no action:** Chat can show the wake before the old turn's later work and end row. Copy and `read_session` can put it under the wrong agent heading. Delivery still reaches the continuation, and no message is lost.
- **Root question:** How should a wake follow the turn that takes its unanswered input?
- **Options:**
  - **A.** Select the newest known turn that takes the hidden ID for a watch wake or scheduled wake-up. Move the line to the start of that turn's work. Account for a continuation that reports the ID in `turn.failed` before it starts. Use one placement rule in both cases. Effort: Small.
  - **B.** Remove the hidden ID from the older known turn when a newer turn takes it, then move the wake. This changes shared turn records and needs checks of their other readers. Preserve ordinary member-message placement. Effort: Medium.
  - **C.** Add an authoritative current input mapping to app history and live events. Make wakes use that mapping for ownership and placement. This requires an additive contract and compatibility checks for older clients. Effort: Large.
  - **D.** Give the newest turn ownership of every input moved to a continuation. Use that turn for both placement and grouping. This also changes where chat and copies place ordinary member messages, so it needs Cal's approval. Effort: Medium.
- **Left out:** Updating the owner alone leaves the line in the wrong place. Moving the line alone leaves the old grouping. Waiting for acknowledgement puts work before its input.
- **Wider fix:** D. One ownership rule covers every kind of input that moves to a continuation.
- **Previous examples:** Before scheduled wake-ups, watch wakes followed the same path. The transcript still uses its first-owner rule for ordinary member messages.
- **Recommendation:** A. It corrects both visible effects within the wake path and preserves other input placement.
- **Action:** fix after merge, apply A, because this Rare product defect has Medium severity and becomes no harder to fix later.
- **Done when:** Update `fold-turns.ts`, `fold-items.ts`, and `transcript-lookups.ts` together. The first owns the fold's turn mapping. The second owns the item's position and work group. The third gives the published transcript the same mapping. Test each kind of wake with `message.sent` on turn A, later A work, A's end, then the continuation B with the hidden ID. Test B answering the input and B failing before `turn.started`. In both cases the line follows A's end and precedes B's work or failure. Chat, copy, and `read_session` agree. Keep the ordinary member-message placement for option A.

The review traced the event order in code. `runner-delivery.ts` calls `DeliveryState.sent` after the socket send. Runner events with acknowledged message IDs remove pending commands. `messages.ts` emits `message.sent` once. The continuation's `turn.started` adds the hidden ID to its known turn. The transcript keeps the older turn's claim.
