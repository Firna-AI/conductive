# A small Markdown file can freeze the Files page

- **Severity:** High. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-06, from PR #14, branch `conductor/boat-native-remote-workspaces-milestone-10`, round 2 finding 6. The user sees it as item 88.
- **Location:** `src/files/markdown/markdown-tables.ts:69` and `src/files/markdown/MarkdownView.tsx:93`.
- **Reason:** the best Small option adds a render limit that the screens do not have today, and a new limit is the user's choice.

- **Terms:**
  - **Sparse table:** a Markdown table whose rows have fewer cells than its header.
- **Background:** The Files tab shows a preview of each Markdown file in the repository. Agents and other people write those files, so the preview treats them as untrusted. A table row with fewer cells than its header shows empty cells, as GitHub does.
- **Problem:** The page builds a grid of header columns times rows. A 1,202-byte file made 40,000 cells. A 24 KB file blocks the page for about 1.6 seconds, and a 40 KB file did not finish in 2 minutes.
- **Impact if no action:** A small file in a repository can freeze the Files tab, and the browser tab with it.
- **Root question:** How can a table cost the page work in proportion to the size of its file?
- **Options:**
  - **B.** Skip the empty cells, with one wide cell for the rest of each row. A 24 KB file still blocks the page for about 1.6 seconds. Effort: Small.
  - **D.** Count the empty cells of all tables in one file. Past a fixed budget, such as 65,536, end the table and show the rest as text, as cmark-gfm and markdown-it do for one table. Effort: Small.
  - **F.** Measure the whole parsed file in the Markdown worker. When it is far larger than the file, show the source in place of the preview, with a notice. Effort: Medium.
  - **C.** Render only the visible rows and columns of a table. Effort: Large.
- **Left out:** A, which drops the empty cells, because the layout still grows with the grid. A limit for each table, because many small tables add up. A lower read limit, because a 1,202-byte file already causes it.
- **Wider fix:** F. It also catches the reference-link copies that the check found, and later shapes of the problem. It adds a limit too.
- **Previous examples:** cmark-gfm and markdown-it fixed the same problem, in markdown-it issue #1000.
- **Recommendation:** D.
- **Action:** ask the user, because D adds a render limit that the screens do not have today.
