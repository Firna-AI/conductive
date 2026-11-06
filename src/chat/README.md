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
- `onWorkspaceChange` gets the workspace record after each change: its state,
  and the title that the agent writes through `workspace.title` and
  `workspace.updated` events. The header and the list of the app show it.
- `extraTabs` takes `<li>` tabs, such as open files, after the session tabs.
- Render the chat inside the Firna theme provider and the Graphite token CSS
  of `docs/mockups/src/theme.ts`, as `dev/main.tsx` does.
- The chat sets no CSS position. A dialog or a sheet covers the nearest
  positioned frame: the app frame.
- `useChatController` gives the controller and its snapshot to an app that
  composes `SessionTabs` and `SessionChat` in its own layout.

## Rules for this code

- The stream cursor spans the whole workspace: every session, file, and
  workspace event. It drops a resent event, holds an event after a gap until
  the gap fills, and ignores the events of another workspace.
- Each session keeps its own event log. A session that opens later loads its
  full stored history, whose numbers can be older than the stream's cursor,
  so a history never goes through the stream's duplicate check.
- The chat loads the session list and the view, then the full history of the
  shown session, then the workspace and the session list again. The stream
  starts after the history's `throughEventNumber`, so no change between the
  reads and the stream gets lost.
- The chat writes no browser storage. The drafts stay in memory, and the
  server keeps the open tabs through the view route.
- Reusable code imports no fixture data and no fake. Fixtures, replays, and
  stateful fakes live in `dev/` and in test files only.
- The parts reuse the mockup CSS modules and the mockup parts that are pure,
  so the app and the mockups look the same. A mockup part that imports
  fixture data or has no handlers has an interactive version here.
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
| `scenario` | `history`, `running`, `steer`, `interrupted`, `failed`, `queued`, `first-turn` |
| `workspace` | `existing`, `new` (Lisbon, which starts) |
| `state` | `ready`, `working`, `unread`, `starting`, `stopped`, `error`, `archived` |
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
changes, uploads, Resume, and the view.

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
- `stream/workspace-stream.ts`: the cursor, the duplicate check, the gaps,
  and the reconnect of the workspace stream.
- `api/client.ts` and `api/read-*.ts`: the chat routes, through the shared
  route builders, and the readers of their responses.
- `components/`: the tabs, the chat, the composer, the model picker, and the
  overlays. `ui/`: interactive buttons, menus, sheets, and dialogs.
- `dev/`: the development page, its fake writes, and its scripted agent.

### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
