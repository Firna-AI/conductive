# Life of a workspace

This doc holds the requirements and the decisions in force for the life of a
workspace. It covers the create, the start steps, the time limits, the
states, the stop and resume, the archive, the restore, the removal from
the list after 14 days, and Continue of a workspace.
It belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md),
which covers the provider, the org image, and the startup script. The
terms are those of the
[architecture doc](../architecture.md#terms).

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A list mark
decision number, such as list mark decision 1, names the dated record of
one decision. That decision belongs to the change that adds the list mark.
Its plan keeps these records while the change is open. Its pull request
keeps them after the merge.

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
- The run of a pull request fetches that pull request, or its base branch
  after a merge.
  [The branch of a pull request run](base-branches.md#the-branch-of-a-pull-request-run)
  gives its steps.
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
  start steps do not show the time limit of the start.
- Reason: the user needs the start limit only when a start passes it, and
  that failed start names the limit. A note of the limit under the steps of
  each start was rejected, because it does not change what the user does.
- A build or a refresh that passes its time limit fails in the same way as
  after any other error. So the last good image stays, as
  [The org image](org-image.md#the-org-image) says.
- A start that passes its time limit fails in the same way as after any
  other error. So a failed create keeps its workspace in the error state,
  as [Create a workspace](create-a-workspace.md#a-failed-first-start) says.
  A failed resume shows the error state, as
  [Stop and resume](stop-and-resume.md) says. After a failed restart near
  day 14, the app stops the sandbox again. The workspace stays stopped, or
  stays archived.
- Each such failed build, create, or resume says that it passed its time
  limit.

## Workspace states

- Each workspace has one state: working, needs input, finished with unread
  output, ready, starting, stopped, or error.
- Needs input shows while the agent waits for the user, such as for help,
  an approval, or an answer (decision 68). The workspace header and its
  row in the list show it, in the web app and in the Mac app.
- The workspace header and the operator section give each state its own
  mark shape, so no state there depends on colour alone. Reason: they also
  show the state of the cloud computer. So the header can show ready beside
  a bar with failed checks.
- An archived workspace sits in the Archived group at the end of the list
  until its Restore ends, as [Archive](#archive) says.

### The list mark

[Workspace list marks](workspace-marks.md) gives the requirements and their reasons.

## Stop and resume

- [Stop and resume](stop-and-resume.md) holds the requirements of the stop
  of a sandbox without activity, its resume, the starts from the agent
  tools, and the restart near day 14 of a stop.

## Archive

- Archive keeps the sandbox of a workspace for 14 days, and stops it at
  once when it runs (decision 1 of PR #138). The chat stays read-only
  (decision 16).
- Archive runs no check of the work in the sandbox and asks no question.
  It works in each state of the workspace. It ends a start that runs.
- Archive revokes the workspace token. After a Restore, the next resume
  gives the sandbox a new token, as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.
- Reason: [Restore](#restore) brings an archived workspace back for 14
  days, so an Archive by mistake loses no work.
- A check for work that is not committed or not pushed was rejected,
  because it needs a running sandbox. The Archive of a stopped workspace
  would then wait for a start.
- After Archive, a toast names the workspace, gives the day when it leaves
  the list, and offers Restore.
- The bar of an archived workspace gives the day of the Archive and the
  day when the workspace leaves the list. Until Restore ends, the bar
  offers Restore until that day.
- The bar gives that day also when it offers no Restore, such as in a
  suspended org or without a kept sandbox. Reason: a workspace never
  leaves the list without a notice.
- Restore ends 14 days after the Archive. The app then deletes the
  sandbox, with its files and its agent sessions. The workspace leaves the
  Archived group and the list, as
  [Removed workspaces](#removed-workspaces) says (decision 518).
- The end of Restore does not wait for the delete. While the delete still
  retries, the sandbox can still exist, but the workspace offers no
  Restore. Reason: the last day of Restore on the bar stays true.
- The bar says that the cloud computer is deleted only after the delete.
  Before that, the bar of a removed workspace says that the cloud computer
  is being deleted.
- A sandbox that the app never deletes was rejected, because each archived
  workspace then uses about two starts a month for its restarts.
- A saved snapshot at Archive was rejected, because the stopped sandbox
  keeps the same files for 14 days at no cost. Past the included count, a
  saved snapshot costs a fee for each day.
- A check of the work before the delete, which keeps the sandbox when it
  finds work, was rejected. It misses the agent sessions and the ignored
  files. Each sandbox that it keeps also needs restarts with no end.
- A push of the work to a backup branch before the delete was rejected.
  The push shows as a push of the owner, and it can start the CI of the
  repository. It can also put files with secret values on GitHub.
- The pull request bar offers Archive after the merge, as
  [After the merge](github-banner.md#after-the-merge) says. The menu of a
  workspace row offers it too, as [Archive](workspace-menu.md#archive)
  says.
- An archived workspace has no file lists and no tools. A phone shows only
  its chat.
- [Orgs and members](orgs-and-members.md#members-and-roles) says who may
  archive a workspace.

## Restore

- For 14 days after the Archive, Restore brings an archived workspace back
  with its files and its agent sessions (decision 1 of PR #138).
- The toast after Archive, the bar of the archived workspace, and its row
  in the Archived group offer Restore. The command palette offers Restore
  workspace, as [Actions](command-palette-actions.md#actions) says.
- Restore puts the workspace back in its section, at its place in the
  list.
- The workspace comes back stopped, also when it had the error state at
  the Archive. Restore starts no sandbox.
- Reason: a resume already gives a new workspace token and fresh env vars,
  and it avoids a start that the user did not ask for. When that start
  fails, the workspace shows the error state with Try again.
- After a Restore from the open workspace, the tab shows the stopped state
  with Resume. A later open of the workspace resumes its sandbox, as for
  each stopped workspace.
- A repeat of a Restore changes nothing.
- After its 14 days, an archived workspace is removed and offers no
  Restore, as [Removed workspaces](#removed-workspaces) says.
- An archived workspace without a kept sandbox offers no Restore either.
  Reason: nothing is left to bring back.
- The app refuses a Restore after the 14 days, or without a kept sandbox,
  with HTTP 409. Its message says why.
- In a suspended org, nobody can restore a workspace, as
  [What members of a suspended org keep](operator-actions.md#what-members-of-a-suspended-org-keep)
  says. The bar of an archived workspace then promises only its chat
  history.
- [Orgs and members](orgs-and-members.md#members-and-roles) says who may
  restore a workspace.

## Removed workspaces

- An archived workspace is removed when its Restore ends, 14 days after
  the Archive (decision 518). It then leaves the workspace list, the count
  of the Archived group, and each group of the command palette.
- Reason: the Archived group then does not grow with no end, and no data
  is lost.
- The app deletes only the sandbox of a removed workspace, as
  [Archive](#archive) says. It keeps all the other data: the record of the
  workspace, the chat history of its sessions, and the files attached to
  its messages. They stay until the org is deleted, as
  [Delete org](delete-org.md) says.
- A delete of the chat and the files, at the end of the 14 days or later,
  was rejected (decision 518). An org setting for the days in the list was
  left out, because the list follows the end of Restore.
- A removed workspace keeps the state archived. So each rule of an
  archived workspace holds for it, unless a rule says otherwise for a
  removed workspace.
- Every archived workspace is removed at the end of its 14 days, also in a
  suspended org and without a kept sandbox. Reason: the removal loses no
  data, so no case needs an exception.
- The removal does not wait for the delete of the sandbox, as the end of
  Restore does not.
- An open list leaves the workspace out from the end of its Restore, also
  without a reload.
- No action puts a removed workspace back in the list.
- Only a direct link opens a removed workspace (decision 519). A workspace
  link, its chip in a chat, a session link, and the run row of a routine
  still open its read-only chat.
- Reason: a link names the workspace by its ID, and the chat of the
  workspace stays.
- While a removed workspace is open, no row of the list is selected, and
  the Archived group does not open for it.
- The agent tools read a removed workspace by its ID. Their workspace list
  leaves it out unless the call asks for it, as
  [List the workspaces](workspace-calls.md#list-the-workspaces) says.
- A link that shows only that the workspace was removed, with agent tools
  that act as if it does not exist, was rejected (decision 519). A link in
  a chat would then lead nowhere.
- A Removed view or filter in the list was rejected too, because the list
  then keeps the old archives that the removal takes out. A group of
  removed workspaces in the search of the palette was left out, as
  [Tabs and groups](command-palette.md#tabs-and-groups) says.
- The bar of a removed workspace has the title "Removed on" and the day of
  the removal. It says that the workspace left the list, and that the chat
  is read-only. It gives the state of the cloud computer, as
  [Archive](#archive) says.
- The file and tool panels of a removed workspace have the title Removed.
- The header and the chips of a removed workspace keep the word and the
  mark of Archived. Reason: its state stays archived, also in the agent
  tools.
- The app says that the workspace is removed, and never that it is
  deleted (decision 520). Only its cloud computer is deleted. Reason: the
  app keeps the data, and "deleted" can read as a promise that the data is
  gone.
- "Deleted" with a note on the Privacy page was rejected for that reason.
  So was "deleted" with a real delete that an admin asks for. The title
  "Archived on" with a line on the day when the workspace left the list
  was rejected, because a reader can miss the change of state.

## Continue

- After the merge of its pull request, Continue moves a workspace to a new
  branch from the latest default branch. The workspace keeps its sandbox
  and its sessions (decision 223).
- [Continue](continue.md) holds its requirements: who may continue, when
  Continue runs, its check for local work, the new branch, and the
  sessions after it.
