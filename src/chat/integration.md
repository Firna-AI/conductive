# Chat integration

This guide belongs to [the chat](README.md). It gives the rules of the
props and the callbacks of `WorkspaceChat`, the hooks, and a chat that the
app keeps. [Use it in the app](README.md#use-it-in-the-app) shows how to
mount the chat.

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
  and the title that the backend gives it through `workspace.title` and
  `workspace.updated` events. The header and the list of the app show it.
- A new workspace and each new session have no name: the `name` of the
  workspace record and the `title` of the session record are null. The
  tabs, the session history, the line of a linked session, and the header
  and the list of the app then show "Untitled", from `nameLabel` in
  `src/shared/name-label.ts`, as
  [Workspace and session names](../../docs/protocol/agents-and-sessions.md#workspace-and-session-names)
  says. "New session" names only the action of +: its label, the heading
  of the empty chat, and the detail in the model picker.
- Each tab shows the `title` of its session record. The backend provides
  the titles that the mockups show. The title from the first message names
  the workspace and its first session, as
  [Messages](../../docs/protocol/messages-and-attachments.md#messages) says. Each
  other session takes the first line of its first message with text as its
  title, as [Sessions](../../docs/protocol/agents-and-sessions.md#sessions)
  says. A name that a member set never changes. The development page does
  the same.
- The rename field of a session with no title starts empty, with
  "Untitled" as its hint, so the label never becomes the name of the
  session. An empty field keeps the old name.
- `renderTab(tab)` renders a file or diff tab of the saved view, such as an
  open file. Its `title` is the name of the tab, as a screen reader reads
  it from the tab, with each secret value hidden, such as "app.ts changes"
  for a diff. The tab menu and the status of the row name the tab by it,
  and the chat takes no name from a path. Its `draw(draw)` draws the tab
  by the same name. For `draw.kind` `row`, it draws the tab at its place
  in the row: it spreads `draw.item` on the `<li>` of the tab and
  `draw.close` on the wrapper of its Close button, and gives
  `draw.link.ref` to the link of the tab. These hold the handlers, the
  classes, and the refs of the drag, of the tab menu, and of the scroll of
  the row. The ref of the link gives the tab the focus back after a move
  from the tab menu. For `lifted`, it draws the copy that a drag lifts
  above the page: the icon and the whole title, with no link and no Close.
  Without `renderTab`, the row shows only the session tabs, as on a phone.
  `components/tab-row.ts` holds these types.
- `onOpenDiff` gets the real path of a changed file of a finished turn. The
  chip of the file shows the label of its path, `displayPath`, which hides
  each secret value, as [Labels of paths](../files/labels.md)
  says.
- `mentions` gives the composer the files and folders of the workspace for
  the list of `@`, and the open of a file chip, as `ChatMentions` in
  `mentions/MentionsContext.tsx` says. `files` is a store of the kept file
  tree: the `WorkspaceFiles` of the Files screens fits it. `openFile`
  opens a file as a press in All files does, `showFolder` shows All files
  with a folder open, and `href` gives the address of the page of a chip.
  Without `mentions`, the composer has no list, and a message shows each
  mention as text, as
  [File mentions](../../docs/protocol/file-mentions.md) says.
- `onOpenPage` gets the page of a workspace chip in a sent message or an
  answer, such as `/orgs/acme/workspaces/<id>/files`, after a plain click.
  The app opens it in the same window. A click with a modifier key stays
  with the browser, as for each link of the app. Without `onOpenPage`, a
  chip is a plain link.
- `content` takes a page that the app shows in place of the chat of the
  open session, such as an open file. The session tabs and the overlays
  stay, and no session tab is the current one.
- The controller's `updateView(change)` changes the saved view with a
  change of the app, such as an open file tab or the list of the Files
  panel. It saves through the same writer as the session tabs, so a later
  write of the chat keeps the change. Until the load reads the view, it
  changes nothing, so the saved tabs stay. In a read-only workspace,
  archived or shown read-only by the app, it changes the view in the
  browser only, and sends no write.
- `host` takes the start steps and the sandbox bar that the app draws, as
  `ChatHost` in `components/SessionChat.tsx` says. The chat places them.
  `keepsComposer` keeps the composer under the bar, as after a failed first
  start. Without a host, the chat draws both from its own record of the
  workspace, with the message that the workspace saved for a failed start.
- `readOnly` says that the workspace takes no write, such as while its org
  is suspended. The app gives `WorkspaceContext.readOnly`. The chat then
  shows its history, as an archived workspace does, and the host's bar
  takes the place of the composer.
- Render the chat inside the Firna theme provider and the Graphite token CSS
  of `docs/mockups/src/theme.ts`, as `dev/main.tsx` does.
- The chat sets no CSS position, except on the message box of a composer,
  so the list of `@` lies just above the box. A dialog or a sheet covers
  the nearest positioned frame: the app frame. The lifted tab of a drag,
  and the tab menu on desktop, draw on `document.body` with a fixed
  position, because the row clips what it holds.
- The menus, the dialogs, and the sheets of the chat note themselves in
  the open layers of the app shell, from `../shell/ui/layers.ts`. So the
  key of the command palette closes an open menu, and does nothing while
  a dialog or a sheet is open. Outside the app, nothing notes them.
- The Mac app shows two more parts of Mac commands outside the chat:
  `ThisMacSection` and `AllowAllBar`. [The Mac commands](device/README.md)
  say how to mount them.
- `useChatController` gives the controller and its snapshot to an app that
  composes `SessionTabs` and `SessionChat` in its own layout. Such an app
  takes the tabs from `rowOf` with the sessions of `tabSessions` and the
  shown tab of `shownTab`, and the session history from `historySessions`
  with the times of `endedAt`, so an archived workspace navigates without a
  write.
- `useChatController` makes the controller through the shared
  `useWorkspaceStore` hook of [the web app](../app/README.md). The hook
  starts the controller after the render. It stops the controller at
  unmount. When a new controller replaces it, the hook stops the old
  controller before the new controller starts.

## A chat that the app keeps

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
`state/sources.ts`. It gives the account, the org, the models, the
members, and the workspace list of the org from the models of the app.

- With sources, the load sends none of these four reads and writes none of
  these values. So no reply of an old read replaces a newer value of the
  app. The view read stays.
- Each change of a source shows at once, also while the chat is hidden. So
  a login that the account screen saves shows in a kept chat on a return.
- `start` copies the sources into the snapshot and follows them. `stop`
  ends the subscriptions. `hide` and `show` keep them.
- A chat without sources reads the four values at each load.
- The workspace list gives the chips their workspaces, with the archived
  ones. The chat watches it from `start` or `show` until `hide` or `stop`,
  through `watchWorkspaces`, which the app connects to
  `OrgModel.watch('list')`. So the chips stay current on a phone, where no
  list is on the screen, and a hidden chat reads nothing. A chat without
  sources reads the list itself while it shows, with the wait of a shown
  list of the app, in `state/workspace-list.ts`.
