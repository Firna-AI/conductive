# Select all in a Markdown preview selects the app

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from the branch `calummoore/selecting-code-context-jlro`, a check of review finding 4.
- **Location:** `src/files/markdown/MarkdownView.tsx` (its scroll box), `src/files/code/CodeBox.tsx`, `docs/protocol/workspace-tools.md` (the select-all bullet under "Files and changes").
- **Reason:** The branch that added select all for the text and the diff of a file tab did not change the Markdown preview.

- **Terms:**
  - **Markdown preview:** the rendered view of a Markdown file in a file tab. **Source** shows its text.
  - **Code box:** `CodeBox` of `src/files/code/CodeBox.tsx`, the focusable scroll region that keeps select all inside the text view and the diff view.
- **Background:** Since 23 November 2026, Cmd+A or Ctrl+A in the text or the diff of a file tab selects only that text. The code box gets the focus on a press and handles the keys. A Markdown file opens in its preview first. The preview has its own scroll box, with no focus and no key handler.
- **Problem:** Cmd+A in the preview of a Markdown file still selects the whole app, with the file tree, the tabs, and the chat list.
- **Impact if no action:** A member who wants to copy a rendered README gets the whole page, as in the bug that the member reported for code.
- **Root question:** Should select all in the Markdown preview select only the preview, and how?
- **Options:**
  - **A.** Give the preview scroll box the same focus and select-all key handling as the code box, with no copy handler. Add the rule to the protocol bullet. Effort: Small.
  - **B.** Change nothing. Members use **Source** to select the text. Effort: Small.
  - **C.** Move the focus and key handling of `CodeBox` into a shared scroll region that the code box and the preview both use. Effort: Small.
- **Left out:** A window-wide select-all handler, because it must guess which box the member means.
- **Wider fix:** C. One region gives each scroll box of a file tab the same select all.
- **Previous examples:** The code view and the diff view, before 23 November 2026.
- **Recommendation:** C. It keeps one way to scope select all in a file tab.
- **Action:** ask the user, because the protocol bullet names only the text and the diff, and a new rule for the preview needs the user's approval.
