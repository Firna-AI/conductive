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

- **Items 9 to 15 and 17 to 20, from the milestones** (Cal, 18 November
  2026). Each took the recommended option. The full items, with every
  option, are in the conversation record and in the findings re-print of
  17 November 2026.
  - **9 C:** while the agent writes, an open mark at the end closes, so
    its words show bold, emphasis, or strikethrough at once. Not chosen:
    A, the mark shows as typed until its pair arrives. B, hide the mark.
  - **10 B:** a web image in the file preview shows its alt text as a
    link, as in the chat. Not chosen: A, the alt text only.
  - **11 C:** bold text has weight 700 in both views, in the shared style
    module. Not chosen: A, two looks. B, weight 600.
  - **12 B:** each table cell stands at the top of its row, in both views.
    Not chosen: A, the middle of the row.
  - **13 A:** a line without a pipe after a table is one more row, as
    `markdown-it` and GitHub read it. Not chosen: B, end the table in the
    chat only. C, end it in the shared table rule.
  - **14 B:** the chat draws a task box as a fixed check box, as the file
    preview does. Not chosen: A, keep it as text.
  - **15 B:** the chat adds no limit for tables. The per-table stop of the
    table rule applies only where the file preview needs it. Not chosen:
    A, accept the stop in the chat.
  - **17 A:** an unindented table right after a list item reads as text of
    the item, as CommonMark says. Not chosen: B, the old reading in the
    chat. C, a source rewrite for both views.
  - **18 B:** a line that starts a list item, a quote, or a heading starts
    no table. Not chosen: A, the parser's reading. C, the chat only.
  - **19 B:** a live update draws again only the blocks whose text
    changed. Not chosen: A, accept the cost. C, a parse worker.
  - **20 A:** both views accept the parser's reading of a shortcut
    reference before brackets. The relaxed test stays, a follow-up item
    records the case, and the case goes to the `markdown-it` project. Not
    chosen: B, a wrapped link rule.

- **Items 82 and 83, from Milestones 8 and 11** (Cal, 20 November 2026).
  - **82 B:** a task box is drawn in the design colours, in both views. It
    stays a disabled check box, with the browser's own look turned off. A
    done box has a dark fill with a light check, so it reads well in both
    schemes. Not chosen: A, the browser's disabled box, which is faint in
    the light scheme.
  - **83 A:** the median live update of a 100 KiB answer, 82 ms on the
    workspace computer after decision 19 B, is accepted, with no new
    measurement. Not chosen: B, parse only the end of a live message. C,
    `content-visibility: auto`. D, a parse worker.
- **Item 84, a done task box in the dark scheme: A**, left to the agent by
  Cal on 20 November 2026 ("do what you think is right"). A done box has
  the ink fill and a check in the page colour in each scheme, so it is
  light with a dark check in the dark scheme. Not chosen: B, a dark box in
  both schemes, which shows less on the near-black page.
- **An image whose path names no file: its alt text**, left to the agent
  in the same message, at the merge of `main` on 20 November 2026. This
  follows decisions 5 A and 10 B: an image that loads no picture shows its
  alt text, the same in both views. Not chosen: the typed Markdown, which
  `main` kept until this change. The follow-up item
  `answer-image-drops-exclamation-mark` closes with it.

## Design calls

Each is my call, with its reason. Calls 1 to 9 date from 16 November
2026, and calls 10 to 14 from 17 November 2026.

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
   - A short table row spans its last cell. The table rule of the parser
     gives each row only the cells of its source line, up to the width of
     the header. A body row with no source cell gets one empty cell, so it
     stays visible. Both the per-table stop and the preview budget still
     count the missing source cells. The file preview fills a short row
     with empty cells, within its table budget.
   - While the agent writes, an underline on the last line shows as text.
   - A heading with no text draws nothing.
   - Lists and quotes deeper than 16 levels show as paragraph text. The
     parser reads one more level, inside which list and quote marks stay
     text, so it drops no line. No text of a message is lost.
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
   The chat parser keeps bare addresses as text before marks pair, including
   formatting marks inside their paths or queries.
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
    draws it. Since the merge of `main` on 20 November 2026, pull request
    #498 draws the image of a picture file of the workspace as a picture in
    an answer, through the answer parts of this change.
13. In the work fold, a closed message line shows a quote as its text and a
    rule as a middle dot, `·`. An open line shows them as blocks. Reason:
    a closed line stays one line, as for a table.
