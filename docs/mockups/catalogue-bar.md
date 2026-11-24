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
step that changes code, and the app merges, marks a draft ready for
review, continues, and archives. On a
phone the row opens the Checks tab, whose top holds the actions, and the
link to GitHub of a pull request. While the branch has no pull request,
that top also names the branch and its base above Create PR, from
decision 306. Here they are calummoore/checkout-autocomplete → main. The
`localWork`, `access`, `appAction`, and `branch` states of the workspace
screen draw them. The child pages:

- `app/banner/checks` has the running, failed, and passed checks and the
  merge, which moved from `app/banner/checks-running`, `checks-failed`,
  `ready-to-merge`, and `merged` and declare `movedFrom`. Checks failed
  offers Fix checks, and Ready to merge offers Squash and merge. After the
  merge, every member sees Continue, and the owner and the admins also see
  Archive.
- `app/banner/blocked` has a merge conflict with Resolve conflicts,
  requested changes with Address review, a draft with Ready for review,
  Ready for review while it runs, its refusals for a missing right,
  another pull request, and another reason, a pull request closed without
  a merge, and Blocked. A conflict, requested changes, and Blocked
  tint the bar amber.
- `app/banner/no-commits` has a branch without commits, whose bar offers no
  Create PR, as in `app/new-workspace/creating` and `first-turn`. On a
  phone the top of the Checks tab names the branch and its base alone.
  Its `local-work` variant has changed files that are not committed, so
  the bar offers Create PR, and a phone shows it under the branches.
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
- `app/banner/merge-queue` has the bar of a queued workspace, as the next
  part of this page gives.

On each page, the row of the workspace in the list shows the GitHub state
of the bar, in the tone of the bar: grey while checks run and for a draft,
red after a failed check, green when ready to merge, purple after the
merge, and amber for a conflict, requested changes, and a block. A branch without
a pull request or without commits, and a pull request closed without a
merge, show the dim mark.

The flow `user-flows/merge-and-continue` goes from Ready to merge through
the merge and Continue to the next task.

## The merge queue

`app/banner/merge-queue` draws the bar of the merge queue that
[Merge queue](../protocol/merge-queue.md) states, from decisions 313 to 320 of 22 November 2026,
from Cal's choice of the same day that the user handles a failure, and
from decision 321 of 23 November 2026, which gives a conflict of a
restack one turn of the queue.
Its canonical screen has Checkout address autocomplete just after Add to
merge queue: place 3 of 3 of the queue of acme/storefront, while its
checks run. A line under the bar names the place and the pull request
below it, "Place 3 of 3 in the merge queue. It builds on #479.", and ends
with Remove from queue. The sidebar shows the row in the Merge queue
group. On a phone the compact row says Queue 3 of 3, and the line stands
at the top of the Checks tab. The `queue` state of the workspace screen,
from `src/screens/queueBarStates.ts`, draws the pages. Its child pages:

- `app/banner/merge-queue/add` has Add to merge queue, the outline button
  after Squash and merge (decision 317). Beside a main action in a column
  narrower than 540 px, it shows only its icon. Its variants have the
  button after Fix checks, alone while the checks run, and in the
  workspace menu of the header.
- `app/banner/merge-queue/queued` has the bottom layer, place 1, which
  builds on main. Its `restack` variant has the one turn of the queue for
  a conflict of its own move of a layer (decision 321 A). The queue sends
  the restack prompt as a message of the queuer, and the line keeps a
  spinner and "Rebasing onto #479" until the turn ends. Its `rebase-waits`
  variant has the entry after that turn left the conflict: the queue sends
  no second turn, the bar shows Resolve conflicts, and the line says "The
  queue waits for a rebase onto #479.". Its `rebase` variant has Resolve
  conflicts after that turn, as a message of the member who pressed it,
  whose prompt asks for a rebase onto the branch below, not a merge.
- `app/banner/merge-queue/merge` has Merge with 2 ahead, while each layer
  is in the stack and ready (decision 316 D). Its variants have the merge
  that runs, a Merge that waits for a lower layer, and the Merge of the
  bottom layer, which keeps its own label. Its `local-work` variant has a
  cloud computer with changed files that are not committed: the bar offers
  Commit and push in the place of Merge, as outside the queue, and the
  line says "The queue waits for its local work to be pushed.".
- `app/banner/merge-queue/cannot-merge` has an entry whose checks failed,
  place 2 of 3. It keeps its place, the bar keeps Fix checks, and the
  normal line says "The queue waits for its checks.", with Remove from
  queue and no Add to merge queue. Its `review` variant has requested
  changes, with Address review and an amber mark in the sidebar. Its
  `above` variant has a ready layer above an entry whose checks failed,
  with no Merge and the line "The queue waits for #479.". Its `token`
  variant has a stored GitHub token of the queuer that stopped working,
  and its `merge-refused` variant a merge that GitHub refused, with Open on
  GitHub. Both keep Merge with 2 ahead, which merges with the token of the
  member who clicks.
- `app/banner/merge-queue/merge-stack` shows Merge stack (3) for a pull
  request with two open layers below it. The `through-queue` variant has
  both lower layers in this org’s queue. The `another-org` variant shows
  the message for a lower layer held by another org (decision 324).
- `app/banner/merge-queue/remove` names the planned base before Remove
  from queue. Its `stack` variant also names the entry that leaves with
  the selected lower entry of a member stack.

The other pages of the bar draw no part of the queue, so their pictures
stay as they are. [The workspace menu, sub-workspaces, and the merge
queue](catalogue-workspace-list.md) gives the pages of the Merge queue
group.

`app/new-workspace/start-branch/stacked` has the bar of a workspace that
stacks on a branch, which names that base. Its `create-pr` variant has the
top of the Checks tab of a phone, which names that base above Create PR,
from decision 306. Its `base-moved` variant has the line under the bar
after GitHub deleted that base, from decision 304, as
[New workspace](catalogue-new-workspace.md) gives.
