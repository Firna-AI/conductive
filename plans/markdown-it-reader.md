# One Markdown parser for the chat and the file preview

Status: Active. On branch `calummoore/output-summary-f7sm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The app reads Markdown with two readers that are written in this
repository. The chat reader is in `src/chat/components/agent-text.ts` and
`src/chat/links/chat-tokens.ts`. The file preview reader is in
`src/files/markdown/`. Shared parts are in `src/markdown/`. Together they
are about 2,000 lines. Ten open follow-up items are cases where a reader
reads standard Markdown wrong. On 16 November 2026, an agent message became
`<br>` and a blank line about 1,700 times. The chat showed each `<br>` as
letters, because both readers show all HTML as text.

This change replaces both readers with one configured
[`markdown-it`](https://github.com/markdown-it/markdown-it) parser. The
parser follows CommonMark, the Markdown standard that GitHub uses, and
reads GitHub tables. Each view keeps its drawing code: an adapter turns
the tokens of the parser into the types that the view draws today. Raw
HTML stays text, except a line-break tag, which shows as a line break. No
HTML from the parser reaches the page. The chat now formats quotes, rules,
emphasis, and strikethrough as the file preview does.

The change does not cover these, which have their own plans:
pictures of workspace files in messages and in the file preview
([Pictures in Markdown](markdown-pictures.md)), and the fold of repeated
filler ([Repeated blocks fold](repeated-block-folds.md)). Sent messages
keep showing their Markdown as typed. The copied transcripts keep the
agent text unchanged.

## Decisions

The user chose each one. The full items, with every option, are in
`.context/markdown-it-reader/` and `.context/br-display/options.md`.

- **Item 3, which Markdown reader the app uses: C**, `markdown-it` parsed
  to React (Cal, 16 November 2026). Not chosen: A, keep the custom
  readers and fix each bug. B, keep them and add a reference test with
  `commonmark.js`. D, `react-markdown` with `remark`. Reason: only a
  tested library removes the class of reader bugs, and parsing to React
  keeps all HTML from the parser off the page. This reverses the rejection
  of a Markdown library in `docs/protocol/chat-markdown.md`. The option
  asked for a speed check first. Design call 6 gives it.
- **Item 1, line-break tags show as letters**: answered by item 3 C, whose
  text allows `<br>` as the only HTML. `<br>` draws as a line break in the
  chat and in the file preview (Cal, 16 November 2026).
- **Item 8, which Markdown the chat shows: D** (Cal, 17 November 2026).
  The chat draws each Markdown part as the file preview draws it, with
  one shared style for quotes, rules, emphasis, and strikethrough. The
  protocol lists only the chat exceptions: images, live text, short table
  rows, and the work fold. Not chosen: A, keep the current set, with code
  that turns about ten parsed parts back into typed text. B, add only
  emphasis and strikethrough. C, all parts with a look for the chat
  alone. E, D with workspace images as file chips. Reason: it removes the
  `*` and `>` marks that agents write, and needs no code that rebuilds
  typed text. The options check of 16 November 2026 added D and E and
  changed the recommendation from A to D.
- **Item 5, pictures at web addresses: A**, a link with the alt text (Cal,
  17 November 2026). Not chosen: B, a press loads the picture. C, the
  picture loads at once. D, a Worker proxy. Reason: a web picture makes
  each reader's browser call a server that sandbox text chose, and the
  content security policy blocks it.

## Design calls

Each is my call, with its reason. Calls 1 to 9 date from 16 November
2026, and calls 10 to 13 from 17 November 2026.

1. One module, `src/markdown/parser.ts`, makes the parser:
   `markdown-it` 15.0.3 or later, the `commonmark` preset, with `table`
   and `strikethrough` on. `html`, `linkify`, and `typographer` are off.
   Reason: version 15.0.3 fixes all 8 published advisories. The app keeps
   its own link readers.
2. A small inline rule reads `<br>`, `<br/>`, and `<br />`, in any letter
   case, as a hard break. `</br>`, a tag with attributes, and a tag in code
   stay text. Reason: `html: false` keeps every tag as text, as tested.
3. A break at the start or the end of a block draws nothing. A block of
   only breaks draws nothing. Two or more breaks in a row draw at most one
   empty line. A closed message line draws a break as a space. Reason: as
   CommonMark does for a hard break, and a closed line stays one line.
4. Each adapter returns the types that the view draws today:
   `TextBlock` for the chat, with an inline tree in place of the paragraph
   string, and `MarkdownDocument` for the file preview. The chat adds
   block kinds for a quote and a rule. Reason: the renderers, the mockups,
   and `MarkdownTable` change little.
5. The chat keeps its own rules on top of the parser:
   - A short table row spans its last cell. The adapter counts the cells
     of the source row with `readTableRow`, because the parser fills
     missing cells.
   - While the agent writes, an underline on the last line shows as text.
   - A heading with no text draws nothing.
   - Lists and quotes deeper than 16 levels show as paragraph text.
   - Each line that the parser drops, past its nesting limit, shows as
     text. No text of a message is lost.
   Reason: these are requirements in `chat-markdown.md` and
   `chat-tables.md`.
6. The chat parses on the main thread, as today. Measured in Node on
   16 November 2026, `markdown-it` parses a typical 100 KiB answer in
   21 ms and a 1 MiB answer in 209 ms. The chat reader takes about 7 ms
   and 51 ms. Reason: agent answers are mostly under 20 KiB, where both
   take under 5 ms. Milestone 4 checks this in the app. The data is in
   `.context/markdown-it-reader/`.
7. The chat now reads entities, such as `&amp;`, backslash escapes, code
   with two backticks, `<https://…>` addresses, and bold around code, as
   CommonMark does. An unpaired `**` now shows as typed. Today it makes
   the rest of the text bold. Reason: these are reader bugs today.
