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
the tokens of the parser into the block types that the view draws today.
Raw HTML stays text, except a line-break tag, which shows as a line break.
No HTML from the parser reaches the page. The change does not cover how
the chat shows a long run of repeated filler. That is item 2 below, which
stays open for a separate change. It also does not cover sent messages,
which keep showing their Markdown as typed, or the copied transcripts,
which keep the agent text unchanged.

## Decisions

- **Item 3, which Markdown reader the app uses: C**, `markdown-it` parsed
  to React (Cal, 16 November 2026). The other options were A, keep the
  custom readers and fix each bug, B, keep them and add a reference test
  with `commonmark.js`, and D, `react-markdown` with `remark`. Reason: only
  a tested library removes the class of reader bugs, and parsing to React
  keeps all HTML from the parser off the page. This reverses the rejection
  of a Markdown library in `docs/protocol/chat-markdown.md:54-59`. The
  option said that the first plan step measures speed, with a fall back to
  A if the check fails. The measurement is under Design calls, item 6.
- **Item 1, line-break tags show as letters**: answered by item 3 C, whose
  text says that the app allows `<br>` as its only HTML. This is the
  behaviour of item 1 option B: one rule for the chat and the file preview.
- **Item 2, repeated filler floods the chat**: open. It recommends B: fold
  each run of five or more identical blocks behind one line with a count.
  It does not block this plan.
- **Decision 1, which Markdown the chat shows**: open. See below.

### Decision 1. Which Markdown the chat shows

The options check added D and E, changed the root question, regraded A
and B, and changed the recommendation from A to D. Its summary is in
`.context/markdown-it-reader/options-check.md`.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `docs/protocol/chat-markdown.md:17-37`.
- **Background:**
  - The chat shows only part of Markdown: paragraphs, headings, lists,
    code blocks, inline code, bold, links, and tables.
  - It shows other Markdown as the text that the agent wrote, such as a
    quote, a rule, emphasis with one `*` or `_`, strikethrough, and an
    image.
  - The small set came from the table work of 9 November 2026, for the
    smallest visible change. It was not a rule against quotes.
  - The parser does not keep the source of an inline part. A quote in a
    list item reaches the adapter without its `>` marks. So code that
    shows a parsed part "as typed" must rebuild it from the source lines.
  - The file preview already draws quotes, rules, emphasis, and
    strikethrough (`src/files/markdown/MarkdownView.module.css:60-70`).
- **Problem:** Agents often write emphasis and quotes. The chat shows their
  `*` and `>` marks as letters.
- **Impact if no action:** The chat keeps showing these marks, as today.
- **Root question:** Which Markdown, if any, should an agent message show
  as typed, now that one parser reads every part for both views?
- **Options:**
  - **A.** Keep the current set. The adapter turns about ten parsed parts
    back into the text that the agent wrote, each with a test. A later
    change deletes that code. Effort: Medium.
  - **B.** Also show emphasis and strikethrough. Quotes, rules, and images
    stay text, with the same rebuild code as A. The mockup bold reader
    needs new code. Effort: Medium.
  - **C.** Show all CommonMark parts, with a look for the chat alone. An
    image shows as a link with its alt text. Quotes and rules need new
    rules for a closed line and an open line of the work fold. Effort:
    Medium.
  - **D.** The chat draws each part as the file preview draws it. The
    protocol lists only the chat exceptions: an image shows its alt text
    as a link, and the chat keeps its rules for live text, short table
    rows, and the work fold. One style module, as for headings, gives
    quotes, rules, emphasis, and strikethrough the same look in both
    views. Effort: Medium.
  - **E.** D, and an image whose address names an image file of the
    workspace shows as a file chip that opens the file tab. How an
    absolute sandbox path maps to the file tree is still unknown. Effort:
    Large.
- **Risk for B to E:** outside code, `a*b*c` shows emphasis and
  `src/__tests__/` shows bold, as on GitHub. Each old message with `>` or
  `*` changes its look, because the saved history shows the same
  formatting as live text (`chat-markdown.md:158-160`).
- **Left out:**
  - Load pictures from an agent address in the chat: it breaks the content
    security policy, which lets images load only from the app, `data:`
    addresses, and GitHub avatars
    (`docs/protocol/access-and-security.md:202-211`).
  - Agent instructions that ask for no emphasis or quotes: old messages,
    other agents, and repository instructions still have the marks.
- **Wider fix:** D. A part that a list does not name shows as marks. D
  draws each part by default, and its shared style keeps both views alike.
- **Previous examples:** `chat-markdown.md:54-56`, the rejection of the
  full file preview reader for the chat.
- **Recommendation:** D. It removes the marks that the problem names and
  needs no code that turns parsed parts back into text. The first
  recommendation was A.
- **Action:** ask the user, because each option changes what members see
  in every agent message.

## Design calls

Each is my call (16 November 2026), with its reason.

