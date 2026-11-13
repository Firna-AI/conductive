# The catalogue: the pull request bar

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives the pull request bar of a workspace, `app/banner`,
with its actions and its child pages, and the flow that merges and
continues.

`app/banner` shows a branch with commits and no pull request. Its bar
offers Create PR, which asks the agent to open the pull request.
Each state shows one main action, from decisions 220 to 228. The number of
a pull request opens it on GitHub. The agent gets a fixed prompt for each
step that changes code, and the app merges, continues, and archives. On a
phone the row opens the Checks tab, whose top holds the actions, and the
link to GitHub of a pull request. The `localWork`, `access`, `appAction`, and `branch`
states of the workspace screen draw them. The child pages:

- `app/banner/checks` has the running, failed, and passed checks and the
  merge, which moved from `app/banner/checks-running`, `checks-failed`,
  `ready-to-merge`, and `merged` and declare `movedFrom`. Checks failed
  offers Fix checks, and Ready to merge offers Squash and merge. After the
  merge, every member sees Continue, and the owner and the admins also see
  Archive.
- `app/banner/blocked` has a merge conflict with Resolve conflicts,
  requested changes with Address review, a draft, a pull request closed
  without a merge, and Blocked. A conflict, requested changes, and Blocked
  tint the bar amber.
- `app/banner/no-commits` has a branch without commits, whose bar offers no
  Create PR, as in `app/new-workspace/creating` and `first-turn`.
  Its `local-work` variant has changed files that are not committed, so
  the bar offers Create PR.
- `app/banner/merge` has the merge that runs, a refusal for new commits, a
  refusal for a missing right, another refusal with Open on GitHub, and
  Ready to merge for a member with read access, without Merge.
- `app/banner/local-work` has Commit and push in the place of Merge, Fix
  checks, Resolve conflicts, and Address review, and in a state without an
  action of its own. Its `commits` variant has only commits that are not
  pushed, so the bar offers Push.
- `app/banner/sent` has the message of each agent action in the chat, as a
  message of the member who clicked, while the agent works on it.
- `app/banner/continue` has the question of Continue with local work, the
  branch change that runs, a Continue that stopped, Continue while a turn
  runs, and Continue for a member who may not archive.
- `app/banner/continued` has the bar after Continue on the new branch, with
  the note of Continue in the session. Its variants have the changed files
  that moved to the new branch, and the note of a Continue by another
  member.

On each page, the row of the workspace in the list shows the GitHub state
of the bar: amber while checks run, red after a failed check, green after
passed checks, and purple after the merge. A conflict, requested changes,
a draft, and a block keep the green of the passed checks. A branch without
a pull request or without commits, and a pull request closed without a
merge, show the dim mark.

The flow `user-flows/merge-and-continue` goes from Ready to merge through
the merge and Continue to the next task.
