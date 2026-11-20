# The app and the mockups draw agent blocks twice

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-10, from branch `calummoore/markdown-formatting-issue`, review round 2, the wider fix of finding 3.
- **Location:** `src/chat/components/AgentText.tsx` (`AgentBlocks`), `src/chat/components/LineBlocks.tsx` (`LineBlocks`), `docs/mockups/src/components/chat/AgentBlocks.tsx`, `docs/mockups/src/components/chat/MessageLine.tsx`, and the agent fixtures under `docs/mockups/src/fixtures/`.
- **Reason:** the fix moves app code and changes about 30 agent fixtures in 10 files, most of them outside the diff of the nested-list branch.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Agent blocks:** the paragraphs, headings, lists, code blocks, quotes, rules, and tables of an agent message, as the chat draws them.
  - **Work line:** the one-line message in the folded work of a turn, which opens to its full text.
- **Background:**
  - The app draws agent text from `TextBlock` of `src/chat/markdown/agent-blocks.ts`, with `AgentBlocks` for an answer and `LineBlocks` of `src/chat/components/LineBlocks.tsx` for a work line.
  - A paragraph, a heading, and a table cell of a `TextBlock` hold an inline tree, `InlineText` of `src/chat/markdown/agent-inline.ts`, not a string. `AnswerText` of `src/chat/markdown/AnswerText.tsx` draws it. So a fixture typed with `TextBlock` writes inline nodes in place of a string.
  - The mockups draw their fixtures with their own `AgentBlocks` and `MessageLine`, from the fixture type `AgentBlock` in `docs/mockups/src/fixtures/conversations.ts`. Its paragraphs are strings, which the mockup `AnswerText` reads with `answerNodes`.
  - The app already reuses mockup parts for agent text: `MarkdownTable`, `ChatItemView.module.css`, `ToolGroup.module.css`, `MessageLine.module.css`, `MarkdownHeadings.module.css`, and `MarkdownProse.module.css`.
  - On `origin/main` before the nested-list branch, the app's work line drew numbered lists and code blocks that the mockups did not draw. The nested-list branch found the mockup work line drawing only the first paragraph of a message with a list.
- **Problem:** Two renderers draw the same blocks. Each can skip a block kind that the other draws, and no check in the gate catches it.
- **Impact if no action:** The mockups, which are the visual spec, can fall behind the app again with each new block kind.
- **Root question:** How do the app and the mockups draw agent blocks with one renderer?
- **Options:**
  - **A.** Keep two renderers, and align them by hand in each change. Effort: Small for each change, and the work repeats.
  - **B.** Share only the block type: the fixtures use `TextBlock`, and each side keeps its renderer. Cost: each paragraph of a fixture becomes an inline tree. Effort: Medium.
  - **C.** Share one renderer, as `MarkdownTable` is shared. Move `AgentBlocks` and `LineBlocks` into `docs/mockups/src/components/chat/`, typed with `TextBlock`, with a prop that draws the text: the app passes its `AnswerText`, and the mockups pass their own `AnswerText` of `docs/mockups/src/components/chat/AnswerText.tsx`. Move the fixtures to `TextBlock`, and delete the mockup `AgentBlock`, `MessageList`, and their renderers. Move the remaining work-line rules of `src/chat/components/chat.module.css` into `ToolGroup.module.css`. Cost: each paragraph of a fixture becomes an inline tree, and the mockup `AnswerText` must draw an inline tree in place of a string. Effort: Medium.
- **Left out:** Markdown text in the fixtures that the app's reader reads, because the spec would then copy each bug of the reader.
- **Wider fix:** C. One renderer removes the class.
- **Previous examples:** The app's work line drew numbered lists and code blocks that the mockups did not draw, as the comment in `src/chat/components/chat.module.css` said on `origin/main`. Finding 3 of the nested-list branch found two list formats in the mockup fixtures.
- **Recommendation:** C. It removes the class, at the cost of one fixture migration.
- **Action:** fix after merge, apply C, because it moves app code and about 30 fixtures outside the diff of the nested-list branch.
