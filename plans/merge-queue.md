# Merge queue

Status: Active. On branch `calummoore/merge-queue-k2ep`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today each workspace merges its own pull request with Merge in the pull
request bar. Many workspaces of one repository work at the same time. When
one pull request merges, the others get conflicts. An agent fixes them, then
another pull request merges first, and the cycle repeats. Cal asked on 20
November 2026 for a merge queue: a member adds a ready pull request to the
queue, each queued pull request builds on the ones ahead, members can
re-order the queue, and the sidebar shows the queue as its own group while
it has rows. The brainstorm notes are in `.context/merge-queue/brief.md`.

This change builds one queue for each repository, into its default branch
(decision 320). The
queue is one GitHub stack. Each queued pull request targets the branch of
the pull request ahead of it, so its agent fixes the conflicts with the work
ahead once, while it waits. The Worker merges the highest pull request whose
layers are all green, and GitHub lands it with every layer below it. The
queue acts as the member who queued each pull request. A stack that a member
made stays together in the queue.

The change does not cover GitHub's own merge queue, a queue for pull
requests from forks, or agent tools that add to the queue. See the design
calls.

Contract owners:

- A new protocol doc, `docs/protocol/merge-queue.md`.
- [GitHub banner](../docs/protocol/github-banner.md).
- [Base branches](../docs/protocol/base-branches.md).
- [GitHub tokens](../docs/protocol/github-tokens.md).
- [Sections](../docs/protocol/sections.md).
- [Protocol docs](../docs/architecture/protocol-docs.md), which lists each
  protocol doc.
- The Terms page in `src/marketing/terms.ts`, the Privacy page in
  `src/marketing/privacy.ts` with its data uses in
  `src/marketing/privacy-uses.ts`, and the public guides in
  `src/marketing/docs/`, mostly `pull-requests.md` and `workspaces.md`.
- The READMEs of `worker/github/`, `worker/app-api/`, `worker/chat/`,
  `worker/lifecycle/`, `src/github/`, `src/shell/`, and `migrations/`.

## Terms

- **Queue:** the ordered list of queued workspaces of one repository, which
  merge into its default branch, such as `main`. Every member of the org
  sees the same queue.
- **Entry:** one queued workspace in a queue, with its open pull request,
  its place, and the member who queued it.
- **Queuer:** the member who added an entry to the queue.
- **GitHub stack:** GitHub's own stacked pull requests, generally available
  since 6 October 2026 on every github.com plan. The bottom pull request
  targets the trunk. Each pull request above targets the branch of the one
  below. A merge of one pull request also merges every pull request below
  it, in one step.
- **Trunk:** the target branch of a queue, at the bottom of its GitHub
  stack. It is always the default branch of the repository (decision 320).
- **Layer:** one pull request of the GitHub stack.
- **Restack:** a move of a layer onto a new branch below it, with
  `git rebase --onto`, and a push of the result.
- **Fix turn:** an agent turn that the queue sends as a message of the
  queuer, with a fixed prompt, such as a restack or Fix checks.
- **Member stack:** pull requests that a member stacked without the queue,
  with a start from another branch (decisions 298 and 301).

## Decisions

The numbers 313 to 320 were the next free numbers on 22 November 2026, on
`main` and on every open branch. Decisions 313 to 315 hold Cal's answers of
22 November 2026, with the options and the letters that Cal saw in the
brainstorm. Decisions 316 to 320 hold Cal's later answers of the same
day, and decision 321 holds his answer of 23 November 2026. No decision is
open.

A second options check ran on the same day over the changed decision 318,
decision 320, and the new design calls. It added option D to decision 318
and changed its recommendation from A to D, and it corrected the trunk
calls. Its report is in `.context/merge-queue/options-check-2.md`.

An options check ran over the decisions and the design calls on 22 November
2026. It added option D to decision 316 and changed its recommendation from
B to D. It found decisions 317 to 319, corrected the design calls, and added
costs and assumptions to decisions 313 to 315. Its report is in
`.context/merge-queue/options-check.md`.

### Decision 313: how the merge queue works

Chosen by Cal on 22 November 2026: F. A Conductive queue that is one GitHub
stack. Waiting pull requests fix their conflicts in parallel, and one merge
can land many of them. A red pull request blocks every pull request above
it, and a re-order rebuilds the stack. The base of a queued workspace
follows GitHub.

- Root question: how does Conductive merge many ready pull requests in an
  order that members control, so that each pull request fixes its conflicts
  with the work ahead of it only once?
- Shared assumptions: one queue lands work into one target branch of one
  repository (task message). Each entry is a workspace with an open pull
  request (architecture doc). GitHub keeps the final say, and nothing
  bypasses its rules (`github-banner.md`, under "Merge").
- A cost that the options check found after the choice: GitHub merges a
  stack only with a linear history. A merge into the trunk from outside
  the queue, or a push to a lower layer, breaks it. Each layer above then
  needs a restack, one after another, before the next merge. So the queue
  works best when every merge of the repository goes through it.
- This changes two requirements in force, for queued workspaces only. The
  bar's doc says that stacked pull requests are not part of the bar. Base
  branches says that a base change on GitHub does not change the base of a
  workspace (decisions 301 and 304). Cal saw both in the text of option F.
- Rejected:
  - D, a "merge captain" agent with no product change. It is fragile, keeps
    a cloud computer running, and has no sidebar group.
  - C, GitHub's merge queue with Conductive as a client. It allows only
    "jump to the front", drops a pull request on a conflict, and needs a
    merge queue rule and a `merge_group` CI trigger in each repository.
  - A, a Conductive queue with no stacking. A head that needs a fix holds
    the queue for the fix and a CI run.
  - B, a queue that the agents restack with no GitHub stack. GitHub then
    runs no checks on the combined work ahead, and each merge needs one
    call for each pull request. B needs no restack of its bottom pull
    request after a merge from outside the queue.
  - E, A first and F later. Cal chose stacks in the first release.
