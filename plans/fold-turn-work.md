# Fold the work of an ended turn

Status: Active. On branch `calummoore/tool-calls-and-thinking-collapse`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A long turn shows each agent message and each run of tool calls. When
the turn ends, the user scrolls past all of them to find the answer.
Conductor folds that work into one line when the final answer arrives,
such as "8 tool calls, 7 messages". The line opens to a list of the
steps, one line each. Decision 150 brings the same behaviour to the chat
of Conductive.

The change touches only the chat display: the mockups, the protocol
docs, and the web app. The events, the runner, and the Worker do not
change. The change does not show the thinking of the agent. The runner
sends only the thinking state and no thinking text, so the chat has no
thinking to fold.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md), under "What the
  chat shows".
- [Agent tools](../docs/protocol/agent-tools.md), under "What the chat
  shows" of the Mac commands.
- The [chat README](../src/chat/README.md) and the
  [transcript rules](../src/chat/transcript.md).
- The mockup [design](../docs/mockups/design.md) and
  [catalogue](../docs/mockups/catalogue.md).

## Decisions

### 150. Fold the work of a turn when it ends

Added on 8 November 2026, from the user's request with two screenshots
of Conductor.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** docs or spec.
- **Location:** None.
- **Background:** Today each run of consecutive tool calls folds into its
  own line, such as "3 tool calls". Each agent message shows in full. A
  finished turn keeps all of them in view above its answer.
- **Problem:** A long turn puts its answer far below the request.
- **Impact if no action:** The user scrolls through the work of each turn
  to find its answer.
- **Root question:** How does the chat keep a long ended turn short, so
  that its answer is easy to find?
- **Options:**
  - **A.** Keep a fold for each run of tool calls, as today. Effort: Small.
  - **B.** When a turn ends, fold its work before the answer into one
    line, as Conductor does. Effort: Medium.
  - **C.** As B, and fold the work also while the turn runs. Effort:
    Medium.
  - **D.** As B, and the runner also sends the thinking text of each
    agent, so that the fold shows thinking rows. It needs a new event
    field for both agents, a size limit, and a new protocol requirement.
    Effort: Large.
- **Left out:** A fold only when a newer turn starts fails "after we get
  the final answer". A fold of the whole turn with its answer fails the
  goal, because the answer must stay easy to find.
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** B.
- **Chosen:** B, by the user on 8 November 2026: "after we get the final
  answer, conductor collapses all the thinking and tool calls before the
  final answer - we should do the same". C hides the work that the user
  watches while the agent works. D can be its own decision later.

### 151. Mac command results and lost lines in a fold

Added on 8 November 2026 by the options check of this plan. The user
answered it on 9 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** docs or spec.
- **Location:** "What the chat shows" in
  `docs/protocol/agent-tools.md` and in
  `docs/protocol/chat-and-events.md`.
- **Terms:**
  - **Mac command card:** the row that shows the result of a command
    that the agent ran on a member's Mac: done with its output, denied,
    or Mac not available.
  - **Lost line:** the one line that says that the workspace refused a
    runner event, such as "A tool update was lost because it was too
    large".
- **Background:** Both rows sit among the work of a turn, at their place.
  Two requirements in force say that they show in the chat: decision 62
  for the command result and decision 76 for the lost line. The user's
  words name only "the thinking and tool calls".
- **Problem:** The fold of decision 150 can hide these rows. Then the
  user may not see that a command ran on their Mac, or that data of the
  turn was lost.
- **Impact if no action:** When the fold hides these rows with no sign, a
  member can miss a command that a saved choice ran on their Mac with no
  prompt, or a gap in the chat.
- **Root question:** When the work of a turn folds, how does the user
  still learn that a command ran on their Mac, or that data of the turn
  was lost?
- **Options:**
  - **A.** Fold both rows with the work, at their place. The two
    requirements then say that the rows fold with the work. Effort:
    Small.
  - **B.** Both rows end a fold and stay in view, at their place. No
    requirement changes. A turn with such a row shows a fold before it
    and a fold after it. Effort: Small.
  - **C.** Both rows stay in view, moved to just after the fold. The chat
    no longer shows them at their place, so both requirements change.
    Effort: Small.
  - **D.** As A, and the closed line of the fold marks what it holds,
    with an icon and words for a Mac command and for lost data. Effort:
    Small.
  - **E.** Cards fold at their place, as in A. Lost lines end a fold and
    stay in view, as in B. Effort: Small.
- **Left out:** None.
- **Wider fix:** D. A mark for each kind of hidden row also covers a kind
  of row that joins the work later.
