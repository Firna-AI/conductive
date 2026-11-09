# Creation recovery

This guide belongs to [Web app: data and composition](README.md). It says
how a tab keeps the first message of a create when the create request
fails, and what a failed first start leaves. The server side of a failed
create is in the
[lifecycle README](../../worker/lifecycle/README.md#browser-routes).

## A failed create request

- `NewWorkspaceModel.send` sends the draft of the form. When the request
  fails, the client knows only that it got no answer that it can use: the
  server can also have taken the message before its answer got lost. The
  form keeps the text, the files, the message ID, the repository, and the
  model, and its state is `failed` with the `ApiError` of the request.
- The form shows "The workspace wasn't created" with the text of the
  error, as `CreateFailed` in `../shell/new-workspace/notices.tsx` says.
  Try again sends the same message ID.
- A 201 reply puts the new workspace in the list and opens its address.
  The form then empties, with a new message ID.

## A failed first start

- Once the server takes the message, the workspace exists. When its first
  start fails, the workspace stays in the list and at its address for every
  member, with its saved cause, its chat, and its queued messages.
- The workspace screen shows the bar of the failed first start above the
  composer, which stays, as
  [The kept workspace](../shell/workspace/kept-workspace.md) says. Try
  again is the Resume of that workspace, so it keeps the workspace ID.
- An open, or a return, resumes a stopped workspace and one whose later
  start failed. A failed first start waits for Try again, so each member
  sees its saved cause first, as `resumesAtOpen` says.
- A create that started keeps its start record. A later error of its
  sandbox has no failed step. So it keeps the sandbox bar with Try again
  in place of the composer, as a failed resume does.

## Another person

- `OrgModel.creations` is a `Creations` from `creations.ts`. It holds the
  life of the create requests of one org in this tab, in memory only.
- `AppModel` follows the boot. A sign-out, or a ready boot of another
  person, ends that life in every kept org.
- A send that still runs then ends at once: its form is idle and empty.
  Its late answer or failure changes nothing, and `send` gives `null`.
- An unsent draft keeps the rule of `OrgModel.newWorkspace`: it stays while
  the app is open.

## Tests

- `new-workspace-model.test.ts`: a failed create keeps the draft, and Try
  again sends the same message ID.
- `app-model.test.ts`: a change of person ends a send that runs, and the
  form then works for that person.
- `../shell/new-workspace/NewWorkspaceScreen.test.tsx`: the text of a
  failed create request, by its status.
- `../shell/workspace/FailedFirstStart.test.tsx` mounts the screens in
  happy-dom. It checks a failed first start in the tab that sent the create
  and for another member after a reload, and Try again in the same
  workspace.

## Key code

- `creations.ts`: `Creations` and `Lifetime`.
- `new-workspace-model.ts`: `send` with its `opened` callback.
- `app-model.ts`: the end of the creates at a change of person.
- `../shell/new-workspace/notices.tsx`: `CreateFailed`.
- `first-start.ts`: `failedFirstStart` and `resumesAtOpen`.
