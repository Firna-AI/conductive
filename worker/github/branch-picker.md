# Workspace branch picker

This page belongs to the [GitHub banner backend](README.md).

The gated repository route in [workspace-branches.ts](../app-api/workspace-branches.ts)
serves `repositoryBranchesPath` from the [branch contract](../../src/shared/workspace-branches.ts).
It accepts `query` and an opaque `cursor`, and returns `rows` and `nextCursor`.
Each page reads bounded branch and open pull request connections.
Search filters pull request titles, numbers, and same-repository branch names.
A page can be empty while `nextCursor` still names more results.
The client must follow that cursor before it shows no matches.

[branch-picker.ts](branch-picker.ts) hides the default branch and suppresses
ordinary branch rows with an open pull request in this repository.
Fork and deleted-fork pull requests keep an unavailable row and their GitHub link.
The parser compares numeric repository IDs.
[branch-repository.ts](branch-repository.ts) checks the selected repository,
installation, and reader before the upstream read and before the response.
The installation token stays on the Worker and permits only content and pull request reads.
[Continue a branch](../../docs/protocol/continue-a-branch.md) states the behavior.
