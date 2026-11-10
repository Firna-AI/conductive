# Copy session transcripts

Status: Active. On branch `calummoore/session-transcript-copy`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The tab menu of a session tab gets two items: Copy concise transcript and
Copy full transcript. Each item copies the conversation of the session as
Markdown, so that a member can paste it into another agent, a document, or
a pull request. A new route of the Worker builds the Markdown from the
stored events of the session, and the browser copies the reply
(decision 213). The concise copy is the chat as it shows by default, with
each fold closed. The full copy is the chat with every fold open
(decision 215). In a read-only workspace, the tab menu of a session tab
opens with only the two copy items (decision 214). A member copies a
closed session after a reopen, as decision 216 chose, and a follow-up item
records that gap. The picker of a new workspace and the mockups take the
effort words from the shared copy that the chat and the Worker use
(decision 217).

This change adds no keyboard shortcut, no command palette row, no copy of
one answer, no download, and no copy from the session history. It adds no thinking text and no tool output,
because the runner sends neither. A tool call carries its kind, its
target, and the description that the agent gave the call. The brainstorm
notes and their sources are in `.context/copy-transcript/`. The options
check of the decisions is in `.context/copy-session-transcripts/`.

How Conductor does it, from the brainstorm: its chat tab menu holds "Copy
concise transcript", with ⌘⌥C, and "Copy full transcript". Its version
0.89.0 fixed a copy that switched to the tab of the menu. Its exact
Markdown was not verified, because its app binary keeps the interface
compressed.

Terms:

- **Fold:** the one line that holds the work of an ended turn before its
  answer, such as "8 tool calls, 7 messages". A run of tool calls whose
  calls are all done also folds into one line, such as "3 tool calls". A
  run with a call that is not done shows each call.
- **Workspace object:** the Durable Object of a workspace. It stores every
  event of the chat and serves the chat routes, one task at a time.
- **Read-only workspace:** an archived workspace, or a workspace of a
  suspended org. Its chat shows, but it accepts no changes.
- **Session history:** the list of the closed sessions of a workspace.
  The clock button at the right end of the tab row opens it.

Contract owners:

- `docs/protocol/session-transcripts.md`. Milestone 2 creates it.
- [Agents and sessions](../docs/protocol/agents-and-sessions.md), the
  section "The tab row".
- The [chat README](../src/chat/README.md) and the
  [tab row guide](../src/chat/tab-row.md).
- The [chat backend README](../worker/chat/README.md).
- The [shared contracts README](../src/shared/README.md).

## Decisions

The options check of 9 November 2026 added options D and E to
decision 213, options C and D to decisions 214 and 215, and better root
questions for decisions 213 and 215. It also corrected three effort grades.
It kept each recommendation. A second check on the same day added option D
to decisions 216 and 217, and a better root question for decision 217. It
changed the recommendation of decision 217 from B to C. The user answered
decisions 216 and 217 on 10 November 2026.

### 213. How the session transcript gets built

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** `src/chat/components/useTabMenu.ts:26`
- **Background:** A browser tab holds the full stored history of each
  session that it showed. For a tab that never showed, the browser must
  load that history first, page by page. The workspace object stores every
  event. The agent tools may not read the chat of another workspace.
- **Problem:** The app cannot copy a whole session as Markdown. The text
  can come from the browser, from a new Worker route, or from a new
  dialog.
- **Impact if no action:** Members select and copy the chat by hand. That
  copy loses the folded work and the Markdown.
- **Root question:** How does a copy get the whole conversation of any
  session, in the order, the folds, and the words of the chat?
- **Options:**
  - **A.** The browser builds the Markdown from the chat that it holds. It
    loads the history of a tab that never showed first. The work is a
    formatter, the menu items, the mockup, the protocol text, and a pending
    clipboard item for a tab that never showed. Effort: Large.
  - **B.** A new Worker route builds the Markdown from the stored events.
    The browser copies the reply. The route needs access checks and tests,
    and the menu work stays the same. Effort: Large.
  - **C.** The tab menu opens a dialog with a preview, Copy, and Download.
    It handles very long sessions, but it adds a dialog, its mockups, and
    one more click. It is a surface, and it can use the text of A or of B.
    Effort: Large.
  - **D.** B, and the browser also runs the same shared builder on a
    session that it holds. Only a session that the tab never loaded waits
    for the route. Cost: two paths to test, which can differ when the state
    of the tab differs from the stored state. Effort: Large.
  - **E.** B, but the Worker writes the text with its own rules for the
    order and the folds, and moves no chat code. Cost: the Worker repeats
    the hardest part of the chat code, so the copy drifts from the chat.
    Effort: Large.
