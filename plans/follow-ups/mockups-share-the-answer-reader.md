# The mockups read answers with their own rules

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-13, from branch `calummoore/delft-i3g7`, the wider fix of a review finding of round 2.
- **Location:** `docs/mockups/src/components/chat/answerNodes.ts`, `docs/mockups/src/components/chat/fileMentions.ts`, `docs/mockups/src/components/chat/workspaceLinks.ts`, `docs/mockups/src/components/chat/MessageText.tsx`, and the mark rules of `docs/mockups/src/components/common/markdownMarks.ts`.
- **Reason:** the change replaces the text pipeline of every message of the mockup catalogue, which is larger than the branch that found it.

- **Terms:**
  - **Mockup catalogue:** the visual spec of the app, in `docs/mockups/`, built with Mokly from fixtures.
  - **Reader of answers:** `agentBlocks` and `answerParts` in `src/chat/markdown/`. They read the text of an agent message with the shared `markdown-it` parser of `src/markdown/parser.ts`, and give its blocks, marks, code, workspace chips, file chips, and links.
  - **`chatParts`:** the reader of sent messages in `src/chat/links/chat-parts.ts`. It splits a sent message into text, code, workspace chips, file chips, and links.
- **Background:**
  - The app reads answers with the reader of answers, and sent messages with `chatParts`. The mockups read answers with their own reader, `answerNodes.ts`. It uses the marks of `common/markdownMarks.ts`, the line breaks of `common/markdownBreaks.ts`, the mention reader in `fileMentions.ts`, and the link reader in `workspaceLinks.ts`.
  - On 13 November 2026 the mockups started to use the path and line rules of the app, through `docs/mockups/src/components/chat/answerPaths.ts`. The other rules stay copies, such as `mentionPattern` and `markedMentionPattern` in `fileMentions.ts`.
- **Problem:** Each rule of the reader lives twice: the start and the end of a mention, its end mark, the marks of bold, emphasis, and strikethrough, the line breaks, and the web links. Each change of a rule needs two edits, and the visual spec can show what the app does not show. On 16 November 2026 the start of a mention after `**` needed an edit of both readers. On 17 November 2026 the mark rules of the shared parser needed a copy in `common/markdownMarks.ts`.
- **Impact if no action:** The catalogue drifts from the app at each change of the chat reader.
- **Root question:** How do the mockups read an answer, with its marks, mentions, code, line targets, and links, by the same rules as the app?
- **Options:**
  - **A.** Keep the copies, and add a test under `src/` that runs the same cases on both readers. Vitest does not run tests under `docs/mockups/`, so the test imports mockup code. Effort: Small.
  - **B.** Draw the text of answers in the mockups through the reader of answers, and the text of sent messages through `chatParts`, with an entry lookup over the mockup file tree and the mockup repository folder. Delete `answerNodes.ts`, the mention reader of `fileMentions.ts`, and `answerPaths.ts`. `common/markdownMarks.ts` and `common/markdownBreaks.ts` stay while the file preview mockup uses them. Map the mockup link rows to the workspace links of the app. The mockups already import from `src/app/` and `src/shared/`. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B.
- **Previous examples:** `mentionPattern` in `fileMentions.ts` copied `mentionAt` of `src/shared/mention-text.ts`. `answerPaths.ts` copied the path rules until 13 November 2026. `common/markdownMarks.ts` copies the mark rules of `markdown-it`.
- **Recommendation:** B. It removes the drift for every rule of the reader.
- **Action:** fix after merge, apply B, because it changes the text pipeline of the whole catalogue.
