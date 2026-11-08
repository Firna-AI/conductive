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
- Each kept workspace gives the events of its stream and a 404 of its open
  to the creates of its org, as
  [Creation recovery](../../app/creation-recovery.md) says. A failed create
  of this tab forgets its kept model, notices, and chat, so its streams
  never open again.
- In a tab without its form, a workspace whose create start failed shows
  the unavailable view. It says "This workspace is not available" and the
  message that the start saved, or "Its sandbox didn't start." when it has
  none, with All workspaces. It offers no Resume, and the list drops its
  row.
- A create that started keeps its start record. So a later error of its
  sandbox shows the sandbox bar with Try again, as a failed resume does.
- The tab also keeps the `ToolEvents` of each workspace. Each show makes
  them follow the stream of the model before it opens, as the notices do.
  They keep the revokes of previews, and give each tool the kept revokes
  first, then the live events.
- The tab also keeps the `WorkspaceFiles` of each workspace whose Files
  part showed. The Files part connects it while it shows, so a return
  shows the lists at once, and its socket asks only for the events after
  its last event number. A sign-out and a failed create stop and forget it
  with the other kept parts.
- Nothing goes to browser storage. So a reload or a new tab starts empty,
  and reads the stored history again.
- The memory has no size limit. It keeps each workspace that the tab
  showed until a reload or a sign-out.
