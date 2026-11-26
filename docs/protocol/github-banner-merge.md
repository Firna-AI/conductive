# GitHub banner: merge and after

This page belongs to [GitHub banner](github-banner.md). It holds the
requirements and the decisions in force for Merge, Ready for review, the
actions after the merge, and the merge record.
[Merge queue in the app](merge-queue-in-the-app.md) holds Merge on a
workspace in the merge queue. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Merge

- A member sees Merge only when GitHub gives that member write access or
  more to the repository (decision 221). The Worker reads that access with
  the member's own GitHub token, as
  [Merge as the member](github-tokens-worker.md#merge-as-the-member) says.
- When the Worker cannot read the access, the bar shows no Merge. Reason:
  a button that is sure to fail helps nobody.
- While the bar reads the access, it uses the last access that the same tab
  read for the member and the repository, when it has one. This applies to
  Merge and to the agent actions. A failed read forgets that access, and a
  sign-out forgets each one. The user chose this on 12 November 2026.
- Reason: the access seldom changes, and a read from GitHub takes seconds.
  The bar of another workspace of the same repository must not wait for
  it. GitHub still checks the access at each merge.
- GitHub keeps the final say, because it checks the rules of the branch at
  the merge.
- Merge for every member was rejected, because a member without the right
  then sees a button that fails. Merge for the workspace owner and the
  admins only was rejected, because a reviewer with the right then must
  merge on GitHub.
- The button of a pull request that lands alone names the merge method,
  such as "Squash and merge". The method is the member's default on GitHub
  when the repository allows it, or else a method that the repository
  allows. The bar has no menu of methods.
- On a workspace in the merge queue, the label of Merge counts the layers
  ahead of it, as
  [Merge on a queued workspace](merge-queue-in-the-app.md#merge-on-a-queued-workspace)
  says (decision 316).
- Merge runs on one click, with no question (decision 228). The merge
  carries the head commit that the bar shows, so GitHub refuses commits
  that the member did not see.
- On a queued workspace, the click asks the queue to merge. That merge
  carries the head that the queue last read and checked, as
  [The merge](merge-queue.md#the-merge) says (decision 314).
- A question before each merge, Commit and push beside Merge, and a wait
  with Undo before the merge were rejected (decision 228).
- While the merge runs, the bar shows that it runs, until GitHub reports
  the result.
- When GitHub refuses the merge, a message under the bar says why. For a
  moved head and for a missing right, the message uses the app's own
  words, and after a missing right the bar hides Merge. For every other
  refusal, the message says that GitHub refused the merge, with Open on
  GitHub.
- No GitHub error text reaches the browser.
- Auto-merge and a bypass of branch rules are not part of the bar. Neither
  is GitHub's own merge queue: a direct merge into a branch that needs a
  GitHub merge queue gets the refusal of GitHub.
- For an unqueued workspace with open pull requests below it in a GitHub
  stack, the button says "Merge stack (N)". The count includes the target
  and each open pull request below it (decision 324).
- When no pull request below it is queued, the click starts a direct stack
  merge with the member's token and merge method. If a lower pull request
  is queued, [Merge stack](merge-queue-in-the-app.md#merge-stack) gives the
  rule for its org.
- Before each direct merge, the Worker checks the target and each open
  layer below it in the repository. It gives one refusal if any of these
  pull requests is queued in any org. A changed stack count also needs a
  new review before a direct stack merge.

## Ready for review

- A draft offers Ready for review. The user chose this on 17 November
  2026.
- Reason: a member must not leave the app to mark a draft ready.
- The app marks the pull request ready for review at once, with the
  member's own GitHub token, as for Merge. No agent turn runs. The user
  chose this on 17 November 2026.
- Reason: the step changes no code. So it must not wait for a running
  sandbox and a turn, or use the model quota of a session.
- A fixed prompt that asks the agent to run `gh pr ready` was rejected for
  the same reason. A sandbox from an older org image can also lack the
  GitHub CLI.
- A member sees Ready for review only when GitHub gives that member write
  access or more to the repository, as for Merge. When the Worker cannot
  read the access, the bar shows no Ready for review.
- The request names the number of the pull request that the bar shows.
  When the branch has another pull request now, the app changes nothing,
  and a message under the bar says so.
- A pull request that is no longer a draft needs no change. The app then
  only reads the GitHub state again.
- While the change runs, the bar shows Marking ready. Then every open tab
  gets the new GitHub state.
- When GitHub refuses the change, a message under the bar says that GitHub
  refused it, with Open on GitHub. No GitHub error text reaches the
  browser. A missing right uses the app's own words, and the bar then
  hides Ready for review.
- The command Mark PR ready for review has no default key, as
  [the default keys](keyboard-shortcuts-keys.md#the-default-keys) say.

## After the merge

- After the merge, the bar offers Continue and Archive.
- Every member sees Continue (decision 224), as [Continue](continue.md)
  says.
- Only the workspace owner and the admins see Archive (decisions 16
  and 42). It archives at once and asks no question, as
  [Archive](workspace-life.md#archive) says.
- While a turn runs in a session of the workspace, Continue is not
  available, and a message under the bar says that it waits for the agent.
- While Continue runs, the bar shows that it runs, and Archive is not
  available.
- A Continue that stopped names its reason in a message under the bar.

## The merge record

- The Worker records each merged pull request of a workspace branch for
  the Stats tab, as [The merge record](account-stats.md#the-merge-record)
  says.
- It records the merge when a read for a workspace finds the pull request
  merged.
- It also records the merge when GitHub sends the event of the merge,
  also for an archived workspace, without a read from GitHub. Reason:
  events do not reach an archived workspace, and a pull request can merge
  on GitHub after its workspace is archived.