- **Previous examples:** None found.
- **Recommendation:** D. The turn stays as short as in Conductor, and the
  closed line still shows that a command ran on the member's Mac or that
  data was lost. B keeps both requirements as they are.
- **Action:** ask the user, because D changes two requirements in force,
  and no user decision covers rows that are neither thinking nor tool
  calls.
- **Chosen:** A, by the user on 9 November 2026. Both rows fold with the
  work at their place, and the line of the fold gets no mark for them.

## Design

Terms:

- **Work** of a turn: its agent messages and its tool calls, with the
  Mac command cards and the lost lines of the turn among them
  (decision 151).
- **Part** of a turn: its items between two member messages. A member
  can send a message during a turn. The message joins that turn, and the
  agent can answer it in the same turn.
- **Answer** of a part: its last agent message, with the agent messages
  right before it.
- **Fold:** one line that holds a run of work and opens to show it.

Rules:

- When a turn ends, each part keeps its answer in view, and the work
  before the answer folds into one line. A turn ends when it finishes,
  stops, or fails, or when a newer turn starts.
- The work after the answer stays in view, such as the calls that a stop
  or a failure cut off.
- A part without an agent message gets no fold. Its runs of tool calls
  fold as they do today.
- A member's message always stays in view.
- A Mac command card and a lost line of the turn fold with the work, at
  their place. A lost line of another turn, or of no turn, ends a run.
- A run folds only when it holds a tool call or a message.
- The line of a fold reads "8 tool calls, 7 messages". It leaves out a
  zero count, and it says "1 tool call" and "1 message". It shows the
  icons of the tool kinds and the total of the left-out output, as the
  line of a run of tool calls does today. Cards and lost lines add no
  count and no mark.
- A fold starts closed. A click opens it, and it keeps that choice while
  the chat shows it.
- An open fold lists its steps in order, one line each. A tool call shows
  as an open run shows it. A message shows its first words, and a click
  opens its full text.
- While a turn runs, the chat does not change. Each message shows, and
  each run of tool calls folds on its own.
- When a turn ends while the user reads its work higher up, the work
  still folds. The chat keeps its distance from the bottom.

Code of the web app:

- `src/chat/components/transcript-entries.ts` adds a fold entry. It reads
  the ended state of each turn from `Transcript.turns`.
- An insert, such as a Mac command card, that follows a folded item
  joins its fold. An insert never starts a fold.
- A lost item folds when its marker names the turn of the fold.
- A new component draws the fold. It shares the call line and the tool
  icons with `ToolGroup`. `TranscriptView` draws the new entry.

Mockups:

- The mockup items have no turn IDs. The mockup grouping takes the items
  after a member message, up to an end, as one turn. A turn has ended
  when it holds an end: a turn end, a stop, an error, or the lost line of
  a turn end.
- A member message that a fixture marks as sent during the turn joins
  that turn and starts a new part.
- A mockup state opens the fold, for the page that shows the open fold.

Design calls. Each is my call of 8 November 2026, and the user can
override it:

- The answer of each part is its last agent message, with the agent
  messages right before it. The work after the answer stays in view.
  Reason: one rule covers each ended turn and each part. A stopped or
  failed turn keeps the last words of the agent and the calls that the
  stop cut off, which the user needs to write the next message. Codex
  sends each agent message as its own answer, so an answer can be two
  messages. Rejected: fold all the work of a turn that ends with a tool
  call, which hides where the turn stopped. Rejected: fold only finished
  turns, which leaves stopped and failed turns long.
- A member's message starts a new part, and each part keeps its own
  answer in view. Reason: the runner answers a message that a member
  sends during the turn in the same turn. So the first answer stays in
  view beside the message that it answers, as "Each result of the agent
  shows with the messages that it answers" requires. Rejected: fold all
  the work before the last answer, which hides the first answer.
  Rejected: fold all of a part that ends with a tool call, which gives
  the parts two rules.
- An open fold shows one line for each step. A message line shows the
  first words of the message and opens to its full text. Reason: the
  screenshot of Conductor shows one-line rows with cut text, and a row
  opens on a click. Rejected: each message in full, which the screenshot
  does not show. Rejected: the runs of tool calls as folds inside the
  fold, which need two clicks to show a call.
- The work folds when the turn ends, also while the user reads it higher
  up. Reason: Conductor folds at the end of the turn, and one click opens
  the fold again. Rejected: a fold that waits until the user scrolls to
  the bottom, which adds scroll state for a short moment.
- The words of the line come from the screenshot of Conductor. Its icons
  and its left-out total come from the line of a run of tool calls.
