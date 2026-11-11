# File reports

This guide gives how the runner compares the repository with its base, what
each changes report counts, and the limits of file reads and diffs.
[Files and changes](../docs/protocol/workspace-tools.md#files-and-changes)
states the requirements. [Event limits](event-limits.md) gives the parts of
each report, and the [runner README](README.md) gives the rest of the runner.

## The comparison base

`comparisonBase` gives the base of each comparison: the snapshot of each
scan, the Changes list of each report and of each turn, and each file diff.
It reads Git references and the local Git settings only. It fetches
nothing, and it moves, resets, or writes no branch, reference, or setting.
It takes the base branch from the first of these that has a value:

1. The `branch.<name>.gh-merge-base` local Git setting of the current
   branch. The branch step of a create sets it to the base branch of the
   workspace. Continue sets it on the new branch.
2. The configured base branch, `CONDUCTIVE_DEFAULT_BRANCH`, or the base
   branch that a diff request names.

The base commit is the merge base of `HEAD` and that branch, as
[The base branch of a workspace](../docs/protocol/base-branches.md#the-base-branch-of-a-workspace)
says (decision 507 G). The branch resolves to
`refs/remotes/origin/<branch>` when that reference exists. Otherwise Git
resolves the name alone, because an older repository can have only a local
branch.

- A setting that names a branch that does not resolve fails the scan or the
  diff. The runner then does not fall back to the configured name. A
  failed scan sends `files.unavailable`, and a failed diff returns
  `file_unavailable`.
- A repository without a commit has no base yet. Its scans send only
  `files.unavailable` until a base exists.
- The merge base keeps the newer commits of the base branch out of Changes.
  So a fetch that moves the base branch, without a merge into the current
  branch, changes no report.
- `refs/remotes/origin/HEAD` does not select the base. So the default
  branch of the repository does not replace the base branch of a pull
  request run.
- The changes report and the diff reply name the selected branch in
  `baseBranch`. So after Continue, they name the base branch of the new
  branch.
- Each scan resolves the base again. So the base follows Continue while the
  runner stays up, and a merge of a newer base commit into the branch. A
  new base commit sends a new changes report, also when the files stay the
  same.
- The trusted commands of the Worker write the setting: the branch step of
  a create, as
  [Browser routes](../worker/lifecycle/README.md#browser-routes) says, and
  the move and its recovery in
  [Continue](../worker/lifecycle/continue.md#the-move).

## The counts of a changes report

- `unpushedCommits` counts the commits of the current branch that no
  remote branch holds. A remote ref update can change the count without a
  file change.
- `uncommittedFileCount` counts the records of `git status --porcelain`,
  also each untracked file. A rename or a copy counts once. Ignored files
  do not count.
- Git status compares the files with `HEAD`, not with the base. So a file
  whose uncommitted edit brings it back to its base content still counts,
  but Changes has no row for it. The count is therefore not the number of
  rows, and not `summary.files`.
- A change of only a count sends a new changes report, because the check
  for a new report compares the whole report.
- Each numbered part of a report repeats both counts, and the saved events
  keep them.
- Each sandbox keeps the runner of the org image that it starts from. A
  report from an older runner can lack either count. The Worker and the
  browser keep that absence as unknown, rather than reporting zero.

## File reads and diffs

- File reads and diffs use the shared UTF-8 decoder and keep a leading byte
  order mark. A valid path can hold a tab, a newline, or a backslash. Each
  path must still resolve inside the repository and pass the `.git` check.
- File reads cap bytes at `FILE_READ_MAX_BYTES`, also when a caller asks
  for more. Diffs use the same cap for each file version and for the patch.
  The runner checks file and blob sizes before it loads their bytes.
  Git stops patch output at the cap. An oversized result returns
  `file_too_large`. Patch size reports the first byte over the limit.

## Tests

- `src/uncommitted-files.test.ts`: a pushed file whose uncommitted edit
  brings back its base content counts once, with an empty Changes list.
  After that edit is committed and pushed, a report with only the new count
  goes out.
- `src/files.test.ts`: a changed, a renamed, and an untracked path count
  once each.
- `src/file-limits.test.ts`: both counts through the output filter, the
  parts, the saved events, and the parts that the fake endpoint joins.
- `src/file-content.test.ts`: a remote base branch that moved without a
  merge sends no report. A merge of that base moves the merge base, and
  sends a new report, also when the files and the line counts stay the
  same.
- `src/merge-base.test.ts`: newer commits of the base branch stay out of
  Changes, file marks, and diffs. The fetched remote base comes before a
  local base branch that is behind. The `gh-merge-base` setting comes
  before the configured name, also while `origin/HEAD` names another
  branch.
- The Worker runs one file reporter through Continue and a rename of the
  default branch, as the [Continue tests](../worker/lifecycle/continue.md#tests)
  say.

## Key code

- `src/files.ts`, `src/repository.ts`, and `src/checkpoint.ts`: the scan
  queue, the file tree, the branch changes, bounded reads, and the files of
  one turn.
- `src/comparison-base.ts`: `comparisonBase`, the one base of the scans,
  the Changes lists, and the diffs. It reads the `gh-merge-base` setting
  of the current branch before the configured name.
- `src/repository-changes.ts`: changed files against the base, the raw
  status count, and current-branch commits that no remote branch holds.
- `src/file-parts.ts`: full report parts and bounded tree deltas.
- `src/file-updates.ts`: the full tree or the tree delta of each scan, and
  the check for a new changes report.
- `src/file-response.ts`: `filterRunnerFileResponse` filters each successful
  file and diff reply before `RunnerLink` sends it. A failed reply passes
  unchanged.
- `src/git-index.ts`, `src/git-entries.ts`, and `src/git-diff.ts`: temporary
  indexes and objects for Git comparisons. The real index stays unchanged.
- `src/git.ts`: Git commands and merge-base selection, which prefers the fetched remote-tracking base over a local branch.
- `src/git-paths.ts`: shared Git namespace states for paths and parents.
