# A workspace moves only by drag or keys

- **Severity:** Medium. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from `calummoore/keyboard-shortcuts-settings`, the options check of the plan's decision on the arrow keys of a focused workspace row.
- **Location:** `docs/protocol/orgs-and-members.md:61` and `src/shell/list/SectionList.tsx:79`
- **Reason:** The keyboard shortcuts change only reads the row keys. A way to move a row without a drag is new behaviour that needs its own design and mockup.

- **Terms:**
  - **WCAG 2.2 success criterion 2.5.7:** the rule "Dragging Movements", level AA. Each action that a drag does also works with a single pointer, such as a click, without a drag.
- **Background:** The workspace list of an org shows its workspaces in sections. `docs/protocol/orgs-and-members.md` says: "A workspace moves to another section by drag and drop. On a phone, a long press lifts the row." The code also moves a focused row with Alt and Up or Down, and a screen reader hears the new place (`src/shell/list/SectionList.tsx`, around line 79). No doc states the keys.
- **Problem:** A person who uses only a pointer, and cannot drag, has no way to move a workspace to another place or section.
- **Impact if no action:** That person cannot sort the workspace list. The list misses WCAG 2.2 success criterion 2.5.7.
- **Root question:** How does a person who cannot drag move a workspace to another place or section?
- **Options:**
  - **A.** A row menu with Move up, Move down, and Move to section. It needs a mockup, a protocol line, and a test. Effort: Medium.
  - **B.** A "Move to" sheet that lists the sections and the places in each. It needs a new sheet and its mockup. Effort: Medium.
  - **C.** Change nothing. The keyboard move exists, and no protocol doc sets a WCAG level. Effort: Small.
- **Left out:** None.
- **Wider fix:** None. This is one missing path, not a class of defect.
- **Previous examples:** None found on `main`.
- **Recommendation:** A. A menu works with a click and with the keyboard, and the section menu already has this shape.
- **Action:** ask the user, because A adds behaviour that no requirement covers.
