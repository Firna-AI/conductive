# GitHub tokens

This doc states how a cloud computer gets GitHub access, who its commits
name as their author, and how the Worker acts on GitHub as a member.
[GitHub tokens: the Worker as a member](github-tokens-worker.md) states
the merges, the branch reads, the fetches of the trusted jobs, and the
steps of the merge queue.
[GitHub tokens: image builds](github-tokens-image-builds.md) states which
GitHub tokens an image job uses to copy the repositories. An image job is
a build or a refresh of the org image.
[Access and security](access-and-security.md) states the shared access
rules. A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A skills
decision number names a decision of the change that adds the
[skills repository](org-skills.md), as that doc says.

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
  action, as [Continue](github-tokens-worker.md#continue) says. The fetch
  of a moved base, also of a base move of a queued workspace, gets the
  token of the workspace owner, as
  [A moved base](github-tokens-worker.md#a-moved-base) says.
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

- Git in a workspace sandbox always has an author name and an author
  email. A commit needs no Git setup by an agent, a member, or a script.
- The author of each commit is the person whose GitHub token Git uses
  (decision 231). [Git and the GitHub CLI](#git-and-the-github-cli) says
  whose token that is.
- In an agent turn, the author is the sender of the turn, the member whose
  message started the turn. A message that another member sends during the
  turn does not change the author.
- In a sandbox whose runner gives an agent no turn author, the commits of
  each agent turn name the workspace owner. An update of the sandbox
  software gives such a sandbox a newer runner at a later start, as
  [Updates](sandbox-software.md#updates) says.
- Outside an agent turn, such as in the shared terminals or in the startup
  script, the author is the workspace owner.
- The author of the first commit that the app pushes to an empty
  repository is the sender of the turn that creates the workspace.
  [Create a workspace](create-a-workspace.md#the-branch-and-the-name)
  states that commit.
- Reason: the commits then show the same person as the pushes and the
  pull requests.
- The workspace owner as the author of every commit was rejected. The
  commit of a teammate's turn then names the owner, but its push uses the
  teammate's token.
- A fixed author of the app with a co-author line for the person was
  rejected. GitHub then shows the person only as a co-author, not as the
  author.
- The author name is the display name of the person's GitHub account,
  without the spaces at its start and end.
- The GitHub login replaces a display name that is missing or that Git
  cannot use. Git cannot use a name made only of spaces and the characters
  `,`, `:`, `;`, `<`, `>`, `"`, `\`, and `'`.
- The author email is the GitHub no-reply address of the person,
  `<id>+<login>@users.noreply.github.com` (decision 232). `<id>` is the
  numeric ID of the GitHub account, and `<login>` is its login.
- Reason: GitHub links each commit with this address to the account, and
  the address shows no private email. So GitHub never refuses the push to
  keep an email private.
- The primary verified email was rejected. It shows a private address in
  the history of the repository, and GitHub refuses the push when the
  person blocks pushes that expose their email.
- The name and the email of the person's own Git settings on their Mac
  were rejected, because a member without the Mac app has none.
- The committer is the same person as the author.
- In an agent turn, Git gets the author from the four variables
  `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and
  `GIT_COMMITTER_EMAIL` of each agent process. This author also wins over
  an author that a script or an agent writes into the Git settings.
- Outside an agent turn, Git gets the workspace owner's author from the Git
  system settings of the sandbox. The app writes them at each start and
  each resume.
- Where Git uses the owner's author, it also wins over a `user.name` and a
  `user.email` that a script or an agent writes into the Git settings. Only
  an `author` or a `committer` setting of a repository or of the sandbox
  user wins over it, because Git reads those settings after its system
  settings. This holds also in an agent turn whose runner gives no turn
  author.
- The sandbox's own variables hold none of the four variables. The owner's
  author in them was rejected. A shell that loads them again, such as a
  login shell, then replaces the turn sender's author with the owner's.
- The sandbox gets no org env var with one of these four names
  (decision 233). The app's author applies in its place, as
  [Startup script and env vars](workspaces-and-sandboxes.md#startup-script-and-env-vars)
  says.
- Org env vars that win over the app's author were rejected, because the
  commits of that org then stop naming the person of the token.
- Risk: one Git command can still give its own author, with an option or
  with its own variables. So the author of a commit does not prove who
  made it.

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

[Merge as the member](github-tokens-worker.md#merge-as-the-member) states
whose GitHub token a merge and Ready for review use.

## Branch reads

[Branch reads](github-tokens-worker.md#branch-reads) states whose GitHub
token reads the branches of a repository.

## Continue

[Continue](github-tokens-worker.md#continue) states whose GitHub token the
fetch of Continue and of a repository change uses.

## A moved base

[A moved base](github-tokens-worker.md#a-moved-base) states whose GitHub
token the fetch of a moved base uses.

## The merge queue

[The merge queue](github-tokens-worker.md#the-merge-queue) states whose
GitHub token each step of the merge queue uses.
