# File row menu deployed smoke test

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-16, from branch `calummoore/perth-6s0l`, the post-merge task of its plan.
- **Location:** None.
- **Reason:** The test needs the merged change deployed to `conductive.build`, the Mac app, and a real phone.

- **Terms:**
  - **Row menu:** the menu of a row of All files or Changes in the Files panel of a workspace. It holds Add to chat, a line, and Copy path, as `docs/protocol/file-row-menu.md` says.
- **Background:** The row menu opens with a right click, Shift+F10, or the Menu key on desktop, and with a long press as a sheet on a phone. Copy path copies the path from the repository root and shows the toast "Path copied". Add to chat shows the session tab that the member saw last, or starts a new session, and puts the chip of the file or folder into its message field, as `docs/protocol/file-mentions.md` says. Before the merge, the menu was checked only in headless Chrome over the fake API of the development page.
- **Task:**
  1. On `conductive.build`, in the Mac app, open a running workspace. Right-click a file row in All files. Select Copy path, and paste the clipboard into a text field. Check the path.
  2. Right-click a folder row and select Add to chat. Check that the session tab shows with the folder chip, with a final `/`, in its message field, and that the field has the focus.
  3. Open the tab menu of a file tab. Check Copy path.
  4. In a phone browser, long-press a file row. Check the sheet. Select Add to chat. Check that the chat shows the chip and that no keyboard opens.
- **Impact if no action:** A defect of the real clipboard of the Mac app or of a phone browser stays unknown until a member reports it.
- **Needs:** The deployed change, the Mac app, a phone, and a workspace with a running cloud computer.
- **Done when:** Each step works, or a new follow-up item records each defect that a step found.
