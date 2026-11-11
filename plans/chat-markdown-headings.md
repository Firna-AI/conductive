# Headings in agent messages

Status: Active. On branch `calummoore/markdown-heading-support`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The chat shows each Markdown heading of an agent message as the text of a
paragraph, without its `#` marks. Agents write headings often. The shared
agent skills put each decision under `## Needs your answer` and
`### 1. <title>`, so those messages lose their sections. A heading also
joins a line directly above or under it, `## Title ##` keeps its closing
`##`, and a setext heading shows its `=====` line as text. The file preview
already draws all six levels.

On 11 November 2026 the user chose decision 1 option B: the chat draws real
headings at all six levels, with the look of the file preview's headings.
One heading reader in `src/markdown/` serves the chat and the file preview,
as the table and list readers do. One heading style in the mockup
components gives both views their look, as option E of the options check
proposed. Quotes, rules, links, emphasis with one
`*`, and task boxes stay text. Chat links have their own planned work. The
wider question of one Markdown reader for both views stays open in
`plans/follow-ups/one-markdown-reader-for-chat-and-preview.md`.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md).
- [Agent text](../src/chat/agent-text.md) and the [chat README](../src/chat/README.md).
- The [files README](../src/files/README.md), for the file preview's parser.
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Decisions

### 1. Chat shows headings as plain text

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/components/agent-text.ts:161`, `docs/protocol/chat-markdown.md:24`
- **Background:** The chat parser removes the `#` marks of a heading and adds its text to a paragraph. `docs/protocol/chat-markdown.md` states this. The line came with PR #119 on 9 November 2026, where the user chose to add tables and keep the other chat formatting. The file preview draws all six levels.
- **Problem:** The sections of an agent message look like body text. A heading also runs into a line directly above or under it.
- **Impact if no action:** Long agent messages stay hard to scan, also the messages that ask the user for decisions.
- **Root question:** How do the headings that agents write show in the chat?
- **Shared assumptions:** The browser reads the text and draws it, because events carry only text (protocol doc, "Saved history"). HTML shows as text (protocol doc, "Formatting"). A live update shows as the complete message with the same text (protocol doc, "While the agent writes"). The fix lives in the chat, not in the agents' output (the code). The approach that drops the last one is left out below.
- **Options:**
  - **A.** Show each heading as its own paragraph in strong text. All levels look the same. A screen reader cannot jump between sections. Effort: Small.
  - **B.** Draw real headings at all six levels, with the look of the file preview's headings. Move the file preview's heading rule to `src/markdown/`, next to the shared table and list readers, and use it in both views. Effort: Medium.
  - **C.** Give the chat the file preview's full block parser, with a setting for each view. It also brings quotes and rules. It reverses the user's choice of 10 November 2026, which rejected this for lists. It also reverses the choice of 9 November 2026, which did not take one parser with a setting for each view. Effort: Large.
  - **D.** Read both views with a CommonMark library, such as `markdown-it`. It needs a safety review and a speed check for live text. It reverses the protocol doc's rejection of a library. Effort: Large.
  - **E.** B, with one heading style module in `docs/mockups/src/components/common/`, as `MarkdownTable.module.css` is for tables. It holds the size, the weight, the colour, and the rule under `h1` for `h1` to `h6`, under a container class. The app's file preview, the mockup file preview, and the chat answer use it. Each view keeps its own margins. It moves the heading rules out of both `MarkdownView.module.css` files. Effort: Medium.
  - **F.** B, built after one renderer draws the agent blocks of the app and the mockups, as option C of `plans/follow-ups/shared-chat-block-renderer.md` says. The headings wait for a change of about 30 fixtures in 10 files. Effort: Large.
