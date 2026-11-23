# Backslash line endings stay in link addresses

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from branch `calummoore/follow-up-an-escaped-breaks-a-markdown-fvhv`, the docs check of the fix for an escaped `<` in a Markdown angle address.
- **Location:** `node_modules/markdown-it/dist/markdown-it.mjs:308`, the backslash test of the angle branch of `parseLinkDestination` (`:288`) in `markdown-it` 15.0.3, and `:322`, the backslash test of its other branch. The app reaches it through `markdownParser` at `src/markdown/parser.ts:35`, in the `link` rule, wrapped at `:109`, and the `image` rule, wrapped at `:125`.
- **Reason:** The approved fix of the escaped `<` changes only the typed reader, and this fix needs a user choice between an app function and an upstream release.

- **Source:** Implementation.
- **Category:** Product bug.
- **Terms:**
  - **Angle address:** the address of a Markdown link or image in angle brackets, such as `[x](<https://example.com/a>)`.
  - **Shared parser:** `markdownParser` in `src/markdown/parser.ts`, the `markdown-it` 15.0.3 parser with its `commonmark` preset. It reads agent messages, also in the message lines of a turn, and the file preview.
  - **File preview:** the Files view that shows a Markdown file of the branch as formatted text.
  - **Typed reader:** `lineTargets` and `readInlineTarget` in `src/markdown/markdown-destination.ts`. They read the Markdown links of sent messages and the message field, also in the mockups.
  - **Line ending:** an LF (U+000A), a CR (U+000D) with no LF after it, or a CR and an LF, as CommonMark defines it at https://spec.commonmark.org/0.31.2/#line-ending.
- **Background:**
  - `docs/protocol/chat-markdown.md` says: "The chat reads the Markdown of each agent message by the rules of CommonMark, with the tables and the strikethrough of GitHub. The file preview reads a Markdown file by the same rules." Both read with the shared parser, by Markdown parser decision 3 C of 16 November 2026: one `markdown-it` parser for the chat and the file preview.
  - CommonMark 0.31.2, section 6.3 Links, https://spec.commonmark.org/0.31.2/#link-destination: "A link destination consists of either - a sequence of zero or more characters between an opening `<` and a closing `>` that contains no line endings or unescaped `<` or `>` characters, or - a nonempty sequence of characters that does not start with `<`, does not include ASCII control characters or space character, and includes parentheses only if (a) they are backslash-escaped or (b) they are part of a balanced pair of unescaped parentheses."
  - CommonMark 0.31.2, section 2.4, https://spec.commonmark.org/0.31.2/#backslash-escapes: "Any ASCII punctuation character may be backslash-escaped". "A backslash at the end of the line is a hard line break". So a backslash does not escape a line ending.
  - Example 491, https://spec.commonmark.org/0.31.2/#example-491: `[link](<foo` + LF + `bar>)` gives `<p>[link](<foo` + LF + `bar>)</p>`, with no link. Example 16, https://spec.commonmark.org/0.31.2/#example-16: `foo\` + LF + `bar` gives `<p>foo<br />` + LF + `bar</p>`. None of the 652 examples puts a backslash before a line ending in a link address, so a parser can pass every example and still differ here.
  - In an angle address, `parseLinkDestination` refuses an LF and a `<`, and it ends the address at a `>`. At a backslash it skips the next character, also an LF. In its other branch, it skips the character after a backslash unless that character is a space.
  - The upstream source at commit `a8c00d4`, the 15.0.3 release and the latest commit of `master` on 20 November 2026, holds the same code in `src/helpers/parse_link_destination.ts`, lines 26 and 49. 15.0.3 is the latest release, and `package.json` asks for `^15.0.3`.
  - The `link` and `image` rules call the function through `state.md.helpers.parseLinkDestination`, at `node_modules/markdown-it/dist/markdown-it.mjs:2997` and `:3080`. Each parser gets its own copy of `helpers`, at `:3731`.
  - The shared parser turns each CR LF and each CR into an LF before it reads the text, in `normalize` at `node_modules/markdown-it/dist/markdown-it.mjs:1002`.
  - The shared parser reads agent messages at `src/chat/markdown/agent-blocks.ts:176` and the file preview at `src/files/markdown/preview-blocks.ts:184`. The typed reader reads sent messages at `src/chat/links/chat-tokens.ts:98`, also in the mockups, through `chatParts` at `docs/mockups/src/components/chat/MessageText.tsx:84`. Through `webAddressParts` it also reads the message field, at `src/chat/components/chip-field/field-nodes.ts:54` and `field-text.ts:25`, and the message box of the mockups, at `docs/mockups/src/components/chat/DraftText.tsx:34`.
  - The typed reader refuses an LF in an angle address, also right after a backslash. `lineTargets` also refuses each target with an LF inside its parentheses. So for an LF, the typed reader follows the CommonMark rule, and the shared parser does not.
  - Upstream `markdown-it` issue 1226, https://github.com/markdown-it/markdown-it/issues/1226, has been open since 5 November 2026, with no comments. Its fourth difference from CommonMark is this class in an address without angle brackets: `[foo](\` + LF + `bar)` gives `<p><a href="%5C%0Abar">foo</a></p>`, where `commonmark.js` and `cmark` give `<p>[foo](<br />` + LF + `bar)</p>`. Its proposed patch changes only that branch, at line 49. A search of the upstream issues and pull requests on 20 November 2026 found no report of the angle case.
  - The difference predates the fix of the escaped `<` of 20 November 2026, which changed only the typed reader. So the branch of that fix holds no code fix for this item. The user has approved no option of this item.