- Left out in the brainstorm: a merge with no order, because two pull
  requests that change one file still loop. A combined branch that closes
  the original pull requests, because Continue and the merge records then
  break. Mergify, Aviator, and Graphite, because each needs a second GitHub
  App in each org and drops a pull request on a conflict. Restacks by the
  app with no agent, because decision 220 rejected code changes by the app.
  Decision 319 brings back GitHub's own server rebase.

### Decision 314: who acts when nobody clicks

Chosen by Cal on 22 November 2026: A. The queue acts as the queuer of each
entry. It merges with the queuer's stored GitHub token, as automations use
the owner's token, and it sends each fix turn as a message of the queuer.

- Root question: whose authority does the queue use to merge and to start
  fix turns after a member queues a pull request?
- This changes decision 228 for queued merges: a queued merge carries the
  head that the queue last read and checked, not a head that a member saw.
  It also changes the sentence of the Privacy page that says a merge uses
  the token of the member who clicks.
- Assumptions that the options check named, and how the design keeps them:
  - The queuer stays a member of the org with write access. Each step
    checks this, and a queuer who lost it makes the entry leave.
  - The stored token stays usable. After a failed refresh, the entry waits,
    and its bar line names the reason (see "Failures").
  - A fix turn uses the agent login of its session, as every message does,
    not a quota of the queuer.
  - One merge lands the layers of several queuers with the token of the
    queuer of its highest layer. Each of those queuers approved a merge.
- Rejected:
  - B, fix turns as the queuer but a click on "Merge next" for each merge.
    The queue then stops each time nobody is there.
  - C, nothing runs without a click. A queue that only shows an order does
    not stop the loop.
- Left out: a Conductive bot account, because work on GitHub always runs as
  a member (decision 50). The workspace owner, as for a moved base
  (decision 307), because the owner did not ask for the merge.

### Decision 315: stacks that members make themselves

Chosen by Cal on 22 November 2026: A. A member stack moves through the
queue as one unit. Its upper pull request always stays directly above its
lower pull request.

- Root question: how does the queue keep a stack that a member made in the
  right order?
- The design reads a member stack from GitHub: the GitHub base of each pull
  request and the `stack` object of a stack that a member made on the
  GitHub website. Reason: the base of a workspace does not follow a base
  change on GitHub outside the queue (decisions 301 and 304).
- Rejected:
  - B, the upper pull request goes anywhere but waits until the lower one
    merges. The queue can then hold a layer that cannot merge.
  - C, a stacked pull request cannot join until its lower one merged. This
    adds a refusal.

### Decision 316: what Merge does on a queued workspace

Chosen by Cal on 22 November 2026: D. Merge shows on a queued workspace
only while the layer and each layer below it are in the GitHub stack and
ready. Its label counts the layers below, and the click asks the queue to
merge up to that layer as its next step, with the token of the member who
clicks. The record below keeps the options that Cal saw.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/github/merge.ts:60`, `docs/protocol/github-banner.md`, under "Merge".
- **Background:** Merge in the bar does a direct merge of the workspace's
  pull request. In a GitHub stack, a merge of one layer also merges every
  layer below it. While the queue rebuilds its stack, a queued pull request
  targets the branch of another entry.
- **Problem:** No rule says what Merge does on a queued workspace. A direct
  merge can land layers that the bar does not show, or land the work into
  another entry's branch.
- **Impact if no action:** A member who clicks Merge on the third entry
  also merges the first and the second. During a rebuild, the click merges
  the work into the wrong branch.
- **Root question:** What does Merge do for a queued pull request, so that
  one click never lands more, or into another branch, than the bar shows?
- **Options:**
  - **A.** No Merge on a queued workspace. The bar offers Remove from queue,
    and Merge comes back after the removal. This adds a gate. Effort: Small.
  - **B.** Merge stays, with the label "Merge with 2 below". It does a direct
    merge, as GitHub does. It races the queue's own merge, and during a
    rebuild it merges into another entry's branch. Effort: Small.
  - **C.** "Merge now" moves the entry to the bottom of the queue, which
    restacks it onto the trunk, and the queue merges it next. Effort:
    Medium.
  - **D.** B's label, shown only while the layer and each layer below it
    are in the GitHub stack and ready to merge. The click asks the queue to
    merge up to that layer as its next step, with the token of the member
    who clicks. Effort: Medium.
- **Left out:** A merge of the layer alone, because GitHub refuses a merge
  of a layer without the layers below it. A question before the merge,
  because decision 228 rejected it.
- **Wider fix:** D. Each merge of a queued layer then goes through the
  queue.
- **Previous examples:** GitHub's own merge box shows a count badge of the
  layers that a merge brings with it.
- **Recommendation:** D, in place of B, the first recommendation. It lands
  only what the label names, always into the trunk, and it never races
  the queue.
- **Action:** ask the user, because each option adds bar behaviour that no
  requirement covers.

### Decision 317: where a member adds a pull request to the queue

Chosen by Cal on 22 November 2026: D, and a control in the pull request
bar too. Cal's words: "D + i think it should also be possible from the
github status bar". This changes decision 220 for this one action.

- Design call of the agent, 22 November 2026: the bar control is an
  outline button in the form of Archive after a merge, beside the main
  action or alone. It shows to members with write access, on each state of
  an open pull request that is not queued. Reason: Checks running and Blocked have no main action to hold a
  menu, and in the states of Fix checks and Resolve conflicts a menu would
  hide Add to merge queue under an action of another kind. The mockups
  show it before the build.
- The record below keeps the options that Cal saw.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/github-banner.md:125`, `docs/protocol/command-palette-actions.md:116`.
- **Background:** The bar shows one main action for each state (decision
  220), such as Merge or Fix checks. Merge latest got a palette row only,
  because "a second control there needs its own design" (merge latest
  decision 2 A).