14. The rule of design call 3 reads a link label as text of its block, in
    both views. The chat reads the alt text of an image in the same way. The
    file preview shows alt text as plain text, with a space for each line
    break. The chat applies the rule once to each block, to the parts that
    it draws. So a line break in a label counts where the link shows it: in
    its words, between the brackets of a link that opens nothing, and not at
    all for a chip or for a link that shows its address. In the file
    preview, a link that holds no node stays an empty link, as CommonMark
    draws it and as the preview drew it before. Examples are
    `[](https://example.com)`, and a label of only line breaks at the edge
    of its block. The link shows nothing, so the rule counts nothing for it:
    it does not end a run of line breaks. Reason: a label is no block, so it
    cannot drop the breaks inside its block, and an empty link cannot let a
    block show two empty lines. Findings 23 and 44 of review round 1 found
    both defects.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md), its linked pages
  [Chat tables](../docs/protocol/chat-tables.md),
  [Chat message lines](../docs/protocol/chat-message-lines.md), and
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
  the mockups import. Deleted in Milestone 5. `readTableRow` lost its last
  caller with the table rule of review round 1, and that round deletes it.
- The quote and rule styles of `src/files/markdown/MarkdownView.module.css`
  → the shared style module of design call 4 and item 8 D. Moved in
  Milestone 5.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat and the file preview change their look for line breaks in table
cells, quotes, rules, emphasis, strikethrough, and web images.

- [x] Add a shared style module for quotes, rules, emphasis, and
      strikethrough, beside `MarkdownHeadings.module.css`. Use it in the
      chat mockups and in `docs/mockups/src/components/files/MarkdownView.tsx`.
      It is `MarkdownProse.module.css`, under its `prose` class, with
      `.quote` and `.rule` for the spans of a message line.
- [x] Add chat states for each new part: in an answer, and in a closed and
      an open message line of the work fold. `app/chat/formatting` has the
      answer. Its variants have the work fold (`work`), live text
      (`writing`), marks without a pair (`as-typed`), and pictures
      (`pictures`). My call, 17 November 2026: a closed line keeps the
      muted colour of a quote, without its line, so the words after it
      read as new text, as the weight of a heading does.
- [x] Add a state with a line break in a table cell to `app/chat/tables`
      and to the Markdown file of the file preview mockup. The new page is
      `app/chat/tables/line-break`. That page held five screens, so its
      four saved states moved into their own folders with their paths.
      README.md of `app/files/markdown` has a cell on two lines.
- [x] Add a web image that shows as a link with its alt text, at
      `app/chat/formatting/pictures`.
