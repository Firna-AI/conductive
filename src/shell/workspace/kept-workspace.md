# The kept workspace

This page is part of the [workspace screen](README.md) guide.

The tab keeps a `ShownWorkspace` for each workspace that it showed: its
`WorkspaceModel`, its `HeaderNotices`, and its `ChatController`.
`shownWorkspaces(app, user)` in `tab-memory.ts` gives the memory of
the `AppModel` of the tab, for the signed-in user.

- Each mount of the screen shows the kept parts through a new
  `WorkspaceView`, after the render, as [Integration](README.md#integration) says.
- An unmount closes the socket of the model and the socket of the chat.
  Each stream keeps its last event number.
- A return draws the kept header, notices, and chat at once. Then each
  socket asks only for the events after its own last event number.
- On a return, the model reads the workspace again, as at each open. The
  chat reads nothing again: no history, no session list, and no view.
- Each kept chat takes the account, the models, its org, and the members of
  the org from the app models, as its `sources`. So a login that the
  account screen saves, a new default model, or a new org name shows in
  the kept chat at once.
- A first show reads the members of the org when they are not ready, such
  as when no screen read them yet or an earlier read failed. A return reads
  no members.
- A kept detail that failed waits for the open of this view, with the
  spinner. So a return never shows an old failure.
- A chat load that ends while the screen is away opens no socket until the
  next mount.
- A sign-out, or a sign-in of another user, stops every kept workspace and
  forgets it.
- A workspace whose first start failed stays kept, in every tab and for
  every member. It shows the message that the start saved, its chat, and
  its queued messages. The bar of the failed start, with Try again, sits
  above the composer, which stays. Try again resumes the same workspace.
  [Creation recovery](../../app/creation-recovery.md#a-failed-first-start)
  gives the rules.
- A create that started keeps its start record. So a later error of its
  sandbox shows the sandbox bar with Try again in place of the composer,
  as a failed resume does.
- The tab also keeps the `ToolEvents` of each workspace. Each show makes
  them follow the stream of the model before it opens, as the notices do.
  They keep the revokes of previews, and give each tool the kept revokes
  first, then the live events.
- The tab also keeps the `WorkspaceSkills` of each workspace, the latest
  skill lists for the list of `/` of its chat. Each show makes it follow
  the stream of the model before it opens, as the tool events do. It
  loads until the first `skills.updated` event, and each later event
  replaces the lists. A report that the app cannot read keeps the last
  lists. `workspace-skills.test.ts` checks it.
- The tab also keeps the `WorkspaceFiles` of each workspace that it
  showed. The workspace screen connects it while it shows a workspace that
  is not archived, so a return shows the lists at once, and its socket asks
  only for the events after its last event number. `KeptFilesConnection`
  owns the one connection, on desktop and on each tab of a phone. The
  Files part, the file pages, the chat, and the pull request bar only read
  the store. The chat reads it for the list of `@` and the file chips, also
  on a phone before a visit to Files. A sign-out stops and forgets it with
  the other kept parts.
- Nothing goes to browser storage. So a reload or a new tab starts empty,
  and reads the stored history again.
- The memory has no size limit. It keeps each workspace that the tab
  showed until a reload or a sign-out.
