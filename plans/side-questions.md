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
  every session rule stays. The user added that it starts closed, in the
  session history, so that no tab opens for each question. The mark opens
  it in an overlay. "Open as tab" reopens it as a normal tab.
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

### Open decision 5. How a closed side session runs its turns

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** the close rules of
  [Sessions](../docs/protocol/agents-and-sessions.md#sessions). The Worker
  checks the close state before each turn step:
  `worker/chat/send-message.ts:38`, `worker/chat/messages.ts:74`,
  `worker/chat/turn-lifecycle.ts:53`, `worker/chat/ordered-dispatch.ts:48`,
  `worker/devices/access.ts:88`, and `worker/secrets/request-reconcile.ts:47`.
- **Terms:**
  - **Session history:** the list of closed sessions behind the history
    button at the right end of the tab row.
- **Background:** The user chose that a side session starts closed, in
  the session history. Today a closed session runs no turn. A close of a
  running session stops its turn first, so that no agent runs where the
  members cannot see it. A message to a closed session gets HTTP 409 with
  `session_closed`. The close state also blocks the dispatch of a turn,
  its model gateway token, its tool writes, its Mac commands, and its
  secret requests.
- **Problem:** The first message of a side session must run while the
  session is closed. Later messages from the overlay must run there too.
  The current rules and at least nine checks in the Worker forbid both.
- **Impact if no action:** The Worker refuses each side question, or each
  send from the overlay reopens the session as a tab.
- **Root question:** How can a side session run with no tab, while every
  member can still see and stop each run? (The options check gave this
  root question.)
- **Options:**
  - **A.** A closed side session can run. Its mark and its history entry
    show that it runs or waits for input. The overlay sends to it without
    a reopen. Stop in the overlay stops it. The close rule changes for
    side sessions only. The mark shows only while the passage is in view.
    Effort: Large.
  - **B.** A send from the overlay reopens the side session as a tab. The
    question then makes a tab at once, which the user wanted to avoid.
    Effort: Small.
  - **C.** The overlay counts as the view of the session. A close of the
    overlay while the turn runs asks first: stop the turn, or open as tab.
    The member must wait in the overlay for each answer. The guard lives
    in one browser, so a reload leaves a run with no view. Effort: Large.
  - **D.** A, plus a run sign on the history button and on the parent tab
    while a closed side session runs or waits for input. Its history entry
    shows Stop. Older Mac apps show no sign. Effort: Large, Small above A.
  - **E.** A closed side session runs only while its parent is open. The
    parent tab shows the sign. A close of the parent asks first and stops
    the side turns too. It couples two sessions, and an older Mac app gets
    a refusal that it does not ask about. Effort: Large.
  - **F.** A, but a closed side session runs read-only: no file change,
    secret, or Mac command. "Open as tab" gives every tool. It needs a
    tool limit in the runner messages for both agents, with a capability
    check for older runners. Effort: Large.
- **Left out:**
  - A third session state, "side", beside open and closed. The user
    rejected it as option B of side session placement.
  - A tab only while a turn runs, which closes when the turn ends. It
    opens a tab for each question for every member, so it fails the
    closed start.
  - The same rule for every closed session. The `send_message` tool could
    then run any closed session unseen, which the close rule rejects.
- **Wider fix:** None among the letters. Each option puts the closed-run
  rule in one function beside `sessionFor` in
  `worker/chat/session-record.ts`, in place of the repeated checks.
- **Previous examples:** `showLocally` in
  `src/chat/state/archive-view.ts:73` shows a closed session without a
  reopen, but it only reads. Agents close their own sessions when their
  work ends, as [Sessions](../docs/protocol/agents-and-sessions.md#sessions)
  says.
- **Recommendation:** D. The options check changed it from A. The member
  can ask, close the overlay, and come back later, and each member sees
  the run also when the passage is out of view. F best limits the risk of
  an unseen run.
- **Action:** ask the user, because D changes the close rule in force, and
  no recorded user decision covers that change.

### Open decision 6. Side sessions in the session history

- **Severity:** Low. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `src/chat/components/tab-keys.ts:47`, which takes the
  first history row for Reopen closed session.
  `docs/protocol/keyboard-shortcuts.md:114`, and the history rules of
  [Sessions](../docs/protocol/agents-and-sessions.md#sessions).
- **Background:** The history lists closed sessions, the last closed
  first. The shortcut Reopen closed session reopens the first one. A side
  session starts closed, so each new side question goes to the top. No
  record field says that a session never had a tab. A side session that
  closed at its start has the same `closedAt` and `createdAt`.
- **Problem:** After a side question, Reopen closed session opens that
  side question as a tab, not the tab that the member closed. The history
  also fills with side questions.
- **Impact if no action:** The shortcut stops doing what its name says.
- **Root question:** How does a member get back the tab that they closed
  last, and still find each side question, when side questions start
  closed? (The options check gave this root question.)
- **Options:**
  - **A.** Side sessions show like any closed session. Reopen closed
    session can open the newest side question. Effort: Small.
  - **B.** The history lists them, but Reopen closed session skips side
    sessions that never had a tab. Effort: Small.
  - **C.** The history does not list a side session until it had a tab.
    Its mark is the only way to reach it. A side session is then closed
    but not in the history, which the history rule does not allow today.
    Effort: Small.
  - **D.** Side sessions show in their own history group, "Side
    questions", below the closed tabs. The key takes only the first closed
    tab. The anchor selects the group, so no new field is needed. The key
    also skips a side session that later had a tab. Effort: Medium.
  - **E.** The key reopens the session whose tab this member closed last,
    from a close list in the chat controller. Side questions, agent
    closes, and closes by other members do not go into it. After a
    reload, the current rule applies. It changes the rule for every close,
    and the history stays mixed. Effort: Medium.
- **Left out:** None.
- **Wider fix:** E. One close list for each member also fixes agent
  closes and the close order of a read-only workspace.
- **Previous examples:**
  `plans/follow-ups/read-only-session-close-order.md`, where the same key
  already opens a session that the member did not close last.
- **Recommendation:** D. The options check changed it from B. It fixes
  both the key and the full history with no new field. E best protects
  the codebase. Older Mac apps keep A in every option, because they
  bundle an older web app.
- **Action:** ask the user, because D changes the history rule and the
  rule of the shortcut, and no recorded user decision covers that change.

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
- With the user's closed start, a press on a mark opens the overlay and
  does not reopen a tab. Only "Open as tab" reopens it.
- A close of the parent session leaves its side sessions as they are.
- The side agent has the same tools as any session. So it can change files
  that the parent session also works on.
- The overlay is a dialog on a computer and a sheet on a phone, as
  [the design](../docs/mockups/design.md) says for overlays.
- The button says "Ask about this". The docs call the feature a "side
  question", because "preview" already names port previews.
- A read-only workspace shows the marks and opens the overlay to read. It
  starts no side question.

Contract owners:

- A new protocol doc, `docs/protocol/side-questions.md`, linked from
  [Agents and sessions](../docs/protocol/agents-and-sessions.md#sessions).
- [Agents and sessions](../docs/protocol/agents-and-sessions.md) and
  [Session management](../docs/protocol/session-management.md), for the
  close rule of open decision 5.
- [Session calls](../docs/protocol/session-calls.md) and
  [Secret requests](../docs/protocol/secret-requests.md), for the rules of
  a closed session that open decision 5 changes.
- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md), for Reopen
  closed session in open decision 6, and
  [their keys](../docs/protocol/keyboard-shortcuts-keys.md), for the new
  key.
- The [chat README](../src/chat/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the side question flow in the chat catalogue, for a computer and a
phone.

- [ ] Draw the "Ask about this" button on a selection in an agent answer
      and in a member message.
- [ ] Draw the prompt field that opens from the button, with send and
      cancel.
- [ ] Draw the mark in the parent chat: idle, running, and waiting for
      input. Draw overlapping marks and their menu.
- [ ] Draw the overlay with the side chat, its composer, Stop, and "Open
      as tab". Draw it as a dialog on a computer and as a sheet on a phone.
- [ ] Draw the phone selection, so that the phone's own selection menu
      does not cover the button.
- [ ] Draw a mark whose text no longer matches, which covers the whole
      message.
- [ ] Draw the read-only workspace: marks and a read-only overlay.
- [ ] Draw the run signs that the answer to open decision 5 needs, such
      as a sign on the history button and on the parent tab.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Write `docs/protocol/side-questions.md`: the anchor, the first
      message, the mark, the overlay, "Open as tab", the closed start, the
      mark life, read-only workspaces, and the decisions of this plan.
- [ ] Update the close rules in `docs/protocol/agents-and-sessions.md`,
      `docs/protocol/session-management.md`,
      `docs/protocol/session-calls.md`, and
      `docs/protocol/secret-requests.md` with the answer to open
      decision 5.
- [ ] Update the history rules and `docs/protocol/keyboard-shortcuts.md`
      with the answer to open decision 6.
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
- [ ] Create the side session with its anchor, closed at the start, and
      send its first message: the prompt, the quote, and the link to the
      parent session.
- [ ] Put the rule of which closed session may run in one function
      beside `sessionFor` in `worker/chat/session-record.ts`. Use it in
      each check of the close state: the send and message routes, the
      dispatch, the turn token, tool writes, Mac commands, and secret
      requests.
- [ ] Apply the answer to open decision 5 to the send, stop, and close
      routes.
- [ ] Add Worker tests for the start, the checks, a read-only workspace,
      and the answer to open decision 5.

## Milestone 5: Selection, prompt, and marks

Tags: ui

Depends on: 1, 4

- [ ] Show "Ask about this" on a finished selection inside one agent
      answer or member message.
- [ ] Add the prompt field, and send it to the route of Milestone 4.
- [ ] Add the keyboard shortcut of Milestone 2 for the current selection.
- [ ] Draw the marks from the anchors of the session records, with the
      fallback to the whole message.
- [ ] Show the run state of a side session on its mark, and the other
      signs of the answer to open decision 5.
- [ ] Apply the answer to open decision 6 to the history and to Reopen
      closed session.
- [ ] Add DOM tests for the selection, the shortcut, the marks, and the
      fallback.

## Milestone 6: The side session overlay

Tags: ui

Depends on: 5

- [ ] Open the overlay from a mark, with the chat and the composer of the
      side session, as a dialog on a computer and a sheet on a phone.
- [ ] Add Stop and "Open as tab". "Open as tab" reopens the session and
      shows its tab.
- [ ] Show the menu of overlapping marks.
- [ ] Add DOM tests for the overlay, "Open as tab", and the read-only
      overlay.
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