- [x] Make `docs/mockups/src/components/chat/strongText.ts` read bold as
      CommonMark does, so that an unpaired `**` shows as typed.
      `common/markdownMarks.ts` replaces it, and reads `**`, `*`, `_`, and
      `~~` as `markdown-it` does.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages. The logs,
      the page comparison, and the screenshots are in
      `.context/markdown-it-reader/m1/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The mockups now give the look of the Markdown of
      replies in `docs/mockups/design-markdown.md`, not in
      `design-chat.md`. Four questions for the user are TODOs of
      Milestones 2 and 4.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] `docs/protocol/chat-markdown.md`: the parts of item 8 D and the chat
      exceptions, the parser decision in place of the library rejection,
      the line-break rule, and the CommonMark changes of design call 7.
      The docs cite the items as Markdown parser decisions 1, 3 C, 5 A,
      and 8 D. My calls, 17 November 2026, by item 8 D: a hard line break
      of CommonMark and indented code show as in the file preview, and a
      quote that holds the first table of a message line counts as that
      table, as the mockups show. The link-library rejection stays.
- [x] `docs/protocol/chat-links.md` and `file-mentions.md`: web images by
      item 5 A, and the mention start of design call 11. My calls,
      17 November 2026: the label test also leaves out the marks of
      emphasis and strikethrough, so a label in italics cannot hide its
      address. An image in the label of a link shows its alt text as words
      of the label. An address in angle brackets that is no link shows as
      typed, as a Markdown link does.
- [x] `docs/protocol/chat-tables.md` and `workspace-tools.md`: a line
      break in a cell, and the HTML rule of the file preview.
- [x] `src/chat/agent-text.md` and `src/files/README.md`. Each rule that
      changes is now a link to its protocol doc. Milestones 4 and 5 update
      the code names.
- [x] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact. Only the list of the parts of a reply in
      `sessions-and-chat.md` changed: it adds quotes.
- [x] Ask the user, from the mockups: while the agent writes, an opening
      `**` shows its stars until its pair arrives, as
      `app/chat/formatting/writing` shows. Keep this, or hide or close an
      open mark of live text? State the answer in `chat-markdown.md`.
      Answered: item 9 C, close the open mark while the agent writes.
- [x] Ask the user, from the mockups: does a web picture in the file
      preview also show as a link with its alt text? Item 5 asked about
      both views, and design call 12 covers only the chat. State the
      answer in `workspace-tools.md`. Answered: item 10 B, a link.
- [x] Ask the user, from the docs: the file preview draws a task box, such
      as `- [ ]`, as a box, and `chat-markdown.md` keeps it as text in the
      chat. Item 8 D lists no task box among the chat exceptions, and the
      mockups draw none. Draw it in the chat as the file preview does, or
      keep it as text? `markdown-it` reads no task box, so the preview
      adapter of Milestone 5 must keep its own. Answered: item 14 B, a
      check box in the chat too.
- [x] Ask the user, from the docs: `markdown-it` reads a line of text
      without a pipe after a table as one more row, as GitHub does.
      `chat-tables.md` says that such a line ends the table, and both
      readers end it there today. Follow the parser, or keep the rule?
      Answered: item 13 A, follow the parser. Milestone 9 states it.
- [x] Ask the user, from the docs: `markdown-it` ends a table at the row
      whose short rows would fill more than 65,536 empty cells. Such rows
      then show as text. `chat-tables.md` says that the chat adds no limit
      for tables. Accept the limit of the parser, or keep no limit?
      Answered: item 15 B, no limit in the chat. Milestone 10 builds it.

## Milestone 3: The parser

Depends on: 2

- [x] Add `markdown-it` to `package.json`.
- [x] Add `src/markdown/parser.ts` with design calls 1 and 2, and its
      tests: each break form, tags that stay text, crafted inputs from
      the advisories, and deep nesting with no lost text.
      My call, 17 November 2026: use 64 block levels so that sixteen
      nested lists fit, with two block levels per list. Record the source
      range and token index when the parser drops lines. Container maps
      cover those lines too, so map coverage alone cannot find them.
      The check logs are in `.context/markdown-it-reader/m3/`.

## Milestone 4: The chat on the parser

Tags: ui

Depends on: 3

- [x] Add the chat adapter with design calls 3, 4, 5, 7, 8, 10, 11, 12,
      and 13. It is `src/chat/markdown/`. My call, 17 November 2026: the
      parser keeps the source text after the label of each link, so a
      link that opens nothing shows as typed.
- [x] Move `AgentText`, `MessageLine`, `LinkedText`, and `FileTextLink` to
      it. Delete `textBlocks`, `Paragraph`, and the answer reading of
      `chatParts`.
- [x] Draw quotes, rules, emphasis, and strikethrough with the shared style
      module.
- [x] Move each test of the old reader to the adapter, with every
      assertion. List each changed expectation in the pull request. The
      assertion that a line without a pipe ends a table waits for the
      answer to the table question of Milestone 2.
- [x] Check live updates in the app with a 100 KiB answer. Stop and ask
      if one update takes more than 50 ms. Answered: item 19 B, draw again
      only the blocks whose text changed. Milestone 11 builds it. Measured on 17 November 2026
      in headless Chrome, production build: the median update takes
      70 ms with the parser, and 66 ms with the old reader. The parse
      takes about 15 ms. The data is in `.context/markdown-it-reader/m4/`.
- [x] Ask the user, from the mockups: bold text has the strong weight and
      the ink colour in the file preview, and the weight of the browser in
      the chat. Does bold text join the shared style module, and with
      which look? Answered: item 11 C, weight 700 in both views.
- [x] Ask the user, from the mockups: with line breaks, a cell of one line
      sits in the middle of a higher row, in both views, as
      `app/chat/tables/line-break` shows. Align each cell to the top of
      its row? Answered: item 12 B, the top of the row.

## Milestone 5: The file preview on the parser

Tags: ui

Depends on: 3

- [x] Add the preview adapter in the parse worker, with the link rule and
      the table budget of the file preview. It is `previewDocument` in
      `src/files/markdown/`. Both adapters share the depth limit and the
      dropped lines of `src/markdown/token-read.ts`, the line breaks of
      `kept-breaks.ts`, and the table read of `table-tokens.ts`. My calls,
      17 November 2026: the preview counts the cells of a row as the
      parser does, so a row of one pipe has none. So the parser never ends
      a table before the budget of the file does. When the parser ends a
      table at its own limit, that row starts the text of the rest of the
      file. The preview draws line breaks by design call 3. A task box
      counts only at the start of the first paragraph of an item, as on
      GitHub. A link that the parser does not make, such as a script
      address, shows as typed. A link in a label shows as its text. The
      depth limit of 12 for marks and links stays. Measured in headless
      Chrome with bundled workers, a new worker parses a 1 MiB file in
      about 650 ms, and the old reader took about 360 ms.
- [x] Move `MarkdownView` and its tests. Move its quote and rule styles to
      the shared style module. The view stays in `src/files/markdown/`, on
      the types of the adapter. My call, 17 November 2026: the README of
      the Files development page follows the mockup's README again. The
      logs, the timing, and the screenshots are in
      `.context/markdown-it-reader/m5/`.
- [x] Delete the old preview reader and the shared readers of Replaced
      ways. `table-rows.ts` keeps its types and `readTableRow`.

## Milestone 6: Follow-up items

Depends on: 4, 5

- [x] Check each item and delete the fixed ones: `chat-code-not-read-as-markdown`,
      `chat-quote-end-hides-heading`, `empty-list-item-takes-later-blocks`,
      `formatting-only-chat-heading`, `heading-line-separator-text`,
      `link-label-scan-quadratic`, `list-lazy-line-read-as-block`,
      `markdown-line-endings`, `preview-quote-keeps-line-after-fence`, and
      `one-markdown-reader-for-chat-and-preview`.
      Deleted as fixed: `chat-quote-end-hides-heading`,
      `empty-list-item-takes-later-blocks`, `heading-line-separator-text`,
      `markdown-line-endings`, `preview-quote-keeps-line-after-fence`,
      `one-markdown-reader-for-chat-and-preview`, and the unnamed
      `bold-after-inline-code`. `chat-fence-at-any-indent` merged into
      `list-lazy-line-read-as-block`. Kept and updated:
      `chat-code-not-read-as-markdown`, now for sent messages,
      `link-label-scan-quadratic`, now for sent messages and the message
      field, `formatting-only-chat-heading`, and
      `list-lazy-line-read-as-block`, now a defect of `markdown-it`. Added:
      `table-header-takes-block-line`. Eight more items that named the
      replaced readers now name the current code. The probes and their
      output are in `.context/markdown-it-reader/m6/`.

## Milestone 8: Mockups for the answers of 18 November 2026

Tags: mockup

Depends on: 6

- [x] Item 9 C: `app/chat/formatting/writing` shows an open mark closed at
      the end of live text, so `**Next:` shows bold. My call, 18 November
      2026: only a mark that can open and cannot close closes there. So
      the `**` of a file pattern, such as `tests/**/*.test.ts`, stays text
      while the agent writes, as in a finished message. A fixture marks a
      message that the agent still writes with `live`.
- [x] Item 11 C: bold text has weight 700 in the shared style module, in
      the chat and in the file preview mockups. My call, 18 November 2026:
      bold text keeps the colour of the text around it, as emphasis and
      strikethrough do. The ink colour of the file preview stood out from
      its text, but not from the text of a reply, so it gave two looks.
- [x] Item 12 B: each cell of `MarkdownTable` stands at the top of its row.
- [x] Item 14 B: a chat state with a task list, unchecked and checked, in
      an answer and in a closed and an open message line. The states are
      `app/chat/lists/tasks` and `app/chat/lists/tasks-work`, because
      `app/chat/formatting` already shows five screens. The file preview
      mockup drew no task box, so README.md of `app/files/markdown` now
      has a task list too, with the box of the app: the disabled check box
      of the browser. `markdownTasks.ts` and `TaskBox.tsx` serve both
      views.
- [x] Item 10 B: the README of the file preview mockup holds a web image
      that shows its alt text as a link.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages. The logs,
      the reader probes, and the screenshots are in
      `.context/markdown-it-reader/m8/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. `docs/mockups/design-markdown.md` now gives the
      bold weight of item 11 C too. Problems that the mockups show: in the
      light scheme, the disabled check box of the browser draws a done
      task in light grey with a white check, which is hard to see. The
      app's file preview draws the box of a task item with more blocks on
      its own line, above the text. The mockups put it at the start of the
      first paragraph, as GitHub does. A message line is a summary, which
      a screen reader reads as one button, so it can lose the state of
      each box in the line. The Files development page copies this README
      in `src/files/dev/dev-samples.ts`, without the picture and the task
      list. The app imports `MarkdownTable` and
      `MarkdownProse.module.css`, so its tables already align to the top,
      and its chat draws bold text at 700.