- **Problem:** Add to merge queue fits every state of an open pull request,
  so it cannot replace one main action.
- **Impact if no action:** The queue has no control to add an entry.
- **Root question:** Where does a member say that a pull request is ready
  for the queue?
- **Options:**
  - **A.** A second control in the bar, beside the main action, while the
    pull request is open. It changes decision 220. Effort: Small.
  - **B.** A menu on the bar's main action, with Add to merge queue as its
    second row. Effort: Small.
  - **C.** Add to merge queue in the menu of the workspace row, in the
    workspace header menu, and as a palette command. Effort: Small.
  - **D.** C, and a drag of a workspace row into the Merge queue group,
    which shows as a drop target during each drag. Effort: Medium.
- **Left out:** A chat command to the agent. The agent tools do not act on
  the queue in this change.
- **Wider fix:** None. This is one choice of controls.
- **Previous examples:** Merge latest decision 2 A put a second action in
  the palette only.
- **Recommendation:** D. The row menu and the palette keep the bar's rule,
  and a drag into the group matches a drag between sections.
- **Action:** ask the user, because A and B change decision 220, and C and
  D add controls that no requirement covers.

### Decision 318: a queued sub-workspace in the list

Chosen by Cal on 22 November 2026: D. A queued workspace leaves its
section and shows once, as a flat row in the group, in queue order. Its
live sub-workspaces that are not queued show under the nearest workspace
above them that is not queued, as for an archived parent (sub-workspace
decision 5 C). They go back under it when it leaves the queue. This changes
sub-workspace decision 1 C for queued workspaces. Cal chose after a drawing
of the four options, in `.context/merge-queue/318/options.png`.

Cal's first answer on 22 November 2026: "it only applies to branches targetting
main". Decision 320 records that answer as the scope of the queue. It does
not settle this decision. A sub-workspace is a row nested under the row of
the workspace that created it. Its nesting does not depend on its target,
and most sub-workspaces target `main`. So a queued sub-workspace that
targets `main` still needs a place in the list. A sub-workspace that
stacks on its parent's branch joins together with its parent, as one unit
(decision 315).

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/sub-workspaces.md:168`, `src/app/sections.ts:47`.
- **Background:** Each live sub-workspace shows nested under the row of its
  parent (sub-workspace decision 1 C). The plan moves each queued workspace
  from its section into the Merge queue group.
- **Problem:** A queued sub-workspace would leave its parent's tree. No rule
  says where the sub-workspaces of a queued parent show.
- **Impact if no action:** The list breaks decision 1 C, or a queued
  workspace shows in two places.
- **Root question:** How does the list show the queue order and each tree
  when one workspace is in both?
- **Options:**
  - **A.** The group shows every queued workspace as a flat row. Its tree
    stays in the section, and the queued row there gets a mark with its
    place, such as "Queue 2". So a queued workspace shows twice. Effort:
    Small.
  - **B.** A queued workspace moves to the group alone. A queued
    sub-workspace leaves its parent's tree, and the sub-workspaces of a
    queued parent stay nested under it in the group. It changes decision
    1 C for queued workspaces. Effort: Small.
  - **C.** Every queued workspace stays in its section, with the mark of A.
    The group shows only for a queued workspace whose tree is not queued.
    Effort: Small.
  - **D.** A queued workspace leaves its section, as an archived one does,
    and shows as a flat row in the group. Its live sub-workspaces show
    under the nearest workspace above them that is not queued, as for an
    archived parent (sub-workspace decision 5 C). It changes sub-workspace
    decision 1 C for queued workspaces, and the shared placement rule in
    `src/shared/workspace-tree.ts`. Effort: Medium.
- **Left out:** No group, with only marks in the sections, because Cal asked
  for a group of its own.
- **Wider fix:** D. One placement rule then serves the Archived group and
  the Merge queue group.
- **Previous examples:** The Archived group moves each archived workspace
  out of its section. Sub-workspace decision 5 rejected a row that shows
  twice, in its section and in the Archived group.
- **Recommendation:** D, in place of A, the first recommendation. It
  follows the Archived group, and sub-workspace decision 5 already
  rejected a row that shows twice.
- **Action:** ask the user, because A shows a workspace twice, and B and D
  change sub-workspace decision 1 C.

### Decision 319: who rebases a layer that has no conflict

Chosen by Cal on 22 November 2026: B. The queue first asks GitHub for a
server rebase of the layer, and sends a fix turn only on a conflict. If the
Milestone 3 check shows that the server rebase does not keep only the
layer's own commits after a squash merge below it, the plan asks Cal again
before Milestone 6. The record below keeps the options that Cal saw.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/github-banner.md:172`.
- **Background:** A layer must hold the newest head of the layer below it.
  GitHub's GraphQL route `updatePullRequestBranch` with `REBASE` rebases
  one branch on GitHub's servers. Decision 220 rejected code changes by the
  app.
- **Problem:** Most restacks have no conflict. A fix turn for each one costs
  an agent turn, a running cloud computer, and minutes.
- **Impact if no action:** Each re-order and each push to a lower layer
  starts one agent turn for each layer above, one after another.
