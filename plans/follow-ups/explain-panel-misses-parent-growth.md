# Fallback popover misses growth of the parent chat

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-24, from the branch `calummoore/auto-scroll-final-message-knfd`, a problem outside the scope that the finding check of finding 2 of review round 1 found.
- **Location:** `src/chat/explain/popover-place.ts`, `usePanelPlace`, near line 51.
- **Reason:** The branch that found it changed only the scroll inside the popover, not the place of the panel.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Explain popover:** the small chat panel by a marked quote, which shows the chat of an explanation session.
  - **Fallback positioning:** on a desktop browser without CSS anchor positioning, `placePanel` measures the room by the mark and sets the place of the panel.
- **Background:** `docs/protocol/explain.md` says that the popover opens below the mark, or above it when it has more room there, so it never covers the marked text. With CSS anchor positioning, the browser keeps the panel at the mark. Without it, `usePanelPlace` places the panel again only on a scroll, a window resize, or a change of the size of the panel.
- **Problem:** New output that grows the parent chat at its bottom moves the mark in the view without any of those events. So the panel does not follow its mark, and a panel above the mark can come to cover the marked text. This was found by reading the code. No test or browser run confirmed it.
- **Impact if no action:** On such a browser, the panel can cover the quote that it explains while the parent chat receives output.
- **Root question:** How does the fallback panel stay by its mark when the parent chat moves the mark?
- **Options:**
  - **A.** Also place the panel again when the parent chat's transcript changes size, with a `ResizeObserver` on it. Effort: Small.
  - **B.** Place the panel again on each animation frame while it is open. Effort: Small, with a cost each frame.
  - **C.** Observe the box of the mark with an `IntersectionObserver` and place the panel again when it moves. Effort: Medium.
- **Left out:** None.
- **Wider fix:** A. It covers each growth of the parent chat, whatever its cause.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/explain-answer-top-after-resize.md` covers the scroll inside the same fallback panel.
- **Recommendation:** A. It reacts to the cause with the observer type that the chat already uses.
- **Action:** fix after merge, apply A, because it needs a browser without CSS anchor positioning, which is rare, and it is outside the scope of the branch that found it.
