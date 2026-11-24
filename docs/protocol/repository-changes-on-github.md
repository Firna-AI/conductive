# Repository changes on GitHub

This doc holds the requirements and the decisions in force for a change of
a repository on GitHub: a new name, a new owner, or a new default branch. It belongs to
[GitHub banner](github-banner.md), which covers the GitHub App and its
webhooks. The [org image](org-image.md) and the
[repository folders](repository-folders.md) give the rules of builds and
folders that this doc uses. The terms are those of the
[architecture doc](../architecture.md#terms).

## Saved values

- The app saves the name and the default branch of each repository of an
  org. Screens, pull requests, and builds read the saved values. A
  workspace start uses the values of the org image that it starts from.
- The GitHub App sends repository webhooks to the Worker. When GitHub
  renames a repository, or changes its default branch, the Worker saves
  the new values. It does so in each org that reaches the repository
  through the same install of the GitHub App. The user chose this on
  17 November 2026.
- So every member of an org sees the same name, the name on GitHub.
- A new default branch also moves the cloud target of each live workspace
  whose base follows that default, as
  [A new default branch on GitHub](base-branches.md#a-new-default-branch-on-github)
  says. A workspace with a stored base keeps its target.
- Reason: the repository list adds the names of the repositories that a
  member's own GitHub token reaches. Without the webhook, a member with
  such a token saw the new name, and every other member saw the old name.
- A copy of the names from the list of each member was rejected. Reason: a
  read then changes saved data, and the copy happens only when a member
  with such a token opens the list.
- The Worker reads the current name and default branch of the repository
  from GitHub, and saves those values. It does not save the values of the
  webhook.
- Reason: a webhook can arrive late, or again after a failure. Its values
  can then be older than a later change. A record of each saved webhook was
  rejected, because it does not help a webhook that arrives late.
- When two webhooks of one repository run at the same time, the saved
  values still end equal to the values on GitHub. A webhook saves only when
  no other save came after its read, and it reads GitHub again after its
  save.
- Reason: two reads can return in the wrong order. A lock across Worker
  instances was rejected, because the check and the second read give the
  same result in one place.
- Other repository events, and an edit that keeps the default branch, change
  nothing.
- The Worker accepts a repository webhook only with a valid GitHub
  signature, as for every GitHub webhook.
- When a read from GitHub fails, or the values do not settle after three
  tries, the Worker answers GitHub with an error. GitHub does not send the
  webhook again by itself. An owner of the GitHub App can send it again
  from the settings of the app.

## A move to another owner

- GitHub can move a repository to another account. The repository then
  gets a new owner in its name, and the install of the GitHub App of the
  new owner reaches it. GitHub sends the `transferred` repository webhook
  only to that install.
- The Worker handles this webhook as a rename. It also saves the new
  install for the repository, so that builds and pull request updates use
  it. The user chose this on 18 November 2026.
- The Worker does so only in an org that already uses the new install for
  another repository. Each other org keeps the old values until an admin
  chooses the repository again in Settings. Until then, its builds fail,
  and its workspaces and automations of the repository get no GitHub
  events.
- Reason: an org must not reach a repository through an install that no
  admin of the org chose. An admin chooses an install when the admin
  chooses one of its repositories in Settings.
- A move to the new install in each org that saves the repository was
  rejected, for the same reason.

## A missed repository webhook

- Push, pull request, check, and status webhooks also carry the name and
  the default branch of their repository. When these differ from the saved
  values, the Worker reads GitHub, saves the current values, and checks the
  org images, as for a repository webhook. The user chose this on
  18 November 2026.
- These webhooks also name the install that sent them. When it differs
  from the saved install, the repository moved, and the Worker follows
  the move as [A move to another owner](#a-move-to-another-owner) says.
  The same webhook then takes effect in each org that follows the move, as
  any webhook of the repository does.
- Reason: a repository webhook can fail, or never arrive. The next webhook
  of the repository then repairs the saved values, and webhooks stay the
  only trigger.
- When that read or save fails, the Worker only logs a warning. The
  original event still completes, and the next webhook checks again.
- A repository with no later webhook keeps the old values until a later
  change, or until the repository webhook is sent again.
- These ways were rejected:
  - A job that asks GitHub to send failed webhooks again. It cannot
    recover a webhook that GitHub never sent.
  - A daily read of every saved repository from GitHub. Its GitHub traffic
    grows with the number of saved repositories.

## The org image

- A refresh finds each repository of the org image by its ID. It copies
  the repository with its saved name, default branch, and install. The
  user chose this on 24 November 2026 (repository load decision 1).
- Reason: a refresh then works after a rename or a move, also while the
  newest build failed. The app starts no build by itself after a failed
  build, so new workspaces would otherwise get no new commits.
- The checks that guard each copy compare the values of the job with the
  saved values.
- A repository that the org no longer saves keeps the values of the org
  image, so its copy fails as before.
- While the org image holds a name or a default branch that differs from
  the saved value, the app starts a build. The build runs for an admin who
  is not suspended, as an automatic refresh does. The user chose this on
  17 November 2026.
- Reason: the build moves the folder to the new name at once, as
  [Folders](#folders) says.
- Each start of a refresh makes it a build while the org image holds such
  a value and the newest build succeeded. This covers the daily timer, a
  push, and an admin who refreshes.
- The build starts at once after the change. While a job runs, it starts
  when that job ends. When it cannot start, the next automatic refresh,
  daily or after a push, starts the build in place of the refresh.
- Reason: one check of the saved values then covers a change during a job
  and a start that failed.
- The check compares the saved values with the org image. It does not read
  GitHub. A change whose repository webhook never arrives reaches the saved
  values through the next webhook of the repository, as
  [A missed repository webhook](#a-missed-repository-webhook) says.
- A start only at the webhook was rejected. Reason: a start that failed, or
  a change during a job, then needed a manual build.
- A refresh that copies the name and the default branch of the org image
  was replaced. Reason: its copy fails after a rename or a move, so each
  refresh failed until a build ran.
- A refresh that skips its run while the org image holds old values was
  rejected. Reason: new workspaces then get no new commits until a build
  succeeds.
- The app starts no build when the newest build on the account of the org
  failed. The change then waits for Try again, which builds the saved
  values. Reason: the app starts no build by itself after a failed build
  (decision 12), as [The org image](org-image.md) says.
- A failed switch build runs on another account, so it does not count.
  Reason: members do not see it, and their image still works, as
  [What members see](switch-account.md#what-members-see) says.

## Folders

- The build moves the folder of a renamed repository to its new name, as
  [Folders over time](repository-folders.md#folders-over-time) says. Its
  folder variable takes the new name too. The user chose this on
  17 November 2026.
- Reason: the folder name then matches the name of the repository in the
  app and on GitHub.
- Keeping the folder name of the earlier org image was rejected. Reason:
  the folder and the repository would then have two names.
- A refresh after a rename keeps the folder and its variable. Only the
  next build moves them. This happens when the newest build failed, so no
  build starts at the rename.
- An install script or a startup script that names the old folder, or the
  old variable, fails after that build. An admin updates the script.
- Each existing workspace keeps its folders, as
  [Folders over time](repository-folders.md#folders-over-time) says.
