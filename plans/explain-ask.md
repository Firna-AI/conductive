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

Contract owners:

- [Explain](../docs/protocol/explain.md).
- The [Explain README](../src/chat/explain/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups of Explain at `app/chat/explain` get Ask, and a new flow shows
an Ask from the selection to the answer.

- [ ] Add Ask next to Explain in `app/chat/explain/select`, in its
      `message` variant, and on a phone.
- [ ] Add `app/chat/explain/ask`: the unsent popover with the quote, an
      empty, focused field, and Send off, by the highlighted selection.
      Add a variant with typed text and Send on, and the phone sheet.
- [ ] Add the popover just after Send, with the question as the title of
      the tab and as the first line of the written prompt in the tab.
- [ ] Add the flow `user-flows/ask-about-chat-text`.
- [ ] Update the Explain part of `docs/mockups/catalogue-chat-and-automations.md`
      and [Explain](../docs/mockups/design-chat.md#explain).
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update `docs/protocol/explain.md`: Ask and its place, the unsent
      popover, the written prompt of an Ask, the keyboard start by Tab,
      and the record of the replaced decision.
- [ ] Update the Explain summary in `docs/protocol/agents-and-sessions.md`.
- [ ] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      guide in `src/marketing/docs/` in full. Update each sentence that
      restates a changed fact, such as the start of the cloud computer in
      `overview.md`.
- [ ] Update `src/chat/explain/README.md`.

## Milestone 3: The Worker takes a question

Depends on: 2

- [ ] Add the optional `question` to `ExplainSessionRequest` in
      `src/shared/sessions.ts`.
- [ ] Read and check `question` in `explanationInput` of
      `worker/chat/explain-session.ts`.
- [ ] Write the prompt of an Ask in `worker/chat/explain-prompt.ts`.
- [ ] Test the prompt, the title, the refused blank question, and a request
      without a question in the Worker tests of Explain.

## Milestone 4: Ask in the chat

Tags: ui

Depends on: 3

- [ ] Add Ask after Explain in `FloatingExplain` and `PhoneExplain`, with
      its word in `src/ui/components/explain/explainCopy.ts`.
- [ ] Add the unsent Ask to `useExplain`: the saved selection, its
      highlight, and the place of the popover.
- [ ] Draw the unsent popover in `ExplainLayer`, with `ExplainPopover` and
      a field for the question. Send calls `ChatController.explain` with
      the question, then opens the popover of the new explanation.
- [ ] Add DOM tests: Ask from a selection, Send off while empty, Escape
      and a press outside before Send, a failed start that keeps the text,
      and the phone.
- [ ] Check the change in a browser and save screenshots under
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
