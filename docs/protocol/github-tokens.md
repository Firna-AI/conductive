# GitHub tokens

This doc states how a cloud computer gets GitHub access, and how the
Worker acts on GitHub as a member.
[GitHub tokens: commit author](github-tokens-commit-author.md) states who
the commits of a cloud computer name as their author.
[GitHub tokens: image builds](github-tokens-image-builds.md) states which
GitHub tokens an image job uses to copy the repositories. An image job is
a build or a refresh of the org image.
[Access and security](access-and-security.md) states the shared access
rules. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A skills
decision number names a decision of the change that adds the
[skills repository](org-skills.md), as that doc says. A retarget decision
number names a decision of the change that lets an agent change the base
branch, as [Base branches](base-branches.md) says.

## Git and the GitHub CLI

- Each workspace provides an authenticated GitHub CLI, `gh`.
- The GitHub App requests Issues read and write so CLI commands can list,
  create, and change issues. Read-only access was rejected because it
  prevents issue changes.
- Each `gh` command gets a fresh GitHub App user token through the git
  credential helper, unless the caller supplies `GH_TOKEN` or `GITHUB_TOKEN`.
- The token stays in the command's environment. The sandbox saves no login
  file and puts no token in a saved snapshot.
- Help, version, and completion commands need no GitHub access.
- In an agent turn, Git and `gh` use the token of the person who sent that
  turn. Pushes and pull requests show as that person, as decision 50 requires.
- Outside an agent turn, `gh` uses the workspace owner's GitHub account.
  The members share the terminals, so this account is the same in each
  terminal and for each connection.
- A supplied turn ID must name a current turn. An unknown or ended turn
  never falls back to the workspace owner.
