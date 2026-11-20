# Repeated blocks fold

Status: Active. Not started. It starts after the change "One Markdown parser for the chat and the file preview" merges, from branch `calummoore/output-summary-f7sm`, and it gets its own branch. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 16 November 2026, in the session "merge release", an agent message
became `<br>` and a blank line about 1,700 times while the agent waited for
a background task. The chat showed each one, so the rest of the chat moved
many screens away. While a turn runs, the chat shows each agent message in
full (`docs/protocol/chat-and-events.md:155`). With
the Markdown parser change ("One Markdown parser for the chat and the file preview"), a flood of `<br>` draws
nothing, but a loop on any other text still floods the chat.

This change folds each run of five or more identical blocks of one agent
message. The chat shows the first block of the run, then one muted
"Repeated N more times" button that opens the rest in place. Real text
before and after the run stays in view. The events, the saved history,
and the copied transcripts keep the full text.

## Decisions

- **Item 2, repeated filler floods the chat: B** (Cal, 17 November 2026).
  Not chosen: A, change nothing beyond the `<br>` rule. C, cap the height
  of each long message, which also hides the end of long real answers. D,
  fold a message that is mostly filler into one line, a loose test that
  can hide real text. Left out: a stop of the reply in the runner, a
  filler mark in the events, and a scroll box of fixed height. Reason: it
  hides only exact repeats and keeps every real line in view. The full
  item is in `.context/br-display/options.md`.

## Design calls

Each is my call (17 November 2026), with its reason. Most come from the
first brainstorm.

1. A run is five or more blocks in a row of one message, with the same
   kind and the same text, without the spaces at their ends. Reason: real
   answers rarely repeat one block, and a near match must never hide a
   real line.
2. The fold reads the blocks of the chat adapter, so a block that draws
   nothing, such as a paragraph of only `<br>`, also counts. Reason: the
   reader still sees that the agent looped.
3. Repeats inside one paragraph or inside a code block never fold. Reason:
   a code block keeps its text exactly, and a repeat inside a line can be
   real text.
4. The same rule applies in list items and in an open message line. A
   closed message line shows the count as text. Reason: a message line is
   a button, and a button cannot hold another button.
5. The button is a native `<details>` element, with the touch size of the
   control sizes. A closed fold keeps its blocks in the page, so a search
   in the page finds them. Reason: as for the work fold.
6. While the agent writes, four repeats show. They fold when the fifth
   arrives, and the count then grows. The open state stays in the browser
   tab. Reason: a live message and the same saved message show the same.
7. Identical messages in a row do not fold. Reason: no case is known, and
   the work fold folds them at the end of the turn.
8. The copied transcripts keep each run in full. Reason: a copy is a
   record, as the changed-file list of a turn end is.

Contract owners:

- [Chat Markdown](../docs/protocol/chat-markdown.md) and
  [Chat and events](../docs/protocol/chat-and-events.md).
- [Session transcripts](../docs/protocol/session-transcripts.md).
- [Agent text](../src/chat/agent-text.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

- [ ] Add a chat state with a folded run, closed and open, in an answer and
      in an open message line.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/chat-markdown.md`: a section on repeated blocks.
- [ ] `docs/protocol/chat-and-events.md:155`: a running turn shows each
      message in full, apart from a folded run.
- [ ] `docs/protocol/session-transcripts.md`: the copies keep each run.
- [ ] `src/chat/agent-text.md`.
- [ ] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact.

## Milestone 3: The fold

Tags: ui

Depends on: 2

- [ ] Add a helper with no side effects that finds runs in the blocks of a
      message, with design calls 1 to 3, and its tests.
- [ ] Draw each run in `AgentBlocks` and `MessageLine`, with design calls
      4 to 6, and their tests.

## Milestone 4: Verification, commit, review, and pull request

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
