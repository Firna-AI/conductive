# Chat

The chat of a workspace: the session tabs with the session history, and the
chat of the open session with its composer. It shows messages, folded tool
calls, the running turn, steer, Stop, failures with Try again, the start
steps of the sandbox, and the bar that takes the composer's place while the
sandbox does not run. It builds against the fake API and the recorded chat
events of `src/test-support/`. Milestone 8i wires it to the Worker and the
agent runner.

## Use it in the app

```tsx
<WorkspaceChat
  orgId={orgId}
  workspaceId={workspaceId}
  fetch={appFetch}
  subscribe={openWorkspaceEvents}
  viewport={phone ? 'mobile' : 'desktop'}
  onWorkspaceChange={(workspace) => showInHeader(workspace)}
  onViewChange={(view) => keepTabs(view)}
  onOpenDiff={(path) => openDiffTab(path)}
  onConnectAgent={(agent) => openAccount(agent)}
  onAddBoatKey={() => openBoatKeyTab()}
/>
```

- `fetch` and `subscribe` must be stable functions. A new one starts a new
  chat, so give the component a module function or a memoized one.
- `subscribe(target, afterEventNumber, listener)` opens the stream of
  `workspaceEventsPath` after the event number. It gives each message to
  `listener.message`, the stored history first, and calls `listener.closed()`
  when the connection drops. The chat checks each message as `unknown`.
- The chat reads the signed-in user from the account route and the members
  of the org from the members route. A stopped turn then says "You stopped
  the agent" to the member who pressed Stop, and names that member to the
  others. When the members do not load, it names nobody but the reader.
- `onWorkspaceChange` gets the workspace record after each change: its state,
  and the title that the agent writes through `workspace.title` and
  `workspace.updated` events. The header and the list of the app show it.
- Each tab shows the `title` of its session record. The backend provides
  the titles that the mockups show: the first session of a new workspace
  has the workspace name, and the agent's title renames both. The
  development page does the same.
- `extraTabs` takes `<li>` tabs, such as open files, after the session tabs.
- Render the chat inside the Firna theme provider and the Graphite token CSS
  of `docs/mockups/src/theme.ts`, as `dev/main.tsx` does.
- The chat sets no CSS position. A dialog or a sheet covers the nearest
  positioned frame: the app frame.
- `useChatController` gives the controller and its snapshot to an app that
  composes `SessionTabs` and `SessionChat` in its own layout. Such an app
  takes the tabs from `tabSessions`, and the session history from
  `historySessions` with the times of `endedAt`, so an archived workspace
  navigates without a write.

## Rules for this code

- The stream cursor spans the whole workspace: every session, file, and
  workspace event. It drops a resent event, holds an event after a gap until
  the gap fills, and ignores the events of another workspace.
- Each session keeps its own event log. A session that opens later loads its
  full stored history, whose numbers can be older than the stream's cursor,
  so a history never goes through the stream's duplicate check.
- Browser readers preserve the required tool-detail and turn-file omission counts.
  These new counts are non-negative safe integers. Missing counts make an event unreadable.
- Tool transcript items keep `tool.omittedDetailBytes`.
  `Transcript.turnCompletions` keeps each completion event by turn ID, including stopped completions and `omittedFileCount`.
- A tool call shows the size of output that the runner left out, such as "1.2 MB left out".
  A folded run of calls shows the total of its calls' current counts, so a finished run still names it.
- A finished turn ends its file list with the files that the runner left out, such as "47 more files".
  A stopped line adds the count of its stopped completion: "You stopped the agent · 5 changed files not listed".
  The counts come from `turnCompletions`. A zero count shows nothing.
- Each refusal marker of a session becomes one `lost` item at its place among the events, which shows one line.
  The transcript keeps the marker only in that item. A repeat of the same marker replaces its item.
  The line names the lost data and the reason in plain words, and never the stream, number, or event type.
  Nullable turn context stays intact. Markers without a session stay outside per-session logs.
  The chat keeps no marker without a session. The browser shows nothing after the first loss, as decision 96 requires.
  A notice beside the data shows only when the fresh full report that repairs it is lost too. The chat builds no such notice.
- A refused `turn.completed` or `turn.failed` ends the turn that its marker names.
  Its running calls show as stopped, its Stop request clears, and no time, files, or Try again appear.
  A marker of a turn that was not running, or without a turn, ends nothing.
