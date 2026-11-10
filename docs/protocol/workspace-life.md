# Life of a workspace

This doc holds the requirements and the decisions in force for the life of a
workspace. It covers the create, the start steps, the time limits, the
states, the stop and resume, the archive, and Continue of a workspace. It
belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md), which covers the
provider, the org image, and the startup script. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Create a workspace

- [Create a workspace](create-a-workspace.md) holds the requirements of
  New workspace, as a page or as a dialog, and of the create, the branch,
  and a failed first start of a new workspace.

## Start steps

- While a sandbox starts, the workspace shows each start step with its
  time, and the time since the start began (decision 20).
- The steps reach every open tab of the workspace as they happen.
- The steps are product steps, not the raw output of the provider.
- A new workspace shows steps such as the start from the org image, the
  fetch of the default branch, and the creation of the branch.
- A resume shows that the files come back as the user left them.
- The chat history shows at once while a sandbox starts. The files and the
  tools wait until the sandbox is ready.

## Time limits of builds and starts

- A build or a refresh of the org image has a time limit of 60 minutes
  (decision 128).
- A start of a workspace's sandbox has a time limit of 20 minutes. This
  holds at create, at resume, and at the restart near day 14 of a stop.
- Each time limit covers the whole build, refresh, or start, from the
  moment that it began. Progress and provider retries do not reset it.
- Reason: a time limit on the whole build or start ends it when it makes
  no progress, whatever the cause. A time limit for each script was
  rejected, because it does not end a wait for a cloud computer that never
  becomes ready.
- While a build runs, the Cloud computer tab shows its time limit. The
  start steps show the time limit of the start.
- A build or a refresh that passes its time limit fails in the same way as
  after any other error. So the last good image stays, as
  [The org image](org-image.md#the-org-image) says.
- A start that passes its time limit fails in the same way as after any
  other error. So a failed create keeps its workspace in the error state,
  as [Create a workspace](create-a-workspace.md#a-failed-first-start) says.
  A failed resume shows the error state, as
  [Stop and resume](#stop-and-resume) says. After a failed restart near day
  14, the app stops the sandbox again. The workspace stays stopped.
- Each such failed build, create, or resume says that it passed its time
  limit.

## Workspace states

- The workspace list shows one state for each workspace: working, needs
  input, finished with unread output, ready, starting, stopped, or error.
- Needs input shows while the agent waits for the user, such as for help,
  an approval, or an answer (decision 68). The workspace header and its
  row in the list show it, in the web app and in the Mac app.
- Each state has its own mark shape, so no state depends on colour alone.
  Bold text marks unread output.
- Archived workspaces sit in the Archived group at the end of the list.

## Stop and resume

- A sandbox stops after 30 minutes without user activity on its workspace
  and without a running agent turn (decisions 11 and 29).
- Activity is input in the tabs of the workspace, such as typing, clicks,
  and scrolling. Terminal input and requests to a port preview are
  activity too.
- An open tab alone is not activity. An open connection is not activity
  either, such as the live reload of a dev server.
- Reason: a forgotten tab must not keep a sandbox running, and a stop must
  not cut off real work.
- A stop ends every process in the sandbox. Its files and its agent
  sessions stay.
- Opening a stopped workspace resumes its sandbox. A workspace whose owner
  is suspended does not start, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
- When a sandbox stops while its workspace is open, the tab shows the
  stopped state with Resume (decision 11).
- A resume at once when the tab shows again was rejected. Resume avoids a
  start that the user did not ask for.
- While the sandbox is stopped, the chat history shows, and the stopped
  state takes the place of the composer.
- A start that fails shows the error state with Try again. The chat history
  stays.
- Near day 14 of a stop, the app starts the sandbox briefly and stops it
  again, so that Boat keeps its disk (decision 43). A workspace whose owner
  is suspended gets no such restart, as
  [Starts, stops, and builds](operator-actions.md#starts-stops-and-builds)
  says (decision 125).
- Reason: Boat can delete the disk of a sandbox that is stopped for more
  than 14 days, and a resume then fails.
- Each such restart uses a start and some minutes of the app's Boat
  account.
- An archive near day 14 was rejected, because it loses unpushed work. A
  copy of the disk in the app's own storage was rejected, because the app
  would then hold a copy of each user's code.

## Archive

- Archive deletes the sandbox of a workspace, and keeps its chat read-only
  in the Archived group (decision 16).
- Before it archives, the app checks the sandbox for local work: changed
  files that are not committed, also untracked files, and commits that no
  remote branch holds, on every local branch.
- When the check finds such work, the question lists it. The user can then
  archive anyway or cancel.
- When the check does not finish, the question says so and names the
  failure. It offers Try again and Cancel.
- The app archives nothing without a finished check.
- Reason: an archive without the check can delete work that was never
  pushed. After [Continue](continue.md), an earlier branch can still hold
  such commits.
- The pull request bar offers Archive after the merge, as
  [After the merge](github-banner.md#after-the-merge) says. The menu of a
  workspace row offers it too, as [Archive](workspace-menu.md#archive)
  says.
- An archived workspace has no file lists and no tools. A phone shows only
  its chat.
- [Orgs and members](orgs-and-members.md#members-and-roles) says who may
  archive a workspace.

## Continue

- After the merge of its pull request, Continue moves a workspace to a new
  branch from the latest default branch. The workspace keeps its sandbox
  and its sessions (decision 223).
- [Continue](continue.md) holds its requirements: who may continue, when
  Continue runs, its check for local work, the new branch, and the
  sessions after it.
