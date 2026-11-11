# GitHub tokens

This doc states how a cloud computer gets GitHub access, and who its
commits name as their author.
[Access and security](access-and-security.md) states the shared access rules.
An image job is a build or a refresh of the org image. An image job
decision number names a decision of the change that makes every image job
clean, as [Org image](org-image.md) says.

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
  The terminal is shared, so this account is the same for each connection.
- A supplied turn ID must name a current turn. An unknown or ended turn
  never falls back to the workspace owner.
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
- A running sandbox keeps its agent runner. Its next workspace start
  updates an older runner, as
  [The agent runner](agent-runner.md#the-agent-runner) says. In a sandbox
  whose runner gives an agent no turn author, such as after a failed
  update, the commits of each agent turn name the workspace owner.
- Outside an agent turn, such as in the shared terminal or in the startup
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
- Git gets the author from the four variables `GIT_AUTHOR_NAME`,
  `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL`.
- The app's values of these four variables replace an org env var with
  the same name (decision 233). The app's other own variables do the same,
  as [Startup script and env vars](workspaces-and-sandboxes.md#startup-script-and-env-vars)
  says.
- The app's author also wins over an author that a script or an agent
  writes into the Git settings.
- Org env vars that win over the app's author were rejected, because the
  commits of that org then stop naming the person of the token.
- Risk: one Git command can still give its own author, with an option or
  with its own variables. So the author of a commit does not prove who
  made it.

## Image builds and refreshes

- A build or a refresh copies each repository of the image with Git in the
  build sandbox, as decision 90 requires. Each copy uses its own GitHub App
  installation token, which can only read the contents of that one
  repository.
- The copies of one image job run in parallel. Each copy has its own token
  and its own one-use build grant.
- The Git commands of an image job, its copies and its checkouts, run at
  once only within a memory budget. The budget comes from the size of each
  repository that GitHub reports and from the free memory of the build
  sandbox (image job decision 14 F). So a large repository copies alone,
  and many small ones copy together.
- All copies at once, and a fixed number of copies or Git commands at
  once, were rejected for that reason. One sandbox command for all copies
  was rejected, because each token then lives from the start of that
  command.
- To read the size of each repository, the Worker uses one more
  installation token, which can only read the metadata of the repositories
  of the job. That token
  never reaches the build sandbox. The Worker revokes it before the first
  copy starts.
- The Worker gives each copy token only to the Git command of that copy.
  The Worker and Git do not write it to command text, command history, a
  remote URL, a Git config, a file, or a saved snapshot.
- The Git command gets the token with a one-use build grant. The grant
  works once, and only for its own build and repository.
- The Worker revokes each copy token as soon as its Git command ends, also
  when the command fails. A failed copy fails the job, and the Worker then
  revokes each token of the job that still works.
- The job goes on only after GitHub confirms the revocation of every token
  of the job. Before that, the job starts no checkout, software step,
  install script, snapshot, or other repository code.
- Each build and each refresh starts from the software image or from the
  base image, where no org code has run (image job decision 12 G). So no
  program of an earlier install can read a clone token.
- Reason: Git in the build sandbox copies a repository of any size, and the
  Git data does not pass through the Worker. Larger uploads and stored
  progress were rejected, because one repository or one Git response must
  still fit in one Worker job. A Git proxy in the Worker and a Workflow
  were rejected, because each puts a new service in the path of the Git
  data.
- A workspace sandbox never gets an installation token. Its Git gets
  GitHub tokens only from the git credential helper.
