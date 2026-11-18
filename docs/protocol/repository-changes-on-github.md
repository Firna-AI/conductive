# Repository changes on GitHub

This doc holds the requirements and the decisions in force for a change of
a repository on GitHub: a new name or a new default branch. It belongs to
[GitHub banner](github-banner.md), which covers the GitHub App and its
webhooks. The [org image](org-image.md) and the
[repository folders](repository-folders.md) give the rules of builds and
folders that this doc uses. The terms are those of the
[architecture doc](../architecture.md#terms).

## Saved values

- The app saves the name and the default branch of each repository of an
  org. Screens, workspace starts, and the org image read the saved values.
- The GitHub App sends repository webhooks to the Worker. When GitHub
  renames a repository, or changes its default branch, the Worker saves
  the new value. It does so in each org that reaches the repository
  through the same install of the GitHub App. The user chose this on
  17 November 2026.
- So every member of an org sees the same name, the name on GitHub.
- Reason: the repository list adds the names of the repositories that a
  member's own GitHub token reaches. Without the webhook, a member with
  such a token saw the new name, and every other member saw the old name.
- A copy of the names from the list of each member was rejected. Reason: a
  read then changes saved data, and the copy happens only when a member
  with such a token opens the list.
- Other repository events, and an edit that keeps the default branch, change
  nothing.
- The Worker accepts a repository webhook only with a valid GitHub
  signature, as for every GitHub webhook.

## The org image

- A refresh copies each repository with the name and the default branch
  that the org image holds. So only a build takes in a new value.
- A change of a repository that the org image holds starts a build at once.
  The build runs for an admin who is not suspended, as an automatic refresh
  does. The user chose this on 17 November 2026.
- Reason: a refresh fails while the saved values differ from the values of
  the org image. Without the build, new workspaces start with old commits.
- A refresh that finds the repository by its ID, not by its name, was
  rejected. Reason: the checks that guard each copy of a repository then
  change, and the folder takes the new name only at a later manual build.
- The app starts no build when the newest build failed. The change then
  waits for Try again. Reason: the app starts no build by itself after a
  failed build (decision 12), as [The org image](org-image.md) says.
- While a job runs, the change starts no second job, as for an added
  repository.
- When the build cannot start, the Worker answers GitHub with an error.
  A new delivery of the same event then starts the build.

## Folders

- The build moves the folder of a renamed repository to its new name, as
  [Folders over time](repository-folders.md#folders-over-time) says. Its
  folder variable takes the new name too. The user chose this on
  17 November 2026.
- Reason: the folder name then matches the name of the repository in the
  app and on GitHub.
- Keeping the folder name of the earlier org image was rejected. Reason:
  the folder and the repository would then have two names.
- An install script or a startup script that names the old folder, or the
  old variable, fails after that build. An admin updates the script.
- Each existing workspace keeps its folders, as
  [Folders over time](repository-folders.md#folders-over-time) says.