- **Root question:** How does a layer move onto the newest head below it
  when the move has no conflict?
- **Options:**
  - **A.** A fix turn for every restack. Effort: Small.
  - **B.** GitHub's server rebase first, and a fix turn only on a conflict.
    It changes decision 220. Milestone 3 must first show that it keeps only
    the layer's own commits after a squash merge below. Effort: Medium.
- **Left out:** A rebase that the Worker runs itself in the cloud computer
  with no agent. It changes decision 220 like B, and B needs no cloud
  computer.
- **Wider fix:** None.
- **Previous examples:** GitHub's own "Rebase stack" button runs a server
  rebase.
- **Recommendation:** B, when the Milestone 3 check passes. Otherwise A.
- **Action:** ask the user, because B changes decision 220.

### Decision 320: the branch that a queue merges into

Chosen by Cal on 22 November 2026, in the answer to decision 318: "it only
applies to branches targetting main".

- The agent's reading, recorded on 22 November 2026: "main" means the
  default branch of the repository, so the queue merges only into the
  default branch. The bottom pull request of each unit must target it. The upper layers of
  a member stack target the branch below them, and they still join with
  their unit (decision 315). A pull request whose unit targets another
  branch, such as `develop`, cannot join.
- Reason: the queue lands work in `main`, where the conflicts come from.
- Rejected: a queue for each target branch, which the first plan draft
  held. It adds a block for each branch and a rule for the trunk of each
  queue.

### Decision 321: who resolves the conflict of a restack

Chosen by Cal on 23 November 2026: A. When the queue's own move of a layer
has a conflict, the queue sends one agent turn as the queuer, with the
restack prompt. If the turn does not resolve it, the entry waits in its
place for a member, as "Failures" says. The record below keeps the options
that Cal saw.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `plans/merge-queue.md`, under "Failures" and decision 319.
- **Background:** The queue moves a layer onto the newest work below it
  when a pull request joins, after a re-order, and after a push to a lower
  layer. GitHub's server rebase does the move (decision 319). When the
  move has a conflict, the first design sent an agent turn as the queuer
  to resolve it. On 22 November 2026 Cal chose that failures are handled
  by the user.
- **Problem:** A conflict of a restack is not a failure of the pull
  request. The queue's own move causes it. Cal's words do not say whether
  it counts as a failure.
- **Impact if no action:** Milestone 6 cannot build the restack.
- **Root question:** When the queue's own move of a layer has a conflict,
  who resolves it?
- **Options:**
  - **A.** The queue sends one agent turn as the queuer, with the rebase
    prompt, as decision 319 B says. If the turn does not resolve it, the
    entry waits for the user, as for a failure. Effort: Small.
  - **B.** The user, as for any conflict. The bar shows Resolve conflicts
    with the rebase prompt, and the entry and each layer above it wait.
    Effort: Small.
  - **C.** A for a join and a re-order, which a member started, and B for
    a push to a lower layer. Effort: Small.
- **Left out:** The queue rebases with no agent, because a conflict needs
  a decision about the code.
- **Wider fix:** None. This is one choice of who acts.
- **Previous examples:** Decision 319 B sends a turn only on a conflict.
- **Recommendation:** A. Each pull request then builds on the work ahead
  with no click, which is the goal of the queue, and a failure of that
  turn still goes to the user.
- **Action:** ask the user, because Cal's words of 22 November 2026 can
  read as B.

## Design

These are design calls of the agent, made on 22 November 2026, unless a
line names a decision. The options check corrected them on the same day.

### The queue

- One queue for each repository of an org. Its trunk is the default
  branch (decision 320). The queue stores the trunk's name, and the leave
  step resets bases to that stored name.
- One rule holds at Add and at each read: a unit stays while its bottom
  pull request targets the default branch on GitHub. Reason: the stored
  base of a workspace does not follow GitHub outside the queue.
- Add to merge queue shows only for a pull request whose unit targets the
  default branch. Reason: a control that is sure to fail helps nobody, as
  for Merge. So the list read carries the GitHub base of each open pull
  request beside its bar state.
- A rename of the default branch keeps every entry. GitHub moves the base
  of each open pull request to the new name, and that move is not a leave.
  The queue stores the new name. Reason: decision 310 rejected a rename
  that makes members act again.
- A switch of the default branch to another branch makes every unit leave,
  before any restack. Reason: the stack's trunk is then not the default
  branch, and no member chose the new one.
- Two orgs can save the same repository. A unit whose repository already
  has a queue with entries in another org cannot join. Add to merge queue
  does not show for it, and the drop target names the reason. Reason: two
  queues would break each other's GitHub stack,
  and one org must not see another org's queue.
- Every member of the org sees each queue. A member with write access or
  more to the repository can add, remove, and re-order entries. Reason:
  Merge already needs that access (decision 221), and every member sees one
  order, as for sections.
- Any workspace with an open pull request from the same repository can
  join, also with failed checks or a conflict. The entry then waits in its
  place until a member fixes it, as "Failures" says.
  Reason: Cal asked that anything with a pull request is eligible.
- Add on a draft first marks it ready for review as the member who adds,
  as Ready for review does. Reason: GitHub does not merge a draft.
- A pull request from a fork cannot join. Reason: a GitHub stack needs
  every branch in one repository.
- One leave step serves every cause. The causes are a merge, a close, a
  change to draft, an archive, a repository or branch change, Continue,
  Remove from queue, a base change on GitHub that the queue did not make, a
  queuer who left the org or lost write access, and a suspended org.
