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

The history button follows the available closed sessions, as
[Sessions](../../docs/protocol/agents-and-sessions.md#sessions) says. The
tab menu of a session copies its link, and its transcript as Markdown,
also in a read-only workspace, as
[Session transcripts](../../docs/protocol/session-transcripts.md) and
[Session links](../../docs/protocol/agents-and-sessions.md#session-links)
say.

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
  copy={services}
  subscribe={openWorkspaceEvents}
  viewport={phone ? 'mobile' : 'desktop'}
  onWorkspaceChange={(workspace) => showInHeader(workspace)}
  onViewChange={(view) => keepTabs(view)}
  onOpenDiff={(path) => openDiffTab(path)}
  onOpenPage={(to) => navigate(to)}
  onConnectAgent={(agent) => openAccount(agent)}
/>
```

[Chat integration](integration.md) gives the rules of each prop and
callback of `WorkspaceChat`, its theme and its layers, the parts that
the Mac app shows outside the chat, and `useChatController`.

### A chat that the app keeps

[A chat that the app keeps](integration.md#a-chat-that-the-app-keeps)
says how `WorkspaceChatView` draws a controller that the app keeps: its
`show`, `hide`, and `stop`, its `sources`, and the workspace list of its
chips.

## Rules for this code

- [The tab row](tab-row.md) gives the rules of the one order of the
  tabs, the drag, the tab menu, and the scroll of the row.
- [Transcript rules](transcript.md) give the rules of the stream cursor,
  the session logs, the transcript items and their counts, the changed
  files that the cloud computer could not read, the end reason of a
  finished turn, the lost lines, the turns, the open run of tool calls of
  a running turn, the work fold of each ended turn, and Try again.
- [The work of a turn](../../docs/protocol/chat-and-events.md#the-work-of-a-turn)
  says what folds when a turn ends. It also says that the line of each fold
  stays in place when the user opens or closes it, also for a run of calls.
- [Chat Markdown](../../docs/protocol/chat-markdown.md) states the
  formatting of agent messages, with their headings and lists.
  [Chat tables](../../docs/protocol/chat-tables.md) states their tables.
  [Workspace links](../../docs/protocol/workspace-links.md) states the
  chips of sent messages and answers, and
  [File mentions](../../docs/protocol/file-mentions.md#files-in-answers)
  states the file chips of answers. [Agent text](agent-text.md) gives the
  rules of the code that formats them: the chips, and the heading, list,
  and table parts that the chat shares with the file preview and the
  mockups.
- [Loads, records, and sends](loads-and-sends.md) gives the rules of
  the history loads, the read-only chats, the order of the records, the
  sends, the fixed prompts of the pull request bar, and Stop with the line
  of each stop.
- [The message field](message-field.md) gives the rules of the message
  field of each composer. They cover its chips, the chips of attached
  files, the copy, the paste, and the drag. They also cover the drop of
  files on the message box, and the handle that inserts files.
- [Attached files of a draft](draft-files.md) gives the rules of the files
  of a draft in each composer. They cover the sources, the attach, refused
  files and folders, and the marks that hold the files. They also cover
  undo, the uploads, the send, and the end of the files.
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
  [names in the product](../../docs/protocol/agents-and-sessions.md#names-in-the-product):
  no "Claude Code", and no provider name.

## Development page

The [development page README](dev/README.md) gives the command that runs
the page, the options of its address, and what the page does. The page
shows the chat on a fake API with state, with no Worker. `npm run dev` also
shows the chat, in the whole app, with the limits that
[Run it](../app/README.md#run-it) gives.

## Tests

Run `npm run test -- src/chat src/shared/transcript src/shared/mention-text src/shared/attachment-mentions src/app/draft-marks.test.ts src/app/draft-files.test.ts`.
The tests drive the controller and the stream
on `FakeApiServer` and the recorded events, and render the chat with
`react-dom/server`. `state/test-kit.ts` holds their helpers.
`state/draft-files.test-support.ts` and
[`draft-files.test-support.ts`](../app/draft-files.test-support.ts) of the
app attach files and write their marks as the field does, with uploads
that wait for the test. The
[workspace screen](../shell/workspace/README.md#key-code) tests the kept
chat in the whole app.
[Chat tests](tests.md) says what each test file checks.

The Mac commands have their own [tests](device/README.md#tests), and a
check in the Mac app.

### Key code

[Chat key code](key-code.md) names the files, the types, and the
functions of the chat that a reader opens first. It covers the controller
and its state, the tab row, and the composer with its message field and
its drop of files. Its other entries are the links, the mentions, the
session links, and the attached files. It also
covers the transcript and its shared parts, the stream, the transcript
copy, the chat routes, the Mac commands, and the development page.


### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Chat Markdown](../../docs/protocol/chat-markdown.md): the formatting of
  agent messages, with their headings and lists.
- [Chat tables](../../docs/protocol/chat-tables.md): the tables of agent
  messages.
- [Agent runner](../../docs/protocol/agent-runner.md): the limits of the
  runner events, their refusal markers, and the late events of a turn.
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