- **Left out:** Change nothing, because it fails the goal. Bold labels in the agents' instructions, because old messages and other agents still write headings. A rewrite before the events carry the text, because it fails the goal for old messages in the saved history and at best gives the look of A. Heading data in the events, because B is better on every point: it changes no event, and old messages need none. A heading rule for the chat alone, because B costs the same and keeps one rule. A Markdown library for the chat alone, because it breaks the rule that both views read lists and tables the same way. An outline of the sections of a long message, because alone it fails the goal. It can come after B.
- **Wider fix:** D. One CommonMark reader ends the class: Markdown that the file preview draws and the chat shows as text. C ends the split between the parsers but keeps the gaps of the file preview's parser.
- **Previous examples:** Tables, PR #119 on 9 November 2026. Nested lists, PR #161 on 10 November 2026. `plans/follow-ups/chat-heading-joins-next-line.md` records the joined line.
- **Related:** `plans/follow-ups/one-markdown-reader-for-chat-and-preview.md` holds options C and D for the wider class. It stays open.
- **Recommendation:** E, after the options check. The first recommendation was B. E is B with one source for the heading look, so the two views cannot drift apart. D best protects the codebase.
- **Action:** ask the user, because B changes a rule of `docs/protocol/chat-markdown.md`, and C and D reverse recorded choices.
- **Chosen:** B, by the user on 11 November 2026. The user answered `1 = B`. The options check added E after the answer. E changes no requirement of B, so the plan builds B with the style module of E, as a design call.

### 2. Headings do not stand out from bold labels

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/components/common/MarkdownHeadings.module.css`, `src/chat/links/LinkedText.tsx:138`
- **Background:** Milestone 1 gives chat headings the look of the file preview's headings: `h1` 16 px, `h2` 13.5 px, and `h3` to `h6` 13 px, all at weight 600. Body text is 13 px. Bold text in a chat answer has no style of its own, so the browser draws it at weight 700. The file preview draws bold text at the token weight 600. Screenshots of A, B, and C are in `.context/chat-markdown-headings/mockups/`: `headings-desktop.png`, `s2-headings-desktop.png`, and `s3-headings-desktop.png`.
- **Problem:** `### 1. <title>` looks lighter than the `**Severity:**` labels under it, and `## Needs your answer` looks like one more bold label. In the file preview, `h2` and `h3` look almost the same.
- **Impact if no action:** Decision messages stay hard to scan, which was the reason for the change.
- **Root question:** How does a heading stand out from bold text and from the next heading level?
- **Options:**
  - **A.** Keep the file preview's look. Effort: Small.
  - **B.** Give the shared heading style a larger scale at weight 700: `h1` 18 px, `h2` 15 px, `h3` 14 px, and `h4` to `h6` 13 px. Both views get it and look heavier. The type tokens have no 18, 15, or 14 px size yet. Effort: Small.
  - **C.** Give the shared heading style the same larger scale at weight 600. Draw bold text in chat answers at the token weight 600, as the file preview does. Bold text in every answer gets a little lighter. Effort: Small.
  - **D.** Give the larger scale to the chat alone. The file preview keeps its look, so the two views look different again. Effort: Small.
- **Left out:** The larger sizes alone at weight 600, because `h3` still competes with bold text at 700.
- **Wider fix:** None. The shared style module already gives one source for the look.
- **Previous examples:** None found.
- **Related:** Decision 1: the user chose the look of the file preview's headings. B, C, and D change that look. Milestones 1a, 2, and 4 wait for the answer.
- **Recommendation:** C. Both weights then follow their design tokens, and the size alone sets a heading above a bold label.
- **Action:** ask the user, because B, C, and D change the look that the user chose in decision 1.

## Design calls

Agent calls, 11 November 2026:

- The chat reads headings as CommonMark and the file preview do: `#` to
  `######` and a space or the line end, without the closing `#` run, and
  setext headings, a line of `=` or `-` under a paragraph. Seven `#`
  marks, or `#` before text with no space, stay text. Reason: the chat
  already shares the CommonMark list rules with the file preview.
- A lazy line, an unindented line that continues the paragraph of a list
  item, is never a setext underline, in both views, as CommonMark says.
  The file preview read `- Foo` above `===` as a heading in the item.
  Reason: both views then read headings the same way, and the fix is a few
  lines in the shared reader's caller. The same case in a quote of the file
  preview stays with `plans/follow-ups/preview-quote-keeps-line-after-fence.md`,
  whose option A fixes it. The chat shows quotes as text.