- The leave step sets the GitHub base of the lowest pull request of the
  leaving unit back to the trunk, so that no entry keeps another entry's
  branch as its base. Each upper pull request of a member stack keeps the
  branch below it in its unit. The step then moves the units above it onto
  the unit below it. Reason: a removal must not break the stack that the
  member made (decision 315). Agent's call of 22 November 2026, after the
  mockups.
- A member stack joins as one unit (decision 315). Add on its upper
  workspace adds each lower pull request that is not queued yet, in stack
  order. A drag moves the unit. Remove from queue on a lower entry also
  removes the entries above it in the unit, and the question says so.

### The GitHub stack

- The queue keeps one GitHub stack for each queue, through the REST stacks
  API: create, add, and unstack. Unstack removes every open layer. So each
  leave and each re-order ends with a new stack and a new stack number,
  which the queue saves.
- The queue keeps one rule after each read of GitHub: from the lowest layer
  that does not hold the newest head of the layer below it, it restacks
  each layer upward. Every cause uses this rule: a join, a re-order, a
  leave, a fix push on a lower layer, and a merge into the trunk from
  outside the queue.
- The bottom layer must hold the newest trunk head when the stack forms.
- A new entry joins at the top. It first restacks onto the branch of the
  layer below it. Then the Worker sets its GitHub base, and then it adds the
  pull request to the stack. Reason: a base that already holds the head of
  the layer would show that layer's commits as removed, so the code that
  changes a base never sets a base that holds the head.
- A restack with a fix turn uses plain Git, `git rebase --onto origin/<new
  base> <old base commit>`, and `git push --force-with-lease`. The prompt
  names both commits. Reason: the cloud computers have no `gh stack`
  extension, and `--onto` keeps only the layer's own commits, also after a
  squash merge below it. Decision 319 holds a server rebase first.
- GitHub needs a linear history. While a workspace is queued, the bar's
  Resolve conflicts, Merge latest, and the restack prompts ask for a
  rebase, not a merge.
- While a workspace is queued, Resolve conflicts names the old base commit
  and runs `git rebase --onto`, as the restack prompt does. Reason: a plain
  rebase onto a lower layer that a restack rewrote would replay that
  layer's old commits and give more conflicts. Agent's call of 23 November
  2026, after the mockups.

### The base follows GitHub

- A queued workspace stores the branch of the layer below it as its base.
  The bottom entry stores a null base, which means the default branch, as
  a create and Continue store it (decision 312).
- Each base change runs the saved base move of the workspace, with its
  fetch (decisions 307 and 308). The fetch uses the workspace owner's
  token, as for a moved base.
- When GitHub changes the base of a queued pull request, such as after a
  merge below it, the `pull_request` `edited` webhook moves the stored base
  to the new GitHub base (decision 313). The move gives the same result when
  the same change arrives twice, also for the queue's own base changes. A
  base change that the queue did not make is a leave. Workspaces outside
  the queue keep decisions 301 and 304.
- After a merge, GitHub rebases each remaining layer, so each workspace
  branch on GitHub gets new commits. The Worker then runs a guarded sync in
  each such cloud computer, when no session runs a turn and the repository
  folder has no changes. It fetches the branch. When the local branch
  equals the old GitHub head, it moves the local branch to the new head.
  Otherwise it sends a restack fix turn. Reason: an old local branch would
  make the agent's next push fail or undo GitHub's rebase.

### The merge

- The Worker merges the highest layer whose bar state is "ready to merge",
  when each layer below it is "ready to merge" too. Reason: the bar state
  already reads the checks, the conflicts, the reviews, and the block of
  GitHub's rules, such as unresolved threads.
- While the layer directly above the highest ready layer runs its checks,
  the queue waits for it, up to 15 minutes. Reason: each merge makes GitHub
  rebase every layer above and run their checks again, so a merge at once
  would often land only the bottom layer.
- It merges with the async merge route, `merge_action: direct_merge` and
  `bypass_rules: false`, and the head of the layer that it last read. It
  uses the stored token of the queuer of the highest layer (decision 314),
  and that queuer's merge method, as Merge does.
- A layer whose cloud computer holds local work that is not pushed is not
  ready, as the bar puts Commit and push before Merge. The queue waits,
  and the bar line says "The queue waits for its local work to be
  pushed.". Reason: a merge must not leave that work behind
  (decision 228).
- A stack merge can stop partway. After each merge, the queue reads each
  layer again before its next step.
- Each merged layer gets a merge record, as a merge from the bar does.
  Continue then works in each merged workspace.

### Failures

Cal chose on 22 November 2026 that a failure is handled as it is outside
the queue: "if something fails it should just be handled normally, I.e by
the user. And the user can remove from the queue rather than fix they
prefer". This replaces the first design, which sent one automatic fix turn
and then moved the entry out of the stack as "Needs attention".

- The queue sends no fix turn for failed checks or requested changes. The
  bar of the workspace shows Fix checks or Address review, as it does
  outside the queue, and a member acts or removes the entry.
- A conflict of a restack gets one agent turn as the queuer (decision 321).
  When that turn ends and the conflict stays, the entry waits like any
  failure, and its bar line says "The queue waits for a rebase onto
  #479.", with Resolve conflicts as the main action.
- An entry that cannot merge keeps its place on the line. Its list mark
  shows its GitHub state, such as red for failed checks. The layers below
  it still merge. The layers above it wait. Reason: Cal asked for no
  section of its own and for the user to decide. A member who wants the
  layers above to go first removes it or drags it up.
- The bar line of a waiting entry says what the queue waits for, such as
  "The queue waits for its checks", or for the layers above, "The queue
  waits for #479". The bar line also names the reason when the queuer's
  stored token fails or GitHub refuses the merge, with Open on GitHub.
