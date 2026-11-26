# Wake line stays with the previous turn

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from implementation item 9 during watch chat verification on `calummoore/wake-a-session-when-a-turn-ends-b5kh`.
- **Location:** `src/shared/transcript/known-turns.ts:101`, `src/shared/transcript/turn-events.ts:180`, and `worker/chat/continuation.ts:11`.
- **Reason:** This display defect needs an unusual command-arrival race, and its correction costs the same after merge.

- **Terms:**
  - **Wake line:** the app line that reports the end of a watched turn and supplies agent input.
  - **Hidden message:** the ordinary agent message that carries that line, without a member bubble.
  - **Continuation:** a new turn that takes unanswered input from a finished turn.
  - **Known turn:** the transcript's record of a turn and its input message IDs.
- **Background:** A wake can join a running turn. The Worker sends its command and records `message.sent` before the runner acknowledges it. A finished turn can leave that command unanswered. The Worker then moves its pending command and current message mapping to a continuation. The wake must follow its hidden message into that turn.
- **Problem:** The runner can end the old turn before it handles the wake command. It then drops that command without an acknowledgement. Both known turns retain the hidden ID after the continuation starts. `messageTurn` selects the first known turn, and the physical wake item keeps its old place. The wake runs, but chat and copied Markdown can place its line inside the old turn.
- **Impact if no action:** Chat can show the wake before the old turn's later work and end row. Copy and `read_session` can put it under the wrong agent heading. Delivery still reaches the continuation, and no message is lost.
- **Root question:** How should a wake follow the turn that takes its unanswered input?
- **Options:**
  - **A.** For wakes only, select the newest known turn that contains the hidden ID. At a continuation start, move its wake to that turn's first item. Put this placement in one shared transcript helper. Add a synchronous regression case for the complete event order. Effort: Small.
  - **B.** Remove the hidden ID from the older known turn when a newer turn takes it, then move the wake. This changes shared turn records and needs checks of their other readers. Preserve ordinary member-message placement. Effort: Medium.
  - **C.** Add an authoritative current input mapping to app history and live events. Make wakes use that mapping for ownership and placement. This requires an additive contract and compatibility checks for older clients. Effort: Large.
- **Left out:** Changing nothing leaves the visible defect. Selecting the newest owner alone leaves the row in the wrong place. Moving the row alone leaves copied Markdown under the wrong heading. Waiting for acknowledgement puts work before its input. Changing ordinary member-message placement exceeds this correction.
- **Wider fix:** A centralizes wake relocation in the shared transcript used by chat, copy, and `read_session`.
- **Previous examples:** Ordinary member messages also select the first known turn in `known-turns.ts`. This correction must preserve their existing placement. No separate recorded example appeared in searches of follow-ups or the recent history of that module and `continuation.ts`.
- **Recommendation:** A. It corrects both visible effects within the wake path and preserves other input placement.
- **Action:** fix after merge, apply A, because this Rare product defect has Medium severity and becomes no harder to fix later.
- **Done when:** Add a synchronous shared-transcript case with this event order: wake notice on A, `message.sent` on A, later A work, A finished without the hidden ID, B started with that ID, then B's answer. Assert that A's later work and end precede the wake. Assert that copied Markdown puts the wake under B's heading. Prove that each half of the correction is necessary. Keep the existing ordinary-wake and member-message checks. Also inspect a continuation that fails before `turn.started`: its `retryMessageId` can name the hidden ID, so the start-only correction does not cover it. Record that remaining case explicitly if it is deferred.

Evidence is a code trace, not a reproduced browser run. `runner-delivery.ts` calls `DeliveryState.sent` after socket send. Only runner events with acknowledged message IDs remove pending commands. `messages.ts` emits `message.sent` once, so the continuation receives no second such event. Its `turn.started` adds the hidden ID to its known turn. No transcript path removes the older turn's claim.
