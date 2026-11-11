# Life of a workspace

This doc holds the requirements and the decisions in force for the life of a
workspace. It covers the create, the start steps, the time limits, the
states, the stop and resume, the archive, and the restore of a workspace.
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
  [Stop and resume](#stop-and-resume) says. After a failed restart near day
  14, the app stops the sandbox again. The workspace stays stopped, or
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
- Archived workspaces sit in the Archived group at the end of the list.

### The list mark

- The list mark of a workspace is a grid of 3 × 3 cells. It shows in the
  list, in the rows of the command palette, and in the chips. It means the
  same in each place.
- Its colour gives the [GitHub state](github-banner.md#the-github-state)
  of the workspace (list mark decision 1). It is red when the checks
  failed, amber while they run, green when they passed, and purple after
  the merge.
- Without a GitHub state, the mark is dim grey.
- A mark shape for each state was rejected for the list. Reason: the list
  and the pull request bar can then disagree, and the user wants the
  checks at a glance.
- The motion of the mark shows whether the agent works (list mark
  decision 1). A light runs around the outer ring of cells while the agent
  works. The whole mark pulses slowly while the agent needs input. In each
  other state, the mark is still.
- Reason: the pulse keeps needs input in the list, as decision 68 requires.
  A still middle column for needs input was rejected, because the user
  asked for a mark of one full colour.
- With reduced motion, the ring stays lit while the agent works. The middle
  column stays lit while the agent needs input. The other cells stay dim,
  so the state of the agent stays visible without motion.
- Bold text alone marks unread output. A green mark for unread output was
  rejected, because green means passed checks.
- An archived workspace shows a fainter grey mark, whatever its GitHub
  state. Reason: a chip of an archived workspace must show the archive, as
  [Chips](workspace-links.md#chips) says.
- In each place, screen readers hear the GitHub state in words before the
  state, such as "Checks failed, Working". Reason: only the colour shows
  the GitHub state. For an archived workspace, they hear no GitHub state.
- A change of the GitHub state does not change the activity time of the
  row.

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
- Opening a file tab or a diff tab also resumes the sandbox, in the same
  cases as opening the workspace (decision 247). A click on a file, on its
  tab, or on a link to it opens the tab. A move back or forward to its
  address opens it too.
- Reason: the tab can show its file only from a running sandbox, so the
  open asks for the start. A tab that showed the stopped state, or an error
  with Try again, until a member pressed Resume was rejected, because the
  open of the tab already asks for the file.
- A message from `send_message` or `create_session` of the agent tools
  also starts the sandbox (decision 260). It does so in the same cases as
  an open, and with the same checks. These cases are a stopped workspace
  and a workspace whose later start failed, such as a failed resume.
- A failed first start keeps waiting for Try again, as
  [A failed first start](create-a-workspace.md#a-failed-first-start)
  says. An empty session from the agent tools starts nothing.
- Reason: every member can already start each workspace of the org with an
  open. A delegated task then runs while no member watches.
- A message that waits until a member opens its workspace was rejected.
  Its task could wait for hours, and the agent that sent it would not learn
  why.
- A refusal of such a message was rejected, because it adds a refusal, and
  the agent must then ask a member to open the workspace.
- Each such start counts toward the starts that all orgs share, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says.
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
- An archived workspace gets this restart only when Boat's 14 days end
  before the app deletes its sandbox, as [Archive](#archive) says. So a
  sandbox that Archive stopped gets none.
- The restart of an archived sandbox gets none of the secrets of its
  workspace and its org, and it runs no startup script. It only resumes the
  sandbox and stops it again.
- Reason: Archive revokes the workspace token, and an archived workspace
  has no tools.
- After a [Restore](#restore), the workspace gets this restart again, near
  day 14 of its last stop. When that time has passed, the restart runs at
  once.
- An automatic Archive near day 14 was rejected, because the delete 14 days
  after an Archive loses unpushed work. A copy of the disk in the app's own
  storage was rejected, because the app would then hold a copy of each
  user's code.

## Archive

- Archive keeps the sandbox of a workspace for 14 days, and stops it at
  once when it runs (decision 1 of PR #138). The chat stays read-only in
  the Archived group (decision 16).
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
- After Archive, a toast names the workspace and offers Restore.
- The bar of an archived workspace gives the day of the Archive. Until
  Restore ends, the bar also gives the last day of Restore, with Restore.
- Restore ends 14 days after the Archive. The app then deletes the
  sandbox, with its files and its agent sessions. The chat stays read-only
  in the Archived group.
- The end of Restore does not wait for the delete. While the delete still
  retries, the sandbox can still exist, but the workspace offers no
  Restore. Reason: the last day of Restore on the bar stays true.
- The bar says that the cloud computer is deleted only after the delete.
  Before that, it gives the day when Restore ended.
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
  [GitHub banner](github-banner.md#banner-states) says. The menu of a
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
- After its 14 days, an archived workspace offers no Restore, as
  [Archive](#archive) says.
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
