# Escaped fence labels stay plain

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-26, from branch `calummoore/auto-color-code-blocks-f7cr`, review finding 2.
- **Location:** `src/markdown/fence-label.ts:3`, `src/chat/markdown/agent-blocks.ts:131`, `src/files/markdown/preview-blocks.ts:137`.
- **Reason:** a Rare product bug that is not High waits for a later branch, and normal agent text never escapes a fence label.

- **Source:** Review. **Category:** Product bug.
- **Terms:**
  - **Fence label:** the first word after the opening backticks or tildes of a code block, such as `rust`. `fenceLabel` in `src/markdown/fence-label.ts` reads it, in lower case, up to white space or a comma.
- **Background:** The chat and the Markdown file preview colour a code block by its fence label, with the colours of a file tab. `languageOfLabel` in `src/files/code/fence-languages.ts` maps the label to a language. A label that names no language shows plain text, as `docs/protocol/chat-code-blocks.md` says. `docs/protocol/chat-markdown.md` says the chat reads entities and escapes as CommonMark does. CommonMark decodes backslash escapes and character references in the info string of a fence.
- **Problem:** `fenceLabel` reads the raw `token.info`. So `c\+\+` and `r&#117;st` stay unknown labels, although markdown-it decodes them to `c++` and `rust`. The order also matters: `rust\,ignore` must decode before the split.
- **Impact if no action:** A valid label with an escape shows plain code in the chat and in the preview. The text stays complete.
- **Root question:** How does a fence label follow the CommonMark reading of the info string?
- **Options:**
  - **A.** In `fenceLabel`, decode the info with `markdownParser.utils.unescapeAll` from `src/markdown/parser.ts`, then take the first word. Add escaped and referenced labels to `src/markdown/fence-label.test.ts`. Update the `fenceLabel` sentences in `src/chat/agent-text.md` and `src/files/markdown-preview.md`. Effort: Small.
  - **B.** Decode the info in the chat and the preview adapters before they call `fenceLabel`. It repeats the call in two places. Effort: Small.
  - **C.** Have the shared parser return the decoded label on each fence token. Effort: Medium.
  - **D.** Decode `token.info` in place with a core rule of the shared parser. `markdownParser.render` would then decode twice, so `&amp;ouml;` gives `language-ö`. Effort: Small.
- **Left out:** Escaped spellings in the language table, because other escapes stay plain. A decoder written for this app, because Markdown parser decision 3 C chose one parser over readers written for this app.
- **Wider fix:** A. Both call sites already use the one helper.
- **Previous examples:** Commit `d161172e1` fixed Markdown escapes in angle addresses.
- **Recommendation:** A. It uses the parser's own decoder and keeps the comma and case rules. A probe of `unescapeAll` took 60 to 70 ms for a crafted 1 MB info line, so it stays linear.
- **Action:** fix after merge, apply A, because the defect is Rare and Low.
