# Chat

The chat of a workspace: the session tabs with the session history, and the
chat of the open session with its composer. It shows messages, folded runs
of tool calls, the folded work of each ended turn above its answer, the
running turn, steer, Stop, failures with Try again, the start steps of the
sandbox, the Mac commands of each turn, and the bar that takes the
composer's place while the sandbox does not run. After a failed first start
of a new workspace, that bar sits above the composer, which stays. The workspace screen
of the app shell mounts it by default, as
[the workspace screen](../shell/workspace/README.md#the-chat-of-the-workspace)
says. It builds against the fake API and the recorded chat events of
`src/test-support/`.

## Use it in the app

The tab keeps one `ChatController` for each workspace that it showed. The
workspace screen draws it with `WorkspaceChatView`, as
[A chat that the app keeps](#a-chat-that-the-app-keeps) says. A part that
needs a chat of its own mounts `WorkspaceChat`, which makes, starts, and
stops its own controller:

```tsx
<WorkspaceChat
  orgId={orgId}
  workspaceId={workspaceId}
  client={services.api}
  subscribe={openWorkspaceEvents}
  viewport={phone ? 'mobile' : 'desktop'}
  onWorkspaceChange={(workspace) => showInHeader(workspace)}
  onViewChange={(view) => keepTabs(view)}
  onOpenDiff={(path) => openDiffTab(path)}
  onConnectAgent={(agent) => openAccount(agent)}
/>
```

[Chat integration](integration.md) gives the rules of each prop and
callback of `WorkspaceChat`, its theme and its layers, the parts that
the Mac app shows outside the chat, and `useChatController`.

### A chat that the app keeps

[A chat that the app keeps](integration.md#a-chat-that-the-app-keeps)
says how `WorkspaceChatView` draws a controller that the app keeps: its
`show`, `hide`, and `stop`, and its `sources`.

## Rules for this code

- [The tab row](tab-row.md) gives the rules of the one order of the
  tabs, the drag, the tab menu, and the scroll of the row.
- [Transcript rules](transcript.md) give the rules of the stream cursor,
  the session logs, the transcript items and their counts, the changed
  files that the cloud computer could not read, the lost lines, the turns,
  the work fold of each ended turn, and Try again.
- [The work of a turn](../../docs/protocol/chat-and-events.md#the-work-of-a-turn)
  says what folds when a turn ends. It also says that the line of each fold
  stays in place when the user opens or closes it, also for a run of calls.
- [Chat Markdown](../../docs/protocol/chat-markdown.md) states the
  formatting and the tables of agent messages. [Agent text](agent-text.md)
  gives the rules of the code that formats them, and the table parts that
  the chat shares with the file preview and the mockups.
- [Loads, records, and sends](loads-and-sends.md) gives the rules of
  the history loads, the read-only chats, the order of the records, the
  sends, and Stop.
- [Sessions, logins, and drafts](sessions.md) give the rules of the draft
  moves, the login of each session, and the linked sessions.
- [The Mac commands](device/README.md) hold the rules of the requests,
  their answers, and the settings of the Mac.
- Reusable code imports no fixture data and no fake. Fixtures, replays, and
  stateful fakes live in `dev/` and in test files only.
- The parts reuse the mockup CSS modules and the mockup parts that are pure,
  so the app and the mockups look the same. The shared CSS also limits a
  long menu or sheet, which then scrolls. A mockup part that imports
  fixture data or has no handlers has an interactive version here.
- Sizes, such as "12 KB" or "1.2 MB", come from `formatSize` in the mockups'
  `src/components/chat/sizes.ts`. The attached files, the left-out output,
  the mockups, and the composer of a new workspace share it. The chat keeps
  no size formatter of its own.
- User-facing text follows the
  [names in the product](../../docs/protocol/chat-and-events.md#names-in-the-product):
  no "Claude Code", and no provider name.

## Development page

The [development page README](dev/README.md) gives the command that runs
the page, the options of its address, and what the page does. The page
shows the chat on a fake API with state, with no Worker. `npm run dev` also
shows the chat, in the whole app, with the limits that
[Run it](../app/README.md#run-it) gives.

## Tests

Run `npm run test -- src/chat`. The tests drive the controller and the stream
on `FakeApiServer` and the recorded events, and render the chat with
`react-dom/server`. `state/test-kit.ts` holds their helpers. The
[workspace screen](../shell/workspace/README.md#key-code) tests the kept
chat in the whole app.
[Chat tests](tests.md) says what each test file checks.

The Mac commands have their own [tests](device/README.md#tests), and a
check in the Mac app.

### Key code

- `WorkspaceChat.tsx`: `WorkspaceChat`, which owns its controller, and
  `WorkspaceChatView`, which draws a kept one, with their callbacks.
- `useChatController.ts`: the controller of one workspace and its snapshot,
  through `useWorkspaceStore`.
- `state/controller.ts`: `ChatController`, the public boundary of the chat
  state and its actions, with `show` and `hide` for a kept chat.
- `state/tab-order.ts`: the pure row order, the places of the open
  sessions, and the move before or after a neighbour.
- `components/SessionTabs.tsx`: the tab row, with the session tabs of
  `components/SessionTab.tsx` and the tabs of `renderTab`.
  `components/tab-row.ts`: `RenderTab`, `TabDraw`, and `rowOf`, the tabs of
  the row in the saved order with their titles.
- `components/useTabDrag.ts`: the drag of the tab row: the drop place, the
  move, and the status. `components/TabDragParts.tsx`: the drop line and
  the lifted tab.
- `components/useTabMenu.ts` and `components/TabMenu.tsx`: the tab menu,
  its items, and its drawing at a point or in a sheet.
  `components/useTabMoves.ts`: the moves of the row, the focus after a move
  from the menu, and the words of the status.
- `components/row-scroll.ts`: the scroll of a full row, its fades, and the
  scroll of a drag near an end. `components/row-reveal.ts`: the place of a
  tab in the row, and the scroll that brings tabs into view.
  `components/tab-nodes.ts`: the elements of the tabs, which the drag, the
  scroll, and the menu share.
- `components/SessionChat.tsx`: the chat of the open session, and
  `ChatHost`, the start steps and the sandbox bar that the app can draw.
- `components/Composer.tsx`: the message box and its controls, with the
  steering prompt that [Messages](../../docs/protocol/chat-and-events.md#messages)
  states.
- `state/load.ts`: the order of the first reads and the stream start.
- `state/sources.ts`: `ChatSources`, the app values that a kept chat
  follows in place of its own reads.
- `state/transcript.ts`: how chat events become the parts of a transcript.
- `state/session-log.ts`: the event log of each session, with its records
  in event order and its newest record. The record owner keeps the logs private.
- `state/known-turns.ts`: the known turns, their order, their ends, and
  `retryItemId`, the one failed item that offers Try again.
- `state/placement.ts`: where an item goes in its turn, also a late one.
- `state/late-events.ts`: accepted events of a turn that has ended.
- `state/item-keys.ts`: the item IDs that later events of an item reuse.
- `state/refused-events.ts`: how a refusal marker becomes a line, and how a
  refused end ends its turn.
- `state/history.ts`: the shared history load of each session, and the
  watch that loads the history of each shown session.
- `state/drafts.ts`: the draft identity, its moves, and its work in flight.
- `state/archive-view.ts`: the tabs and the session history of a
  read-only workspace, which change in the browser only.
- `state/model-moves.ts`: the draft move of a model change, in the snapshot
  that first shows the new session. Its target becomes selected only while
  the source stays selected. A newer session, file, or diff tab stays selected.
- `state/session-records.ts`: the order of session records by event number,
  and the pending edits of a session. It publishes accepted records from
  replies, complete current lists, and event merges. `confirmSessions`
  establishes the current records before the shown session starts its history.
- `state/workspace-records.ts`: the order of the workspace record and its
  start steps and saved error by event number.
- `state/session-login.ts`: whose login a message uses, from the session
  record and the reader, and the login label in the composer.
- `state/linked-replies.ts`: the message and the focus of a reply that names
  a linked session.
- `components/SourceLine.tsx`: the line that links a linked session to its
  source.
- `components/TranscriptItem.tsx` and `components/LostEventLine.tsx`: each
  part of the chat, with the left-out counts and the plain words of a lost
  event from the mockups' `lostCopy.ts`.
- `components/turn-work.ts` and `components/transcript-entries.ts`:
  `foldedWork` finds the work of each ended turn that folds, as the
  [transcript rules](transcript.md) say. `groupEntries` makes the entries
  that the chat draws, and puts each insert at its place, also in a fold.
- `components/WorkFold.tsx` and `components/MessageLine.tsx`: the work fold
  of an ended turn with its steps, and the message line that grows to the
  full text. A message line with a table opens the table under the line.
- `components/agent-text.ts`: `textBlocks`, the paragraphs, lists, code
  blocks, and tables of an agent message, with `TextTable`, and
  `inlineParts`, its inline code and strong text.
  `components/AgentText.tsx`: `AgentText`, which draws them, and
  `AgentBlocks` and `InlineMarkdown`, which the message line shares.
- `components/ToolGroup.tsx`: a run of tool calls, with `FoldLine` and
  `CallLine`, which the work fold shares.
- `components/reading-place.ts`: the keeper of the reader's place, which
  `ChatPane` gives through `ChatKeeper`. While the reader is scrolled up, it
  keeps the top row in view in place for every change of size of the
  transcript. When that row folds away, the fold that took it keeps its
  place.
- `components/useFold.ts`: `useFold` opens and closes a fold on a click on
  its line, and gives the line to the keeper, also at the bottom of the
  chat, so the line keeps its place.
- `components/SessionStatus.tsx`: the empty views and the history status of
  a session.
- `stream/workspace-stream.ts`: the cursor, the duplicate check, the gaps,
  the reconnect, and the `hold` and `release` of the workspace stream.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders and the app's `ApiClient`, and the readers of their
  responses.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
- `components/send-key.ts`: `useSendKey`, the send key that the composer
  shares with the page and the dialog of New workspace in the app shell.
- `device/`: the Mac commands. Their [README](device/README.md) names
  their key code.
- `dev/`: the development page, its fake writes, its scripted agent, its
  Mac, the `loss` scenario in `dev/dev-loss.ts`, and the `starter` option
  in `dev/dev-logins.ts`. `dev/dev-answers.ts` holds the answers of the
  scripted agent, which the `answer` option chooses.


### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Chat Markdown](../../docs/protocol/chat-markdown.md): the formatting of
  agent messages, with their tables.
- [Agent runner](../../docs/protocol/agent-runner.md): the limits of the
  runner events, their refusal markers, and the late events of a turn.
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
