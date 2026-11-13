# The default branch at a create

This guide belongs to the [workspace lifecycle README](README.md). It gives
the fetch step of a create, which prepares the start and base branches of
the new workspace. The create can name both branches, as
[Start from a branch](../../docs/protocol/start-from-a-branch.md) says.
The run of a routine can also have another base branch, as
[Browser routes](README.md#browser-routes) says.
[The branch and the name](../../docs/protocol/create-a-workspace.md#the-branch-and-the-name)
states the requirements, and [Repository layout](repository-layout.md)
gives the folder of each repository.

The fetch step of a create runs `defaultBranchCommand` from
[`default-branch-command.ts`](default-branch-command.ts).
`workspacePhaseCommand` in [`start-command.ts`](start-command.ts) gives it
the repository folder of the workspace map, the captured default, start,
and base branches, the ID of the first turn,
and the trusted sender of the create. Without that sender, the step fails.

The command exports the turn ID as `CONDUCTIVE_TURN_ID`. So the
[git credential route](README.md#machine-route) gives each Git request a
fresh GitHub user token of that sender. The command holds no token, and
it writes no token to a Git config or a file. It needs the `origin` remote
and the credential helper of the image.

1. `git ls-remote origin` reads every ref of the remote. A failed read
   fails the step.
2. When the remote has no ref, the command makes an empty root commit with
   `git mktree` and `git commit-tree`. It does not read the index, so no
   file of the folder goes into the commit. The author and the committer
   are the sender: the display name, or else the GitHub login, with the
   email `<GitHub ID>+<GitHub login>@users.noreply.github.com`. The message
   is `Initialize empty repository`.
3. It pushes that commit to the default branch without force. When the
   push fails, it reads the remote refs again. When the remote is still
   empty, the step fails with the status of the push. Otherwise another
   push came first, and the step continues.
4. Each successful path fetches the start branch into
   `refs/remotes/origin/<start branch>`. A different base branch gets its
   own fetch into `refs/remotes/origin/<base branch>`.
5. The command points `refs/remotes/origin/HEAD` at the base reference.
   The branch step creates the workspace branch from the start commit of
   a pull request run when it exists. Otherwise it uses the start branch's
   explicit remote reference. It sets `gh-merge-base` to the base branch.

An empty remote gets its first commit only on the default branch.
A missing start or base branch fails the fetch. The command confirms a
missing ref with `git ls-remote --exit-code` after a failed fetch.
It uses separate exit codes for the start and base branches.
[`start-branch-failure.ts`](start-branch-failure.ts) maps them to a public
failure that names the branch. An unavailable remote keeps the ordinary failure.
The command quotes every branch with `shellQuote`.

A remote with any ref gets no commit.
A missing default branch fails the fetch only when it is the start or base branch.

The command writes no local default branch, and it keeps the staged files
and every local branch. On an older image whose repository has a local
default branch, that branch keeps its commit. The runner still compares
with the fetched base from its first scan. The `gh-merge-base` setting
names the base branch, and the runner prefers its remote-tracking
reference over a local branch, as
[The comparison base](../../runner/file-reports.md#the-comparison-base)
says.

## Tests

- `default-branch-command.test.ts` runs the default branch step with native
  Git. `FakeGitHubGit` serves a local bare repository through
  `git-http-backend`, and the production git credential route gives the
  token. No test uses a real GitHub account.
  It also reads the runner snapshot of the result. After an empty bootstrap
  and on an older image with a local default branch, the base is the
  fetched tip. The local default branch stays absent, or keeps its older
  commit.
- `start-branches-command.test.ts` runs separate start and base fetches
  with native Git. It checks the start commit, the base settings, shell
  quoting, an empty remote, and branches deleted before the fetch.
- `start-branch-retry.test.ts` checks the public named failure and keeps
  both branches through Try again, object restart, and an ordinary resume.

## Key code

- [`default-branch-command.ts`](default-branch-command.ts):
  `defaultBranchCommand`, the fetch step with the empty first commit.
- [`start-command.ts`](start-command.ts): `workspacePhaseCommand`, the
  fetch and branch commands of a create.
