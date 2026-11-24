# Ask about a selection of chat text

Status: Active. On branch `calummoore/ask-explain-custom-message-7bnf`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Explain starts an explanation of a selection of chat text with a prompt
that the app writes. The member cannot add a question of their own. This
change adds Ask next to Explain. Ask works as Explain does, but the member
writes the message first. The change does not cover attachments, a model
picker, or a key of its own for Ask.

On 24 November 2026 the user asked for Ask, "next to explain, that allows
the user then to add a custom message - but otherwise similar to explain".
That request replaces the decision of 20 November 2026 that rejected "a
prompt field by the selection, where the member writes a question". The
user then chose these options on 24 November 2026:

- **Where the member types the message: A.** Ask opens the popover at once,
  with the quote and an empty, focused field. Send starts the session, and
  the answer shows in the same popover. Close or Escape before Send starts
  nothing. Rejected: B, a field by the selection that turns into the
  popover after Enter. It is the shape that the user rejected before, it
  can cover the text, and on a phone it competes with the selection menu.
  Left out: a session that starts at once and waits for the question,
  because the agent spends a turn before it gets the question. Also left
  out: the quote in the main composer, because it gives no popover and no
  mark.
- **The written prompt of an Ask: A.** The member's message comes first, so
  its first line gives the title. Then come the same context and the same
  three requests as for Explain: read the parent session when more context
  is necessary, change no files, and keep the answer short. Rejected: B,
  the same without "change no files" and "keep it short", because an answer
  then can be long or change files in a small popover. Rejected: C, a first
  line `Ask about "<quote>"`, because the title and the tooltip of the mark
  then do not show the question.
- **A key for Ask: A.** Ask has no key of its own. Tab reaches Ask just
  after Explain. Rejected: B, a new default key, because most free ⌥⌘
  letters clash with a browser or with macOS, such as ⌥⌘K in Firefox and
  ⌥⌘M in macOS.

Design calls of the agent, on 24 November 2026:

- Ask stands just after Explain, in the same floating bar, under the same
  rules of when Explain shows. On a phone, it stands next to Explain above
  the composer. Reason: the two actions share one selection.
- An Ask is an explanation. It has the same anchor, mark, states, default
  login, and fast mode off. Reason: "otherwise similar to explain".
- Ask saves the selection when the member presses it. The focus then moves
  into the field, which ends the selection of the page. The selected text
  keeps a highlight while the unsent popover is open, and the popover
  stays by that text. Reason: no mark exists before Send.
- Send stays off while the field is empty. The field takes text only, with
  no attachments. Reason: the follow-up field has no attach button either.
- Close, Escape, or a press outside before Send drops the typed text. The
  focus then goes back to the chat of the parent session. Reason: nothing
  started, so no session holds a draft.
- A failed start keeps the unsent popover open with its text. The parent
  chat shows the notice of a failed Explain. Reason: the member loses no
  typed text.
- The Worker route of Explain takes an optional `question`. A request
  without it gets the written prompt of Explain, so older app tabs keep
  working. A question of only white space is refused as invalid input. The
  question has no length limit of its own, as a message has none.
- The written prompt of an Ask gives the whole quote under "The selected
  text", before the text with the lines around it. Reason: the first line
  of an Ask is the question, so no other line names the quote.
- The mockups gave these calls:
  - The unsent popover leaves out Expand. Close keeps its place at the end
    of the header, and Expand shows after Send. Reason: no tab exists
    before Send, so Expand would be off in every unsent popover.
  - Explain and Ask are plain buttons in one raised bar, with the outline,
    the fill, and the shadow of a menu. Ask has the icon of a speech
    bubble with a question mark. Reason: the two actions then read as one
    tool of the selection, as in the selection tools of editors.
  - The highlight of the unsent Ask has the colours of a selection, with
    no handles and no selection menu on a phone. The text takes its mark
    at Send. Reason: no explanation exists before Send, so the text must
    not look like a mark.
  - The empty field of the unsent Ask says "Ask about this text". Reason:
    the quote in the header names the text.
  - The unsent popover takes the name Ask for screen readers. Reason: it
    has no session title before Send.
  - After Send, the field is empty again and keeps the focus, as the
    follow-up field. Reason: the same box sends the next message, as the
    composer of a tab does after Send.
  - On a phone, the unsent popover is the sheet at half height. The field
    takes the focus, so the keyboard of the phone opens with the sheet,
    and the chat scrolls the highlighted text into view above the sheet.
    Reason: the sheet and the mark of Explain behave in the same way.