- An automatic turn of the queue goes to the newest open session of the
  workspace. The queue waits until no session of the workspace runs a
  turn. Reason: a message during a turn joins that turn and pushes as the
  sender of that turn.
- A stopped cloud computer resumes for an automatic turn, as a message
  from an agent tool does.

### Re-order

- A drag in the sidebar group changes the order. Unstack cannot start at a
  place in the stack, so a re-order unstacks the whole stack. No merge runs
  until the new stack exists.
- Each changed entry restacks first, from the bottom up, one after the
  other. The Worker then sets its GitHub base, and adds the layers back.
- A re-order cannot move an entry below a layer that is merging.

### Storage and coordination

- A new D1 table holds the queues, and a second one holds the entries, with
  the place, the queuer, the state, and the time of each step. The
  migration adds tables only, so the previous Worker keeps working.
- One Durable Object for each queue runs every step in order, with an
  alarm, as the image coordinator does on a named object of the `Workspace`
  class. Reason: two steps of one queue must never run at the same time.
- The member routes go through the queue object too.
- Webhooks, the end of a fix turn, an archive, Continue, and a repository
  change wake the queue object. The object collects its wakes through its
  alarm, and it reads GitHub once for each alarm. Reason: check webhooks
  come often, and GitHub's hourly limit of the App is shared.

### The app

- A "Merge queue" group shows at the top of the sidebar list only when a
  queue has entries. It holds one block for each queue, headed by the
  repository. Each row shows its place, the state of its
  step, and the state of its checks. A queued workspace shows only there,
  and its sub-workspaces that are not queued move up a level, as for an
  archived parent (decision 318).
- A member with write access drags a row to re-order, as in a section. A
  phone lifts a row with a long press.
- A member adds an entry from the bar, the row menu, the header menu, the
  palette, or a drag of a row into the group, which shows as a drop target
  during each drag (decision 317). The bar of a queued workspace names its
  place and the pull request below it, and gets Remove from queue. Merge
  there goes through the queue (decision 316).
- Each new action is also a command, as each action of the app is
  (decision 199).
- The list read carries the entry of each queued workspace, through a new
  field of the Rust `Workspace` type and its generated TypeScript. The bar
  read carries the queue state of its workspace.
- A click on "Merge with 2 ahead" merges with the merge method of the
  member who clicks, as Merge outside the queue does (`worker/github/merges.md`).
  Its tooltip names the method. The queue runs the click as its next step,
  without the wait for the layer above. Agent's call of 22 November 2026,
  after the mockups.
- During each drag of a row, the group shows as a drop target. For a row
  that cannot join, such as a pull request into another branch or a member
  without write access, the target names the reason and takes no drop.
  Reason: decision 317 shows the target during each drag, and a drop must
  not fail with no reason. Agent's call of 22 November 2026, after the
  mockups.
- Design calls of the agent, 22 November 2026, that the mockups of
  Milestone 1 forced. `app/merge-queue` and `app/banner/merge-queue` draw
  them.
  - The bar of a queued workspace keeps the GitHub state of its pull
    request and its one main action. A line under the bar, in the form of
    a message of the bar, names the place and the pull request below, such
    as "Place 3 of 3 in the merge queue. It builds on #479.". It says what
    a running step does, such as "Rebasing onto #479", and it ends with
    Remove from queue. Reason: the bar keeps the one main action of
    decision 220, and the place and the step need words.
  - Replaced on 22 November 2026 by "Failures": an amber line for an
    entry that needs attention. The bar keeps its fix, such as Fix checks,
    and the line says what the queue waits for.
  - Remove from queue asks first. The question says that the pull request
    loses its place and targets the default branch again. On the lower
    entry of a member stack, it names the entries above it, which leave
    too. A layer that merges offers no Remove from queue. Reason: a member
    cannot get a place back, and a merge cannot stop for a removal.
  - The words of the line and the rows say "place" and "builds on", not
    "above" and "below". Reason: the group lists place 1, the bottom
    layer, first, so the words of the stack read against the list. For
    the same reason, the label of Merge counts the layers "ahead", such as
    "Merge with 2 ahead", in place of "Merge with 2 below" in the option
    text of decision 316. Decision 316 chose the merge through the queue,
    and this call changes only its words.
  - Merge of the bottom layer keeps the label of its merge method, such
    as Squash and merge. Reason: no layer lands with it.
  - Beside a main action in a bar narrower than 540 px, Add to merge queue
    shows only its icon, with its name as a tooltip, as a link to GitHub
    keeps only its mark. Reason: in the right column of 440 px, both
    labels leave one letter of the state.
  - Replaced on 22 November 2026, after Cal's review of the mockups: rows
    with a place number and a step line, a "Needs attention" label, and an
    outline around a member stack. Cal: "I don't think the labels add
    anything", and "we could have a vertical line through them to show
    they are connected".
  - A row of the group is a normal workspace row: its list mark, its name,
    and its time, with no place number and no step line. Place 1, the
    next to merge, shows first. A vertical line joins the list marks of
    the entries in the GitHub stack. Reason: Cal's review. The list mark
    already shows the GitHub state in its colour and shows running work
    with its motion, and the bar names the place and the step.
  - An entry that cannot merge stays on the line in its place, as
    "Failures" says. Its list mark shows its GitHub state, such as red for
    failed checks.
  - A member stack has no outline of its own, because the line already
    joins every entry. A drag still moves its rows together.
  - The block of a queue names its repository only when the org has
    queues in two or more repositories.
  - The blocks follow the order of the repositories of the org. The group collapses as a
    section does, with the count of its entries, and has no menu.
  - A drag of an entry moves its unit only inside its block. A row of a
    section over the group gives the block of its repository the outline
    of a drop target, and the line falls after its last layer, because a
    new entry joins at the top. During a drag while no queue has entries,
    the group shows as a zone with a dashed outline.
  - The menu of a row that can join adds Add to merge queue after the
    line, before Archive. The menu of a queued row has Remove from queue
    and no Move to section, because the row shows in no section.
  - On a phone, the compact row of the bar names the place, such as
    "Queue 3 of 3". The line stands at the top of
    the Checks tab, and its actions wrap under its words.

