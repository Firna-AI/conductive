# The design of the pull request bar

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the pull
request bar: its one main action in each state, the line under the bar,
the branches and the actions on top of the Checks tab of a phone,
Continue, and the merge queue.

- The pull request bar shows one main action in each state, beside its
  links to GitHub, from decisions 220 to 228. `barModel.ts` in
  [`src/ui/components/workspace/`](../../src/ui/components/workspace/)
  holds the rule: the action of each state, with
  the local work, the GitHub access of the viewer, and an action of the app
  that runs, and Merge needs a merge method. `barCopy.ts` beside it holds
  the labels, the messages under the bar, and the fixed prompts of the agent
  actions. Address review names "A reviewer" when GitHub names no login of
  a reviewer. `barIcons.ts` holds the icon of each agent action. They import
  no fixture, so the app uses them too.
  - On a tinted bar the main action takes the tint of the bar, so the
    button matches it: green, amber, red, or purple. A merged pull request
    tints its bar and its phone row purple, so Continue is purple too. The
    same button keeps that tint at the top of the Checks tab of a phone. On
    a bar without a tint, such as the bar without a pull request, the main
    action takes the outline tone of Archive, so the bar shows no primary
    fill. The user chose this on 10 and 11 November 2026. `TintedTheme` in
    [`src/ui/components/common/tint.tsx`](../../src/ui/components/common/tint.tsx)
    gives the primary tone of Firna the
    fill of the tint, a deeper fill on hover, and a white label, from the
    `successFill`, `warningFill`, `dangerFill`, `mergedFill`, and `onFill`
    tokens. `barTint` in `src/components/workspace/prStatus.ts` gives the
    tint of each state.
  - An agent action sends its fixed prompt, so the chat shows it as a
    message of the member who clicked. Merge names its method, such as
    "Squash and merge", and a spinner shows while the merge or Continue
    runs.
  - On desktop, the tooltip of each button that takes a click, and of each
    link to the pull request, gives its label and the key of its command,
    such as "Create PR (⇧⌘P)" or "Open pull request #482 on GitHub (⇧⌘G)",
    from decision 199. A busy or disabled button and a phone show no key.
    `ShortcutTip` in `src/components/common/` gives the tooltip.
  - The number of a pull request opens it on GitHub, with an arrow after a
    divider. `PullRequestNumber` in `src/components/workspace/barParts.tsx`
    draws it, so the bar of a
    pull request has no other link to it. The row of a phone is one link to
    the Checks tab, so its number stays plain, and the top of that tab keeps
    Open on GitHub.
  - A refusal of GitHub, a Continue that stopped, the wait of Continue for
    a turn, and a base that moved to the default branch show as one line
    under the bar. The line takes the tint of its state, and its bottom
    border stays neutral.
  - When GitHub no longer has the stored base of a workspace, the Worker
    moves the base to the default branch (decision 304). The bar then names
    the default branch, and its line says which branch GitHub no longer
    has. That line is a status in the neutral tone, with the info icon, and
    it shows until a pull request opens. The fact `baseMoved` of
    `barModel.ts` chooses it, and `barCopy.ts` gives its words. On a phone
    it stands at the top of the Checks tab, above the branch and its base.
  - On a phone the row opens the Checks tab. `ChecksActions` in
    `src/components/workspace/ChecksActions.tsx` draws the actions, the line,
    and the link to GitHub at the top of that tab, at touch size.
  - While the branch has no pull request, the top of the Checks tab of a
    phone names the branch and its base, where Create PR stands. The user
    chose this as decision 306 on 16 November 2026. `ChecksBranches` in
    `ChecksBranches.tsx`, beside `ChecksActions.tsx`, draws them with the
    parts of the desktop bar: the
    branch icon, the branch, an arrow, and the base, in the same font and
    colours. The names wrap, because a phone has no tooltip. When the two
    names do not fit on one line, the base moves to a line of its own with
    its arrow. A name that is longer than the line breaks. Create PR stands
    under them, in the same group. They show in each state without a pull
    request, also without an action, such as for a branch without commits.
    The compact row does not change.
  - `ContinueDialog` asks before Continue when the sandbox has local work.
    `LocalWorkList` in
    [`src/ui/components/workspace/`](../../src/ui/components/workspace/)
    lists that work for the app and the mockups: each changed file that is
    not committed, and the commits that no remote branch holds.
    `ContinuedLine` in [`src/ui/components/chat/`](../../src/ui/components/chat/)
    draws the note of Continue in each session, centred and muted, as the
    first line of a linked session. It takes no fixtures.

## The merge queue