## Milestone 9: Documentation for the answers of 18 November 2026

Depends on: 8

- [x] `docs/protocol/chat-markdown.md`: the live-text exception of item 9
      C, and task boxes in the chat by item 14 B. Strong text joins the
      shared look by item 11 C. Images move from the chat exceptions to
      the shared parts, because item 10 B shows a web image in one way in
      both views. My calls, 18 November 2026: an open mark is one in the
      paragraph, heading, or table cell where the live text ends, as the
      mockups close only the marks of the last paragraph. The saved
      history shows what a live tab shows once the agent message is
      complete, because its last live update can close an open mark. The
      doc has 284 lines.
- [x] `docs/protocol/chat-tables.md`: rows without a pipe by item 13 A, a
      table after a list item by item 17 A, no table at a list, quote, or
      heading line by item 18 B, cells at the top of the row by item 12 B,
      and no limit in the chat by item 15 B. My calls, 18 November 2026:
      the body rows end where the parser ends them: at a blank line, at a
      line that starts a list item, a quote, a heading, a rule, or a code
      block, and at a line outside the item or quote of the table. Lines
      without `>` under the text of a quote continue that text too, by the
      same rule of CommonMark. `chat-message-lines.md` gives the task
      boxes of a closed and an open line, a press on a box, which acts on
      the line, and the state of each box for a screen reader, which
      item 14 B settles. The parser probes are in
      `.context/markdown-it-reader/m9/probe/`.
