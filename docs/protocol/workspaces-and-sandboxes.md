# Workspaces and sandboxes

This doc holds the requirements and the decisions in force for workspaces
and their sandboxes. It also covers the number and the link of each
workspace. [Org image](org-image.md) covers the org image that every
sandbox starts from, and [Workspace tools](workspace-tools.md) covers the
tools of a workspace. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The provider

- Boat runs every sandbox (decision 2).
- Every sandbox and every org image of every org runs in the app's own
  Boat account (decision 80). That account pays for all use.
- No user needs a Boat account or a Boat key.
- A Boat key for each org was rejected. Users then needed their own Boat
  account, and the app had to name Boat to them.
- All orgs share the plan limits of the app's Boat account, such as the
  number of sandboxes at once and of starts in a day.
- [Access and security](access-and-security.md#the-apps-boat-key) states
  how the Worker keeps the app's Boat key.
- User-facing text never names Boat (decision 80). It says "cloud
  computer" or "sandbox". This holds in the app, the Mac app, the
  marketing site, Get started, and the legal pages.
- Reason: the user asked that the provider stays hidden, so that the app
  can move to another provider later.
- Each workspace has its own sandbox with its own clone of its repository
  (decision 4). One worktree for each workspace in a shared sandbox was
  rejected, because each workspace gets its own sandbox.
- Every sandbox has one machine size for now: Boat's default size, with
  4 vCPU and 8 GB.

## The org image

- [The org image](org-image.md#the-org-image) holds the requirements of
  the org image of an org, its builds, and its refreshes.

### The first build

- [The first build](org-image.md#the-first-build) holds the requirements
  of the first build of a new org and of its added build.

## Repository folders

- [Repository folders](repository-folders.md) gives the folder and the
  shell variable of each repository in a sandbox (decision 94).

## Startup script and env vars

- The startup script runs in the sandbox of each workspace at each start
  and at each resume.
- Bash runs the startup script.
- The startup script starts in the folder of the workspace's repository
  (decision 94).
- [Folder variables](repository-folders.md#folder-variables) says which
  scripts get the variable of each repository folder.
- Only an admin changes the install script, the startup script, the env
  vars, and the repositories (decision 57). Other members see them
  read-only.
- Each sandbox gets the org's env vars at create and at each resume
  (decision 17). A changed value applies at the next start.
- Builds and refreshes get none of the env vars, and no saved snapshot
  holds them. Reason: a saved snapshot keeps every file.
- The app gives each sandbox its values itself, because every sandbox
  starts with no secrets of a Boat environment.
- [Access and security](access-and-security.md#secrets-that-users-enter)
  says how the app keeps the values.

## Create a workspace

- [Create a workspace](create-a-workspace.md) holds the requirements of
  New workspace, as a page or as a dialog, and of the create, the branch,
  and a failed first start of a new workspace.

## Workspace numbers and links

- The workspace header omits the branch name on desktop and on a phone.
  Reason: this keeps the header compact.
- Each workspace has a number in its org (decision 212). The numbers of an
  org count up from 1, in the order in which its workspaces were created.
- The app never gives a number twice in one org. This holds also after a
  failed first start and after a Restore of the org.
- Reason: a person who said `W-12` must not find another workspace there
  later.
- The label of a number is `W-` and the number, such as `W-395`, in every
  org. Org initials before the number, such as `AC-395`, were rejected,
  because the label then changes when an admin changes the initials.
- A part of the workspace ID or of the branch name in place of a number
  was rejected, because people cannot easily say it.
- The label shows on the [Copy link](workspace-links.md#copy-link) button
  of the workspace header and in each [chip](workspace-links.md#chips). A
  [search of the command palette](command-palette.md#search) that matches
  the label shows it too.
- The rows of the workspace list show no label. A label in each row was
  rejected, because the names then lose room in the sidebar and on a
  phone.
- Each workspace has a link: the web address of its page at the app
  origin, such as
  `https://app.conductive.build/orgs/<org ID>/workspaces/<workspace ID>`.
- The link names the org and the workspace by their IDs, never by a number
  or a name. So the label and the name can change later (decision 212).
- The workspace record gives the number in `number` and the link in
  `link`. Copy link, the chips, and the agent tools use this link.
- Reason: the page of the Mac app runs on its own origin, and a sandbox
  does not know the app origin.

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

## The workspace menu

- [Workspace menu](workspace-menu.md) holds the requirements of the menu
  of a workspace row: Move to section, Reassign to, Rename, and Archive.

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
- Before it archives, the app checks the sandbox for changed files that
  are not committed and for commits that are not pushed.
- When the check finds such work, the question lists it. The user can then
  archive anyway or cancel.
- When the check does not finish, the question says so and names the
  failure. It offers Try again and Cancel.
- The app archives nothing without a finished check.
- Reason: an archive without the check can delete work that was never
  pushed.
- The pull request bar offers Archive after the merge, as
  [GitHub banner](github-banner.md#banner-states) says. The menu of a
  workspace row offers it too, as [Archive](workspace-menu.md#archive)
  says.
- An archived workspace has no file lists and no tools. A phone shows only
  its chat.
- [Orgs and members](orgs-and-members.md#members-and-roles) says who may
  archive a workspace.

## Tools of a workspace

- [Workspace tools](workspace-tools.md) holds the requirements of the
  tools of a workspace.

### Files and changes

- [Files and changes](workspace-tools.md#files-and-changes) holds the
  requirements of All files, Changes, and the file reports of the runner.

### Terminal

- [Terminal](workspace-tools.md#terminal) holds the requirements of the
  shell of a workspace.

### Port previews

- [Port previews](workspace-tools.md#port-previews) holds the
  requirements of the previews of the ports of a sandbox.

### Desktop

- [Desktop](workspace-tools.md#desktop) holds the requirements of the
  live desktop of a sandbox, which the app hides for now.