- In the chat, a setext underline counts only when a line break follows
  it. Reason: while the agent writes a list directly under a line of text,
  the `-` of the list would show that line as a heading for one update.
  Cost: a message that ends on an underline shows that line as text, as a
  header row shows as text until its separator row arrives.
- In the chat, a setext underline turns only paragraph text into a
  heading. A quote line or an indented code line, which the chat shows as
  text, never becomes a heading. Reason: CommonMark and the file preview
  read `> Note` above `---` as a quote and a rule.
- One heading reader in `src/markdown/headings.ts` serves both views, with
  no React imports. Reason: the user chose shared readers for tables on 9
  November 2026 and for lists on 10 November 2026.
- A heading draws as `h1` to `h6`, at the level that the agent wrote.
  Reason: the file preview and GitHub do the same, and a screen reader can
  jump between sections.
- Headings take the size, the weight, and the colour of the file preview's
  headings. The spacing fits the block gap of an agent message. Reason:
  tables already look the same in both views. The mockups check it.
- One heading style module in `docs/mockups/src/components/common/` holds
  that look, under a container class. The chat answer, the app's file
  preview, and the mockup file preview use it, and each keeps its own
  margins. Reason: option E of the options check. Three copies would
  drift, and the two copies of the file preview already differ: the mockup
  styles only `h1` and `h2`.
- A heading with no text draws nothing, but it still ends the paragraph
  above it. Reason: a screen reader meets no empty heading, also while the
  agent writes `## ` before the words.
- In a message line of the folded work, a heading is a span, not a heading
  element. The closed line shows its text in the line. The open line shows
  it on its own line in the heading weight. Reason: the closed line stays
  one line. A `<summary>` may hold a heading, but its button role hides
  the heading from the heading list of a screen reader.
- The closed line also shows the text of a heading in the heading weight.
  Reason: the mockups showed "Plan Wait 250 ms after the last key press",
  where the heading ran into the text after it. The weight shows where the
  heading ends, and the line keeps the agent's words. A ` · ` after the
  heading, as between table cells, was the other way.
- Under an open line, a heading after the first table is a heading element
  in the look of the open line's headings. Reason: it is outside the
  `<summary>`, and the work stays quieter than the answer.
- A heading inside a list item stands as far from the block above it as a
  heading at the top of an answer. Reason: agents rarely write one, and one
  rule keeps the spacing simple. The mockups do not draw this case.
- The mockups now draw `**` as bold text in answers, as the app does.
  Reason: decision messages put bold labels under each heading, and the
  look of a heading must be judged beside them.
- The text of a heading shows inline code, strong text, and workspace
  chips, as a paragraph does. Reason: it uses the same `LinkedText`.
- The public guide and the comparison note name headings in the same
  change. Reason: the repository rules for guides and the comparison page.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups draw headings in agent answers and in a message line of the
folded work, as the visual spec of the chat.

- [x] Add a heading block to the mockup agent blocks: `AgentBlock` in `docs/mockups/src/fixtures/conversations.ts`, drawn by `docs/mockups/src/components/chat/AgentBlocks.tsx` and the mockup `MessageLine.tsx`.
- [x] Add the shared heading style module in `docs/mockups/src/components/common/`. Use it for the chat answer and the mockup file preview. Draw `h3` to `h6` in the mockup file preview too.
- [x] Give the headings of an agent answer their margins in `ChatItemView.module.css`, and the heading of a message line its style in `ToolGroup.module.css`.
- [x] Compare the size and the weight of `h2` and `h3` with the strong text of an answer, which is bolder than the heading weight. When a heading does not stand out from a bold label, show a stronger scale beside it, for a decision.
- [x] Add the chat state `app/chat/headings`: an answer with `## Needs your answer`, `### 1. <title>`, a list under it, the other levels, and a message line that holds a heading.
- [x] Update the chat rows of `docs/mockups/catalogue.md` and the agent text of `docs/mockups/design-chat.md`.
- [x] Run `npm run mockups:check`. Smoke-test the new state in the mockup preview.
- [x] Update the design and the TODOs of this plan for each problem that the mockups show.

