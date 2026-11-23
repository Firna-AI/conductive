# A system-line note starts with its separator

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from watched-turn wake mockups.
- **Location:** `src/ui/components/chat/StopLine.tsx`, `WakeLine.tsx`, and `StopLine.module.css`.
- **Reason:** The existing system-line separator pattern needs one shared treatment beyond the watch line.

- **Terms:**
  - **System line:** centred app text in the chat, such as a stopped turn or a watched-turn wake.
- **Background:** A system line separates an extra note from its main words with a middle dot. Both stop and wake lines use the stop-line CSS. Narrow chat widths wrap their text.
- **Problem:** A wrapped note can start with the middle dot on its next line. The other-workspace wake shows "· Background work stopped at the time limit" below its session chip.
- **Impact if no action:** The note remains readable, but its separator looks like a list marker.
- **Root question:** How should shared system lines keep a separator with the text that it separates?
- **Options:**
  - **A.** Bind the dot to its preceding text in the stop and wake lines with a non-breaking space. Check both lines at narrow widths. Effort: Small.
  - **B.** Share the note rendering for both lines, with the same separator binding. This gives later system lines one reusable pattern. Effort: Small.
- **Left out:** Changing the words loses no cause of the wrapping. Changing only the wake leaves the same issue in the stop line.
- **Wider fix:** B. One rendering pattern keeps note separators consistent.
- **Previous examples:** The existing stop line uses the same dot-and-space separator as the new wake line.
- **Recommendation:** B. It treats both affected lines consistently without changing their facts or actions.
- **Action:** Fix after merge, apply B. The stop-line rendering predates the watch feature and is outside its required change.
