# Explain chat text

Status: Active. On branch `calummoore/highlight-and-prompt-mvmd`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A member who wants to ask about one passage of a chat answer must today
copy the passage, start a session with "+", paste it, and lose the link
between the two. On 17 November 2026 the user asked for a feature: select
text in the chat, press a button, and write a short prompt. The selected
text then stays marked, and a press on the mark opens the conversation
about it. That conversation is a normal session, and the member can open
it as a full session tab.

On 20 November 2026 the user changed the feature to Explain. The member
selects text and presses Explain. The member writes no prompt. The app
writes the prompt with the context that the agent needs and sends it at
once. The answer shows in a small popover by the text. In the popover the
member can send more messages, or expand the conversation to its full tab.
The text stays marked, and a press on the mark shows the popover again.

This change adds Explain. An explanation is a normal session with an
anchor: the parent session, the message, and the quoted text. The parent
chat draws a mark from each anchor. The change does not cover a fork of
the parent conversation, a flow of the answer back into the parent
session, or marks in tool lines and notices.

## Terms

- **Explanation:** the session that Explain starts. Its tab shows its
  title, as each session tab does.
- **Parent session:** the session that holds the marked text.
- **Mark:** the lasting highlight on the explained text in the parent chat.
- **Anchor:** what the app stores to find the mark again: the parent
  session, the message ID, and the quoted text with the text around it.
- **Popover:** the small panel by the mark that shows the explanation.

## Decisions

The user chose these on 17 November 2026, in the brainstorm of this
workspace. The notes of the brainstorm are in
`.context/highlight-prompt/notes.md`. The words "side question" and "side
session" of that time now read "Explain" and "explanation".

- **Side session placement: A.** The side session is a normal session, and
  every session rule stays. It opens as a normal tab. The mark opens it in
  an overlay, and "Open as tab" shows its tab.
  - The user first proposed that a side session starts closed, so that no
    tab opens for each question. That start raised two decisions: how a
    closed side session runs its turns, and how side sessions show in the
    session history. On 17 November 2026 the user chose to keep the side
    session open for now, which removes both decisions. A later change can
    add the closed start. Their options and the two options checks are in
    `.context/side-questions/`. The plan of commit `f3ee829d6` gives them
    in full.
  - Rejected: B, a session that shows only in its overlay until "Open as
    tab". It changes decision 19, which makes each session a tab, and the
    rules of close, history, and links.
- **What the side agent knows: A.** The first message holds the prompt,
  the quote, and a link to the parent session. The agent reads the parent
  with the `read_session` tool when it needs more.
  - Rejected for now: B, a transcript of the parent in the first message.
    It costs more tokens and cuts long chats.
  - Rejected for now: C, a fork of the parent conversation. It needs a
    runner change, works only with the agent of the parent, and pays for
    the whole context again on another login. A later change can add it
    with the same anchor and overlay.
- **Keyboard start: B.** A keyboard shortcut starts a side question about
  the current text selection. The button is also reachable with Tab.
  - Rejected: A, pointer only. Keyboard users could not use the feature.
  - Rejected: C, a menu on each message. It adds UI to every message.
- **Mark life: A.** A mark never goes away. A press on it always opens its
  side session.
  - Rejected: B, a close of the side session hides the mark.
  - Rejected: C, a separate "Remove mark" action.

The user chose these on 20 November 2026:

- **Explain, with no prompt.** The feature is Explain. The button says
  Explain. A press sends a prompt that the app writes, with the context
  that the agent needs. The prompt field of the first mockups goes.
- **A popover first.** The answer shows in a small popover by the mark.
  The popover lets the member send more messages and expand to the full
  tab. It replaces the large overlay of the first mockups.
- **Every state in the mockups.** The mockups draw each state of the flow.

## Design calls

These calls are the agent's own. The first group was made on
17 November 2026, under existing rules.

- Every member sees the marks, because all members share the sessions.
- The anchor lives on the side session record, as an optional field. Each
  tab already gets each session record, so the parent chat finds its marks
  with no new event. An old stored session has no anchor.
- The anchor stores the rendered text of the selection, with some text
  before and after it. The app finds the mark again in the rendered text
  of the message. When the text no longer matches, the mark covers the
  whole message.