- Trusted jobs are the other cases. The fetch of a Continue job or of a
  repository change job gets the token of the member who pressed the
  action, as [Continue](#continue) says. The fetch of each move of a base
  branch gets the token of the workspace owner, as
  [A moved base](#a-moved-base) says.
- Each command that an agent runs in a turn has the ID of that turn. This
  holds also in a shell that loads the sandbox's own variables again, such
  as the login shell in which Codex runs each command.
- The sandbox's own variables hold no turn ID. An empty turn ID in them was
  rejected, because a shell that loads them again then removes the turn ID,
  and Git gets no GitHub access.
- When Git gets no GitHub access, it shows the reason. Outside an agent
  turn, it says that Git gets GitHub access in an agent turn. When the
  Worker refuses, it shows the Worker's message, such as an ended turn or an
  expired GitHub sign-in. Any other failure shows one fixed message that
  says to try again.
- One fixed message for every failure was rejected, because it told the
  person to sign in again also when a new sign-in cannot help.
- The helper asks the Worker at `/v1/git/credential` on
  `api.conductive.build`. It proves itself with the workspace token.
- The Worker checks access before it gets the GitHub token and again
  before it returns the token. The token must still belong to the same
  person after a refresh.
- Reason: a GitHub App user token expires after 8 hours, and the secrets
  of a sandbox change only at a resume.
- A user token reaches every repository where that person installed the
  GitHub App and has access.
- Risk: each process in the sandbox can get the owner's token without an
  agent turn. Each member with a terminal there can get it too.
  A copied token works until it expires, also on that person's repositories
  outside the org.

## Commit author

[GitHub tokens: commit author](github-tokens-commit-author.md) states who
each commit in a workspace sandbox names as its author and its committer.

## Image builds and refreshes

- [GitHub tokens: image builds](github-tokens-image-builds.md) states how
  a build or a refresh copies each repository with its own installation
  token.
- A workspace sandbox never gets an installation token. Its Git gets
  GitHub tokens only from the git credential helper.

## The skills repository

- The runner copies the [skills repository](org-skills.md) of the org,
  and checks it for new commits, with no GitHub token (skills
  decision 6 A). So only a public repository gives skills.
- For the copy and its checks, Git gets no token from the git credential
  helper, and it asks for no password. So a private or missing repository
  fails at once.
- Reason: the copy and its checks run outside any agent turn, and Git
  gets no GitHub access there, as
  [Git and the GitHub CLI](#git-and-the-github-cli) says.
  [Public repositories only](org-skills.md#public-repositories-only)
  gives the ways with a token that were rejected.
- The Worker looks up the skills repository for the Skills section of the
  org settings, as [The list of skills](org-skills.md#the-list-of-skills)
  says. It reads GitHub with the GitHub sign-in of the member who views
  the section. The answer goes only to that member.
- The lookup only reads. It reads the record of the repository and the
  file tree of its default branch.
- Reason: one request for the file tree finds every skill. A sign-in gets
  a higher GitHub rate limit than a request with no token. A lookup with
  no token was rejected for that reason.

## The Actions permission

- The GitHub App has Actions write, and each install owner approves it
  (decision 225).
- With it, the agent reads the logs of failed GitHub Actions jobs with
  `gh run view --log-failed`, for Fix checks of the pull request bar.
- Reason: the logs are the main evidence of a failed Actions job.
- A check of another service keeps its log outside GitHub. Fix checks then
  asks the agent to read its details, or to run it locally.
- Risk: write also lets each member token start, re-run, and cancel
  workflow runs, turn workflows on and off, and delete runs, logs,
  artifacts, and caches. This holds on each repository that the token
  reaches, also outside the org. Read access would be enough for the logs.
- These ways were rejected (decision 225):
  - No Actions permission. Fix checks then works only from the check
    summaries and local runs, and a failure that shows only in a log takes
    longer.
  - A Worker that puts the end of each failed log into the prompt. The
    actions of the bar only send their prompt (decision 222).
  - A personal token, or a second GitHub App, for the logs. One GitHub App
    gives the app all of its GitHub access.

## Merge as the member

- The Worker reads, for each member, the access of that member to the
  repository and the merge method that GitHub gives that member
  (decision 221). It reads with the member's own GitHub token, and the
  answer goes only to that member.
- A member may merge when GitHub gives that member write access or more.
  GitHub still checks the rules of the branch at the merge.
- Reason: GitHub reports no single field for the right to merge.
- The Worker merges with the GitHub token of the member who clicks Merge
  (decision 220). GitHub then shows that member as the merger, and checks
  the rights of that member.
- A merge with a token of the app was rejected. GitHub would then show the
  app as the merger, and skip the rights of the member.
- The Worker refuses a merge for a person who is not a member of the org,
  in a suspended org, and in an archived workspace.
- No GitHub error text reaches the browser. The Worker gives each refusal
  of GitHub as an error code of the app.
- The Worker also marks a draft ready for review with the GitHub token of
  the member who clicks Ready for review, as
  [Ready for review](github-banner.md#ready-for-review) says. The same
  access rule, refusals, and error codes of the app apply. The user chose
  this on 17 November 2026.
- For a call of an agent that changes the target branch, the Worker also
  changes the base of the open pull request (retarget decision 2 C). It
  uses the GitHub token of the sender of the calling turn.
  [Change the target branch](workspace-management.md#change-the-target-branch)
  states the call.
- GitHub then shows that member as the person who changed the base, and
  checks the rights of that member. The sender needs write access or
  more, as for Merge. No GitHub error text reaches the agent.

## Branch reads

- The picker of New workspace lists the branches of one repository of the
  org. The Worker reads them live from GitHub with the GitHub user token of
  the member who opens the picker. It stores no list.
- The live branch reply holds only branches that GitHub lists, newest
  commit first. The picker gets its default row from the saved repository.
- The Worker answers only a member of the org, and only for a repository
  of that org. The answer goes only to that member.
- Reason: the browser gets no GitHub token, and each member sees only the
  branches that GitHub shows to that member.
- The branch check of a create asks GitHub for each named branch with the
  GitHub user token of the sender, as
  [The branch check](start-from-a-branch.md#the-branch-check) says. The
  sender of a create call is the sender of the calling turn.
- GitHub then checks the read access of that member. When the token cannot
  read the repository, the app says so, and it does not claim that a
  branch is missing.
- The Worker gives each refusal of GitHub as an error code of the app, as
  for a merge.
- A call of an agent that changes the target branch also asks GitHub for
  its branch with the GitHub user token of the sender. It reads the open
  pull request of the workspace with the same token. Reason: the call acts
  for the sender.

## Continue

- Continue reads the merged pull request with the GitHub token of the
  member who pressed Continue. With that token, it also asks GitHub whether
  the base branch of that pull request still exists.
- Continue fetches the latest commit of its base branch with the same
  token (decision 226). GitHub then checks the read access of that member.
  [The base and the new branch](continue.md#the-base-and-the-new-branch)
  gives that base branch (decision 300).
- The workspace runs this fetch as a trusted Continue job, as it runs the
  fetch of a create. The credential route gives the token to that job only
  while its fetch runs.
- The token reaches only that fetch. No Git setting and no hook of the
  repository folder runs with it. Reason: agent code can change the Git
  settings and the hooks of the repository folder.
- Every member may press Continue (decision 224). So the token of a member
  who is not the owner reaches the sandbox of the owner for the fetch, as
  it does for a message of that member.
- A [repository change](repository-change.md) fetches the latest default
  branch of the new repository in the same way, with the token of the
  member who changes the repository.
- These ways were rejected (decision 226):
  - The token of the workspace owner, through the mode that `gh` uses
    outside a turn. It works only in a workspace from a newer org image.
  - An installation token that reads only the one repository. A workspace
    sandbox then gets an installation token, and the fetch needs the revoke
    steps of image builds.

## A moved base

- Each move of a base branch fetches the latest commit of the new base
  branch into the cloud computer, as
  [The move in the cloud computer](base-branches.md#the-move-in-the-cloud-computer)
  says. A move follows a deleted base (decision 304) or a new default
  branch (decision 310). It also follows a call of an agent, or a new base
  of the open pull request (retarget decision 1 C).
- The fetch of each move gets the GitHub token of the workspace owner
  (decision 307). This holds also for a move that a call of an agent
  starts. The owner's account is the one that `gh` already uses outside an
  agent turn.
- Reason: the saved retry of the move or a resume runs the fetch, also
  after the turn of a call ends. Most moves start after a GitHub read,
  such as the read after a GitHub webhook, with no member. So no turn and
  no press of a member gives a token.
- The workspace runs this fetch as a trusted job, as it runs the fetch of
  Continue. The credential route gives the token to that job only while
  its fetch runs. GitHub then checks the read access of the owner.
- As for Continue, the token reaches only that fetch. No Git setting and
  no hook of the repository folder runs with it.
- These ways were rejected (decision 307):
  - A fetch only with the token of a turn or of the member who presses
    Continue. A move after a GitHub webhook, at a retry, or at a resume
    then gets no token.
  - A base commit that the Worker reads from GitHub and gives to the agent
    runner. It changes the contract of the agent runner.
  - The move at the next agent turn, with the token of the sender of that
    turn. A workspace that waits for review then keeps the old comparison.
  - A button on the message of a moved base, which fetches with the token
    of the member who presses it. Changes then wait for that press.