8. Web links keep their rules. The adapter sends each link token through
   `linkTarget`, `webLink`, and `labelHidesAddress`, and each text token
   through `bareAddressAt`. The file preview keeps its own link rule. The
   parser writes each address in punycode and percent-encoding. Where the
   chat shows an address as words, it shows the readable form from
   `normalizeLinkText`. Reason: the reader sees the address as the agent
   wrote it.
9. The new dependency adds about 44 KiB, after compression, to the app.
   Reason: the chat is the first screen, so the parser cannot load later.
10. The rules of [Files in answers](../docs/protocol/file-mentions.md#files-in-answers)
    stay. The adapter reads mentions in text tokens, a path in a code token
    with `codeTarget`, and the target of a link or an image token with
    `fileLinkTarget`, with their line targets. Reason: these rules came
    from pull request #361, after the first draft of this plan.
11. A mention can start right after each mark that the chat reads, now
    also `*`, `_`, and `~~`, and it ends before the closing mark. Reason:
    answer chip decision 5 says "after a mark", and its sentence "today
    `**` is the only mark" no longer holds.
12. A web image, with item 5 A, shows its alt text as a link to its
    address, through the web link rules. With no valid address, it shows
    its alt text only, as the file preview does. A workspace image stays a
    link that opens its file, until [Pictures in Markdown](markdown-pictures.md)
    draws it.
13. In the work fold, a closed message line shows a quote as its text and a
    rule as a middle dot, `·`. An open line shows them as blocks. Reason:
    a closed line stays one line, as for a table.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md), its linked pages
  [Chat tables](../docs/protocol/chat-tables.md) and
  [Chat links](../docs/protocol/chat-links.md), and
  [File mentions](../docs/protocol/file-mentions.md).
- [Workspace tools](../docs/protocol/workspace-tools.md), for the file
  preview.
- [Agent text](../src/chat/agent-text.md) and the
  [Files README](../src/files/README.md).

Replaced ways:

- The chat block reader `textBlocks` and `Paragraph` of
  `src/chat/components/agent-text.ts` and `agent-paragraph.ts` → the chat
  adapter. Consumers: `AgentText.tsx`, `MessageLine.tsx`,
  `agent-text.test.ts`, `AgentText.dom.test.tsx`, and
  `src/app/clipboard.test-support.ts`. Moved and deleted in Milestone 4.
- The answer reading of `chatParts`, with `strong: true`, in
  `src/chat/links/chat-parts.ts` and `chat-tokens.ts` → the inline tree of
  the chat adapter. Consumers: `LinkedText.tsx`, `FileTextLink.tsx`,
  `AnswerText.dom.test.tsx`, `chat-parts-answers.test.ts`, and the other
  tests of `chat-parts`. Sent messages keep `chatParts`. Moved and deleted
  in Milestone 4.
