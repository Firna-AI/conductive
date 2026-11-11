# No requirement says where the chat scrolls

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from branch `calummoore/chat-auto-scroll-issue`, a finding of the fix that keeps the chat at its newest message.
- **Location:** `docs/protocol/chat-and-events.md`, the section "What the chat shows".
- **Reason:** the recommended option adds requirements to a protocol doc, and the user reviews each new requirement.

- **Terms:**
  - **Keeper:** `ReadingPlace` in `src/chat/components/reading-place.ts`. It keeps the row that the reader reads in place while the transcript changes size.
- **Background:**
  - The chat of a session scrolls in a box that keeps its bottom in place. At the bottom, the newest message stays in view while the agent writes.
  - While the reader is scrolled up, the keeper keeps the row that they read in place.
  - Branch `calummoore/chat-auto-scroll-issue` fixed three causes of a chat that stopped following new messages. A scroll of the reader to the end could stop a pixel past the end, where Chrome moved the newest message out of view. The keeper undid a scroll of the reader that came in the same frame as a change of size. A session tab opened at the scroll place of the session shown before it.
  - The chat README, `src/chat/README.md`, and the code comments describe this behaviour. The protocol doc `docs/protocol/chat-and-events.md` states only that the line of a fold stays in place when the user opens or closes it.
- **Problem:** A review checks the code against the protocol docs. No requirement states where the chat scrolls, so a review could not find these defects, and a later change can bring them back.
- **Impact if no action:** The behaviour that the fix restored has no requirement that reviews check.
- **Root question:** Which requirements state where the chat of a session scrolls?
- **Options:**
  - **A.** Add these requirements to "What the chat shows" in `docs/protocol/chat-and-events.md`, and check the legal pages and the public guides for sentences that restate them. At the bottom, the chat keeps the newest message in view while the transcript grows. While the reader is scrolled up, the row that they read stays in place. The chat never undoes a scroll of the reader. Add the rules that the answers of the related items choose: where a session opens, and what a send while scrolled up shows. Effort: Small.
  - **C.** Keep the rules in the chat README and the code comments only. Effort: Small.
- **Left out:** Where a session opens when the reader returns, because it is its own question in `plans/follow-ups/chat-session-return-place.md`. That item took the earlier option B, a place for each session.
- **Wider fix:** A. A requirement lets each review check the behaviour.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/chat-session-return-place.md` and `plans/follow-ups/chat-send-while-scrolled-up.md`. Each answer adds one requirement to the same section, so the doc update waits for both answers. `plans/follow-ups/chat-read-row-moves-when-box-resizes.md`: the requirement that the read row stays in place can also settle that item.
- **Recommendation:** A. The user reported this behaviour as a bug, so it is a requirement that each review must check.
- **Action:** ask the user, because the recommended option adds requirements to a protocol doc, and the user reviews each new requirement.
