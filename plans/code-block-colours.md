# Syntax colours for code blocks

Status: Active. On branch `calummoore/auto-color-code-blocks-f7cr`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A code block in an agent answer shows plain text. The protocol requires
it: "A code block shows its text with no formatting"
(`docs/protocol/chat-markdown.md`). Both Markdown readers drop the
language name after the opening fence (`token.info`): the chat in
`src/chat/markdown/agent-blocks.ts` and the file preview in
`src/files/markdown/preview-blocks.ts`. On 26 November 2026 the user sent
a screenshot of a plain Rust block in an answer and asked the app to
detect the language and colour the code.

This change keeps the fence label. A known label gives a language family
of `src/files/code/languages.ts`, and the block shows the colours of a
file tab, from the shared `highlightLines`. A block without a label, or
with an unknown label, stays plain. The agent instructions ask agents to
label each code block. The change does not guess a language, colour
inline code, or colour `diff` blocks.

## Decisions

Decisions of 26 November 2026, from the brainstorm. The full brainstorm
report is in `.context/code-colours/brainstorm.md`.

- **Code colours, decision 1: A.** Colour a block by its fence label, with
  the shared file tab colourer. Alternatives:
  - B, the fence label with a library such as Prism. It adds 21.6 KB
    gzipped, has had ReDoS advisories, and looks different from a file
    tab.
  - C, A plus an in-house guess for blocks without a label. A wrong guess
    colours logs and command output, and it needs a test set.
  - D, highlight.js for colours and guesses. It adds 42.8 KB gzipped, a
    guess takes about 52 ms for 40 KB, and it misread output in tests.
  - Reason: agents usually label code, A adds no download, it stays
    linear on crafted text, and the same code looks the same in an answer
    and in a file tab. Earlier changes made the same call: PR #276, PR
    #356, and PR #663.
- **Code colours, decision 2: B.** The agent instructions ask the agent to
  write the language name after each opening fence, and `text` for
  output. Alternative: A, no instruction. Reason: one sentence raises the
  share of coloured blocks. Only new sessions get it, because a session
  keeps its saved instructions.

## Design calls

My calls of 26 November 2026. Each fails the decision test, because a
requirement settles it or it has a clearly best option.

1. The Markdown file preview colours its code blocks too. Reason: Markdown
   parser decision 8 D says the chat draws each part as the preview does.
2. An open message line colours its code blocks. A closed line stays one
   plain line. Reason: an open line draws as an answer.
3. The reader keeps the first word of the label, in lower case. A `Map`
   gives the family, so a label such as `constructor` finds nothing.
4. An unknown label shows plain text. So do `text`, `txt`, `plain`,
   `plaintext`, `console`, `output`, `log`, and `none`. Reason: wrong
   colours are worse than none.
5. A block shows no language name. Reason: no requirement or mockup asks
   for one.
6. `diff` and `patch` blocks and inline code stay plain. Reason: diff line
   colours are a new look that a later proposal can add.
7. Fix Rust lifetimes in the shared colourer. Today the text
   `'a> Tool for Weather<'` of `impl<'a> Tool for Weather<'a>` shows as a
   string. Reason: the user's example is Rust, and `.rs` file tabs gain
   the fix.
8. Keep the five code colours of `src/files/code/code.module.css`.
9. Colours are inline spans inside the one `<pre>`, with the original line
   feeds. Reason: Copy code copies the text as written, and Explain reads
   each block element as a line break.
10. Each line draws as its own memoized part. Reason: a live block then
    draws only its last line again.
11. The file preview colours its blocks in its parse worker. Reason:
    `src/files/markdown-preview.md` keeps long or crafted files off the
    page thread.
12. The public guide `src/marketing/docs/sessions-and-chat.md` gets one
    sentence about colours, near "To copy a code block".
13. Sent messages of members keep their code as typed.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- The [Agent text doc](../src/chat/agent-text.md) and the
  [Files README](../src/files/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The chat code block and the Markdown preview mockups show a labelled Rust
block in colour, and a block without a label in plain text.

- [ ] Give the mockup `CodeBlock` in
      `docs/mockups/src/components/chat/CodeBlock.tsx` a language, and
      draw its lines with the shared token spans.
- [ ] Add a labelled Rust block and a plain block to the chat code block
      entry and to a chat conversation fixture.
- [ ] Colour the labelled code blocks of the mockup `MarkdownView`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/chat-markdown.md`: replace "A code block shows its
      text with no formatting" with the colour rules of decision 1 and
      design calls 2 to 6.
- [ ] `docs/protocol/agent-instructions.md`: add the fence label sentence
      of decision 2.
- [ ] Update `src/chat/agent-text.md`, `src/files/README.md`, and
      `src/files/markdown-preview.md`.
- [ ] Add the sentence of design call 12 to the public guide. Read each
      public guide and both legal pages in full, and update each sentence
      that restates a changed fact.

## Milestone 3: Fence labels and the colourer

Depends on: 2

- [ ] Add a shared fence label reader in `src/markdown/` and a label
      table beside `src/files/code/languages.ts`, with tests.
- [ ] Keep the label on the `code` blocks of `agent-blocks.ts` and
      `preview-blocks.ts`, with tests.
- [ ] Fix Rust lifetimes in `highlight.ts`, with a regression test.
- [ ] Add the fence label sentence to
      `crates/cnd-runner/src/engine/instructions.rs`, with its test. Run
      the Rust checks.

## Milestone 4: Coloured code blocks

Tags: ui

Depends on: 3

- [ ] Draw the chat `CodeBlock` with coloured lines, through `AgentDrawing`
      and `answerDrawing`, also in open message lines.
- [ ] Colour the code blocks of `MarkdownView`, with the tokens from the
      parse worker.
- [ ] Test that Copy code and Explain read the exact text.
- [ ] Check a labelled Rust block in the browser, in the chat and in the
      file preview. Save the screenshots under `.context/code-colours/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4

- [ ] Run the targeted tests, the complete gate, and the Rust checks named
      in `CLAUDE.md`.
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