- The file preview reader, `parseMarkdown` and the modules
  `markdown-blocks`, `markdown-inline`, `markdown-delimiters`,
  `markdown-nesting`, `markdown-spans`, `markdown-targets`,
  `markdown-text`, `markdown-lines`, and `markdown-tables` of
  `src/files/markdown/` → the preview adapter. Consumers:
  `worker-parse.ts`, `markdown-worker.ts`, `MarkdownView.tsx`,
  `FileBody.tsx`, `src/files/mount-test-kit.ts`, and their tests. Moved
  and deleted in Milestone 5.
- The shared readers `src/markdown/list-items.ts`, `headings.ts`,
  `lines.ts`, and the readers `readTableSeparator` and `tableStarts` of
  `table-rows.ts` → the parser. `table-rows.ts` keeps its types, which
  the mockups import, and `readTableRow`. Deleted in Milestone 5.
- The quote and rule styles of `src/files/markdown/MarkdownView.module.css`
  → the shared style module of design call 4 and item 8 D. Moved in
  Milestone 5.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat and the file preview change their look for line breaks in table
cells, quotes, rules, emphasis, strikethrough, and web images.

- [ ] Add a shared style module for quotes, rules, emphasis, and
      strikethrough, beside `MarkdownHeadings.module.css`. Use it in the
      chat mockups and in `docs/mockups/src/components/files/MarkdownView.tsx`.
- [ ] Add chat states for each new part: in an answer, and in a closed and
      an open message line of the work fold.
- [ ] Add a state with a line break in a table cell to `app/chat/tables`
      and to the Markdown file of the file preview mockup.
- [ ] Add a web image that shows as a link with its alt text.
- [ ] Make `docs/mockups/src/components/chat/strongText.ts` read bold as
      CommonMark does, so that an unpaired `**` shows as typed.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/chat-markdown.md`: the parts of item 8 D and the chat
      exceptions, the parser decision in place of the library rejection,
      the line-break rule, and the CommonMark changes of design call 7.
- [ ] `docs/protocol/chat-links.md` and `file-mentions.md`: web images by
      item 5 A, and the mention start of design call 11.
- [ ] `docs/protocol/chat-tables.md` and `workspace-tools.md`: a line
      break in a cell, and the HTML rule of the file preview.
- [ ] `src/chat/agent-text.md` and `src/files/README.md`.
- [ ] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact.

## Milestone 3: The parser

Depends on: 2

- [ ] Add `markdown-it` to `package.json`.
- [ ] Add `src/markdown/parser.ts` with design calls 1 and 2, and its
      tests: each break form, tags that stay text, crafted inputs from
      the advisories, and deep nesting with no lost text.

## Milestone 4: The chat on the parser

Tags: ui

Depends on: 3

- [ ] Add the chat adapter with design calls 3, 4, 5, 7, 8, 10, 11, 12,
      and 13.
- [ ] Move `AgentText`, `MessageLine`, `LinkedText`, and `FileTextLink` to
      it. Delete `textBlocks`, `Paragraph`, and the answer reading of
      `chatParts`.
- [ ] Draw quotes, rules, emphasis, and strikethrough with the shared style
      module.
- [ ] Move each test of the old reader to the adapter, with every
      assertion. List each changed expectation in the pull request.
- [ ] Check live updates in the app with a 100 KiB answer. Stop and ask
      if one update takes more than 50 ms.

## Milestone 5: The file preview on the parser

Tags: ui

Depends on: 3

- [ ] Add the preview adapter in the parse worker, with the link rule and
      the table budget of the file preview.
- [ ] Move `MarkdownView` and its tests. Move its quote and rule styles to
      the shared style module.
- [ ] Delete the old preview reader and the shared readers of Replaced
      ways.

## Milestone 6: Follow-up items

Depends on: 4, 5

- [ ] Check each item and delete the fixed ones: `chat-code-not-read-as-markdown`,
      `chat-quote-end-hides-heading`, `empty-list-item-takes-later-blocks`,
      `formatting-only-chat-heading`, `heading-line-separator-text`,
      `link-label-scan-quadratic`, `list-lazy-line-read-as-block`,
      `markdown-line-endings`, `preview-quote-keeps-line-after-fence`, and
      `one-markdown-reader-for-chat-and-preview`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Open a long agent answer with a table and a quote in production, and
      check that it shows as the mockups show.
