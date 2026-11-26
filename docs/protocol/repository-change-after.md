# After a repository change

This page belongs to [Repository change](repository-change.md).
It holds the requirements after a workspace moves to another repository.

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
- Each new terminal starts in the new folder.
- Each terminal tab attaches to the shell that runs, as
  [The shell](terminal-shell.md#the-shell) says. After the change, each idle
  shell in the old folder moves to the new folder with `cd` (repository
  change decision 12 B). A shell is idle when no command runs in it. The
  move clears a line that a member typed and did not send.
- A shell that runs a command keeps its folder. A shell in a folder outside
  the old folder keeps its folder too.
- Reason: the first terminal that a member sees after the change then
  works in the new repository, and no running command stops.
- These ways were rejected (repository change decision 12):
  - Each shell keeps its folder until the member ends it. The first
    terminal after the change then works in the old repository.
  - A new shell for each terminal. Each command that runs in an old shell
    then ends.
- The change stops no program that an agent or a member started, such as
  a dev server. Such a program keeps working in the old folder, and its
  preview shows the old repository. Reason: the agent runner moves in its
  own process, and a stop of such a program can lose work with no
  warning.
- Each open file tab and diff tab of the old repository closes. Reason:
  its path is no longer a path of the workspace's repository.
- Each skill tab stays open, and a temporary skill tab stays temporary.
  Reason: a skill tab names an agent and a skill, not a path of the
  repository. A skill that the list of its agent no longer holds after
  the change shows the notice of a removed skill, as
  [Notices](skill-tabs.md#notices) says.
