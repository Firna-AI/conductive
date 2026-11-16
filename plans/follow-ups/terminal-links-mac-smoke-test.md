# Smoke-test terminal links in the Mac app

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-13, from the post-merge task of the terminal links change on branch `calummoore/delft-vl39`.
- **Location:** None.
- **Reason:** The Mac app needs the deployed change, and the change was tested only in Chrome on Linux.

- **Background:**
  - Each web address in the Terminal tool is a link. Cmd+click on a Mac opens it.
  - A local address, such as `http://localhost:3000`, opens the Preview tool at its port. Other links open in a new tab, and the Mac app sends a new tab to the default browser.
  - The link under the mouse pointer shows an underline and the hint "⌘-click to open".
- **Task:** In the Mac app, start a dev server in the Terminal tool. Hover its local address and check the hint. Cmd+click it and check that the Preview tool opens at its port. Cmd+click a public link, such as a GitHub address, and check that the default browser opens it. With tmux and its mouse mode on, Cmd+click a link and check that tmux gets no click.
- **Impact if no action:** A problem that only the Mac app shows, such as a blocked new window, stays unseen.
- **Needs:** The deployed change and the Mac app.
- **Done when:** Each step works in the Mac app, or each failure has its own follow-up item.