### Not in this change

- GitHub's own merge queue. At Add, the Worker reads the rules of the
  trunk. When the trunk requires a GitHub merge queue, the pull request
  cannot join. Add to merge queue does not show for it, and the drop
  target names the reason. Reason: the queue would otherwise
  run every restack and then fail at the merge.
- Agent tools that add to the queue. A follow-up item records them.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the sidebar group and the bar states, on a computer and on a phone.

- [x] Draw the sidebar "Merge queue" group in a new entry
      `app/merge-queue`: one queue, two queues, each step state, a "Needs
      attention" row, a member stack as one unit, a drag, and the empty list
      with no group.
- [x] Draw the bar states in `app/banner/merge-queue`: a queued bottom
      entry, a queued upper entry with its place, a restack in progress,
      "Needs attention", and Remove from queue with its question.
- [x] Draw Add to merge queue in the bar, the row menu, and the header
      menu, and the drag into the group with its drop target (decision 317).
- [x] Draw Merge on a queued workspace, with the count of the layers below
      it (decision 316).
- [x] Draw a queued parent and a queued sub-workspace, with the
      sub-workspaces that move up a level (decision 318).
- [x] Draw the phone layout of the group and of the queued bar.
- [x] Add the fixed prompts of the restack and of the rebase variant of
      Resolve conflicts to `barCopy.ts`.
- [x] Update `catalogue.md`, `catalogue-bar.md`,
      `catalogue-workspace-list.md`, and `design-bar.md`.
- [x] Run `npm run mockups:check`. Smoke-test the new pages in a browser
      and save screenshots under `.context/merge-queue/`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 1b: Mockup of a drop that cannot join

Tags: mockup

Depends on: 1

The design call on the drop target came after Milestone 1. Milestone 8
needs its picture.

- [x] Draw the drop target of the group during a drag of a row that cannot
      join, with its reason, on a computer and on a phone.
- [x] Run `npm run mockups:check` and smoke-test the page.

## Milestone 1c: Mockup review fixes

Tags: mockup

Depends on: 1

Cal reviewed the group on 22 November 2026. Draw the rows of the group as
the design under "The app" now says.

- [x] Draw each row of the group as a normal workspace row, with no place
      number and no step line, and a vertical line that joins the entries
      of the GitHub stack.
- [x] Draw an entry that needs attention as a row after the joined rows,
      off the line, with no label.
- [x] Remove the outline of a member stack. Name the repository of a block
      only with queues in two or more repositories.
- [x] Update the catalogue docs and the notes of each changed page.
- [x] Run `npm run mockups:check`, and smoke-test the changed pages.

## Milestone 1d: Failures handled by the user

Tags: mockup

Depends on: 1c

Cal chose on 22 November 2026 that the user handles a failure. Draw the
group and the bar as "Failures" now says.

- [x] Keep an entry that cannot merge on the line in its place, with its
      red or amber mark, on every page of `app/merge-queue`. Remove the
      row off the line.
- [x] Replace the amber "Needs attention" line of the bar with the line
      that says what the queue waits for, and with the reason of a failed
      token or a refused merge. Keep Fix checks and Remove from queue.
- [x] Remove the compact phone row "Needs attention".
- [x] Draw the `restack` and `rebase` pages after decision 321, and the
      entry that waits after the agent's turn did not resolve the conflict.
- [x] Draw the bar line of an entry that waits for its local work.
- [x] Update the catalogue docs and the notes of each changed page.
- [x] Run `npm run mockups:check`, and smoke-test the changed pages.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of the queue.

- [ ] Write `docs/protocol/merge-queue.md` with the rules of the queue, the
      GitHub stack, the merge, the failures, the re-order, and the group.
      Add it to `docs/architecture/protocol-docs.md`.
- [ ] Update `docs/protocol/github-banner.md`: the bar actions of the
      queue, decision 316, and the Merge section that says stacks are not
      part of the bar.
- [ ] Update `docs/protocol/base-branches.md`: the base of a queued
      workspace follows the queue and GitHub (decision 313).
- [ ] Update `docs/protocol/github-tokens.md`: the queue merges and sends
      fix turns as the queuer (decision 314). The fetches of its base moves
      use the owner's token (decision 307).
- [ ] Update `docs/protocol/sections.md`: the Merge queue group.
- [ ] State that a click on Merge of a queued workspace merges as the next
      step of the queue, with the clicker's merge method.
- [ ] Update `docs/protocol/sub-workspaces.md`: a queued workspace leaves
      its tree, and its sub-workspaces move up a level (decision 318).
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact, such as the token of a merge.
      Set the effective date of the Terms when its text changes.
- [ ] Read each public guide in full. Update each sentence that restates a
      changed fact, mostly in `pull-requests.md` and `workspaces.md`. Add a
      merge queue section to `pull-requests.md`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: GitHub stack client

Depends on: 2

A client for the GitHub routes that the queue uses, with fakes for the
tests.

