# Creation recovery

This guide belongs to [Web app: data and composition](README.md). It says
how a tab keeps the first message of a create until the new sandbox
starts. It also says how the message comes back when that start fails.
The server side of a failed create is in the
[lifecycle README](../../worker/lifecycle/README.md#browser-routes).

## The creates of a tab

- `OrgModel.creations` is a `Creations` from `creations.ts`. It keeps the
  admitted creates of one org in this tab, in memory only. Nothing goes to
  browser storage, and it opens no socket of its own.
- At a 201 reply, `NewWorkspaceModel.send` admits the sent draft as a
  `Submission`. It holds the workspace ID, the section, the text, the
  attachment records, the message ID, the repository, and the model. Then
  it calls `opened`, which goes to the new address. So the move and the
  forget of a failed create land in one render.
- The kept workspace of the shell gives each ordered event of its stream to
  `observe`. It gives a 404 of its open to `removed`, as
  [The kept workspace](../shell/workspace/README.md#the-kept-workspace)
  says.
- A running state ends a create well: `ready`, `working`, `input`, or
  `unread`. The server sets one only after the start is prepared and the
  runner is connected. The tab then forgets the create. `starting`,
  `stopped`, and `archived` keep it.
- An `error` state, or a 404 of its open, ends a starting create badly.
  `OrgModel.removeWorkspace` takes the workspace out of the list, and the
  create gets a form of its own: a `NewWorkspaceModel` made from its
  `Submission`.

## The returned form

- In the tab that sent the create, the address of the failed workspace
  shows that form. `WorkspaceRoute` in `../shell/OrgRoutes.tsx` draws it in
  `NewWorkspaceScreen`.
- The form starts in the state `not-started`: the server took the message,
  and the sandbox did not start. This state has no HTTP status. The form
  shows "The workspace wasn't created" with "Its sandbox didn't start. Your
  message is kept."
- The form keeps the text, the files, the message ID, the repository, and
  the model, also with later edits. The form of the section and its newer
  draft stay apart, and two failed messages of one section get two forms.
- Try again sends the same message ID. A reply with the failed workspace ID
  admits nothing, and the form goes back to `not-started`. A reply with
  another workspace ID admits the message, opens the new address, and then
  forgets the failed create.
- Only the first message of the create comes back in the form.

## Another person

- `AppModel` follows the boot. A sign-out, or a ready boot of another
  person, clears the creates of every kept org.
- The clear also ends the `Lifetime` of those creates. A send that still
  runs ends at once: its form is idle and empty. Its late answer or failure
  changes nothing, and `send` gives `null`.
- An unsent draft keeps the rule of `OrgModel.newWorkspace`: it stays while
  the app is open.

## Other tabs

- In a tab without the form, a workspace whose create start failed shows
  the unavailable view. It says "This workspace is not available" and "Its
  sandbox didn't start.", with All workspaces. It offers no Resume, and the
  list drops its row. `failedCreate` tells such a workspace: the state
  `error`, a `create` start, and a step in the state `failed`.
- A create that started keeps its start record. A later error of its
  sandbox has no failed step. So it keeps the sandbox bar with Try again,
  as a failed resume does.
- `OrgModel.removeWorkspace` keeps a removed workspace out of the list. A
  list answer that started before the removal does not bring it back. A
  later record of it from this tab does not bring it back either.

## Tests

- `creations.test.ts`: a failed start gives its message back in a form of
  its own. A create stays until its start succeeds, or until its open gets
  a 404.
- `new-workspace-model.test.ts` and `app-model.test.ts`: the returned form
  keeps its edits and files until another workspace takes the message. A
  change of person forgets the creates, and ends a send that runs.
- `../shell/new-workspace/CreateRecovery.test.tsx` mounts the screens in
  happy-dom. It checks the return to the form, also after a move away, and
  a retry that makes another workspace. It also checks the unavailable view
  of another tab.
- The browser harness has controls that fail a held create start, as
  [Harness controls](../../worker/chat/integration/outer-worker-tests.md#harness-controls)
  says. The Worker routes no attachment upload yet, so only the tests in
  this folder and `../shell/` cover the files of a returned form.

## Key code

- `creations.ts`: `Creations`, `Submission`, `Lifetime`, and
  `failedCreate`.
- `new-workspace-model.ts`: `send` with its `opened` callback, and the
  `not-started` state.
- `org-model.ts`: `creations` and `removeWorkspace`. `app-model.ts`: the
  clear at a change of person.
- `../shell/OrgRoutes.tsx`: `WorkspaceRoute`.
- `../shell/workspace/shown-workspaces.ts`: the events and the 404 of each
  kept workspace for the creates, and the forget of a failed create.
- `../shell/new-workspace/notices.tsx`: `CreateFailed`, with no HTTP error
  for `not-started`.