- [x] `docs/protocol/workspace-tools.md`: a web image in the file preview
      by item 10 B. The look of the preview also names strong text and
      task boxes. The doc has 409 lines, over the target of about 250 for
      a protocol doc. A split is outside this milestone, and the final
      report of the milestone raises it.
- [x] `docs/mockups/design-markdown.md`: bold weight by item 11 C.
      Milestone 8 already gave it. The built tokens give the heading
      weight and the strong weight as 600, so bold text at 700 is heavier,
      as the page says. No change.
- [x] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact. No sentence restates one, so none changed. The link
      check of the changed docs is in `.context/markdown-it-reader/m9/`.

## Milestone 10: The table rule for the answers of 18 November 2026

Depends on: 9

- [x] Item 15 B: the per-table stop of `src/markdown/table-rule.ts`
      applies only in a parse for the file preview.
- [x] Item 18 B: a line that starts a list item, a quote, or a heading
      starts no table. The table rule now follows the heading rule.
      Delete `plans/follow-ups/table-header-takes-block-line.md`.
- [x] Item 13 A: `readTable` keeps each row that the parser reads.
      Remove the no-op `rowsInTable`, `ownCells`, and the row split.
      Test a line without a pipe in both views. The return field `rest`
      stays empty for the unchanged block reader, outside this scope.
- [x] Item 20 A: `plans/follow-ups/shortcut-reference-before-brackets.md`
      records the shortcut reference case, the relaxed test, and the text
      of divergence 1 of `markdown-it` issue 1226.
- [x] Add `plans/follow-ups/split-workspace-terminal-protocol-section.md`
      for the split of the Terminal section after the merge.

Evidence: `.context/markdown-it-reader/m10/` holds the regression failures,
the CommonMark comparison, and the check logs.

## Milestone 11: The chat and the preview for the answers of 18 November 2026

Tags: ui

Depends on: 9

- [x] Item 9 C: while the agent writes, the chat adapter closes an open
      mark at the end of the text. My calls, 18 November 2026: the events
      give no end of one agent message, so the chat writes the newest item
      of the running turn, when it is an agent message. A later step of the
      turn, such as a tool call, or the end of the turn ends it. Between
      `assistant.completed` and the next step, the message still closes its
      open marks. An open mark closes as a closing mark at the end of the
      text would: a mark between a pair stays text, and the closing mark
      joins a closing run right before it, so `**a b*` shows `a b` in bold,
      as when its pair arrives. An underline at the end shows as text, and
      the marks close after it. The read of the live block gets the
      reference definitions of the whole message, so a reference link reads
      as in the whole message (finding 101 of review round 3, 18 November
      2026).
