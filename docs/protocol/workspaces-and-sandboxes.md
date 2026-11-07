# Workspaces and sandboxes

This doc holds the requirements and the decisions in force for workspaces
and their sandboxes. It also covers the org image that every sandbox starts
from, and the tools of a workspace. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The provider

- Boat runs every sandbox (decision 2).
- Every sandbox of an org runs on the Boat account of the org's Boat key
  (decision 46). [Orgs and members](orgs-and-members.md#the-boat-key) says
  who adds the key.
- User-facing text names Boat only on the Boat key screen and its tab, on
  the marketing site, and in Get started (decision 47). Everywhere else it
  says "cloud computer" or "sandbox".
- Reason: users learn before the sign-up that they need a Boat account,
  and the rest of the app can move to another provider later.
- Each workspace has its own sandbox with its own clone of its repository
  (decision 4). One worktree for each workspace in a shared sandbox was
  rejected, because each workspace gets its own sandbox.
- Every sandbox has one machine size for now: Boat's default size, with
  4 vCPU and 8 GB.

## The org image

- Each org has one org image that holds a prepared copy of every
  repository that the org chose (decision 13).
- One image for each repository was rejected, because each image costs
  its own saved snapshot and starts.
- The Repositories tab of the org settings chooses the repositories
  (decision 10). A change of the repositories takes effect at the next
  build.
- The install script prepares the image. It is a script, not a terminal
  session, and it runs only in a build.
- Bash runs the install script.
- The Cloud computer tab lists the operating system and software that the
  base image includes before the install script runs.
- "Build computer" starts a build. A build runs the install script on a
  copy of the image, with every chosen repository cloned (decision 12).
- A build replaces the org image only when it succeeds. A failed build
  keeps the last good image (decision 9).
- While a build runs, its log streams on the Cloud computer tab. New
  workspaces keep starting from the last good image.
- A failed build shows the end of its log and Try again. The Settings link
  of the sidebar then shows a mark.
- After the user saves a changed install script, the tab asks for a build,
  because the script runs only in a build.
- The Cloud computer tab lists the builds, each with its time, its result,
  and its length.
- A push to the default branch of a chosen repository refreshes the org
  image, at most once in 30 minutes. A daily timer refreshes it too.
- A refresh fetches the new commits of every chosen repository. It does
  not run the install script.
- Reason: a new workspace then needs only a small fetch. The limit of one
  refresh in 30 minutes saves starts, because each refresh is a start.

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

- New workspace opens an empty chat with a repository picker. The first
  message creates the workspace.
- The app accepts that message before the sandbox is ready, as
  [Chat and events](chat-and-events.md#messages) says.
- The create answers when the workspace and its first message are stored,
  before the sandbox starts (decision 91). The answer holds the workspace,
  its session ID, and the queued first message, so that the new workspace
  can show the live start steps.
- Reason: the new workspace then follows its start steps on its own
  events, as a resume does. A stream of the progress in the create request
  was rejected, and so was a failed create that stays as a workspace in
  the error state, because each is a larger build.
- A new workspace starts from the newest good org image. It then creates
  its branch in the folder of its repository.
- When the GitHub repository has no refs, such as branches or tags, the
  start first pushes an empty first commit to the default branch of the
  repository (decision 89). It then fetches that branch and creates the
  workspace branch from it.
- The push uses the GitHub user token of the sender of the current turn,
  as [GitHub tokens](access-and-security.md#github-tokens) says. No
  command and no Git config holds the token.
- A repository with any ref gets no first commit from the app.
- When another push reaches the repository first, the start keeps that
  push and fetches the default branch. The app never force-pushes.
- When the app cannot read the refs of the repository, or when the push
  fails and the repository stays empty, the start fails.
- Reason: the workspace branch starts from the default branch, and the
  Changes list compares with it, so that branch must exist on GitHub. A
  branch or a first commit only in the sandbox was rejected for that
  reason, and a refused start because it blocks work in a new repository.
- The branch name starts with the GitHub login that the workspace owner has
  at the create (decision 53).
- A city name and four random characters follow, such as
  `calummoore/lisbon-7k2q`.
- Reason: a GitHub login is unique, so the branches of each person stay
  together. A first name was rejected, because two people can share one.
- The workspace name starts as the city name.
  [Chat and events](chat-and-events.md#messages) says how the agent's title
  then renames it.
- When the sandbox of a new workspace does not start, the workspace does
  not stay. The events of the workspace first show the failed start and
  the error state. The app then removes the workspace and its token.
- The first message then goes back to the composer of the tab that sent
  it, and Try again sends it again. No failure loses the message or its
  attachments.
- Try again creates the workspace with a new workspace ID. The message
  keeps its message ID.
- After the removal, only the member who sent the first message can still
  get the events of the failed workspace. That member gets the stored
  events once, and the connection then closes.

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
- Opening a stopped workspace resumes its sandbox.
- When a sandbox stops while its workspace is open, the tab shows the
  stopped state with Resume (decision 11).
- A resume at once when the tab shows again was rejected. Resume avoids a
  start that the user did not ask for.
- While the sandbox is stopped, the chat history shows, and the stopped
  state takes the place of the composer.
- A start that fails shows the error state with Try again. The chat history
  stays.
- Near day 14 of a stop, the app starts the sandbox briefly and stops it
  again, so that Boat keeps its disk (decision 43).
- Reason: Boat can delete the disk of a sandbox that is stopped for more
  than 14 days, and a resume then fails.
- Each such restart uses a start and some minutes of the org's Boat
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
- Reason: an archive without the check can delete work that was never
  pushed.
- The pull request bar offers Archive after the merge, as
  [GitHub banner](github-banner.md#banner-states) says.
- An archived workspace has no file lists and no tools. A phone shows only
  its chat.
- [Orgs and members](orgs-and-members.md#members-and-roles) says who may
  archive a workspace.

## Tools of a workspace

### Files and changes

- All files shows every file of the branch as a tree. A small mark shows
  each added or changed file.
- A file opens as a tab in the centre column. Markdown shows rendered, with
  a switch to its source. Code shows with line numbers and syntax colours.
- The header of a file tab can copy and download the file.
- Reading a file has a size limit.
- The Markdown preview fills short table rows only up to 65,536 empty
  cells in one file. Then it shows the rest of the file as text
  (decision 88).
- Changes lists the files that the branch changes against the default
  branch. Its summary gives the number of changed files and the lines that
  they add and remove.
- A changed file opens its diff against the default branch as a tab.
- The agent runner watches the repository and reports both lists.
  Branch changes count uncommitted and untracked work too.
- Runner file reports hold at most 256 KiB, or 262,144 bytes, of compact UTF-8 JSON per event.
  This includes the event type, metadata, escapes, and delimiters. It excludes the runner envelope.
- The complete runner envelope also meets the
  [runner event limit](chat-and-events.md#the-agent-runner).
  Reason: paths have no fixed byte length, so an item count cannot bound an event.
- Full trees and branch changes lists use numbered parts of one revision (decision 76).
  Every path and entry stays whole. Each path appears once in the complete report.
- Tree reports and branch changes reports have independent revision sequences within one runner stream.
  A new stream starts both at revision 1 with full reports.
- Each part gives its revision, part number, and total part count as positive safe integers.
  Part numbers start at 1 and end at the fixed total part count.
- The runner sends parts in order from one consistent captured state.
  It does not interleave revisions of one report kind, including tree deltas.
- A single-part or empty report uses part number 1 and total part count 1.
  Each changes part repeats the full report's base branch and summary.
- The summary counts the complete list, rather than one part.
  The workspace joins entries in part order and uses the full report atomically.
- A report becomes complete only after every part is stored.
  The workspace keeps the last complete report while parts are pending.
- Parts never join across streams, report kinds, or revisions.
  A conflicting repeated part is invalid. An identical repeated part never counts twice.
- A resend keeps its stream, runner event number, and payload.
  A reconnect keeps pending parts. Confirmation of a part includes its durable assembly state.
- A refused part, a newer full report, or a new stream discards the incomplete report.
- A new full report has a newer revision than the last applied report of its kind.
  It can skip unapplied revisions to recover missing or refused data.
- After a refused tree report or tree delta, the workspace asks for one full file tree, as
  [Lost workspace updates](chat-and-events.md#lost-workspace-updates) says (decision 96).
  After a refused changes report, it asks for one full changes list.
- After the refused update, each part of that kind belongs to a replacement.
  The only exception is a remaining part of the refused report or of an earlier report.
- A stored new part 1 after the refused update starts a replacement, also at the revision of the refused report.
- An invalid part counts as a replacement unless its stream, revision, and part number show a remaining part.
  A tree delta is never a replacement, and it never ends or fails an open tree repair.
- Each tree delta holds at most 512 changes and meets the same 256 KiB event budget.
  A large update uses several deltas, each with the next consecutive tree revision.
- Reason: the count cap also bounds the tree work of each event.
- A delta applies only after its previous tree revision is complete.
  The runner increases the branch changes revision by 1 for each new full changes report.
- A browser file event and a browser file response contain complete reports.
  They never expose a runner part as a full tree or changes list.
- The runner reads one file or one diff on request. When the runner is not
  connected, a file read falls back to Boat's file read.
- The Durable Object keeps the last tree and the last changes, so both tabs
  still show them while the sandbox sleeps.
- Reason: Boat's API can run `git` and read files only while the sandbox
  runs, one request at a time, and with no live updates.

### Terminal

- The Terminal tab opens a shell in the sandbox, in the folder of the
  workspace's repository (decision 94).
- On a phone, a row of keys adds the keys that a phone keyboard lacks.

### Port previews

- The user opens a port preview by typing its port. The app does not
  discover ports.
- A preview shows in a frame inside the app, with an "Open in new tab"
  link. Reason: Safari blocks the cookies of the previewed app inside a
  frame.

### Desktop

- The Desktop tab shows the live desktop of the sandbox, where the agents
  use a browser. The user watches the agents there.

[Access and security](access-and-security.md) states how the terminal, the
previews, and the desktop stay safe.
