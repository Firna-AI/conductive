# Chat

The chat of a workspace: the session tabs with the session history, and the
chat of the open session with its composer. It shows messages, folded tool
calls, the running turn, steer, Stop, failures with Try again, the start
steps of the sandbox, the Mac commands of each turn, and the bar that takes
the composer's place while the sandbox does not run. The workspace screen
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

- `client` and `subscribe` must be stable. A new one starts a new chat.
  `client` is an `ApiClient`: `AppServices.api` in the app, or one from
  `createApiClient` over a fake.
- Each call of the chat goes through that client. A failure shows the
  message of its `ApiError`, such as the message of the Worker. A reply that
  a reader of the chat refuses shows "The request failed. Try again."
- `subscribe(target, afterEventNumber, listener)` opens the stream of
  `workspaceEventsPath` after the event number. In the app, it opens
  `AppServices.events`. It gives each message to `listener.message`, the
  stored history first, and calls `listener.closed()` when the connection
  drops. The chat checks each message as `unknown`.
- The chat reads the signed-in user from the account route and the members
  of the org from the members route, or it takes both from its `sources`,
  as [A chat that the app keeps](#a-chat-that-the-app-keeps) says. A
  stopped turn then says "You stopped the agent" to the member who pressed
  Stop, and names that member to the others. When the members do not load,
  it names nobody but the reader.
- `onWorkspaceChange` gets the workspace record after each change: its state,
  and the title that the agent writes through `workspace.title` and
  `workspace.updated` events. The header and the list of the app show it.
- Each tab shows the `title` of its session record. The backend provides
  the titles that the mockups show: the first session of a new workspace
  has the workspace name, and the agent's title renames both. The
  development page does the same.
- `extraTabs` takes `<li>` tabs, such as open files, after the session tabs.
- `host` takes the start steps and the sandbox bar that the app draws, as
  `ChatHost` in `components/SessionChat.tsx` says. The chat places them.
  Without a host, the chat draws both from its own record of the workspace.
- Render the chat inside the Firna theme provider and the Graphite token CSS
  of `docs/mockups/src/theme.ts`, as `dev/main.tsx` does.
- The chat sets no CSS position. A dialog or a sheet covers the nearest
  positioned frame: the app frame.
- The Mac app shows two more parts of Mac commands outside the chat:
  `ThisMacSection` and `AllowAllBar`. [The Mac commands](device/README.md)
  say how to mount them.
- `useChatController` gives the controller and its snapshot to an app that
  composes `SessionTabs` and `SessionChat` in its own layout. Such an app
  takes the tabs from `tabSessions`, and the session history from
  `historySessions` with the times of `endedAt`, so an archived workspace
  navigates without a write.
- `useChatController` makes the controller through the shared
  `useWorkspaceStore` hook of [the web app](../app/README.md). The hook
  starts the controller after the render. It stops the controller at
  unmount. When a new controller replaces it, the hook stops the old
  controller before the new controller starts.

### A chat that the app keeps

`WorkspaceChatView` draws a `ChatController` that the app keeps, such as
across the pages of a tab. It takes the props of `WorkspaceChat` other than
the connection. The app makes the controller with a stable `client` and
`subscribe`, and calls `show` and `hide` itself:

- The first `show` loads the chat, as `start` does. A `show` after a failed
  load loads it again.
- A later `show` opens the stream again after its cursor. So the chat shows
  at once, and it reads no history, no session list, and no view again.
- `hide` closes the stream while the app shows another page. The chat keeps
  its sessions, drafts, transcripts, and cursor. Actions and loads that run
  still finish.
- A load that ends while the chat is hidden opens no stream until the next
  `show`.
- `stop` ends the controller, as at a sign-out. Late replies then change
  nothing.

The app can also give the controller `sources`, a `ChatSources` from
`state/sources.ts`. It gives the account, the org, the models, and the
members from the models of the app.

- With sources, the load sends none of these four reads and writes none of
  these values. So no reply of an old read replaces a newer value of the
  app. The view read stays.
- Each change of a source shows at once, also while the chat is hidden. So
  a login that the account screen saves shows in a kept chat on a return.
- `start` copies the sources into the snapshot and follows them. `stop`
  ends the subscriptions. `hide` and `show` keep them.
- A chat without sources reads the four values at each load.

## Rules for this code

- [Transcript rules](transcript.md) give the rules of the stream cursor,
  the session logs, the transcript items and their counts, the lost lines,
  the turns, and Try again.
- The chat loads the history of each session that becomes the shown session,
  whatever changed the selection: a click, an action, or a record from the
  stream. One load runs at a time for each session, and a failed load waits
  for Try again or for the next selection.
- The status of the stored history comes from its load alone. A chat with
  content, such as live messages, a sent message, a running turn, or the
  start steps, keeps it and shows a failed load as a notice by the composer,
  with Try again. An empty chat shows the failure in place of the chat.
- An archived workspace keeps its chat read-only, and the backend refuses
  its writes. So its tabs change in the browser only. The session history
  opens the stored history of any session as a tab, and a tab closes with
  no write. A closed tab shows in the session history again, also the tab
  of a session that was open at the archive. The session records do not
  change, so a closed session stays closed. The controller's `select`,
  `requestClose`, and `reopen` take this path while the workspace is
  archived, and the server path otherwise.
- [Sessions, logins, and drafts](sessions.md) give the rules of the draft
  moves, the login of each session, and the linked sessions.
- A Stop request records the member who pressed Stop, and ends nothing. The
  turn ends when its end says stopped. A stop with no request names nobody:
  "The agent stopped".
- Session records and the workspace record carry no order from the server,
  so the chat counts a local version for each session and one for the
  workspace record with its start steps. A newer action or stream event wins
  over an older reply or rollback. So a Resume reply never hides a newer
  state from the stream, such as a failed start with its Try again. The steps
  after an action, such as a view save, the focus, or a free Resume button,
  still run when its reply is older. The retry message is the exception: the
  session log orders its records by event number, as the rules above say.
- The chat loads the session list and the view, then the full history of the
  shown session, then the workspace and the session list again. The stream
  starts after the history's `throughEventNumber`, so no change between the
  reads and the stream gets lost.
- The chat writes no browser storage. The drafts stay in memory, and the
  server keeps the open tabs through the view route. A kept controller
  lives only in the memory of its tab, so a reload or a new tab starts
  empty.
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
`components/TryAgain.dom.test.tsx` mounts the chat and presses Try again.
It checks the plain message of a refused retry in a tab that missed newer events.
`state/linked-replies.test.tsx` drives replies of Send and Try again that
name a linked session, in both orders, and two chats with different readers
on one fake stream. `components/SessionLogin.test.tsx` renders the login
line and its notices. `components/SourceLink.dom.test.tsx` presses the link
of a linked session to its open and its closed source. In an archived
workspace, it opens a linked session that closed before the archive from the
session history. Its source link writes nothing.

The Mac commands have their own [tests](device/README.md#tests), and a
check in the Mac app.

### Key code

- `WorkspaceChat.tsx`: `WorkspaceChat`, which owns its controller, and
  `WorkspaceChatView`, which draws a kept one, with their callbacks.
- `useChatController.ts`: the controller of one workspace and its snapshot,
  through `useWorkspaceStore`.
- `state/controller.ts`: `ChatController`, the public boundary of the chat
  state and its actions, with `show` and `hide` for a kept chat.
- `components/SessionChat.tsx`: the chat of the open session, and
  `ChatHost`, the start steps and the sandbox bar that the app can draw.
- `state/load.ts`: the order of the first reads and the stream start.
- `state/sources.ts`: `ChatSources`, the app values that a kept chat
  follows in place of its own reads.
- `state/transcript.ts`: how chat events become the parts of a transcript.
- `state/session-log.ts`: the event log of each session, with the retry
  message of its newest record and `takeListed` for the session list.
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
- `state/archive-view.ts`: the tabs and the session history of an archived
  workspace, which change in the browser only.
- `state/model-moves.ts`: the draft move of a model change, in the snapshot
  that first shows the new session.
- `state/session-records.ts`: the local versions of the session records and
  of the workspace record.
- `state/session-login.ts`: whose login a message uses, from the session
  record and the reader, and the words of the line under the composer.
- `state/linked-replies.ts`: the message and the focus of a reply that names
  a linked session.
- `components/SourceLine.tsx`: the line that links a linked session to its
  source.
- `components/TranscriptItem.tsx` and `components/LostEventLine.tsx`: each
  part of the chat, with the left-out counts and the plain words of a lost
  event from the mockups' `lostCopy.ts`.
- `components/SessionStatus.tsx`: the empty views and the history status of
  a session.
- `stream/workspace-stream.ts`: the cursor, the duplicate check, the gaps,
  the reconnect, and the `hold` and `release` of the workspace stream.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders and the app's `ApiClient`, and the readers of their
  responses.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
- `device/`: the Mac commands. Their [README](device/README.md) names
  their key code.
- `dev/`: the development page, its fake writes, its scripted agent, its
  Mac, the `loss` scenario in `dev/dev-loss.ts`, and the `starter` option
  in `dev/dev-logins.ts`.


### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