- **Left out:**
  - A Copy button on each answer. It copies one answer, not the session.
  - An export of the agent's own session log from the cloud computer. An
    archived workspace has no cloud computer, the two agents write
    different formats, and those logs can hold the secret values that the
    chat hides.
  - No change, where the member selects the chat and copies it. That copy
    loses the folded work and the Markdown.
  - A share link to the transcript. It gives a link, not Markdown, and it
    shows chat data outside the app.
  - A transcript that the workspace object keeps up to date at each event.
    It adds work to each event of each session, for a copy that members
    make only now and then.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** None found in this repository. Conductor copies
  with one press from its tab menu.
- **Recommendation:** A. The browser holds the same events for each
  session that it showed, and A adds no route. The options check agrees.
  When the route stays for a later client, D is the best form of B.
- **Action:** ask the user, because the user asked for a brainstorm, and
  the approach of the feature is the user's choice.
- **Outcome:** The user chose B on 9 November 2026, before the options
  check added D and E. B makes the Worker fold the events as the chat
  does, so Milestones 3 and 4 move that code to `src/shared/`.

### 214. Copy in a read-only workspace

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/agents-and-sessions.md:159`
- **Background:** Decision 188 gave the tab menu, and a design call of its
  change opened no tab menu in a read-only workspace. The reason was that a
  member cannot rename or move a tab there. The chat of such a workspace
  still shows. Copy link in the workspace header shows in every workspace.
- **Problem:** Under that rule, a member cannot copy the transcript of an
  archived workspace.
- **Impact if no action:** The record of a finished task can leave the app
  only by a copy of the chat by hand.
- **Root question:** Can a member copy the transcript of a session in a
  read-only workspace?
- **Options:**
  - **A.** Keep the rule. A read-only workspace opens no tab menu, so it
    has no copy. Effort: Small.
  - **B.** Open the tab menu of a session tab in a read-only workspace with
    only the copy items. A long press on a phone then needs a press that
    opens the menu without a drag. Effort: Medium.
  - **C.** Open the usual menu of a session tab. Rename session, Move left,
    and Move right are off, and the two copy items are on. Cost: three
    greyed rows that a read-only workspace never turns on. Effort: Medium.
  - **D.** Add a Copy transcript control to the read-only chat, such as in
    the bar of an archived workspace. Cost: a second place for the same
    action, with its own mockups and tests. It copies only the shown
    session. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B, built with a mark on each menu item that changes the
  workspace. A read-only workspace then leaves out the marked items, and a
  later item that only reads needs no new decision.
- **Previous examples:** Copy link in
  `src/shell/workspace/WorkspaceHeader.tsx` has no read-only check.
- **Related:** Decision 215 sets the copy items that this menu shows.
- **Recommendation:** B. A copy changes nothing, and an archived workspace
  holds finished work that a member is likely to keep. The options check
  agrees.
- **Action:** ask the user, because option B changes a requirement in
  force: a read-only workspace opens no tab menu.
- **Outcome:** The user chose B on 9 November 2026, when B was graded
  Small.

### 215. A concise copy beside the full copy

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/chat/components/useTabMenu.ts:54`
- **Background:** Conductor offers a concise copy and a full copy. The
  full copy holds every agent message and every tool call of the session.
- **Problem:** The user asked only for the full copy. A member who wants
  only the conversation then also gets all the work of each turn.
- **Impact if no action:** Members trim long copies by hand before they
  paste them.
- **Root question:** What does a member get when they copy a session: all
  the work, only the conversation, or a choice of both?
