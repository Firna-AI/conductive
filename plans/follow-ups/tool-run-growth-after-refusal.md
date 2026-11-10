# A lost line can stop the growth of a run

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-10, from the branch `calummoore/tool-calls-collapsing-issue`, review finding 1 of that branch.
- **Location:** `src/chat/components/transcript-entries.ts`, the function `newestOfRunningTurn` and the line that sets `growing`.
- **Reason:** The fix depends on the open choice in `plans/follow-ups/tool-run-fold-requirement.md`, because most of its options remove this code.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Run of tool calls:** consecutive tool calls of the agent that the chat shows under one line, such as "9 tool calls".
  - **Growing run:** the run that the next call of the running turn joins. The chat shows each of its calls, also between two calls.
  - **Waiting message:** a message of a member that no turn has taken yet. A new item of the running turn goes before it, because the agent reads it at its next tool call.
  - **Lost line:** the line that reports a runner event that the workspace refused, such as a tool update that was too large.
- **Background:** Since 10 November 2026, `groupEntries` marks as growing the run that holds the newest item of the running turn. The chat places a new item of the running turn before a waiting message, in `placeOf` of `src/chat/state/placement.ts`. A lost line goes at the place of its event, at the end of the chat, as `src/chat/state/refused-events.ts` does.
- **Problem:** When a lost line of the running turn comes after a waiting message, the lost line is the newest item of the turn. The next calls go before the waiting message, into the run. That run is not marked as growing, so it folds each time its calls are done, and opens again at the next call. A read-only replay showed the cycle across two calls.
- **Impact if no action:** In this rare order of events, the user sees the open and close cycle again.
- **Root question:** How can a run stay open whenever later calls still join it?
- **Options:**
  - **A.** Stop the search for the newest item at the first waiting message. Add the case to the test "keeps the newest run of a running turn open" in `src/chat/components/WorkFold.dom.test.tsx`. This copies a part of the placement rule. Effort: Small.
  - **B.** Export the place of the next item of a turn from `src/chat/state/placement.ts`, and mark as growing the run whose last call stands directly before that place. Keep the check that this call belongs to the running turn: without it, a new turn with no item yet marks the last run of the previous turn as growing. Add the case to the same test. Effort: Small.
  - **C.** Place a lost line of the running turn with the other items of its turn, before a waiting message. Check the new order and update its tests. This changes more event handling. Effort: Medium.
  - **D.** Choose option B, C, D, or E of `plans/follow-ups/tool-run-fold-requirement.md`. Each removes the search for the growing run, so no order of events can bring the cycle back. Effort: Small, inside that change.
  - **E.** Keep waiting messages out of the ordered list of items, and draw them after the list until a turn takes them. Each item of the running turn then goes at the end. This rewrites how waiting messages are placed and drawn, and many chat tests change. Effort: Large.
- **Left out:** No change leaves the cycle. A separate stored growth state keeps a second state in step with the placement, and B gives the same result without it. A search that skips lost lines marks a run as growing when a lost line directly follows it, although the next call then starts a new run.
- **Wider fix:** B. One function then decides both where the next call goes and which run grows, so the two cannot disagree.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/tool-run-fold-requirement.md`, work that waits for the answer. Only its option A keeps this item. `plans/follow-ups/refusal-line-after-waiting-message.md`, the same order of events, from the side of the lost line.
- **Recommendation:** D, when the answer to `plans/follow-ups/tool-run-fold-requirement.md` is B, C, D, or E. B, when that answer is A.
- **Action:** ask the user, because its fix depends on the answer to the open item in `plans/follow-ups/tool-run-fold-requirement.md`.
