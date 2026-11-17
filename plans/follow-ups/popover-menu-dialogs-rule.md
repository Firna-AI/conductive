# Dialogs from a popover menu: close or keep?

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from branch `calummoore/milan-hmhx`, review item 13.
- **Location:** `docs/protocol/org-rail-order.md`, the section "The hidden sidebar". `src/shell/layout/ListPopover.tsx`, `useDismiss` and the click rule of `ListPopoverSurface`. `src/shell/list/SectionHeader.tsx`, the section menu.
- **Reason:** The fix changes a requirement that the branch added, and no user decision says which side is right.

- **Terms:**
  - **List popover:** the whole sidebar of the current org, open over the page beside the org rail while the sidebar is hidden, from `src/shell/layout/ListPopover.tsx`.
  - **Section menu:** the menu of a section header in the list, with New workspace, Rename section, New section, and Delete section. It opens outside the box of the popover.
- **Background:**
  - `docs/protocol/org-rail-order.md` says that each page, dialog, or palette that opens from the popover closes it, and that the focus goes back to the tile after such a dialog.
  - The code closes the popover on a plain click on a link, or on a control with `aria-haspopup="dialog"`, inside its own box. The New workspace row and the Search row are such controls.
  - The section menu opens outside that box. Its New workspace item can open the New workspace dialog, and its New section item opens the New section dialog, which the list in the popover holds.
  - While a dialog is open, a press does not close the popover, so the New section dialog does not close with it.
- **Problem:** The two dialogs of the section menu open over the popover and leave it open, and the focus then goes back into the popover. The protocol states another rule.
- **Impact if no action:** A reader of the protocol expects the popover to close behind these dialogs. A change that follows the text would close the New section dialog with the popover.
- **Root question:** Which dialogs that open from the popover close it?
- **Options:**
  - **A.** Keep the code. Change the protocol: a dialog that a menu of the popover opens keeps the popover open, as the menu does, and the focus then goes back into the popover. Effort: Small.
  - **B.** Close the popover for each dialog that opens from it, also from its menus. The New section dialog must then move out of the list in the popover. After a create, the new section is out of sight. Effort: Medium.
  - **C.** Close the popover for New workspace from each place, and keep it open for New section, whose result shows in the list. Change the section menu and the protocol. Effort: Small.
- **Left out:** None.
- **Wider fix:** None, because the `documentation` skill already covers drift between a doc and the code.
- **Recommendation:** A. A menu of the popover and its dialogs then act as one part of the popover, and the result of New section stays in view.
- **Action:** ask the user, because A changes the requirement text that the branch adds, and no user decision says which side is right.
