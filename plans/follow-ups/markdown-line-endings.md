# The chat splits Markdown only at line feeds

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, review round 1, finding 1.
- **Location:** `src/chat/components/agent-text.ts` (`textBlocks`, its `text.split('\n')`), `src/files/markdown/markdown-blocks.ts` (`parseBlocks`, its split at every line ending), `src/markdown/lines.ts`.
- **Reason:** agent text with carriage returns is rare, and the fix costs the same after the merge.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Agent message:** one message of an agent in a turn, which the chat formats with its own small Markdown parser, `textBlocks`.
  - **File preview:** the view that shows a Markdown file of the repository, parsed by `parseBlocks` in `src/files/markdown/`.
  - **CRLF:** a carriage return followed by a line feed, the line ending of Windows text.
- **Background:**
  - `textBlocks` splits the text of an agent message at `\n` only. `parseBlocks` splits at `\r\n`, `\n`, and `\r`, as CommonMark reads line endings.
  - `docs/protocol/chat-markdown.md` says that agent messages and the file preview read headings with the heading rules of CommonMark, and lists with the list rules of CommonMark.
  - The two views share the heading reader `src/markdown/headings.ts`, the list reader `src/markdown/list-items.ts`, and the line tests of `src/markdown/lines.ts`. Both readers expand tabs directly after the split.
- **Problem:** In CRLF text, each line of the chat keeps a trailing `\r`. So `## Title` above `Body`, with CRLF line endings, shows as one paragraph `## Title Body`, and an underline heading shows its underline as text. A CRLF list shows as one paragraph with its markers, such as `- one - two`, and each code line keeps a trailing carriage return. The file preview reads the same text correctly. The list and code part is the same on `origin/main` before the heading branch.
- **Impact if no action:** An agent message with CRLF or CR line endings loses its headings and lists in the chat.
- **Root question:** How does the chat split the text of an agent message into lines, so that it reads every CommonMark line ending as the file preview does?
- **Options:**
  - **A.** Split at `\r\n`, `\n`, and `\r` in `textBlocks`, and add a CRLF case to the heading tests. Effort: Small.
  - **B.** Add one shared helper in `src/markdown/lines.ts` that gives the lines of a Markdown text, split at every line ending, with tabs expanded. Use it in `textBlocks` and `parseBlocks`. Add one case to the heading tests of `src/chat/components/agent-text.test.ts` that mixes CRLF, CR, and LF around a hash heading and an underline heading. The file preview change keeps its behaviour, so it needs no new test. Effort: Small.
- **Left out:** Trimming carriage returns inside each line reader, because text with only CR line endings stays one line, and each reader needs the same trim. Normalizing the text in the runner, the Worker, or the shared transcript reducer, because B gives the same result in one place for live and saved text, and a reducer that changes each delta can turn a CRLF pair that two deltas split into two line breaks. One block reader for both views or a Markdown library, because B gives the same result for line endings at a Small effort, and `plans/follow-ups/one-markdown-reader-for-chat-and-preview.md` holds that wider question. A test that runs both readers on each line ending, because it is a test for the class, which needs the user's approval.
- **Wider fix:** B. One shared split gives both views one line rule.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/chat-quote-end-hides-heading.md` changes the same parser and test file, so one branch can apply both.
- **Recommendation:** B. It gives both views one line rule, and it also fixes the CRLF lists and code lines of the chat.
- **Action:** fix after merge, apply B, because a Rare product bug of Medium severity waits for a later branch under the fix rule.
