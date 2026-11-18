# Live updates of long answers pass 50 ms

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-18, from branch `calummoore/output-summary-f7sm`, Milestone 11 of the Markdown parser plan, after Markdown parser decision 19 B.
- **Location:** `src/chat/components/AgentText.tsx`, `src/chat/markdown/agent-blocks.ts`.
- **Reason:** the plan asked to stop and ask when one live update of a 100 KiB answer takes more than 50 ms, and the user's answer is not in yet.

- **Source:** Implementation. **Category:** Performance.
- **Background:** While an agent writes, the chat reads the whole message again at each update. Decision 19 B made each update draw again only the blocks whose text changed. Normal answers are under 20 KiB.
- **Problem:** On the 4-core workspace computer, with a load of about 3.4, the median update of a 100 KiB answer took 82 ms, against 149 ms for the code before 19 B. The parse takes about 15 to 20 ms, and the browser's style and layout about 30 ms. The data is in `.context/markdown-it-reader/m11/timing/` of that workspace.
- **Impact if no action:** while an agent writes a very long answer, each update can hold the page for about 80 ms on a slow or busy computer.
- **Root question:** Must a live update of a 100 KiB answer stay under 50 ms?
- **Options:**
  - **A.** Accept the result of 19 B, and measure again on a computer with no other load. Effort: Small.
  - **B.** Parse again only the end of a live message, with the reference definitions of the earlier text. Effort: Medium.
  - **C.** Let the browser skip blocks out of view with `content-visibility: auto`, in a mockup style file. Effort: Medium.
  - **D.** Parse in a worker. The user did not choose this as option C of decision 19. Effort: Large.
- **Left out:** None.
- **Wider fix:** None. This is a time budget, not a class of defect.
- **Previous examples:** Milestone 4 measured 70 ms on 17 November 2026, which gave decision 19.
- **Recommendation:** A. The code before 19 B took 149 ms on this computer against 70 ms in Milestone 4, so this computer runs about two times slower.
- **Action:** ask the user, because the plan asks to stop and ask above 50 ms.