- **Options:**
  - **A.** Only "Copy full transcript". It copies the chat with every fold
    open. Effort: Small.
  - **B.** Two items, as Conductor has. "Copy concise transcript" copies
    the chat as it shows by default, with each fold closed. "Copy full
    transcript" copies it with every fold open. The concise copy needs the
    work fold, the fold words, and the rule that opens a run in the Worker.
    Effort: Medium.
  - **C.** Two items, and the runner also sends the thinking text and the
    tool output, so that the full copy holds them. Cost: new runner events,
    a larger stored history, new limits, and the masking of secret values
    in the new text. Only new turns get the data. Effort: Large.
  - **D.** Two items, but the concise copy holds only the messages of the
    members and the answers, with no fold lines and no turn ends. Cost: the
    concise copy no longer reads like the chat. Effort: Small.
- **Left out:**
  - One item that opens a dialog with the choice. Two menu items give the
    same choice with one less click.
  - Only "Copy concise transcript". It fails the task, which asks for the
    full copy.
  - A copy with the folds as the member left them. The open folds live
    only in the tab, and the route cannot see them.
- **Wider fix:** None. This is a design question, not a class of defect.
- **Previous examples:** Conductor 0.38.3 added one copy on ⌘⌥C. Its menu
  now has a concise copy on ⌘⌥C and a separate full copy.
- **Related:** Decision 214 shows these items in a read-only workspace.
- **Recommendation:** B. The concise copy keeps the answers and the changed
  files that another agent or a pull request needs, and it reads like the
  chat. The options check agrees.
- **Action:** ask the user, because option B adds a second copy item that
  the user did not ask for, and no requirement covers it.
- **Outcome:** The user chose B on 9 November 2026, when B was graded
  Small.
- **Correction after the choice:** The brainstorm said that each tool call
  can hold 64 KiB of output, so that a full copy can reach megabytes. That
  was wrong. A tool call holds the description of the call, not its
  output. A full copy is mostly the text of the messages. Each Mac command
  adds its output, which the app cuts at 64 KiB.