1. One module, `src/markdown/parser.ts`, makes the parser:
   `markdown-it` 15.0.3 or later, the `commonmark` preset, with `table`
   and `strikethrough` on. `html`, `linkify`, and `typographer` are off.
   Reason: version 15.0.3 fixes all 8 published advisories. The app keeps
   its own link readers.
2. A small inline rule reads `<br>`, `<br/>`, and `<br />`, in any letter
   case, as a hard break. `</br>`, a tag with attributes, and a tag in code
   stay text. Reason: `html: false` keeps every tag as text, as tested in
   `.context/markdown-it-reader/`.
3. A break at the start or the end of a block draws nothing. A block of
   only breaks draws nothing. Two or more breaks in a row draw at most one
   empty line. A closed message line draws a break as a space. Reason: as
   CommonMark does for a hard break, and a closed line stays one line.
4. Each adapter returns the types that the view draws today:
   `TextBlock` for the chat, with an inline tree in place of the paragraph
   string, and `MarkdownDocument` for the file preview. Reason: the
   renderers, the mockups, and `MarkdownTable` change little.
5. The chat keeps its own rules on top of the parser:
   - A short table row spans its last cell. The adapter counts the cells
     of the source row with `readTableRow`, because the parser fills
     missing cells.
   - While the agent writes, an underline on the last line shows as text.
   - A heading with no text draws nothing.
   - Lists deeper than 16 levels show as paragraph text.
   - Each line that the parser drops, past its nesting limit, shows as
     text. No text of a message is lost.
   Reason: these are requirements in `chat-markdown.md` and
   `chat-tables.md`.
6. The chat parses on the main thread, as today. Measured in Node on
   16 November 2026, `markdown-it` parses a typical 100 KiB answer in
   21 ms and a 1 MiB answer in 209 ms. The chat reader takes about 7 ms
   and 51 ms. Reason: agent answers are mostly under 20 KiB, where both
   are under 5 ms. Milestone 4 checks this in the app. The data is in
   `.context/markdown-it-reader/`.
7. The chat now reads entities, such as `&amp;`, backslash escapes, code
   with two backticks, `<https://…>` addresses, and bold around code, as
   CommonMark does. An unpaired `**` now shows as typed. Today it makes
   the rest of the text bold. Reason: these are reader bugs today.
8. Links keep their rules. The adapter sends each link token through
   `linkTarget`, `webLink`, and `labelHidesAddress`, and each text token
   through `bareAddressAt`. The file preview keeps its own link rule.
   The parser writes each link address in punycode and percent-encoding.
   Where the chat shows an address as words, it shows the readable form
   from `normalizeLinkText` of the parser. Reason: the reader sees the
   address as the agent wrote it.
9. The new dependency adds about 44 KiB, after compression, to the app.
   Reason: the chat is the first screen, so the parser cannot load later.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md) and
  [Chat tables](../docs/protocol/chat-tables.md).
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
  the chat adapter. Consumers: `LinkedText.tsx` and the tests of
  `chat-parts`. Sent messages keep `chatParts`. Moved and deleted in
  Milestone 4.
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

## Milestone 1: Mockups

Tags: mockup

Depends on: none

A line-break tag in a table cell now shows as two lines, in the chat and
in the file preview.

- [ ] Add a state with a line break in a table cell to `app/chat/tables`
      and to the Markdown file of the file preview mockup.
- [ ] Make `docs/mockups/src/components/chat/strongText.ts` read bold as
      CommonMark does, so that an unpaired `**` shows as typed.
- [ ] Draw the parts that decision 1 adds, in the chat mockups and in
      `docs/mockups/src/components/files/MarkdownView.tsx`. With D, add the
      shared style module for quotes, rules, emphasis, and strikethrough.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/chat-markdown.md`: the parser decision in place of
      the library rejection, the line-break rule, the CommonMark changes
      of design call 7, and the outcome of decision 1.
- [ ] `docs/protocol/chat-tables.md` and `workspace-tools.md`: a line
      break in a cell, and the file preview HTML rule.
- [ ] `docs/protocol/chat-links.md:105-107` and
      `docs/protocol/agent-instructions.md:84-86`, which say that the chat
      shows an image as typed.
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

- [ ] Add the chat adapter with design calls 3, 4, 5, 7, and 8, and the
      outcome of decision 1.
- [ ] Move `AgentText`, `MessageLine`, and `LinkedText` to it. Delete
      `textBlocks`, `Paragraph`, and the answer reading of `chatParts`.
- [ ] Move each test of the old reader to the adapter, with every
      assertion. List each changed expectation in the pull request.
- [ ] Check live updates in the app with a 100 KiB answer. Stop and ask
      if one update takes more than 50 ms.

## Milestone 5: The file preview on the parser

Tags: ui

Depends on: 3

- [ ] Add the preview adapter in the parse worker, with the link rule and
      the table budget of the file preview.
- [ ] Move `MarkdownView` and its tests. Delete the old preview reader
      and the shared readers of Replaced ways.

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

- [ ] Open a long agent answer with a table in production, and check that
      it shows as before.