- Agent calls of the documentation milestone, on 24 November 2026:
  - The Explain protocol doc has three pages: `explain.md`,
    `explain-ask.md`, and `explain-popover.md`. Reason: one page passed
    400 lines, and each section that other docs link to stays on
    `explain.md`.
  - The field of an Ask empties at Send and takes input while the start
    waits. Text typed during the wait goes into the draft of the new
    explanation, and a failed start puts the question back before that
    text. Reason: the composer rule of
    [Messages](../docs/protocol/messages-and-attachments.md#messages).
  - Send stays busy while the start waits, so a second press starts no
    second explanation. Reason: Explain is busy in the same way.
  - A close while the start waits stops nothing. The reply opens the
    popover of the new explanation, and a failed start opens the unsent
    popover again with the question. Reason: the reply of Explain always
    opens its popover, and the member loses no typed text. Call of the
    orchestrator.
  - A close of the unsent popover by Close or Escape gives the focus to
    the chat of the parent session, which takes it only from code. A press
    outside leaves the focus where the press puts it. Reason: the chat is
    the place that the protocol names, and no control of it stays. Call
    of the orchestrator.
  - White space alone counts as no text, so Send stays off. Reason: the
    follow-up field does the same, and the Worker refuses a blank
    question.
  - The field of the unsent popover stays while the cloud computer does
    not run, and no bar takes its place. Reason: Send starts the cloud
    computer, as a press on Explain does.
  - A press outside closes the unsent popover only on a computer. Reason:
    the rule of 23 November 2026 for each popover keeps the sheet of a
    phone open.
  - The unsent popover counts as the one open popover, so another popover
    that opens in its place drops the question. Reason: at most one
    popover is open.
  - The quote takes its mark when the explanation starts, not at the press
    on Send. Reason: a failed start keeps the unsent popover and its
    highlight.
  - The docs say only that Ask has no key of its own, and nothing of a
    command that a person can bind. Reason: the user's choice covers only
    the key, and Milestone 4 adds no command.
  - The protocol docs state the decision in force and keep no record of
    the replaced decision of 20 November 2026. Reason: the
    `documentation` skill keeps that record in this plan.
  - The Privacy sections in `privacy-uses.ts` and `privacy-recipients.ts`
    name Ask, and the Privacy effective date is 24 November 2026. Reason:
    those files hold parts of the Privacy page, and the page promises a
    new effective date for each change.
  - The workspaces guide lists Explain and Ask among the actions that
    start a stopped computer, as the overview does. Reason: the guide
    already missed Explain.
  - The guides describe Ask before Milestone 4 builds it. So the browser
    check of Milestone 4 confirms each guide sentence on Ask, and the
    branch does not merge without Milestone 4. Reason: a guide describes
    only what the product offers.
  - The heading "Explain chat text" of the sessions guide stays. Reason: a
    new heading gives the section a new address.
  - The Explain README says that the chat does not show Ask yet. Milestone
    4 removes that sentence and adds Ask to its Key code and Tests.
    Reason: a README marks nothing as built that is not built.

Contract owners:

- [Explain](../docs/protocol/explain.md).
- [Explain: Ask](../docs/protocol/explain-ask.md).
- [Explain: the mark and the popover](../docs/protocol/explain-popover.md).
- The [Explain README](../src/chat/explain/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups of Explain at `app/chat/explain` get Ask, and a new flow shows
an Ask from the selection to the answer.

- [x] Add Ask next to Explain in `app/chat/explain/select`, in its
      `message` variant, and on a phone.
- [x] Add `app/chat/explain/ask`: the unsent popover with the quote, an
      empty, focused field, and Send off, by the highlighted selection.
      Add a variant with typed text and Send on, and the phone sheet.
- [x] Add the popover just after Send, with the question as the title of
      the tab and as the first line of the written prompt in the tab.
- [x] Add the flow `user-flows/ask-about-chat-text`.
- [x] Update the Explain part of `docs/mockups/catalogue-chat-and-automations.md`
      and [Explain](../docs/mockups/design-chat.md#explain).
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

The screenshots and the logs of the checks of this milestone are in
`.context/explain-ask/mockups/`.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Update `docs/protocol/explain.md`: Ask and its place, the unsent
      popover, the written prompt of an Ask, the keyboard start by Tab,
      and the record of the replaced decision.
- [x] Update the Explain summary in `docs/protocol/agents-and-sessions.md`.
- [x] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      guide in `src/marketing/docs/` in full. Update each sentence that
      restates a changed fact, such as the start of the cloud computer in
      `overview.md`.
- [x] Update `src/chat/explain/README.md`.

## Milestone 3: The Worker takes a question

Depends on: 2

- [x] Add the optional `question` to `ExplainSessionRequest` in
      `src/shared/sessions.ts`.
- [x] Read and check `question` in `explanationInput` of
      `worker/chat/explain-session.ts`.
- [x] Write the prompt of an Ask in `worker/chat/explain-prompt.ts`.
- [x] Test the prompt, the title, the refused blank question, and a request
      without a question in the Worker tests of Explain.

## Milestone 4: Ask in the chat

Tags: ui

Depends on: 3

- [x] Add Ask after Explain in `FloatingExplain` and `PhoneExplain`, with
      its word in `src/ui/components/explain/explainCopy.ts`.
- [x] Move the two rules of `docs/mockups/src/components/explain/Ask.module.css`
      into the shared styles of `src/ui/components/explain/`: the bar into
      `ExplainButton.module.css` and the kept text into
      `MarkedText.module.css`. Delete `Ask.module.css`.
- [x] Add the unsent Ask to `useExplain`: the saved selection, its
      highlight, and the place of the popover.
- [x] Draw the unsent popover in `ExplainLayer`, with `ExplainPopover` and
      a field for the question. Send calls `ChatController.explain` with
      the question, then opens the popover of the new explanation.
- [x] Add DOM tests: Ask from a selection, Send off while empty, Escape
      and a press outside before Send, a failed start that keeps the text,
      text typed while the start waits, a close while the start waits,
      and the phone.
- [x] Check the change in a browser and save screenshots under
      `.context/explain-ask/`.

## Milestone 5: Verification, commit, review, and pull request

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
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
