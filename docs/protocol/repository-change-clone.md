# A clone at a repository change

This page belongs to [Repository change](repository-change.md). It holds
the requirements of a repository change that clones the new repository
from GitHub. The change clones it when the sandbox does not hold it, as
[A repository that the computer does not hold](repository-change.md#a-repository-that-the-computer-does-not-hold)
says. Its terms and its decision names are those of Repository change.

- The next start or resume runs the startup script in the new folder, as
  [When the change runs](repository-change.md#when-the-change-runs) says.
- New workspace still clones no repository after a start, as
  [Waiting repositories](new-workspace-notices.md#waiting-repositories)
  says. Reason: a new workspace can wait for the build that prepares its
  repository. A workspace that already started keeps the org image that it
  started from.
- The question asks nothing new for a clone. The new folder holds no local
  work, so the question shows only for the work that the workspace stops
  following, as [The question](repository-change.md#the-question) says.
- The repository button shows the same progress as for each other change
  (repository change decision 9 A). Reason: a clone can take longer than a
  move, but that progress already covers a wait of unknown length.
- The clone fetches the new repository with the GitHub token of the member
  who changes the repository. It uses the same trusted fetch as the fetch
  of the default branch, as [Continue](github-tokens-worker.md#continue)
  in GitHub tokens says.
- The new folder gets every branch and every tag of the repository. Its
  remote `origin` names the repository on GitHub and fetches every branch,
  as in a folder from a build. Reason: Git commands, Changes, and agents
  then work the same in every folder.
- [Folders over time](repository-folders.md#folders-over-time) gives the
  name of the new folder and its variable, and when each process gets the
  variable. No other folder and no other variable changes.
- The new folder takes its name only when the clone is complete, with the
  new branch checked out. So a failed clone leaves no folder under that
  name. Reason: a partial folder under that name would look like the
  repository. A later try would then need another name.
- When the new folder has its name, the record of the folders holds it
  with its variable. A later failure of the change keeps them there.
  Reason: the record must match the disk, so that each later start gives
  the folder its variable.
- When the agent runner of the sandbox cannot add a folder yet, the app
  refuses a change that needs a clone. The refusal says "Restart the
  software, then try again." Nothing stops. Reason: repository change
  decision 5 A gives this rule for a runner that cannot move.
