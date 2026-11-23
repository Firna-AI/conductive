# Open code fences swallow later transcript blocks

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-23, from the review of `calummoore/agent-scheduling-wake-future-nlp0`, check of finding 4.
- **Location:** `src/shared/transcript/markdown-items.ts` at `userMarkdown` and `itemMarkdown`, `src/shared/transcript/session-markdown.ts` at `render`, and `docs/protocol/session-transcripts.md`.
- **Reason:** Closing an open fence would add text to copies of member messages and agent answers on main. This change to exported text needs Cal's approval.

- **Terms:**
  - **Code fence:** a Markdown block opened by a line of backticks or tildes, and closed by a matching fence.
  - **Copy:** the shared Markdown export used by Copy and the `read_session` tool.
- **Background:** The copy keeps Markdown in member messages, agent answers, and fired wake-ups. It adds headings and later transcript blocks between bodies. A fired wake-up now has its lead in a separate paragraph, so a closed code fence at the start of its body keeps its bounds.
- **Problem:** A body can end with a fence still open. The copy appends the next heading or line to that body. A Markdown reader then treats the heading and later transcript blocks as part of the code block.
- **Impact if no action:** A copied or read transcript can show later messages, agent headings, or session notes as code.
- **Root question:** How should a copy preserve a body's Markdown and keep each later transcript block separate?
- **Options:**
  - **A.** Preserve the text of each body exactly, including an unfinished fence. A reader can close the fence after pasting. Effort: Small.
  - **B.** Close unfinished fences in member messages and agent answers, at their separate export sites. Wake-up bodies would still need the same change. Effort: Medium.
  - **F.** Use one helper for every free-form body in the copy. Start the body in its own block and close a fence that is still open at its end. Preserve each existing closed fence and each body line. Use the parsed fence marker and container so nested lists and quotes still work. Effort: Medium.
- **Left out:** Escaping the whole body loses the Markdown formatting that the copy preserves. Adding only a blank line cannot close an open fence.
- **Wider fix:** F. The same export rule applies to a member message, an answer, and a wake-up.
- **Previous examples:** A fired wake-up whose body began with a fenced command used to turn the next heading into code. Separating its lead from the body fixed the closed-fence case.
- **Recommendation:** F. It preserves the body and gives the next transcript item a separate block.
- **Action:** ask the user after merge, because F changes the copy of existing messages and answers.
- **Done when:** If Cal chooses F, test the output of `SessionMarkdown.render` with an incomplete fence followed by a heading for each kind of body. Verify that the heading parses outside the code block. Keep the closed-fence and normal Markdown cases.
