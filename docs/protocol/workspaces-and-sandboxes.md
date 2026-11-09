# Workspaces and sandboxes

This doc holds the requirements and the decisions in force for workspaces
and their sandboxes. It also covers the org image that every sandbox starts
from, and the tools of a workspace. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

These docs belong to this doc:

- [Repository folders](repository-folders.md): the folder and the shell
  variable of each repository in a sandbox.
- [Life of a workspace](workspace-life.md): the create, the start steps,
  the time limits, the states, the stop and resume, and the archive.
- [Tools of a workspace](workspace-tools.md): the files and changes, the
  terminal, the port previews, and the desktop.

## The provider

- Boat runs every sandbox (decision 2).
- Every sandbox and every org image of every org runs in the app's own
  Boat account (decision 80). That account pays for all use.
- No user needs a Boat account or a Boat key.
- A Boat key for each org was rejected. Users then needed their own Boat
  account, and the app had to name Boat to them.
- All orgs share the plan limits of the app's Boat account, such as the
  number of sandboxes at once and of starts in a day.
- [Access and security](isolation.md#the-apps-boat-key) states
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
  image, at most once in 30 minutes. A daily timer refreshes it too. Each
  automatic refresh needs an admin who is not suspended, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
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
- [Access and security](tokens-and-secrets.md#secrets-that-users-enter)
  says how the app keeps the values.

## Files and changes

- [Files and changes](workspace-tools.md#files-and-changes) states the
  file lists of a workspace and the file reports of the runner.
