# GitHub tokens: commit author

This page belongs to [GitHub tokens](github-tokens.md). It states who each
commit in a workspace sandbox names as its author and its committer, and
the ways that were rejected. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Commit author

- Git in a workspace sandbox always has an author name and an author
  email. A commit needs no Git setup by an agent, a member, or a script.
- The author of each commit is the person whose GitHub token Git uses
  (decision 231).
  [Git and the GitHub CLI](github-tokens.md#git-and-the-github-cli) says
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