- [x] Item 19 B: a live update draws again only the blocks whose text
      changed. Measure a 100 KiB answer again. Each block and each text of
      an answer compares its new data with its last data, and the chips and
      links still follow the workspaces, the tree, and the links of the
      screen. Measured on 18 November 2026 in headless Chrome, production
      build, as Milestone 4 did, six runs of each build, alternated: the
      median update takes 82 ms, and 149 ms before this change. The highest
      update takes 264 ms, at the end of a turn, which parses the answer
      again as a finished message. The highest update before an end takes
      181 ms. The machine had 4 cores and a load of about 3, so the times
      are higher than the 70 ms of Milestone 4 on 17 November. The parse
      takes about 15 to 20 ms of each update, and style and layout about
      30 ms. The data is in `.context/markdown-it-reader/m11/timing/`.
- [x] Item 14 B: the chat draws task boxes with the reader of the file
      preview, moved to `src/markdown/`. It is `readTaskBox` of
      `src/markdown/task-boxes.ts`. My call, 18 November 2026: a numbered
      task item shows its box and no number, in an answer and in a message
      line, as the shared style hides the marker of a task item.
- [x] Item 10 B: the file preview shows a web image as a link with its
      alt text. Only an absolute `http` or `https` address is a link, as
      `workspace-tools.md` says, with the link rules of the preview. In the
      label of a link, an image shows its alt text alone.
- [x] Items 11 C and 12 B: the app uses the shared bold weight and the top
      alignment of `MarkdownTable`. The file preview lost its own bold rule:
      bold text now has weight 700 and the colour of its text, also in a
      quote. Both views already stood each cell at the top of its row.
- [x] Update `src/chat/agent-text.md`, `src/files/markdown-preview.md`,
      and the other guides that name the changed code.
- [x] From the mockups of Milestone 8: one shared task-item drawing for
      both views, with the box at the start of the first paragraph, so a
      task with sub-tasks keeps its box on the line of its words. Today
      the file preview puts that box on a line of its own. It is
      `MarkdownItem` of `src/markdown/MarkdownItem.tsx`.
- [x] From the mockups of Milestone 8: each task box in a message line has
      a name that states its state, such as "done", so a screen reader
      reads it inside the line's button. Check with a screen reader. The
      names are "done" and "not done". Chrome gives the closed line the
      name "Two changes to make: not done Debounce the lookups not done
      Move the fields under the list". No screen reader ran: the check read
      the accessibility tree of Chrome, which screen readers read.
- [x] From the mockups of Milestone 8: the README sample of
      `src/files/dev/dev-samples.ts` adds the web picture and the task list
      of the mockup README. The chat development page adds `answer=tasks`.
      The logs, the screenshots, and the browser checks are in
      `.context/markdown-it-reader/m11/`.
- [x] Item 82 B: draw the task box in the design colours, in the mockups and
      in both views. The `taskBox` class of `MarkdownProse.module.css`
      gives `TaskBox` one look in an answer, a message line, and the file
      preview, and `LineTaskBox` now draws `TaskBox` with its name. My
      calls, 20 November 2026: the box keeps the 13 px of the box of the
      browser, so the placement rules of `.task` and the place of each box
      stay. An open box has a 1 px border in the muted colour, because the
      lighter border colours were faint in the dark scheme. A done box has
      the ink fill and a check in the surface colour, so in the dark scheme
      it is a light box with a dark check, as the browser drew it there. A
      mask draws the check. The box keeps its colours when the page prints,
      and with forced colours it takes the look of the system. The
      screenshots and the checks are in `.context/markdown-it-reader/item82/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Merge `origin/main` at `17051a2de` into the branch, with the
      behaviours that `main` added to the replaced readers moved to the
      parser and its adapters. The justification of each merge decision is
      in `.context/markdown-it-reader/merge-main.md`. The pull request
      description copies it.
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

- [x] Open a long agent answer with a table and a quote in production, and
      check that it shows as the mockups show. Now the follow-up item
      `markdown-parser-production-check`.
