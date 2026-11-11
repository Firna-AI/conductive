# The chat draws its whole transcript again often

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-11, from the options check of the plan on branch `calummoore/chat-history-loading-3c`. The plan changes the history load, not the render of the transcript.
- **Location:** `TranscriptView` in `src/chat/components/TranscriptView.tsx:60`, and `AgentText` in `src/chat/components/AgentText.tsx:86`.
- **Reason:** No measurement yet separates this render time from the fold time, and the fix is in the render code, outside the files of the plan.

- **Source:** Review. **Category:** Performance.
- **Terms:**
  - **Transcript:** the list of items that the chat shows for one session: messages, tool calls, and turn ends. `src/shared/transcript/transcript.ts` defines it.
  - **Running turn:** a turn of the agent that has not ended. The chat shows its time and updates it each second.
- **Background:**
  - `TranscriptView` groups every item of the transcript into rows at each render, through `groupEntries`.
  - `AgentText` parses the whole text of an answer into blocks at each render, through `textBlocks`.
  - Neither keeps an earlier result. So each change of the transcript groups every item and parses every answer again.
  - The chat passes the time of a running turn as `now`, so the transcript draws again each second while a turn runs.
- **Problem:** The work of each render grows with the length of the session, and it runs each second during a turn. A one-time measurement of the fold did not include this render time.
- **Impact if no action:** A long session can keep the main thread busy each second while a turn runs, also after the fold becomes fast.
- **Root question:** How does the chat draw a long transcript without doing work for the items that did not change?
- **Options:**
  - **A.** Measure first. Time the render of a long session apart from the fold, and decide after. Effort: Small.
  - **B.** Keep the results of `groupEntries` and `textBlocks` while their inputs stay the same, and draw each row as a component that skips an unchanged row. Effort: Medium.
  - **C.** Draw only the rows near the view, and leave the others out of the page until the reader scrolls to them. The chat keeps its place rules for rows that are out of the page. Effort: Large.
- **Left out:** None.
- **Wider fix:** B. Each row then costs work only when its own data changes.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/chat-fold-slows-long-sessions.md` has the same symptom, a busy main thread in a long session. Its measurement left out this render time.
- **Recommendation:** A. The fold is the measured cost, and this render cost has no number yet. B best protects the codebase.
- **Action:** fix after merge, apply A, because no measurement shows the size of this cost yet, and it is outside the files of the history load.
