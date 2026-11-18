# Repository change

This doc holds the requirements and the decisions in force for a
repository change: the action that moves an existing workspace to another
repository of its org. A member starts it from the repository in the
workspace header. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md). The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
repository change decision number, such as repository change decision 1,
names a decision of the change that added this action.

## Terms

- **Old repository:** the repository of the workspace before the change,
  and its folder in the sandbox.
- **New repository:** the repository that the member picks, and its
  folder in the sandbox.

## A change in place

- A repository change moves the workspace to a new branch in the folder of
  the new repository (repository change decision 1 A).
- The workspace keeps its sandbox, with the files of every folder and its
  installed software. It keeps its number, its link, its name, its owner,
  its section, its sessions, and its chat. The agents keep their context.
- A workspace has one repository and one branch at a time. The new
  repository, its branch, and its base branch take the place of the old
  ones in the record of the workspace.
- The old branch, its pull request, and the local work in the old folder
  stay as they are. The change deletes nothing, on GitHub or in the
  sandbox.
- A run workspace of an automation can change its repository too. Its
  "Run of" line under the header stays, as
  [A run is a workspace](automation-runs.md#a-run-is-a-workspace) says.
- Reason: the change keeps the files, the context of the agents, the
  number, and the link, with no new start.
- These ways were rejected (repository change decision 1):
  - A reset to a new sandbox from the newest org image. The local work is
    lost, and the agents start without context.
  - A new workspace in the new repository with the same name, and an
    archive of this one. The number and the link change.
  - A new workspace that forks this sandbox. It needs one more start, and
    the number and the link change.
  - A change only while the workspace has no work. The member asked to see
    the work in a question, then to change.
  - A move back to an earlier repository that takes up the earlier branch
    of its folder. The Worker must then keep the earlier branch of each
    folder. A later change can add it when moves back are common.

## The menu

- The repository in the workspace header is a button, on desktop and on a
  phone. On a phone, it is in the line under the workspace name.
- Its menu lists the repositories that the org chose and that this sandbox
  holds, in the order of New workspace. The current repository has a
  check. The menu has no notes.
- A chosen repository that this sandbox does not hold does not show. This
  holds also for a
  [waiting repository](org-image.md#repository-changes)
  (repository change decision 4 G).
- When the app has no record of the folders of a sandbox, the menu lists
  only the current repository. Reason: the app knows no other folder of
  that sandbox.
- A pick of the current repository changes nothing.
- The app refuses a change to a repository that the org did not choose, or
  that this sandbox does not hold.
- Reason: such a repository is rare, because each new workspace starts
  from the newest org image. A member who needs it creates a new
  workspace.
- These ways were rejected (repository change decision 4):
  - A row that is off, with a note that says to create a new workspace.
    Also such a row that opens New workspace with that repository picked.
    The menu has no notes.
  - A clone of the repository into its folder at the change. It reverses
    two rejections in force: a clone after a start, as
    [Waiting repositories](create-a-workspace.md#waiting-repositories)
    says, and the install script only in a build. A folder added later
    also needs its own name rule.
  - Such a clone with a run of the install script. The script runs for
    every folder, can take minutes, and can change the other folders.
  - A new sandbox from the newest org image for this case only. The
    files, the local work, and the processes of the old sandbox are lost.
  - A helper sandbox from the newest org image that packs the folder for
    this sandbox. Each change costs one more start, and the work of the
    install script outside the folder does not come with it.

## Who may change the repository

- Every member of the org may change the repository of each workspace of
  the org (repository change decision 2 B).
- Reason: the change deletes no work, as Continue does not.
- These ways were rejected (repository change decision 2):
  - A change only by the workspace owner and the admins, as for Archive.
  - A change by every member, but only by the owner and the admins while
    the branch has an open pull request. It adds a second rule, and the
    menu and the Worker then need the state of the pull request.

## When the change runs

- The app refuses the change in an archived workspace and in a workspace
  of a suspended org.
- The app refuses the change while a turn runs in a session of the
  workspace. Reason: a folder change under a running agent can mix its
  edits into the new branch.
- The app refuses the change while Continue or Restart runs. While the
  change runs, the app refuses Continue, Restart, and Archive, and new
  turns wait until it ends. Reason: each of them changes the branch or the
  software under the change.
- When the agent runner of the sandbox cannot move to another folder yet,
  the app refuses the change with "Restart the software, then try again."
  Nothing stops (repository change decision 5 A). Reason: Restart installs
  the newest software, and a refusal stops no program without a warning.
- These ways were rejected (repository change decision 5):
  - A Restart that the change runs first. Each program that an agent
    started, such as a dev server, stops with no warning.
  - A menu that is off for such a workspace. The member does not learn
    why.
- A refused change keeps the workspace as it is. The member sees the
  reason.
- The change starts a stopped sandbox first, because the change runs in
  the sandbox.
- While the change runs, the repository button shows the progress and the
  name of the new repository.
- The change does not run the startup script. The next start or resume
  runs it in the new folder. Reason: the script can start services that
  already run.

## The question

- Before the change, the app checks for the work that the workspace stops
  following, and for the local work in the new folder (repository change
  decision 3 D).
- The work that the workspace stops following is:
  - the local work in the old folder: the changed files, also untracked
    files, and the commits that no remote branch holds, as Continue counts
    them
  - an open pull request of the old branch
  - the pushed commits of the old branch that its base branch does not
    hold
- A merged or closed pull request is not such work.
- When the check finds work, a question shows first. Its title is "Change
  repository?". It says that the workspace moves to a new branch of the
  new repository, and that nothing is deleted.
- The question gives two lists. The first list gives the work that stays
  with the old repository. The second list gives the local work in the new
  folder, which the change carries to the new branch. A list without work
  does not show.
- The member can press Change repository or Cancel. Cancel keeps the
  workspace as it is.
- Without such work, the change starts at once. Reason: the change deletes
  nothing, so the question says what the workspace stops following, not
  that work is lost.
- These ways were rejected (repository change decision 3):
  - A question that lists only the local work. The member can lose track
    of an open pull request with no warning.
  - A question without the local work of the new folder. The member then
    does not see the work that the change carries to the new branch.
  - A question before each change, also without work.

## The base and the new branch

- The change fetches the latest default branch of the new repository with
  the GitHub access of the member who changes the repository, as
  [Continue](github-tokens.md#continue) in GitHub tokens says.
- The new branch starts from that default branch. That default branch
  becomes the base branch of the workspace, as
  [Base branches](base-branches.md#the-base-branch-of-a-workspace) says.
- The name of the new branch follows the rule of Continue, as
  [The base and the new branch](continue.md#the-base-and-the-new-branch)
  says: the current GitHub login of the workspace owner, the name part
  from the workspace name, the version, and four new random characters,
  such as `calummoore/checkout-address-autocomplete-v2-9c1e`. This holds
  also when another member changes the repository.
- A repository change starts a new task, so it adds 1 to the number of the
  task, as Continue does.
- Reason: decision 53 keeps the branches of each person together, and the
  name part and the version say which work the branch holds, as for
  Continue.
- The changed files of the new folder move to the new branch. The commits
  of the new folder stay on their local branches.
- When Git cannot move these changed files to the new branch, the change
  stops. Reason: a forced move can lose work.

## The context folder

- The change first adds the rule `/.context/` to the local exclude file of
  the new folder. Then it copies the
  [context folder](repository-folders.md#the-context-folder) of the old
  folder into the new folder.
- A file of the new folder with the same path stays, and the copy skips
  it.
- The context folder of the old folder stays.
- When the copy fails, the change stops and names the reason. The copy
  comes before the new branch, so the workspace keeps the old repository
  and the old branch. Reason: a chip of an earlier attached file must open
  its copy, and a change that goes on without the copy loses that link
  with no notice.
- Reason: notes and attached files stay with the workspace, as the member
  asked. A skip loses no file. The rule comes first, so that Changes lists
  no copied file.
- So a chip of an earlier attached file opens its copy in the new folder.

## A failed change

- A failed change keeps the old repository and the old branch in the
  record of the workspace. The agents stay in the old folder.
- After a failure, a toast says "The repository didn't change." and names
  the reason.
- An example is a changed file of the new folder that clashes with the
  latest default branch. The toast then says to commit or discard the
  files and try again.
- A repeat of a change that already finished changes nothing more.
- A change can fail after Git moved the new folder to the new branch, for
  example when its record cannot be stored for 10 minutes. The new folder
  then keeps the new branch, and the record keeps the old repository.
  Reason: the change never runs Git again to undo a move, because an undo
  can lose the changed files that moved. A change that never ends would
  hold Continue, Restart, Archive, and each new message of the workspace.

## After the change

- The pull request bar starts again at the state without a pull request.
- The GitHub events of the workspace follow the new repository and the new
  branch.
- All files lists the new folder. Changes and each diff compare the new
  branch with the new base branch.
- Each session shows one note at the place of the change, as
  [What the chat shows](chat-and-events.md#what-the-chat-shows) says.
- Each session works in the new folder on the new branch, also a session
  that starts or reopens later. The agents keep their sessions and their
  context.
- Each later message to a session whose instructions name the old folder
  names the new folder and the new branch, as
  [The repository line](message-lines.md#the-repository-line) says.
- `CONDUCTIVE_REPOSITORY_DIR` names the new folder, as
  [Folder variables](repository-folders.md#folder-variables) says.
- Each new terminal starts in the new folder. A terminal that already
  runs keeps its folder. Each terminal tab attaches to the shell that runs,
  as [The shell](terminal.md#the-shell) says, so that shell keeps the old
  folder. A shell that starts after the change, such as after the member
  ends that shell, starts in the new folder.
- The change stops no program that an agent or a member started, such as
  a dev server. Such a program keeps working in the old folder, and its
  preview shows the old repository. Reason: the agent runner moves in its
  own process, and a stop of such a program can lose work with no
  warning.
- Each open file tab and diff tab of the old repository closes. Reason:
  its path is no longer a path of the workspace's repository.