### 216. Copy a closed session

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/chat/components/ChatOverlays.tsx:16`
- **Background:** A closed session has no tab, so no tab menu copies it.
  Each entry of the session history reopens its session. A reopen opens
  the tab again for every member, because the members share the sessions
  of a workspace. In a read-only workspace, an entry shows its session as
  a tab for the member alone, so the tab menu reaches every session there.
  The planned route of decision 213 can read a closed session too, because
  its session check accepts one.
- **Problem:** In a workspace that accepts changes, a member must reopen a
  closed session for everyone before they can copy it.
- **Impact if no action:** A member who wants an old transcript reopens the
  session, copies it, and closes it again. The other members see the tab
  come and go. The new close also moves the session to the top of the
  session history of each member.
- **Root question:** How does a member copy the transcript of a closed
  session?
- **Options:**
  - **A.** Not in this change. A member reopens the session to copy it, and
    a follow-up item records the gap. Effort: Small.
  - **B.** Each entry of the session history gets the two copy items, in a
    menu that a right click, Shift and F10, the Menu key, or a long press
    opens. A press on the entry still reopens the session. Cost: a menu
    that opens from a row of the history, with its own rules for a press
    outside and for the focus in a phone sheet, a long press with no drag,
    its mockups, and its tests. Effort: Medium.
  - **C.** An entry of the session history shows its closed session as a
    tab for the member alone, as a read-only workspace does. Its tab menu
    then copies it. Cost: a new local view in a workspace that accepts
    changes, with its own rules for messages, a close, and a reload. It
    changes the requirement that an entry reopens its session. Effort:
    Large.
  - **D.** Each entry of the session history gets a visible control at the
    end of its row, such as a More button, that opens the two copy items. A
    press on the entry still reopens the session. Cost: a new kind of menu
    row with its own arrow-key and focus rules, its mockups, and its tests.
    Each row gets busier. Effort: Medium.
- **Left out:**
  - A copy that reopens the session, copies it, and closes it again on its
    own. The other members still see the tab come and go, so B is better
    on every point.
  - A submenu on each entry, with Reopen session and the two copy items. It
    breaks the requirement that an entry reopens its session, and D shows
    the copy as clearly with no extra press.
  - A dialog or a page that shows the text of a closed session, with a Copy
    button. It brings back the dialog of option C of decision 213, which
    the user did not choose.
- **Wider fix:** B, built from the item list of the session tab menu. Each
  item also says whether it needs a tab, as Rename session and the moves
  do. An entry of the history then shows each item that needs no tab and
  that the mark of decision 214 allows. A later item that needs no tab
  then reaches a closed session with no new decision.
- **Previous examples:** The source line of a session reaches a closed
  source session only through a reopen for every member, in
  `src/chat/components/SessionChat.tsx:136`.
- **Related:** Decision 214: in a read-only workspace, the session history
  already reaches every session through a tab for the member alone.
- **Recommendation:** B, built as the wider fix says. The route can read a
  closed session, so only the menu is new, and no other member sees a
  change. The options check agrees.
- **Action:** ask the user, because option B adds behaviour that no
  requirement covers.
- **Outcome:** The user chose A on 10 November 2026. The follow-up item
  `plans/follow-ups/copy-closed-session.md` keeps options B, C, and D for
  later.

### 217. Remove the other copies of the effort words

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** `src/shell/ui/ModelPicker.tsx:16`
- **Terms:**
  - **Effort words:** the names of the effort levels that a model picker
    shows, such as "Max" in "Opus 5.5 Max".
- **Background:**
  - The follow-up item `plans/follow-ups/effort-words-copies.md` records
    that the effort words live in three places: `src/chat/state/format.ts`,
    the picker of a new workspace in `src/shell/ui/ModelPicker.tsx`, and
    the mockup fixture `docs/mockups/src/fixtures/agents.ts`.
  - `modelLabel` lives in the first two. `src/shell/new-workspace/notices.tsx`
    imports it from the picker of a new workspace.
  - Its option A keeps one copy in a shared module, and both app pickers
    import it. Its option B also lets the mockups import it.
  - Milestone 4 moves the copy of the chat to `src/shared/agents.ts`,
    because the Worker needs it.
  - The rules of the follow-up items start work on an item only when the
    user asks for it.
- **Problem:** After Milestone 4, the picker of a new workspace and the
  mockup fixture still keep their own copies.
- **Impact if no action:** The two app pickers and the mockups can still
  show different words for the same effort level.
- **Root question:** Where do the effort words and the model label live
  when this branch merges, so that every picker and the mockups show the
  same words?
- **Options:**
  - **A.** No change to the other copies. The follow-up stays open, with
    the new path of the copy of the chat. Effort: Small.
  - **B.** Apply option A of the follow-up in Milestone 4. The picker of a
    new workspace and `notices.tsx` import the shared words and
    `modelLabel`. The follow-up keeps only the copy of the mockup fixture.
    Effort: Small.
  - **C.** Apply option B of the follow-up in full in Milestone 4, and
    delete the item. The mockup fixture also imports the shared words. The
    import changes nothing that a mockup shows, so Milestone 4 runs
    `npm run mockups:check` and needs no mockup milestone. Effort: Small.
  - **D.** C, but the one copy of the effort words lives in a pure word
    module of the mockup components, as `lostCopy.ts` does. Milestone 1
    moves the words there, and Milestone 4 makes the chat, the picker of a
    new workspace, and the Worker import them. Only `modelLabel` moves to
    `src/shared/agents.ts`. Cost: Milestone 4 then depends on Milestone 1.
    Effort: Small.
- **Left out:**
  - A test or a lint that checks that the copies agree. It keeps the
    copies and needs the approval of the user, so C is better on every
    point.
  - The effort words in the configured model list. It changes the reply
    of the models and moves product text into the deployment setup, so C
    is better on every point.
- **Wider fix:** C. One copy then serves the app and the mockups.
- **Previous examples:** None found.
- **Related:** `plans/follow-ups/new-workspace-effort-fallback.md`: the two
  pickers also choose the effort of a new model in different ways. That
  item stays apart, because the words do not settle it.
- **Recommendation:** C. The first recommendation was B. The import of the
  fixture changes nothing that a mockup shows, so C fits in Milestone 4,
  removes the last copy, and closes the follow-up item.
- **Action:** ask the user, because the rules of the follow-up items start
  work on an item only when the user asks for it.
- **Outcome:** The user chose C on 10 November 2026. Milestone 4 applies it
  and deletes `plans/follow-ups/effort-words-copies.md`.

## Design

The agent made each call below on 9 November 2026.

The menu and the copy:

- The menu of a session tab holds Rename session, a line, Copy concise
  transcript, Copy full transcript, a line, Move left, and Move right.
  Reason: decision 188 groups the rows by kind, with a line between the
  groups.
- In a read-only workspace, the menu of a session tab holds only the two
  copy items. A file or diff tab there opens no menu. The menu opens in the
  usual ways: a right click, Shift and F10, the Menu key, and a long press
  on a phone. No drag starts. Reason: a file tab has nothing to copy, and
  the other items change the workspace.
- Each menu item that changes the workspace carries a mark, and a
  read-only workspace leaves out the marked items. Reason: this is the
  wider fix of decision 214, so that a later item that only reads needs
  no new decision.
- The rule of the mockups that an item that is off keeps its place,
  greyed, covers an item that the place of a tab rules out. A read-only
  workspace leaves out the items that it does not allow, by decision 214.
  Milestone 1 writes this exception in `docs/mockups/design.md`.
- A copy does not change the shown tab. Reason: Rename session does not
  change it either, and Conductor fixed a copy that did.
- The browser keeps the clipboard permission of the press while the
  request runs. It writes a pending clipboard item where the browser
  supports one. Else it writes the text when the reply comes. Reason:
  Safari and Firefox refuse a clipboard write that comes long after the
  press.
- When the clipboard refuses the write after the wait, the browser keeps
  the text of that session and that kind of copy for one minute. The next
  press of the same item writes the kept text at once and drops it.
  Reason: a new request would wait again and fail in the same way.
- After the copy, a toast says "Transcript copied". When the request or
  the write fails, the toast says "The transcript didn't copy. Try again."
  Reason: the menu closes on the press, and Copy link uses the same words.
- This change adds no keyboard shortcut and no command palette row.
  Reason: in Chrome, ⌘⌥C opens the developer tools. Both can come later.

The route:

- The route is
  `GET /api/orgs/{orgId}/workspaces/{workspaceId}/sessions/{sessionId}/transcript`,
  with `detail=concise` or `detail=full`. The workspace object serves it
  with the access of the history route. Reason: the same sign-in gate, the
  same org check, and the same reads in a read-only workspace.
- The route reads one page of the stored history in each task of the
  workspace object, through one event number. Reason: runner events and
  messages then wait for one page at most, not for the whole read. The
  copy still shows one state, as a history load does.
- An unknown session gets `404 session_not_found`, as on the other session
  routes. An unknown `detail` gets `400 invalid_input`, as other chat
  inputs do.
- The reply is JSON that holds the Markdown text. Reason: the API client
  of the app and its error messages stay the same.
- The workspace token of a sandbox cannot call the route, because the
  route sits behind the sign-in gate. Reason: the agent tools may make only
  their six calls, as [Agent tools](../docs/protocol/agent-tools.md) says.

One fold and one set of words:

- The pure fold code of the chat moves to `src/shared/transcript/`. The
  browser and the Worker then fold the events of a session with the same
  code. Reason: the copy then has the order and the folds of the chat, and
  no production code of the Worker imports chat code of the browser. The
  test support of the Worker already folds the stored history with the
  `SessionLog` of the browser, so the move is for clear ownership. A fold
  with its own rules in the Worker, option E of decision 213, would drift
  from the chat.
- The two placement modules take distinct names in the shared folder,
  such as `item-placement.ts` and `command-placement.ts`. Reason: both are
  `placement.ts` today.
- Each word or format that the copy shares with the chat comes from the
  module that the chat uses. A word inside a React component moves to a
  pure module. A pure word module of the mockup components, such as
  `docs/mockups/src/components/chat/lostCopy.ts`, stays in place, and the
  Worker imports it as the app does. Reason: the copy says what the chat
  says.
- The rule that a run with a call that is not done shows open moves from
  `ToolGroup.tsx` to the shared module. Reason: the concise copy needs it.
- The effort words and `modelLabel` of the chat move to
  `src/shared/agents.ts`, because the Worker needs them. By decision 217,
  the picker of a new workspace, `src/shell/new-workspace/notices.tsx`,
  and the mockup fixture import them too.

The agent made this call on 10 November 2026:

- The comparison page at `conductive.build/from-conductor` lists no
  transcript copy, so this change changes no row of it. Reason: its rule
  in `docs/protocol/conductor-cloud-comparison.md` covers only the features
  that it lists.

The text:

- The text starts with the title of the session as a heading, else
  "Untitled". A line gives the label and the name of the workspace, with
  its link. A line gives the time of the copy in UTC. Reason: a pasted copy
  needs its source, and the Worker does not know the time zone of the
  reader.
- Each member message starts with a heading that holds the display name of
  the member, else the GitHub login. The copy never says "You". Reason: a
  pasted copy has no "you".
- Each answer starts with a heading that holds "Agent" and the model with
  its effort, as the model picker names them, such as "Agent · Opus 5.5
  Max". The copy never names "Claude Code". Reason: the naming rules in
  [Agents and sessions](../docs/protocol/agents-and-sessions.md#names-in-the-product).
- Each path shows by its label, never by its real path. Reason: the label
  hides each secret value (decision 145).
- An attachment shows by its name. Reason: its file needs a sign-in.
- A stop line names the member, as the chat names another member, such as
  "Priya stopped the agent". A stop by a member who left the org gives
  "The agent stopped".
- A running turn copies as far as it got. A line then says that the agent
  is still working.
- The full copy gives each tool call one list line: the verb of the chat,
  the target as code, and the detail. Each Mac command gives its command,
  its Mac, its state, and its output in a code block. Inline code and code
  blocks take a fence longer than each run of backticks in them.

An example of a concise copy. The full copy puts the work of the turn in
place of the fold line:

````markdown
# Address autocomplete

W-395 · Checkout fixes · https://app.conductive.build/orgs/acme/workspaces/w395
Copied 9 November 2026, 18:40 UTC

## Cal

Add address autocomplete to the checkout form.

Attachments: checkout.png

## Agent · Opus 5.5 Max

_8 tool calls, 7 messages_

I added the autocomplete to the address field of the form.

_Finished in 4m 12s. Changed files: `src/checkout/Form.tsx`, `src/checkout/useAddress.ts`_
````

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The tab menu of a session tab gets the two copy items. A new mockup page
draws the copy: the toast after a copy, the failed copy, and the menu of a
read-only workspace. The Move tabs page keeps its five screens.

- [ ] Add the copy group to the session tab menu in
      `docs/mockups/src/components/workspace/TabMenu.tsx`: Rename session,
      a line, Copy concise transcript, Copy full transcript, a line, Move
      left, and Move right. Take the icons from `lucide-react`, as the
      other rows do.
- [ ] Mark each item of `tabMenuOf` that changes the workspace. Add a
      read-only mode that leaves out the marked items, so that a session
      tab gives only the two copy items and a file or diff tab gives none.
- [ ] Write in `docs/mockups/design.md` that a read-only workspace leaves
      out the menu items that it does not allow, while an item that the
      place of a tab rules out stays greyed.
- [ ] Update the description and the rationale of the "Tab menu" screen in
      `docs/mockups/src/entries/app/tabs/index.mockup.tsx` for decisions
      214 and 215.
- [ ] Add the page "Copy a transcript" under
      `docs/mockups/src/entries/app/transcripts/`, with these screens, each
      on desktop and on a phone:
  - [ ] "Transcript copied": the toast after Copy full transcript, from
        the menu of a tab that does not show. The shown tab stays.
  - [ ] "Copy failed": the toast "The transcript didn't copy. Try again."
  - [ ] "Archived workspace": the menu of a session tab with only the two
        copy items. A phone shows it as a sheet.
- [ ] Add the workspace state that the toast needs to
      `docs/mockups/src/screens/workspaceState.ts`. Use the toast of
      `@firna/ui`, as the copy toasts of the app do.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`. Save the screenshots under
      `.context/copy-session-transcripts/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the copy items, the text of a copy, the route, and
decisions 213, 214, and 215.

- [ ] Add `docs/protocol/session-transcripts.md`. State the two copy
      items, what each copy holds, the rules of the text from "The text"
      above, the copy that keeps the shown tab, the toasts, and the access
      of the route. Give decisions 213, 214, and 215 next to their
      requirements, with the rejected options and the reasons.
- [ ] Update "The tab row" in `docs/protocol/agents-and-sessions.md`: the
      items of the menu of a session tab, the menu of a read-only
      workspace (decision 214), and a link to the new page.
- [ ] Add a link to the new page in `docs/protocol/chat-and-events.md`, as
      for the other sections, and in the list of protocol docs in
      `docs/architecture.md`.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a fact that this milestone changes. Record the result under
      this milestone.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Share the fold of the chat

Depends on: none

The pure code that folds the events of a session into the items and the
folds of the chat moves to `src/shared/transcript/`. The behaviour of the
chat does not change.

- [ ] Move these modules to `src/shared/transcript/`, with their unit
      tests:
  - [ ] the session log, the transcript fold, and its helpers in
        `src/chat/state/`
  - [ ] the work fold and the entry grouping in `src/chat/components/`,
        `turn-work.ts` and `transcript-entries.ts`
  - [ ] the place of each Mac command, `src/chat/device/placement.ts`
- [ ] Give the two placement modules distinct names, such as
      `item-placement.ts` and `command-placement.ts`.
- [ ] Make an insert generic over its content, so that the browser keeps
      its React nodes and the Worker passes data.
- [ ] Give the session log an envelope input that the stored envelopes of
      the Worker and the stream envelopes of the browser both meet.
- [ ] Change no expected value of a moved test.
- [ ] Update the imports, also in the test support of the Worker, and
      `src/shared/README.md`, the Key code of `src/chat/README.md`, and
      the links of `src/chat/transcript.md`.
- [ ] Run `npm run typecheck`, `npm run lint`,
      `npm run file-length:check`, and the chat tests.

## Milestone 4: Share the words of the chat lines

Depends on: 3

Each word and format that the copy shares with the chat moves to a pure
module that the Worker can import. The behaviour of the chat does not
change.

- [ ] Move the effort words and `modelLabel` from
      `src/chat/state/format.ts` to `src/shared/agents.ts`.
- [ ] Apply decision 217, option C:
  - [ ] Make `src/shell/ui/ModelPicker.tsx` and
        `src/shell/new-workspace/notices.tsx` import the effort words and
        `modelLabel` from `src/shared/agents.ts`. Remove the copies of the
        picker.
  - [ ] Make `docs/mockups/src/fixtures/agents.ts` import the shared
        effort words. Run `npm run mockups:check`.
  - [ ] Delete `plans/follow-ups/effort-words-copies.md`, and name it in the
        commit message. Update the **Related** line of
        `plans/follow-ups/new-workspace-effort-fallback.md`, which names it.
- [ ] Move `formatDuration` to a pure shared module.
- [ ] Move the words and rules that sit inside chat components to pure
      modules under `src/shared/transcript/`: the tool verbs of
      `ToolGroup.tsx` and its rule that opens a run with a call that is not
      done, the stop line of `TranscriptItem.tsx`, the words of
      `TurnEnd.tsx`, the fold counts, and the failure line.
- [ ] Keep the pure word modules of the mockup components in place, such
      as `lostCopy.ts` and `sizes.ts`.
- [ ] Update the READMEs that name a moved module.
- [ ] Run `npm run typecheck`, `npm run lint`,
      `npm run file-length:check`, and the chat tests.

## Milestone 5: The transcript route

Depends on: 2, 4

The workspace object serves the Markdown of a session, concise or full.

- [ ] Add the path of the route and the type of its reply to
      `src/shared/sessions.ts`.
- [ ] Build the Markdown in `worker/chat/`:
  - [ ] Read one page of the stored history of the session in each task
        of the workspace object, through one event number.
  - [ ] Fold the events with the shared session log. Place the Mac
        commands of the session. Group the entries.
  - [ ] Write the concise or the full text, as "The text" above says.
        Take the member names from D1 and the model names from the
        configured model list.
- [ ] Serve the route as a read. `worker/chat/backend.ts` runs each other
      chat request as one task. Run each page read of this route as its
      own task instead.
- [ ] Add unit tests of the builder with literal expected Markdown. One
      concise and one full transcript cover the heading lines, the member
      and agent headings, a fold line, the tool lines, a Mac command with
      output, a stop, a failure, a lost line, a path label that hides a
      secret, an attachment, and a running turn.
- [ ] Add route tests with local D1 and the workspace object:
  - [ ] A member of the org gets the Markdown.
  - [ ] A member of another org gets `404 workspace_not_found`.
  - [ ] A session of another workspace gets `404 session_not_found`.
  - [ ] An archived workspace gives the Markdown.
  - [ ] An unknown `detail` gets `400 invalid_input`.
- [ ] Update the routes, the access, and the Key code in
      `worker/chat/README.md`.
- [ ] Run `npm run typecheck`, `npm run lint`,
      `npm run file-length:check`, and the Worker chat tests.

## Milestone 6: The transcript call of the browser

Depends on: 5

The chat API asks for a transcript, and the copy service of the app takes
a text that is still pending.

- [ ] Add `transcript(sessionId, detail)` to the chat API in
      `src/chat/api/client.ts`, with its reader.
- [ ] Let `copy` of `AppServices` take a pending text. Write a pending
      clipboard item where the browser supports one. Else write the text
      when it comes.
- [ ] Keep the text of a refused write for one minute, for its session and
      its kind of copy. The next press of the same item writes it at once.
- [ ] Update the fake services in `src/app/test-kit.ts`,
      `src/app/dev/fake-services.ts`, and
      `src/shell/workspace/dev/main.tsx`.
- [ ] Add unit tests of the copy with a fake `navigator`: a pending item
      where the browser supports one, the text after the reply where it
      does not, a refused write that rejects, and a second press that
      writes the kept text.
- [ ] Serve the transcript in the fake backend of the chat development
      page, so that a smoke test can copy.
- [ ] Run `npm run typecheck`, `npm run lint`, and the app tests.

## Milestone 7: Copy items in the tab menu

Tags: ui

Depends on: 1, 6

The session tab menu copies the transcript, also in a read-only
workspace.

- [ ] Add Copy concise transcript and Copy full transcript to the menu of
      a session tab in `src/chat/components/useTabMenu.ts`, in the order
      and with the icons of the mockup.
- [ ] Mark each menu item that changes the workspace. In a read-only
      workspace, leave out the marked items.
- [ ] Open the menu of a session tab in a read-only workspace with only
      the copy items: on a right click, on Shift and F10, on the Menu key,
      and on a long press on a phone. A file or diff tab there opens no
      menu, and no tab drags.
- [ ] Add the chat action that asks for the transcript, copies the reply,
      and shows the toast. The shown tab does not change.
- [ ] Update the expected items of the tab menu tests in
      `TabMenu.dom.test.tsx`, `TabDrag.dom.test.tsx`, and
      `src/shell/workspace/files/FilesWiring.test.tsx`.
- [ ] Add DOM tests:
  - [ ] Copy full transcript asks for the full text, copies the reply,
        shows "Transcript copied", and keeps the shown tab.
  - [ ] A failed request shows "The transcript didn't copy. Try again."
  - [ ] A read-only workspace shows only the copy items, also after a
        long press on a phone.
- [ ] Run each new DOM test 10 times. Save the pass counts under
      `.context/copy-session-transcripts/`.
- [ ] Update `src/chat/tab-row.md` and `src/chat/README.md`.
- [ ] Smoke-test in Chrome with the app or the chat development page. Copy
      each kind from a tab that never showed, paste it, and compare it with
      the chat. Do it again in an archived workspace and in the phone
      layout. Save the evidence under `.context/copy-session-transcripts/`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7

- [ ] Run the targeted tests and the complete gate, `npm run check`.
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
      and the follow-up items that the change adds and deletes. It adds
      `tool-detail-called-output.md`, `new-workspace-effort-fallback.md`,
      and `copy-closed-session.md`. It deletes `effort-words-copies.md`.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, copy each kind of transcript in Safari, in
      Firefox, and in the Mac app, from a tab that never showed. Check
      that the clipboard holds the text.