- The side session uses the login and the default model of the member who
  asks, as `create_session` does
  ([Start a session](../docs/protocol/session-calls.md#start-a-session)).
- A member can mark agent answers and member messages, not tool lines or
  notices. A mark stays inside one message. Only finished text can be
  marked.
- A press on overlapping marks opens a short menu of their side sessions.
  A mark inside a folded part shows when the fold opens.
- A side session opens its tab at the end of the row, as every new tab
  does ([The tab row](../docs/protocol/tab-row.md)). The parent tab stays
  shown, and the popover opens over it.
- A press on the mark of a closed side session opens the popover to read
  its chat. A send or expand there reopens the session, as a session link
  does
  ([Session links](../docs/protocol/agents-and-sessions.md#session-links)).
- A close of the parent session leaves its side sessions as they are.
- The side agent has the same tools as any session. So it can change files
  that the parent session also works on.
- A read-only workspace shows the marks and opens the popover to read. It
  starts no explanation.

These calls were made on 20 November 2026:

- On a computer, Explain stands just above the middle of the selection, as
  the selection tools of most editors put it. In a member message at the
  right of the chat, it lines up with the end of the selection. On a
  phone, the button stands above the composer, away from the selection
  menu of the phone. The first mockup put the button under the end of the
  selection. The user said that this place looked odd, so it moved.
- Expand shows the tab of the explanation, which opened at the end of the
  row when Explain started it, as the user's choice of 17 November keeps.
  Expand reopens the tab first when it is closed.
- The written prompt gives the agent what it needs without a fork:
  - The first line is `Explain "<quote>"`, cut at the title limit, so the
    session title names the text.
  - Then the quote with some text before and after it, the title of the
    parent session, its link, and the message ID.
  - Then an instruction: read the parent session with `read_session` when
    the quote needs more context, change no files, and keep the answer
    short, because it shows in a popover.
- The popover does not show the written prompt. It shows the quote at its
  top, then the answers and the follow-up messages. The full tab shows the
  prompt as a normal message, so nothing is hidden.
- The popover is a small panel by the mark on a computer, with a fixed
  width and a highest height. Its chat scrolls inside it. On a phone it is
  a sheet of half the screen height, which the member can drag to full
  height.
- An agent request that waits for input, such as a secret request, shows
  in the popover in the same way as at the end of a session tab.

These calls were made on 20 November 2026, in the Explain mockups:

- The popover header shows the quote, at most two lines, then Expand and
  Close. It has no title of its own.
- On a computer the popover is 400 px wide and at most 420 px high, or
  less when the room by the mark is smaller. It opens below the mark, or
  above it when it has more room there. It puts no dim over the app,
  because the parent chat stays live.
- On a phone the sheet puts no dim over the app. While a request waits for
  the member, the sheet opens at full height, so the request card and the
  chat above it both have room.
- The follow-up field grows from one line to four lines. It has Stop while
  a turn runs, and Send. It has no model picker and no attach button,
  because Expand gives the full composer. A follow-up during a turn steers
  that turn, as each message of a session does.
- A mark shows the state of its explanation: a spinner while it runs or
  while the cloud computer starts, Needs input, a red alert when it
  failed, and the Explain icon when it is answered.
- The read-only popover has no follow-up field.
- The written prompt names the parent session with its session link only,
  because the link shows as a chip with the title.

Contract owners:

- A new protocol doc, `docs/protocol/explain.md`, linked from
  [Agents and sessions](../docs/protocol/agents-and-sessions.md#sessions).
- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts-keys.md), for
  the new key.
- The [chat README](../src/chat/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the side question flow in the chat catalogue, for a computer and a
phone.

- [x] Draw the "Ask about this" button on a selection in an agent answer
      and in a member message.
- [x] Draw the prompt field that opens from the button, with send and
      cancel.
- [x] Draw the mark in the parent chat: idle, running, and waiting for
      input. Draw overlapping marks and their menu.
- [x] Draw the overlay with the side chat, its composer, Stop, and "Open
      as tab". Draw it as a dialog on a computer and as a sheet on a phone.
- [x] Draw the phone selection, so that the phone's own selection menu
      does not cover the button.
- [x] Draw a mark whose text no longer matches, which covers the whole
      message.
- [x] Draw the read-only workspace: marks and a read-only overlay.
- [x] Draw the new side tab at the end of the row, with the parent tab
      still shown under the overlay.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

The mockups are under `app/chat/side-questions` and
`user-flows/ask-a-side-question`. Screenshots are in
`.context/side-questions/mockups/final/`.

## Milestone 2: Explain mockups

Tags: mockup

Depends on: 1

Redraw the flow of Milestone 1 as Explain, and draw each of its states,
for a computer and a phone, in light and dark. Rename the side question
pages, parts, and words to Explain.

- [x] Rename the pages under `app/chat/side-questions` to `app/chat/explain`
      and the user flow to `user-flows/explain-chat-text`. Rename the parts
      and the copy to Explain.
- [x] Remove the prompt field and its sheet.
- [x] Draw the selection with Explain: in an agent answer, in a member
      message, and on a phone.
- [x] Draw the popover in each state: starting while the cloud computer
      starts, working with no answer yet, answering, answered, a follow-up
      running, waiting for input, failed with Try again, stopped, and a
      long answer that scrolls.
- [x] Draw the follow-up field, Stop, expand, and close in the popover.
- [x] Draw the marks with the popover closed: running, waiting for input,
      answered, failed, overlapping marks with their menu, and a mark whose
      text no longer matches.
- [x] Draw the popover of a closed explanation, where a send or expand
      reopens it.
- [x] Draw the expanded tab, with the written prompt as its first message.
- [x] Draw the read-only workspace: marks, a read-only popover, and no
      Explain.
- [x] Draw the phone sheet at half height and at full height.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

The mockups are under `app/chat/explain` and
`user-flows/explain-chat-text`. Screenshots are in
`.context/explain/mockups/final/`.

## Milestone 3: Documentation and protocol

Depends on: 2

- [ ] Write `docs/protocol/explain.md`: the anchor, the written prompt,
      the mark, the popover and its states, expand, the open start, the
      popover of a closed explanation, the mark life, read-only
      workspaces, and the decisions of this plan.
- [ ] Choose a free key under the rules of
      `docs/protocol/keyboard-shortcuts-keys.md` and record it there.
- [ ] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that the change
      makes wrong. Add a short guide section on Explain.
- [ ] Update `src/chat/README.md`.

## Milestone 4: The anchor on the session record

Depends on: 3

- [ ] Add an optional `anchor` to the session type in
      `crates/cnd-runner-interface/src/tools/session_types.rs`: the
      parent session ID, the message ID, the quote, and the text before
      and after it.
- [ ] Run `cargo run -p cnd-runner-interface --example export_bindings`
      and commit the generated files.
- [ ] Add `anchor` to the optional fields of
      `worker/chat/session-storage.ts`, so that old records stay valid.
- [ ] Run the Rust checks of `AGENTS.md`.

## Milestone 5: Start an explanation in the Worker

Depends on: 4

- [ ] Add a route that starts an explanation. It checks that the parent
      session and the message exist in the workspace, and that the member
      may send there. It caps the length of the quote.
- [ ] Create the explanation with its anchor as an open session, and send
      its first message: the written prompt of the design calls.
- [ ] Add Worker tests for the start, the written prompt, the checks, and
      a read-only workspace.

## Milestone 6: Selection, Explain, and marks

Tags: ui

Depends on: 2, 5

- [ ] Show Explain on a finished selection inside one agent answer or
      member message, and send it to the route of Milestone 5.
- [ ] Add the keyboard shortcut of Milestone 3 for the current selection.
- [ ] Draw the marks from the anchors of the session records, with the
      fallback to the whole message.
- [ ] Show the state of an explanation on its mark.
- [ ] Add DOM tests for the selection, the shortcut, the marks, and the
      fallback.

## Milestone 7: The popover

Tags: ui

Depends on: 6

- [ ] Open the popover from Explain and from a mark, with the chat of the
      explanation without its written prompt, as a panel on a computer and
      a sheet on a phone.
- [ ] Add the follow-up field, Stop, expand, and close. Expand shows the
      tab of the explanation, and reopens it first when it is closed.
- [ ] Show each state of the mockups, and a closed explanation to read. A
      send there reopens it.
- [ ] Show the menu of overlapping marks.
- [ ] Scroll the mark into view above the phone sheet when the popover
      opens.
- [ ] Give the popover a fallback place in browsers without CSS anchor
      positioning.
- [ ] Add DOM tests for the popover states, expand, a closed explanation,
      and the read-only popover.
- [ ] Check the flow in a browser, on a computer and a phone width.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then
      the targeted tests and `npm run check`. Run the Rust checks.
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

## Post-merge follow-up (non-blocking)

- [ ] Explain a passage on `conductive.build`, close the popover while it
      runs, and open it again from the mark.