Evidence: `.context/chat-markdown-headings/m1-report.md` and the screenshots
beside it.

## Milestone 1a: Heading scale

Tags: mockup

Depends on: 1, and the answer to decision 2

The mockups take the heading scale of the answer to decision 2. With
option A, this milestone has no work.

- [ ] Apply the answer to decision 2 to `MarkdownHeadings.module.css`, and to the weight of bold text in mockup answers when the answer asks for it.
- [ ] Update the page texts and `docs/mockups/design-chat.md` where they give the sizes or the weights.
- [ ] Run `npm run mockups:check`. Smoke-test `app/chat/headings` and `app/files/markdown`.

## Milestone 2: Documentation and protocol

Depends on: 1a

The protocol doc states the heading requirements. The public guide and
the comparison page name headings.

- [ ] Update `docs/protocol/chat-markdown.md`: headings in the formatting list, a section with the heading rules, the reason line of the rejected full Markdown, and the mockup state.
- [ ] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full. Update each sentence that restates a changed fact.
- [ ] Read each guide in `src/marketing/docs/` in full. Update each sentence that restates a changed fact, such as "Read replies and tables" in `sessions-and-chat.md`.
- [ ] Name headings in the note of the `rich-chat-rendering` row in `src/marketing/from-conductor/areas/agents-and-chat.ts`. Its status stays Available.

## Milestone 3: Shared heading reader

Depends on: 1

The file preview reads its headings with the shared reader. Its behaviour
does not change, except that a lazy line no longer makes a setext heading.

- [ ] Move the ATX heading test, the closing `#` run rule, and the setext underline test from `src/files/markdown/markdown-blocks.ts` to `src/markdown/headings.ts`.
- [ ] Use them in `markdown-blocks.ts`. The file preview tests pass unchanged.
- [ ] Keep a lazy line of a list item from being a setext underline in the file preview, with a test.
- [ ] Remove the case of `- Parent` above `===` or `--` from `plans/follow-ups/list-lazy-line-read-as-block.md`. Add the setext case of a quote to `plans/follow-ups/preview-quote-keeps-line-after-fence.md`.
- [ ] Update the parser entries of `src/files/README.md` and the shared parts of `src/chat/agent-text.md`.

## Milestone 4: Headings in the chat

Tags: ui

Depends on: 1a, 2, 3

The chat reads headings with the shared reader and draws them.

- [ ] Add the `heading` block to `TextBlock` in `src/chat/components/agent-text.ts`, read with `src/markdown/headings.ts`, with the setext rules of the design calls.
- [ ] Draw it in `AgentText.tsx` and as a span in `MessageLine.tsx`, as the mockups show.
- [ ] Use the shared heading style in the app's chat answer and in the app's file preview. Remove the heading rules of `src/files/markdown/MarkdownView.module.css`.
- [ ] Update the heading cases of `agent-text.test.ts`, and add tests for the levels, the closing run, setext, the underline at the end of the text, a lazy underline, a quote line above an underline, the lines above and under a heading, and the drawn elements.
- [ ] Update `src/chat/agent-text.md` and the `agent-text.ts` entry of `src/chat/README.md`. Give the right reason for spans in a `<summary>` there, in `MessageLine.tsx`, and in the comments of `OpenFold.dom.test.tsx`.
- [ ] Apply the answer to decision 2 to the weight of bold text in the app's answers, when the answer asks for it.
- [ ] Delete `plans/follow-ups/chat-heading-joins-next-line.md`, which this milestone fixes. In `plans/follow-ups/one-markdown-reader-for-chat-and-preview.md`, update the sentence on headings, and add the choice of 9 November 2026 to option C.
- [ ] Smoke-test an agent message with headings in the app.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the `implementation-review` skill after the push. Report the findings, then apply the fix rule: fix the `fix now` findings, record follow-up items under `plans/follow-ups/` for the rest, re-review once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Open the pull request. Its description gives the decisions and the design calls of this plan with their dates, a permalink to this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Check an agent message with headings on the test deployment at `conductive.build` after the deploy.
