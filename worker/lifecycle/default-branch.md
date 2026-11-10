# The default branch at a create

This guide belongs to the [workspace lifecycle README](README.md). It gives
the fetch step of a create, which prepares the default branch that the new
workspace branch starts from.
[The branch and the name](../../docs/protocol/create-a-workspace.md#the-branch-and-the-name)
states the requirements, and [Repository layout](repository-layout.md)
gives the folder of each repository.

The fetch step of a create runs `defaultBranchCommand` from
[`default-branch-command.ts`](default-branch-command.ts).
`workspacePhaseCommand` in [`start-command.ts`](start-command.ts) gives it
the repository folder of the workspace map, the captured default branch,
the ID of the first turn, and the trusted sender of the create. Without
that sender, the step fails.

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
4. Each successful path ends with a fetch of the default branch into its
   remote-tracking reference, `refs/remotes/origin/<default branch>`. Then
   the command points `refs/remotes/origin/HEAD` at that reference. The
   branch step then creates the workspace branch from `FETCH_HEAD`.

A remote with any ref gets no commit, also when it has no default branch.
The fetch then fails, and the start fails.

The command writes no local default branch, and it keeps the staged files
and every local branch. On an older image whose repository has a local
default branch, that branch keeps its commit. The runner still compares
with the fetched tip from its first scan, because `origin/HEAD` names it,
as [The comparison base](../../runner/file-reports.md#the-comparison-base)
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

## Key code

- [`default-branch-command.ts`](default-branch-command.ts):
  `defaultBranchCommand`, the fetch step with the empty first commit.
- [`start-command.ts`](start-command.ts): `workspacePhaseCommand`, the
  fetch and branch commands of a create.