- `Transcript.newestTurnId` names the newest turn, from its accepted turn events and from a refused end that names a turn.
  Try again shows only on the failed item of that turn, when no turn runs.
  A later line of a lost event keeps it. A newer turn takes it away, also when the end of that turn was lost.
- Ordered history folding preserves these fields and lines across completion and failure events.
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
- Each draft has an identity. When a model of the other agent moves the draft
  to a new session, its files that still upload and its send in flight
  finish on the draft there.
- The chat chooses the ID of that new session, so the draft moves in the
  same snapshot that first shows the session, from the stream or from the
  reply. A later record or reply never moves a draft again, so a tab that
  the user types in keeps its text. The reply then removes the sent files
  that the backend did not keep from the draft that moved, wherever it is.
- A Stop request records the member who pressed Stop, and ends nothing. The
  turn ends when its end says stopped. A stop with no request names nobody:
  "The agent stopped".
- Session records and the workspace record carry no order from the server,
  so the chat counts a local version for each session and one for the
  workspace record with its start steps. A newer action or stream event wins
  over an older reply or rollback. So a Resume reply never hides a newer
  state from the stream, such as a failed start with its Try again. The steps
  after an action, such as a view save, the focus, or a free Resume button,
  still run when its reply is older.
- The chat loads the session list and the view, then the full history of the
  shown session, then the workspace and the session list again. The stream
  starts after the history's `throughEventNumber`, so no change between the
  reads and the stream gets lost.
- The chat writes no browser storage. The drafts stay in memory, and the
  server keeps the open tabs through the view route.
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

Run the page from the repository root:

```sh
npx vite --config src/chat/dev/vite.config.js --port 5181 --strictPort
```

Then open `http://127.0.0.1:5181/src/chat/dev/`. This Vite configuration
serves the page with React on the fake API alone, without the Worker and its
sign-in gate.

The address chooses the state. The first value of each option is the default:

| Option | Values |
| --- | --- |
| `scenario` | `history`, `running`, `steer`, `interrupted`, `failed`, `queued`, `first-turn`, `loss` (left-out output and files, lost events, and a lost turn end) |
| `workspace` | `existing`, `new` (Lisbon, which starts) |
| `state` | `ready`, `working`, `input` (needs input), `unread`, `starting`, `stopped`, `error`, `archived` |
| `role` | `admin`, `member` |
| `key`, `login` | `on`, `off` |
| `replay` | `stored`, `live` (the recorded chat arrives event by event) |
| `viewport` | `desktop`, `mobile` |
| `scheme` | `dark`, `light` |
| `clock` | `running`, `frozen` |

The desktop page keeps the mockup's columns, so the chat column is 718 px wide
in a 1440 px window. The buttons of the page make the sandbox ready, stop it,
fail its start, write the title, drop the connection, resend the last event,
and send two parts out of order. Writes of the page change the fake's state:
new sessions, rename, close, reopen, messages, steer, Stop, Try again, model
changes, uploads, Resume, and the view. A model change opens its session
under the ID that the chat chose. Stop and the close of a running tab
record the member of the `role` option as the one who pressed Stop. Stop
the sandbox ends a running turn with no Stop request.

## Tests

Run `npm run test -- src/chat`. The tests drive the controller and the stream
on `FakeApiServer` and the recorded events, and render the chat with
`react-dom/server`. `state/test-kit.ts` holds their helpers.

### Key code

- `WorkspaceChat.tsx`: the integration component and its callbacks.
- `useChatController.ts`: the controller of one workspace and its snapshot.
- `state/controller.ts`: `ChatController`, the public boundary of the chat
  state and its actions.
- `state/load.ts`: the order of the first reads and the stream start.
- `state/transcript.ts`: how chat events become the parts of a transcript.
- `state/session-log.ts`: the event log of each session.
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
- `components/TranscriptItem.tsx` and `components/LostEventLine.tsx`: each
  part of the chat, with the left-out counts and the plain words of a lost
  event from the mockups' `lostCopy.ts`.
- `components/SessionStatus.tsx`: the empty views and the history status of
  a session.
- `stream/workspace-stream.ts`: the cursor, the duplicate check, the gaps,
  and the reconnect of the workspace stream.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders, and the readers of their responses.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
- `dev/`: the development page, its fake writes, its scripted agent, and the
  `loss` scenario in `dev/dev-loss.ts`.

### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
