# Chat

The chat of a workspace: the session tabs with the session history, and the
chat of the open session with its composer. It shows messages, folded runs
of tool calls, the folded work of each ended turn above its answer, the
running turn, steer, Stop, failures with Try again, the start steps of the
sandbox, the Mac commands and the secret requests of each turn, the stack
of the open requests above the composer, the needs-input mark of each
session tab that holds an open request, Explain with the marks and the
popover of each explanation, and the bar that takes the composer's place
while the sandbox does not run. After a failed first start
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
say. The tab menu of a file or diff tab copies its path, with the
`copyPath` that the host gives with the tab, as
[The tab row](../../docs/protocol/agents-and-sessions.md#the-tab-row)
says.

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

Add to chat in the menu of a row of the Files panel puts the chip of a
file or a folder into the message field of the session that the member
saw last, as
[Add to chat](../../docs/protocol/file-mentions.md#add-to-chat) says. The
shell asks the kept `ChatController` for it with `addToChat`. The
controller shows that session, or starts a new one when no session tab is
open, as [Add to chat](loads-and-sends.md#add-to-chat) says. Its message
field then puts the chip in as a pick from the list of `@` does, with
`FieldHandle.insertMention`, as [The message field](message-field.md)
says.

### A chat that the app keeps

[A chat that the app keeps](integration.md#a-chat-that-the-app-keeps)
says how `WorkspaceChatView` draws a controller that the app keeps: its
`show`, `hide`, and `stop`, its `sources`, and the workspace list of its
chips.

The shell gives the chat an optional picture reader through
`ChatMentions.pictures` in `mentions/MentionsContext.tsx`. The reader and
its types live in `../files/page/picture-reads.ts`. The shell gives it only
while the sandbox runs. It reads a real file path from the workspace tree
through the existing file client. With it, the Markdown image of a PNG,
JPEG, GIF, or WebP file of an answer shows as a picture, and without it
as its link, as
[Pictures in answers](../../docs/protocol/file-mentions-answers.md#pictures-in-answers)
says. [Pictures in answers](answer-pictures.md) gives the rules of the
code that draws them.

## Rules for this code

- [The tab row](tab-row.md) gives the rules of the one order of the
  tabs, the mark of the temporary tab, the needs-input mark of a session
  tab, the drag, the tab menu, and the
  scroll of the row, and the reader's place that each tab keeps. A move of
  the temporary tab to another place keeps it, and so does Keep open in its tab menu, through the `keep` that the
  host gives that tab.
- [Transcript rules](transcript.md) give the rules of the stream cursor,
  the session logs, the transcript items and their counts, the changed
  files that the cloud computer could not read, the end reason of a
  finished turn, the standard speed of a fast turn, the lost lines, the
  turns, the open run of tool calls of
  a running turn, the work fold of each ended turn, and Try again.
- [The work of a turn](../../docs/protocol/chat-and-events.md#the-work-of-a-turn)
  says what folds when a turn ends. It also says that the line of each fold
  stays in place when the user opens or closes it, also for a run of calls.
- [Chat Markdown](../../docs/protocol/chat-markdown.md) states the
  formatting of agent messages, with their headings and lists.
  [Chat tables](../../docs/protocol/chat-tables.md) states their tables.
  [Chat message lines](../../docs/protocol/chat-message-lines.md) states
  their lines in the work of a turn.
  [Chat links](../../docs/protocol/chat-links.md) states the links of sent
  messages and answers, and
  [Workspace links](../../docs/protocol/workspace-links.md) states their
  chips. [File mentions](../../docs/protocol/file-mentions-answers.md)
  states the file chips and the pictures of answers.
  [Agent text](agent-text.md) gives the rules of the code that formats
  them: the chat adapter on the shared Markdown parser, and the heading,
  list, and table parts that the chat shares with the file preview and the
  mockups. Its linked guides [Message lines](message-lines.md),
  [Text links](text-links.md), and
  [Pictures in answers](answer-pictures.md) give the message lines of the
  work of a turn, the links and the chips, and the pictures.
- The links of chat text open through the link opener of the app shell, in
  `../shell/ui/text-links.tsx`. The workspace screen gives it the pages of
  the app and the port previews of the workspace, as
  [Chat integration](integration.md) says. Outside that screen, each link
  opens a new tab.
- [Loads, records, and sends](loads-and-sends.md) gives the rules of
  the history loads, the read-only chats, the order of the records, the
  sends, the fixed prompts of the pull request bar, Stop with the line of
  each stop, and Add to chat of the Files panel.
- [The message field](message-field.md) gives the rules of the message
  field of each composer. They cover its chips, the chips of attached
  files, the copy, the paste, and the drag. They also cover the drop of
  files on the message box, and the handle that inserts files.
- [Attached files of a draft](draft-files.md) gives the rules of the files
  of a draft in each composer. They cover the sources, the attach, refused
  files and folders, and the marks that hold the files. They also cover
  undo, the uploads, the send, and the end of the files.
- [Sessions, logins, and drafts](sessions.md) give the rules of the draft
  moves, the login of each session, a personal login or the org login, the
  default login of a new session, and the linked sessions.
- [The Mac commands](device/README.md) hold the rules of the requests,
  their answers, and the settings of the Mac.
- [The request stack](#the-request-stack) below gives the rules of the
  stack of the open requests above the composer.
- [The secret requests](secrets/README.md) hold the rules of the requests
  for secrets, their answers, the runs, and the line of a late answer.
- [Explain](explain/README.md) holds the rules of Explain by a selection,
  its key, the marks of explanations, their menu, and the popover with its
  follow-up field.
- Reusable code imports no fixture data and no fake. Fixtures, replays, and
  stateful fakes live in `dev/` and in test files only.
- The parts reuse the shared parts and CSS Modules of the
  [shared UI](../ui/README.md) in `src/ui/`, which the mockups draw too. So
  the app and the mockups look the same. The shared CSS also limits a
  long menu or sheet, which then scrolls. A mockup part that imports
  fixture data or has no handlers has an interactive version here.
- Sizes, such as "12 KB" or "1.2 MB", come from `formatSize` in the shared
  `src/ui/components/chat/sizes.ts`. The attached files, the left-out
  output, the mockups, and the composer of a new workspace share it. The
  chat keeps no size formatter of its own.
- User-facing text follows the
  [names in the product](../../docs/protocol/agents-and-sessions.md#names-in-the-product):
  no "Claude Code", and no provider name.

## The request stack

[The request stack](../../docs/protocol/request-stack.md) states the
requirements. `components/WaitingRequests.tsx` draws the open Mac commands
and secret requests of the shown session, with the shared
`RequestStackFrame` of `src/ui/components/chat/`, which the mockups draw
too.

- `stackCards` of `components/request-stack.ts` orders the cards with the
  shared `stackEntries` of `src/ui/components/chat/requestStackOrder.ts`:
  the calls that wait first, then the late requests, each oldest first,
  with one card for each set of secrets, then the cards that this view
  cannot answer. A Mac command card takes an answer only where it shows
  its choices. A secret card takes one where the chat takes answers.
- A card of secrets keeps one key while requests for its set join and
  leave it, so `placeAfter` keeps it on top. `placeAfter` keeps the card
  on top while a request joins or leaves, shows the next card when that
  card leaves, and puts a new card that this view can answer on top of a
  card that it cannot answer.
- Previous and Next sit before the card, so the keyboard reaches them
  first. A press that shows the first or the last card moves the focus to
  the other button. The place is a polite live region.
- The stack holds the focus while any of its parts has it, also a sheet
  or a menu of a card. When the part that holds it leaves, such as a card
  after its answer, the focus moves to the card on top, or to the field of
  the composer when no card is left. So an answer in another view never
  takes the focus from the composer.
- Each session starts its own stack. The card on top starts at its top,
  and a value typed into a card leaves the page with the card when another
  card shows.
- The popover of an explanation shows the stack of its session too.
- The tab of each session that holds an open request shows the
  needs-input mark, as [the tab row](tab-row.md) says. One rule,
  `waitsForMember` of `state/open-requests.ts`, says whether a session
  holds one, for its tab and for the mark of its explanation. A Mac
  command that waits counts in every view, also in a browser, which cannot
  answer it. The history of a session holds only its own secret requests,
  so the chat also reads those of every session, at the start and after
  each reconnect, as [the secret requests](secrets/README.md) say. The
  read of the Mac commands already holds those of the whole workspace.

## Development page

The [development page README](dev/README.md) gives the command that runs
the page, the options of its address, and what the page does. The page
shows the chat on a fake API with state, with no Worker. `npm run dev` also
shows the chat, in the whole app, with the limits that
[Run it](../app/README.md#run-it) gives.

## Tests

Run `npm run test -- src/chat src/shared/transcript src/shared/mention-text src/shared/skill-text src/shared/attachment-mentions src/app/draft-marks.test.ts src/app/draft-files.test.ts src/shell/workspace/workspace-skills.test.ts`.
The tests drive the controller and the stream
on `FakeApiServer` and the recorded events, and render the chat with
`react-dom/server`. `state/test-kit.ts` holds their helpers.
`state/draft-files.test-support.ts` and
[`draft-files.test-support.ts`](../app/draft-files.test-support.ts) of the
app attach files and write their marks as the field does, with uploads
that wait for the test. The
[workspace screen](../shell/workspace/key-code.md) tests the kept
chat in the whole app.
[Chat tests](tests.md) says what each test file checks.

The Mac commands have their own [tests](device/README.md#tests), and a
check in the Mac app. Explain has its own [tests](explain/README.md#tests).

The placement of the model menu needs a real browser. The Electron check
[`chat-menu-clipping.spec.ts`](../../desktop/tests/chat-menu-clipping.spec.ts)
builds the development page and opens the real Model and effort menu in a
box that clips. It checks the choices outside the box, a pointer choice
of an effort in the submenu of Effort, the arrow keys, the submenu of All models beside the menu and level with
its row, and the focus return after Escape. Run
`npm --prefix desktop run test:electron -- tests/chat-menu-clipping.spec.ts`.

### Key code

[Chat key code](key-code.md) names the files, the types, and the
functions of the chat that a reader opens first. It covers the controller
and its state, the tab row, and the composer with its message field and
its drop of files. Its other entries are the attached files and the
workspace list of the chips. It also
covers the transcript and its shared parts, the stream, the transcript
copy, the chat routes, the Mac commands, and the development page. Its
linked guide [Text key code](text-key-code.md) names the links, the chips,
the mentions, the pictures, and the Markdown of chat text.


### Related docs

- [Chat and events](../../docs/protocol/chat-and-events.md)
- [Chat Markdown](../../docs/protocol/chat-markdown.md): the formatting of
  agent messages, with their headings and lists.
- [Chat tables](../../docs/protocol/chat-tables.md): the tables of agent
  messages.
- [Chat message lines](../../docs/protocol/chat-message-lines.md): the
  lines of agent messages in the work of a turn.
- [Chat links](../../docs/protocol/chat-links.md): the links of sent
  messages and answers.
- [Agent runner](../../docs/protocol/agent-runner.md): the limits of the
  runner events, their refusal markers, and the late events of a turn.
- [Workspaces and sandboxes](../../docs/protocol/workspaces-and-sandboxes.md):
  start steps, stop and resume, and archive.
- [Architecture](../../docs/architecture.md)
- [Mockups](../../docs/mockups/README.md): the visual spec.
- [Shared contracts](../shared/README.md) and
  [browser fakes](../test-support/README.md).