- The decision numbers are 150 and 151. Branches in flight already use
  142 to 149.
- `chat-and-events.md` has 378 lines, past the target of about 250 lines.
  The `documentation` skill asks for a split when a change touches such a
  doc. So "The agent runner", with "Lost workspace updates", moves into a
  new protocol doc, `agent-runner.md`. Reason: it is the largest
  self-contained section, and no branch in flight edits it, so the move
  causes no merge conflict. The chat doc then keeps about 245 lines.
  Rejected: a move of "Messages", which six branches in flight edit.
  Rejected: short sections that keep the old anchors and only link to
  the new doc. The pull request names the moved anchors.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockup chat folds the work of each ended turn. `app/chat` shows the
folded work of its finished turn. A new child page shows the open fold,
a turn with parts, and the answer of decision 151.

- [ ] Group the work of each ended turn in
      `docs/mockups/src/components/chat/groupItems.ts`, with the rules of
      the design.
- [ ] Add the fold part beside `ToolGroup.tsx`, with its styles in
      `ToolGroup.module.css`. Share the call line and the icons with
      `ToolGroup`. Draw the message lines that open to their full text.
      Draw the new entry in `ChatPane.tsx`.
- [ ] Add a mockup state that opens the fold. Add the child page
      `app/chat/work`, and add it to the order in
      `app/chat/_folder.json`. Draw these screens on it:
  - [ ] The open fold of the finished turn, with one message line open.
  - [ ] A finished turn with a member message during the turn: a fold
        and an answer for each part.
  - [ ] A finished turn with a Mac command card and a lost line among
        its work, folded at their place, as decision 151 says.
- [ ] Update each description and rationale that the change makes stale:
      `app/chat`, the stopped and failed variants of `app/chat/turns`, and
      the pages of lost data. Check the hero picture of the marketing
      site, which draws the finished chat.
- [ ] Update `docs/mockups/design.md` and `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages at both
      sizes, in light and dark. Save the screenshots under
      `.context/fold-turn-work/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the fold as a requirement, with decisions 150
and 151. The chat docs give its rules for the code.

- [ ] Move "The agent runner" and "Lost workspace updates" from
      `docs/protocol/chat-and-events.md` into a new
      `docs/protocol/agent-runner.md`. Update each link to their anchors
      in the docs, the READMEs, and the code comments. Add the new doc to
      the list of protocol docs in `docs/architecture.md`.
- [ ] Add the fold to "What the chat shows" in `chat-and-events.md`, with
      decision 150, the rejected alternative, and the reason. State what
      folds, when, the words of its line, and what stays in view.
- [ ] Apply decision 151. Say in "What the chat shows" of
      `chat-and-events.md` that a lost line among the work of a turn folds
      with that work. Say in "What the chat shows" of
      `docs/protocol/agent-tools.md` that the result of a command folds
      with the work of its turn when the turn ends.
- [ ] Update `src/chat/README.md` and `src/chat/transcript.md` with the
      fold: the summary of the chat, the rules for this code, and the key
      code.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Fold the work in the chat

Tags: ui

Depends on: 2

The chat of the web app folds the work of each ended turn, as the
mockups show.

- [ ] Add the fold entry to `src/chat/components/transcript-entries.ts`,
      with the rules of the design.
- [ ] Add the fold component. Share the call line and the icons of
      `ToolGroup`, and use the mockup styles.
- [ ] Draw the fold entry in `TranscriptView.tsx`.
- [ ] Test the requirements of the fold. See each test fail first:
  - [ ] A finished turn folds its work before its answer, and the line
        counts the calls and the messages.
  - [ ] A running turn keeps each message and each run of tool calls as
        today.
  - [ ] A stopped turn keeps its last message and the calls that the
        stop cut off in view.
  - [ ] A member's message during the turn starts a new part, and each
        part keeps its answer in view.
  - [ ] Two agent messages at the end of a turn both stay in view.
  - [ ] A card and a lost line of the turn fold at their place. A run
        of lost lines alone does not fold.
  - [ ] The open fold lists its steps in order, and a message line opens
        to its full text.
- [ ] Update the tests whose expected text changes on purpose, such as
      `LostData.test.tsx` and `PendingCommands.test.tsx`. Name each one in
      the report.
- [ ] Smoke-test a finished turn on the development page of the chat.
      Save the screenshots under `.context/fold-turn-work/`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives decisions 150 and 151
      and the design calls of this plan with their dates, a permalink to
      this plan, the moved anchors of the protocol docs, and the
      follow-up items that the change adds.
