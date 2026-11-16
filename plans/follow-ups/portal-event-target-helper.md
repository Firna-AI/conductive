# One helper for React events that come from a portal

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Wider fix of finding 1 of branch `calummoore/file-modal-hover-popup-0ore`.
- **Added:** 2026-11-16, from the review of the preview of attached files.
- **Location:** `src/shell/ui/Sheet.tsx` (`trapTab`), `src/chat/components/chat-drop-area.ts` (`onElement`), `src/chat/components/chip-field/attached-file-chip.tsx`.
- **Reason:** The branch fixed its own case by moving the preview dialog out of the hover box. The shared helper touches other areas, so it gets its own branch.

- **Terms:**
  - **React portal:** React draws an element in another place of the page, but it still sends the events of that element to its React parents.
- **Background:** Two places check by hand whether the target of a React event is inside the DOM element of the handler: `trapTab` and `onElement` of the chat drop area. Each other handler of a parent of a portal gets the events of the portal.
- **Problem:** Each new parent of a portal must remember the check. A missed check makes a dialog, a drop, or a hover react to events of another layer.
- **Impact if no action:** A later layer can repeat the bug class: a hover card that shows after a dialog closes, or a trap that moves the focus out of a nested dialog.
- **Root question:** How does a React handler know that an event comes from its own DOM element?
- **Options:**
  - **A.** Add one helper, such as `onOwnElement(event)`, and use it in `trapTab` and in `onElement`. Effort: Small.
  - **B.** Keep the two checks, and document the class in the chat guide. Effort: Small.
- **Left out:** A lint for portal parents, because no rule can tell which handler needs the check.
- **Wider fix:** A.
- **Previous examples:** Commit `094beb99e` added `onElement` for drag events from a portal.
- **Recommendation:** A.
- **Action:** fix after merge, apply A.
