# Merge queue in the app

This page belongs to [Merge queue](merge-queue.md). It holds the
requirements and the decisions in force for what members see and do with
the queue in the app: the Merge queue group of the workspace list, Add to
merge queue, the bar of a queued workspace, Remove from queue, Merge on a
queued workspace, the prompts of a queued workspace, and the commands. The
terms are those of [Merge queue](merge-queue.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

The [mockup catalogue](../mockups/catalogue-workspace-list.md) draws the
group at `app/merge-queue`, and the
[catalogue of the bar](../mockups/catalogue-bar.md) draws the bar at
`app/banner/merge-queue`. The mockups give the words of each label, line,
question, reason, and prompt.

## The Merge queue group

- The workspace list shows a Merge queue group at its top, above the
  sections, while a queue of the org has entries. This holds in the sidebar
  and on the list page, in the desktop layout and in the phone layout.
- The group holds one block for each queue with entries. The blocks follow
  the order of the repositories of the org, as
  [Repository order](repository-order.md) says.
- A block names its repository only while two or more queues of the org
  have entries.
- The group collapses as a section does, and its header then shows the
  count of its entries. The collapse is for the member only. The group has
  no menu. Reason: the group belongs to the app, as the Archived group
  does.
- Each row of the group is a normal workspace row: its list mark, its name,
  and its time, with its hover, its Archive, and its menu. It shows no
  place number and no step.
- A block lists its entries from place 1, the next to merge.
- A vertical line joins the list marks of the entries of a block. A block
  of one entry has no line.
- An entry that cannot merge stays on the line, in its place. Its list mark
  shows its GitHub state, such as red for failed checks, as
  [Workspace list marks](workspace-marks.md) says.
- A member stack has no outline of its own. Reason: the line already joins
  every entry.
- The user chose these rows in a review of the mockups on 22 November
  2026. Reason: the list mark already shows the GitHub state in its colour
  and running work with its motion, and the bar names the place and the
  step.
- A place number and a step line on each row, a "Needs attention" label,
  and an outline around a member stack were rejected in that review. The
  user said that the labels add nothing, and asked for a line that shows
  that the entries are connected.
- A queued workspace shows only in the group, as one flat row in queue
  order, and not in its section (decision 318). Its live sub-workspaces
  that are not queued move up a level, as
  [A queued workspace](sub-workspace-list.md#a-queued-workspace) says.

## Drags

- A member with write access to the repository drags an entry to another
  place of its block, as a row moves in a section. On a phone, a long press
  lifts the row.
- A drag lifts the whole unit of the entry. It moves the unit only inside
  its block, and the drop line falls only between two units.
- Moving the pointer, scrolling, and releasing each check the visible
  target under the pointer. A release outside the queue or its eligible
  block makes no queue change. Outside the group and sections, a dragged
  section row returns to its own place.
- When the move fails, the rows go back to their places, and a toast names
  the failure, as for a move between sections.
- During each drag of a row of a section, the group shows as a drop target
  (decision 317). While no queue has entries, the group shows as a zone
  with a dashed outline.
- Over the group, a row that can join shows where it joins: after the last
  entry of the queue of its repository, because a new entry joins at the
  top of the stack. A drop adds the workspace, as Add to merge queue does.
- A row that cannot join takes no drop. The group names the reason in
  place of the drop line. Reason: decision 317 shows the target during each
  drag, and a drop must not fail with no reason.
- The reasons are a branch with no open pull request, a unit that targets
  another branch than the default branch, a pull request from a fork, a
  member without write access to the repository, a default branch that
  needs GitHub's own merge queue, and a repository that another org
  already queues.
- The workspace list uses saved GitHub facts for the controls and drop
  reasons. Write access is specific to the viewer. The Worker refreshes
  those facts in the background and checks current access and eligibility
  on each queue change.
- Branch names in queue messages use labels that hide the known secret
  values from the workspace's latest computer start. See
  [Tokens and secrets](tokens-and-secrets.md).

## Add to merge queue

- A member adds a workspace from the bar, from the menu of its row, from
  the menu of the header, from the palette, or with a drag of its row into
  the group (decision 317). The user chose the menus, the palette, and the
  drag, and also asked for a control in the bar.
- Reason: the menus and the palette keep the rule of one main action in
  the bar, and a drag into the group matches a drag between sections.
- Each place offers Add to merge queue only for a workspace that can join,
  as [Who may join](merge-queue.md#who-may-join) says. It follows the
  access rules of [Merge](github-banner-merge.md#merge), so only a member
  with write access or more to the repository sees it.
- A queued workspace offers no Add to merge queue, also when its entry
  cannot merge. An archived workspace and a workspace of a suspended org
  offer none either.
- In the bar, Add to merge queue is an outline button after the main
  action, in the form of Archive after a merge. When the state has no main
  action, such as Checks running and Blocked, it shows alone. It shows on
  each state of an open pull request that is not queued.
- This changes decision 220 for this one action. The bar keeps one main
  action, and Add to merge queue is a second control beside it.
- Reason for a button: Checks running and Blocked have no main action to
  hold a menu. In the states of Fix checks and Resolve conflicts, a menu
  would hide Add to merge queue under an action of another kind.
- A menu on the main action of the bar, with Add to merge queue as its
  second row, was rejected for this reason (decision 317).
- Beside a main action in a bar narrower than 540 px, Add to merge queue
  shows only its icon, with its name as a tooltip and for screen readers.
  Reason: in the right column of 440 px, both labels leave one letter of
  the state. On a phone, both buttons show their words at the top of the
  Checks tab.
- In the menu of a row and of the header, Add to merge queue comes after
  the line, before Archive, as [The menu](workspace-menu.md#the-menu) says.
- Add puts the workspace at the top of the stack. It first marks a draft
  ready for review, as [Who may join](merge-queue.md#who-may-join) says. It
  also adds each lower pull request of a member stack, as
  [Member stacks](merge-queue.md#member-stacks) says.

## The bar of a queued workspace

- The bar of a queued workspace keeps the GitHub state of its pull request
  and its one main action, such as Fix checks (decision 220).
- A line under the bar, in the form of a message of the bar, names the
  place of the entry and the pull request that it builds on, such as
  "Place 3 of 3 in the merge queue. It builds on #479." The bottom entry
  builds on the trunk.
- While a step runs, the line says what it does, such as "Rebasing onto
  #479" or "Merging into main". The rebase keeps its words until the
  restack turn of a conflict ends.
- While the entry waits, the line says what the queue waits for, in place
  of the pull request below. It names its checks, its review, a rebase onto
  the branch below, the rules of GitHub, the push of local work, or a lower
  layer, such as "The queue waits for #479."
- The line also names a wait to check local work or to verify the change
  of the default branch.
- When the stored GitHub token of the queuer stopped working, or GitHub
  refused the merge, the line names that reason. After a refusal, the line
  also offers Open on GitHub. No GitHub error text reaches the browser.
- The line ends with Remove from queue for a member who may change the
  queue, as [Remove from queue](#remove-from-queue) says.
- The words say "place" and "builds on", not "above" and "below". Reason:
  the group lists place 1, the bottom layer, first, so the words of the
  stack read against the list.
- Reason for the line: the bar keeps the one main action of decision 220,
  and the place and the step need words.
- On a phone, the compact row of the bar names the place, such as "Queue 3
  of 3", also for an entry that cannot merge. The line stands at the top of
  the Checks tab, and its actions wrap under its words.

## Remove from queue

- Remove from queue shows at the end of the line, in the menu of the row
  and of the header, and in the palette. It follows the access rules of
  [Add to merge queue](#add-to-merge-queue).
- In the menu of a queued row, Remove from queue takes the place of Add to
  merge queue, as [The menu](workspace-menu.md#the-menu) says.
- A layer that merges offers no Remove from queue. Reason: a merge cannot
  stop for a removal.
- Remove from queue asks first. The question says that the pull request
  loses its place and names its planned base. An upper entry of a member
  stack can keep the branch below it. The question also names the upper
  entries of the unit that leave with the selected pull request. A later
  add joins at the end of the queue. On a phone, the question opens as a
  sheet.
- Reason: a member cannot get a place back.
- A confirmed removal runs the leave step, as
  [Leaving the queue](merge-queue.md#leaving-the-queue) says.

## Merge on a queued workspace

- On a queued workspace, Merge shows only while the layer and each entry
  ahead of it are in the same GitHub stack and ready to merge (decision
  316). Who sees Merge follows [Merge](github-banner-merge.md#merge).
- Its label counts the layers ahead of it in the queue, which land with it,
  such as "Merge with 2 ahead". Merge of the bottom layer keeps the label of
  its merge method, such as "Squash and merge". Reason: no layer lands with
  it.
- "Ahead" reads with the list, where place 1 shows first. The option of
  decision 316 said "Merge with 2 below", and only its words changed.
- A click asks the queue to merge up to that layer as its next step, with
  the GitHub token and the merge method of the member who clicks. Its
  tooltip names the method. The queue runs the click without the wait for
  the layer above, as [The merge](merge-queue.md#the-merge) says.
- While the queue merges, Merge shows that the merge runs, and the line
  says so.
- Merge stays after a failed token of the queuer and after a refusal of
  GitHub. Reason: it merges with the token of the member who clicks.
- While the cloud computer holds local work, Commit and push or Push takes
  the place of Merge, as outside the queue (decision 228).
- Reason for this Merge: it lands only what its label names, always into
  the trunk, and it never races the merge of the queue.
- These ways were rejected (decision 316):
  - No Merge on a queued workspace until a Remove from queue. It adds a
    gate.
  - A direct merge, as GitHub does. It races the merge of the queue, and
    during a rebuild it merges into the branch of another entry.
  - Merge now, which moves the entry to place 1, and lets the queue merge
    it next.
- A merge of the layer alone was left out, because GitHub refuses a merge
  of a layer without the layers below it. A question before the merge was
  left out, because decision 228 rejected it.

## Merge stack

- An unqueued workspace at a layer of a GitHub stack with open pull
  requests below it shows Merge stack (N) in the place of Merge. The count
  includes the target and each open layer below it (decision 324).
- When a lower layer is queued in this org, the click goes through the
  queue. The queued layers must be ready at the front of the queue. The
  queue uses the clicker's GitHub account and method to merge the stack up
  to the clicked layer.
- When a lower layer is queued in another org, the bar offers no Merge.
  It says "Another org's merge queue holds a pull request below this one."
  It names no other org or entry.
- When no lower layer is queued, the click starts a direct stack merge,
  as [Merge](github-banner-merge.md#merge) says.

## The prompts of a queued workspace

- GitHub merges a stack only with a linear history. So while a workspace
  is queued, Resolve conflicts, Merge latest, and the restack ask for a
  rebase, not a merge.
- Resolve conflicts and Merge latest use the branch selected by queue
  order. That branch is the trunk or the branch directly below the entry.
- Both actions read the stored workspace state at the click. They send no
  prompt if that read fails. A live GitHub event keeps the bar's queue
  read in progress.
- The prompts show branch labels. Their commands fetch by pull request
  number or fetch the default branch through GitHub's `HEAD`. They check
  the fetched head against the verified commit when known.
  Each prompt asks for `git rebase --onto` with the old base commit and for
  a push with `git push --force-with-lease --force-if-includes`.
  The agent stops if it cannot verify the base or if Git refuses the push.
- Reason: a plain rebase onto a lower layer that a restack rewrote would
  replay the old commits of that layer, and give more conflicts.
- These prompts go as a message of the member who clicks, as outside the
  queue. The restack prompt goes as a message of the queuer, as
  [Restack turns](merge-queue-stack.md#restack-turns) says.

## Commands

- Add to merge queue and Remove from queue are commands too, as each
  action of the pull request bar is (decision 199). The palette offers each
  one only while the page offers it to the person.
- Neither command has a default key, as
  [The default keys](keyboard-shortcuts-keys.md#the-default-keys) say.
- The keys that move a focused row of a section move a focused row of the
  group inside its block, as a drag does. A member stack moves as one unit.
- An agent call that moves a queued workspace to another section or under
  another parent changes its stored section or parent. The row stays in
  the group, and it shows there after it leaves the queue.