[Merge queue](../protocol/merge-queue.md) gives a merge queue for each repository,
which lands its pull requests into the default branch as one GitHub
stack (decisions 313 and 320). The bar shows the queue in two parts.
`queueModel.ts` in
[`src/ui/components/workspace/`](../../src/ui/components/workspace/)
holds the rule, and `queueCopy.ts` beside it holds the words.
`barModel` reads the queue from the optional fact
`queue`, so a bar without it shows no part of the queue.

- Add to merge queue is an outline button after the main action, or alone
  when the state has none, such as Checks running and Blocked. It takes
  the form of Archive after a merge, from the design call of decision 317.
  It shows on each state of an open pull request that is not queued. It
  needs write access, and a pull request whose unit targets the default
  branch. A queued workspace shows no Add to merge queue, also when it
  cannot merge. `QueueAddButton` in `QueueBarParts.tsx` draws it. Beside a
  main action in a bar narrower than 540 px, it shows only its icon in
  the outline tone, with its name as a tooltip and for screen readers, as
  a link to GitHub keeps only its mark. So the words of the state stay in
  the right column of 440 px.
- A queued workspace gets a line under the bar, after a message of the
  bar. `QueueLineView` in `QueueBarParts.tsx` draws it with the parts of
  that message. It names the place and the pull request below, such as
  "Place 3 of 3 in the merge queue. It builds on #479.", and what the step
  does, such as "Rebasing onto #479", with a spinner while a step runs. It
  ends with Remove from queue, in the outline tone, for a member with write
  access. Remove from queue asks first, and on the lower entry of a member
  stack the question names the entries above it, which leave too. The
  words say "builds on" and the place, not "above" or "below", because
  the Merge queue group lists place 1, the bottom layer, first.
- An entry that cannot merge keeps its place, and the bar keeps its main
  action, such as Fix checks or Address review, as outside the queue,
  because Cal chose on 22 November 2026 that the user handles a failure.
  The queue sends it no fix turn. The line keeps its neutral form, with
  no tint, and says what the queue waits for in place of the pull request
  below: "The queue waits for its checks." for failed checks, its review
  for requested changes, a rebase onto the branch below for a conflict,
  and GitHub for a block of its rules. A layer above an entry that cannot
  merge names it, such as "The queue waits for #479.", and so does a ready
  layer above a layer that is not ready yet. When the stored GitHub token
  of the queuer fails, or GitHub refuses the merge, the line names that
  reason. A refusal ends the line with Open on GitHub, before Remove from
  queue. Merge with the layers ahead stays while each layer is ready,
  because it merges with the token of the member who clicks.
  `queueLineText` in `queueCopy.ts` gives the words, and `cannotMerge` in
  `queueModel.ts` gives the GitHub states that wait for a member.
- A conflict of the queue's own move of a layer gets one agent turn as
  the queuer, with the restack prompt, as Cal chose for decision 321 A on
  23 November 2026. The move keeps its line, "Rebasing onto #479", with a
  spinner, until that turn ends. When the conflict stays, the queue sends
  no second turn. The entry then waits as an entry that cannot merge: the
  bar keeps Resolve conflicts, and the line says "The queue waits for a
  rebase onto #479.".
- A layer whose cloud computer holds local work that is not pushed is not
  ready, because a merge must not leave that work behind (decision 228).
  The bar keeps Commit and push, or Push, in the place of Merge, as
  outside the queue, and the line says "The queue waits for its local work
  to be pushed.". `barQueueOf` in `queueModel.ts` gives the line the local
  work of the bar, so the words and the button always agree. A lower layer
  that the queue waits for still comes first in the line.
- Merge on a queued workspace goes through the queue (decision 316 D). It
  shows only while the layer and each layer below it are in the stack and
  ready, and its label counts the layers ahead of it in the queue, such
  as "Merge with 2 ahead". "Ahead" reads with the list, where place 1
  shows first. The bottom layer keeps the label of its merge method, because
  no layer lands with it. `queuedMerge` in `queueModel.ts` gives the rule.
- While a workspace is queued, Resolve conflicts asks for a rebase onto
  the branch below, with `git push --force-with-lease`, because a GitHub
  stack needs a linear history. The fact `rebase` of the prompt facts in
  `barCopy.ts` chooses it. `restackPrompt` beside it gives the one turn of
  the queue for a conflict of its move of a layer onto the newest head
  below it, with `git rebase --onto`, and names the new head and the old
  base commit.
- On a phone the compact row names the place, such as Queue 3 of 3, also
  for an entry that cannot merge. The line stands at the top of the Checks
  tab, above the buttons.