- [ ] Add a client for the stacks routes: list, get, create, add, and
      unstack, with the API version `2026-03-10`, the shared timeout, and
      the shared body budget.
- [ ] Add a client call that changes the base of a pull request.
- [ ] Reuse the async merge client for a layer merge.
- [ ] Parse the `stack` object of `pull_request` webhook payloads.
- [ ] Add the stacks routes and the base change to the fake GitHub server
      of the tests.
- [ ] Check these against a scratch repository of Cal's org, record the
      results under `.context/merge-queue/`, and update this plan:
  - [ ] A merge of an upper layer merges the layers below.
  - [ ] A stack merge that stops partway, and the state of each layer.
  - [ ] Which layers GitHub rebases after a merge, and which webhooks it
        sends.
  - [ ] A base that holds the head of the layer.
  - [ ] The server rebase of one layer with `updatePullRequestBranch`,
        after a squash merge below it (decision 319).
  - [ ] Which GitHub App permission the stacks routes need.
  - [ ] That a stack and its bases survive a rename of the default branch.
- [ ] Unit tests for each route, each refusal, and each parse.

## Milestone 4: Queue storage and routes

Depends on: 3

The tables, the coordinator object, and the member routes.

- [ ] Add a migration range to `migrations/README.md`, and a migration
      with the queue and entry tables.
- [ ] Add the queue Durable Object name and its alarm on the `Workspace`
      class, as the image coordinator does.
- [ ] Add the routes: add, remove, and re-order, through the queue object,
      with the access check of write access, the org, the suspension, and
      the archive rules.
- [ ] Add one leave step for every cause that the design names, and wake
      the queue object from an archive, Continue, and a repository change.
- [ ] Add the member stack unit rule (decision 315).
- [ ] Carry the viewer's write access to each repository in the list read,
      for the row menu and the drag.
- [ ] Add the queue entries to the list read and the queue state to the bar
      read.
- [ ] Tests for each route, each refusal, and each isolation rule: a member
      reaches only the queues of the org's repositories.

## Milestone 5: Fix turns as the queuer

Depends on: 4

A Worker path that sends a fixed prompt as a message of the queuer, with no
browser.

- [ ] Add a Durable Object entry point that sends a queue message as the
      queuer, to the newest open session, without the agent tool footer.
- [ ] Wait while any session of the workspace runs a turn, up to 30
      minutes. Resume a stopped cloud computer.
- [ ] Check at each step that the queuer is still a member with write
      access, in an org that is not suspended.
- [ ] Report the end of each queue turn to the queue object, with a saved
      retry, as the automation run report does.
- [ ] Tests for the send, the wait, the resume, and the report.

## Milestone 6: Join, base moves, and sync

Depends on: 5

- [ ] Join: change the pull request base, send the restack turn, and add
      the layer to the GitHub stack after its push.
- [ ] Move the stored base with the saved base move and its fetch for each
      queue base change.
- [ ] Follow a base change on GitHub for queued workspaces, from the
      `pull_request` `edited` webhook.
- [ ] Run the guarded sync after GitHub rewrites a workspace branch.
- [ ] Tests for each step, a failed step, a retry, and a webhook that
      arrives twice.

## Milestone 7: Merge, leaves, failures, and re-order

Depends on: 6

- [ ] Merge the highest ready layer as its queuer, with the wait for the
      layer above it, and save the merge records.
- [ ] Keep the restack rule after each read: from the lowest layer that
      does not hold the head below it, upward.
- [ ] Run the leave step for each cause, with the base reset to the trunk.
- [ ] Keep a layer that cannot merge in its place, merge the layers below
      it, and give the bar line the reason that the queue waits
      ("Failures").
- [ ] Send one agent turn for a conflict of a restack, then wait for a
      member (decision 321).
- [ ] Re-order with unstack, base changes, restacks from the bottom up, and
      the add back.
- [ ] Tests for each path, also with two steps that arrive at once.

## Milestone 8: The sidebar group

Tags: ui

Depends on: 1, 1b, 4

- [ ] Build the Merge queue group from the mockup, with its blocks, rows,
      and states.
- [ ] Add Remove from queue to the row menu and the header menu, with its
      command.
- [ ] Show the reason on the drop target for a row that cannot join.
- [ ] Leave queued workspaces out of their sections, and move their
      sub-workspaces up with the placement rule of archived parents in
      `src/shared/workspace-tree.ts` (decision 318).
- [ ] Add Add to merge queue to the row menu, the header menu, and the
      palette, each with its command, and the drag into the group
      (decision 317).
- [ ] Re-order by drag and by long press, with the same rollback on failure
      as a section move.
- [ ] Tests for the grouping, the drag, and the rollback.

## Milestone 9: The bar

Tags: ui

Depends on: 1, 4

- [ ] Add the queued states and Remove from queue from the mockup, and
      the second button Add to merge queue (decision 317).
- [ ] Show Merge on a queued workspace with the count of the layers below
      it, and send the click to the queue (decision 316).
- [ ] Use the rebase prompts while a workspace is queued, also the words
      of Merge latest in `mergeLatestCopy.ts`.
- [ ] Add commands for Add to merge queue and Remove from queue, in the
      palette and in Keyboard shortcuts.
- [ ] Recapture the marketing pictures that show the bar of an open pull
      request, with `npm run marketing:pictures`.
- [ ] Tests for each state and each action.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test the queue with the local Worker and the fake GitHub
      server: join three workspaces, re-order, fail one, and merge.
- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Add a follow-up item for agent tools that add to the queue.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Queue three real pull requests of this repository in production.
      Check that each restacks once, that one merge lands the green layers,
      and that the next layer syncs after GitHub rebases it.
