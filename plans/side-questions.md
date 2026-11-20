# Side questions about chat text

Status: Active. On branch `calummoore/highlight-and-prompt-mvmd`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A member who wants to ask about one passage of a chat answer must today
copy the passage, start a session with "+", paste it, and lose the link
between the two. On 17 November 2026 the user asked for a feature: select
text in the chat, press a button, and write a short prompt. The selected
text then stays marked. A press on the mark opens the conversation about
it in an overlay. That conversation is a normal session, and the member
can open it as a full session tab.

This change adds side questions. A side question is a normal session with
an anchor: the parent session, the message, and the quoted text. The
parent chat draws a mark from each anchor. The mark opens the side session
in an overlay with its chat and its composer, and with "Open as tab". The
change does not cover a fork of the parent conversation, a flow of the
side answer back into the parent session, or marks in tool lines and
notices.

## Decisions

The user chose these on 17 November 2026, in the brainstorm of this
workspace. The notes of the brainstorm are in
`.context/highlight-prompt/notes.md`.

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

## Design calls

These calls are the agent's own, made on 17 November 2026 under existing
rules.

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
- The prompt is the first line of the first message, so it becomes the
  session title.
- A member can mark agent answers and member messages, not tool lines or
  notices. A mark stays inside one message. Only finished text can be
  marked.
- A press on overlapping marks opens a short menu of their side sessions.
  A mark inside a folded part shows when the fold opens.
- A side session opens its tab at the end of the row, as every new tab
  does ([The tab row](../docs/protocol/tab-row.md)). The parent tab stays
  shown, and the overlay opens over it.
- A press on the mark of a closed side session opens the overlay to read
  its chat. A send or "Open as tab" there reopens the session, as a
  session link does
  ([Session links](../docs/protocol/agents-and-sessions.md#session-links)).
- A close of the parent session leaves its side sessions as they are.
- The side agent has the same tools as any session. So it can change files
  that the parent session also works on.
- The overlay is a dialog on a computer and a sheet on a phone, as
  [the design](../docs/mockups/design.md) says for overlays.
- On a computer, Ask about this stands just above the middle of the
  selection, as the selection tools of most editors put it. In a member
  message at the right of the chat, it lines up with the end of the
  selection. The prompt field opens under the selection, from its start.
  On a phone, the button stands above the composer, away from the
  selection menu of the phone. The first mockup put the button under the
  end of the selection. On 20 November 2026 the user said that this place
  looked odd, so it moved.
- The button says "Ask about this". The docs call the feature a "side
  question", because "preview" already names port previews.
- A read-only workspace shows the marks and opens the overlay to read. It
  starts no side question.

Contract owners:

- A new protocol doc, `docs/protocol/side-questions.md`, linked from
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

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/side-questions.md`: the anchor, the first
      message, the mark, the overlay, "Open as tab", the open start, the
      overlay of a closed side session, the mark life, read-only
      workspaces, and the decisions of this plan.
- [ ] Choose a free key under the rules of
      `docs/protocol/keyboard-shortcuts-keys.md` and record it there.
- [ ] Read the Terms page, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that the change
      makes wrong. Add a short guide section on side questions.
- [ ] Update `src/chat/README.md`.

## Milestone 3: The anchor on the session record

Depends on: 2

- [ ] Add an optional `anchor` to the session type in
      `crates/cnd-runner-interface/src/tools/session_types.rs`: the
      parent session ID, the message ID, the quote, and the text before
      and after it.
- [ ] Run `cargo run -p cnd-runner-interface --example export_bindings`
      and commit the generated files.
- [ ] Add `anchor` to the optional fields of
      `worker/chat/session-storage.ts`, so that old records stay valid.
- [ ] Run the Rust checks of `AGENTS.md`.

## Milestone 4: Start and run a side question in the Worker

Depends on: 3

- [ ] Add a route that starts a side question. It checks that the parent
      session and the message exist in the workspace, and that the member
      may send there. It caps the length of the quote.
- [ ] Create the side session with its anchor as an open session, and
      send its first message: the prompt, the quote, and the link to the
      parent session.
- [ ] Add Worker tests for the start, the checks, and a read-only
      workspace.

## Milestone 5: Selection, prompt, and marks

Tags: ui

Depends on: 1, 4

- [ ] Show "Ask about this" on a finished selection inside one agent
      answer or member message.
- [ ] Add the prompt field, and send it to the route of Milestone 4.
- [ ] Add the keyboard shortcut of Milestone 2 for the current selection.
- [ ] Draw the marks from the anchors of the session records, with the
      fallback to the whole message.
- [ ] Show the run state of a side session on its mark.
- [ ] Add DOM tests for the selection, the shortcut, the marks, and the
      fallback.

## Milestone 6: The side session overlay

Tags: ui

Depends on: 5

- [ ] Open the overlay from a mark, with the chat and the composer of the
      side session, as a dialog on a computer and a sheet on a phone.
- [ ] Add Stop and "Open as tab". "Open as tab" shows the tab of the
      session, and reopens it first when it is closed.
- [ ] Show a closed side session in the overlay to read. A send there
      reopens it.
- [ ] Show the menu of overlapping marks.
- [ ] Add DOM tests for the overlay, "Open as tab", the overlay of a
      closed side session, and the read-only overlay.
- [ ] Check the flow in a browser, on a computer and a phone width.

## Milestone 7: Verification, commit, review, and pull request

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

- [ ] Ask a side question on `conductive.build`, close the overlay while
      it runs, and reopen it from the mark.