- **Problem:**
  - The input below has an LF right after the backslash:

    ```markdown
    [x](<https://example.com/a\
    b>)
    ```

  - On 20 November 2026, a run of the installed `markdown-it` 15.0.3, with `new MarkdownIt('commonmark', { html: false, linkify: false, typographer: false })`, gave a link: `<p><a href="https://example.com/a%5C%0Ab">x</a></p>`. CommonMark gives no Markdown link here. The HTML comes from the renderer of the library, and the app draws its own elements from the same tokens.
  - In an agent message, `x` shows as a link, because `linkParts` at `src/chat/markdown/answer-parts.ts:115` gets a `web` link from `webLink` at `src/markdown/web-links.ts:42`. The title gives `https://example.com/a%5C%0Ab`. A press opens that address in a new tab, or in the default browser in the Mac app. The file preview of a Markdown file with this text shows the same link, through `safeHref` at `src/files/markdown/preview-inline.ts:54` and `FileLink` at `src/files/markdown/inline-render.tsx:25`.
  - In a sent message, the typed reader makes no Markdown link, so the text shows as typed. Its bare address `https://example.com/a\` ends at the line break, and `bareAddressAt` at `src/markdown/web-links.ts:79` keeps the final `\`. The URL parser turns that `\` into `/`, so the link opens `https://example.com/a/`. The message field shows the text with no link. The mockups read a sent message and the message box with the typed reader too. A mockup answer is an authored tree, not Markdown, so neither the typed reader nor the shared parser reads it.
  - The same run gave the same link for a CR or a CR LF after the backslash. It also gave it for an address without angle brackets: `[x](https://example.com/a\` + LF + `b)`.
  - An image, `![x](<https://example.com/a\` + LF + `b>)`, gave `<p><img src="https://example.com/a%5C%0Ab" alt="x" /></p>`. So the chat and the file preview show its alt text as a link to that address.
  - A reference definition, `[x]` + LF + LF + `[x]: <https://example.com/a\` + LF + `b>`, gave no definition, as CommonMark reads it: `<p>[x]</p>` + LF + `<p>[x]: &lt;https://example.com/a<br />` + LF + `b&gt;</p>`.
  - With no backslash, `[x](<https://example.com/a` + LF + `b>)` gave no Markdown link: `<p>[x](&lt;https://example.com/a` + LF + `b&gt;)</p>`.
- **Impact if no action:** An agent message or a Markdown file with this rare text shows a Markdown link that CommonMark does not make, and a press opens an address with `%5C%0A` in its path. The same text in a sent message links another address.
- **Root question:** How do agent messages and the file preview read a backslash before a line ending in a link address as CommonMark does, without a Markdown link?
- **Options:**
  - **A.** Change nothing in the app. Report the angle case to the `markdown-it` project, for example on issue 1226, whose patch covers only addresses without angle brackets. Adopt the release that fixes both branches, and add regression cases then. Cost: both views keep the Markdown link for an unknown time, also for good if the project does not fix it. Effort: Small, with an unknown wait.
  - **B.** Give the shared parser its own `parseLinkDestination`, through `markdownParser.helpers`: the function of the library, but a backslash escapes no line ending in either branch. One change covers links and images in both views. It covers each line ending, because the parser turns each one into an LF first. Add one regression case for each branch at the lowest boundary that catches the bug. That boundary is `parseMarkdownTokens` in `src/markdown/parser.ts`, which both views call. Each case puts a backslash right before an LF, in an angle address or in an address without angle brackets. Do not repeat the cases for each view, for images, or for each line ending: those reach the same function. Cost: the app owns a copy of about 60 lines of the library, and each upgrade of `markdown-it` needs a compare. Effort: Small.
  - **C.** B, and report the angle case upstream, as A does. When a `markdown-it` release fixes both branches, remove the app's function and keep the regression cases. Cost: as B, until that release. Effort: Small.
- **Left out:**
  - Change nothing and report nothing: both views keep a Markdown link that CommonMark does not make, which fails the goal.
  - Read Markdown with another CommonMark library: it reverses Markdown parser decision 3 C, one `markdown-it` parser, and it takes a Large effort.
  - Test the address again in the `link` and `image` wrappers of `src/markdown/parser.ts`, after the library accepts it: the test must undo the tokens of the rule, and a second read of the escapes can drift from the scan of the library. B is better on every point.
  - Remove the backslash before each line ending from the text before the parser reads it: it also changes each hard line break outside a link. B is better on every point.
  - Patch `node_modules` with a patch tool: it adds a dependency and an install step for the same change as B. B is better on every point.
  - Make the typed reader accept the line ending, as the library does: it moves sent messages away from CommonMark, which fails the goal.
- **Wider fix:** C. One function, which the link and image rules share, removes the class in both views now, and the upstream fix removes it for every caller of the library.
- **Previous examples:**
  - The escaped `<` in an angle address of typed Markdown: a second test of the whole address refused it, because that test read the escapes again as raw text. The branch that adds this item moves each boundary rule of an angle address into one scan that knows the escapes.
  - `plans/follow-ups/shortcut-reference-before-brackets.md`: another difference of `markdown-it` 15.0.3 from CommonMark in link parsing, the first difference of issue 1226.
  - The fourth difference of issue 1226: this class in an address without angle brackets.
- **Related:**
  - `plans/follow-ups/shortcut-reference-before-brackets.md`: the same library and the same upstream issue. On 18 November 2026, the user chose to wait for a `markdown-it` release for that case, by Markdown parser decision 20 A. That choice covers only shortcut references, but it bears on A and C here.
  - `plans/follow-ups/list-lazy-line-read-as-block.md`: it recommends app wrappers in `src/markdown/parser.ts` for block rules of `markdown-it` that differ from CommonMark. It bears on B and C here.
- **Recommendation:** C. Both views then follow the CommonMark rule now, at Small effort, and the upstream report lets the app's function go when a release has the fix.
- **Action:** ask the user, because A and C have real trade-offs and no option is clearly best: on 18 November 2026 the user chose to wait for a `markdown-it` release for another link-parsing difference, and C instead adds a function that the app owns.

Supplemental history, not needed to act: the probes `probe-markdown-it.mjs` and `probe-markdown-it-variants.mjs`, with their `.txt` outputs, under `.context/escaped-angle-address/` of the workspace that found this item. Git ignores that folder.
