# The actions of the bar

This guide belongs to [the GitHub banner UI](README.md). It gives the one
action state of the pull request bar: the member's access, Merge, Ready
for review, the fixed prompts of the agent, Continue, and their keys. [GitHub banner](../../docs/protocol/github-banner.md)
and [Continue](../../docs/protocol/continue.md) state the requirements, and
the mockups under `app/banner` draw them.

## One action state

The desktop bar and the top of the phone Checks tab share one `BarActions`
store, so they make one read of the access and run one merge, Ready for
review, or Continue at a time. `useBarActions` in [useBarControls.ts](useBarControls.ts) makes
it for each workspace through `useWorkspaceStore`, from a stable `ports`
function. A new workspace, member, or branch gives a new `ports` function,
and so a new store. The stop of the old store aborts its reads and its run,
and drops its question. So no read, run, or question of the old branch
stays.

The ports are the action clients, the prompt send of the chat, the timer of
the app, the GitHub state, a fresh GitHub read, and two numbers of the
ordered stream: `last`, and `reconnects`.

`useBarControls` turns the store, the GitHub state, the local work, the
turns, and the permissions of the screen into `BarControls`: the
`BarView` of the state that shows, and `onAction`, the press of a button.
The views draw only `BarControls`.

## The rules

`barViewOf` in [barView.ts](barView.ts) gives the actions, the link, the
message, the note, and the branches of a GitHub state. It applies the
shared `barModel`, so the app and the mockups share one rule. It
adds what the app knows:

- The member's access comes from the capability route. Until the first
  answer, the bar offers no agent action and no Merge. A failed read
  offers the agent actions and no Merge. Write access without an allowed
  method offers the agent actions and no Merge.
- The `access` port keeps the last answer for the repository of the
  workspace. `OrgModel.githubAccessOf` gives it, so every workspace of the
  repository in the tab shares it. A new store shows that answer at once,
  and still reads the access. A failed read forgets it. A stopped read
  keeps it. The app model forgets each answer when the person signs out or
  changes. [Merge](../../docs/protocol/github-banner.md#merge) gives the
  rule.
- `localWorkOf` reads the changes report of the kept files. Any one of
  these is local work: a positive raw count of uncommitted files, a listed
  file that is not committed, or a commit that no remote branch holds. The
  raw count also holds a file that the list leaves out, such as a file that
  an edit took back to its base content, as
  [the counts of a changes report](../../runner/file-reports.md#the-counts-of-a-changes-report)
  say. Until a report shows, the local work is unknown, and Merge waits. A
  report of an older runner can lack either count. A missing count stays
  absent, never zero. Without the raw count, listed files show uncommitted
  work. A reported unpushed count still applies.
- `localWorkOf` also gives the kind of the local work: `changes` when a
  file is not committed, `commits` when only unpushed commits are left, or
  `none`. On an open pull request, `changes` shows Commit and push and
  `commits` shows Push. Both buttons run the command `commit-and-push`,
  through `agentActionCommand` of the shared `barCopy.ts`.
- Fix checks shows only while the checks name a check that blocks the
  merge: failed, timed out, cancelled, or one that needs an action. Its
  prompt lists them.
- A base that GitHub deleted moved to the default branch, which the
  banner names as its base, and `baseMoved` names the deleted branch. The
  line shows its label `displayBaseMoved`, which hides each secret value,
  as the branch and the base show their labels. The reader keeps both,
  and `barModel` gives its line under the bar until a pull request opens,
  as [The banner states](../../docs/protocol/github-banner.md#banner-states)
  say. The line is a status with an info mark, not a refusal. On a phone it
  tops the Checks tab, as each message of the bar does.
- While the branch has no pull request, `branches` names the branch and
  its base, in each such state, also without an action and in a suspended
  org. The top of the phone Checks tab shows them under the message and
  above the actions, as
  [The branch and its base on a phone](../../docs/protocol/github-banner-layouts.md#the-branch-and-its-base-on-a-phone)
  says. With a pull request, `branches` is null.
- An archived workspace and a suspended org show only the links.
- After the merge, every member sees Continue. Archive needs the Archive
  of the screen, which archives at once and asks no question. Continue
  waits while a turn runs in any session, open or closed.

`promptOf` in [barPrompts.ts](barPrompts.ts) fills `agentPrompt` of the
shared `barCopy.ts` with the number, the target branch, the blocking
checks in GitHub's order, and the reviewers. Resolve conflicts on a queued
workspace uses `git rebase --onto` with the saved old base commit for that
head. If the read lacks the commit, the prompt asks the agent to verify
where the layer's own commits begin.

## The merge queue

[Merge queue in the app](../../docs/protocol/merge-queue-in-the-app.md)
states the requirements. `queueFactsOf` in [queueView.ts](queueView.ts)
gives `barModel` the queue facts of the bar. `queueViewOf` gets the words
of its line from the shared `queueCopy.ts`.

- The bar read and the stored read carry the queue state of a queued
  workspace. A GitHub event carries none, so the store keeps the state of
  the last read. The bar reads again after each write of the queue in
  the tab, and when a read of the list shows another entry of the
  workspace.
- The line under the bar names the place and the pull request below, or
  what the queue waits for: its checks, a rebase, its review, the rules of
  GitHub, a push, a local-work read, a default branch check, a running turn,
  an agent login, or an open session. A failed token and a refused merge name their reason, and a
  refused merge leads to the pull request on GitHub. A wait for a lower
  layer names the blocking pull request. Remove from queue ends the line
  for a member with write access, except while the layer merges, and it
  asks first. A failed base reset names the remaining GitHub base.
- Add to merge queue shows on an open pull request that can join, for a
  member with write access, beside the main action or alone. The list of
  the org gives whether the pull request can join, and whether it holds
  the workspace as an entry. In a bar narrower than 540 px beside a main
  action, it shows only its icon.
- The compact row of a phone names the place, such as "Queue 3 of 3", and
  the line tops the Checks tab.
- Merge on a queued workspace sends the displayed ahead count to the
  queue. The Worker reads the clicker's token and preferred method. The
  bar shows the count while the queue can accept the merge and shows
  Merge busy while the merge runs.
- Resolve conflicts and Merge latest use the intended base from the
  stored state when pressed. Their queue prompts use `git rebase --onto`
  and a guarded push.

## Merge

- One press merges the head that the bar shows, with the member's method.
  A pending job is read again after one second, with the timer of the app.
  The wait is a choice of the app.
- After a merge, the store reads the GitHub state once. Merging shows until
  the bar shows a newer GitHub state, such as the merged one.
- `mergeOutcome` in [barRuns.ts](barRuns.ts) turns a refusal into the line
  under the bar. A moved head and a missing right take the words of the
  mockups. A missing right also reads the access again, so Merge hides.
  Another refusal says that GitHub refused, with Open on GitHub. Another
  failure, such as an expired job, keeps the app's safe words with Open on
  GitHub.
- A line shows until the bar shows a newer GitHub state, from a read or an
  event, or until the next press.

## Ready for review

- A draft shows Ready for review only with write access that the
  capability route read, as Merge does. `barModel` gives it, and local
  work still comes first.
- One press sends the number of the pull request that the bar shows to the
  `ready` route. The Worker marks it ready with the member's token, then
  reads the GitHub state again and pushes it to every tab.
- Marking ready shows until the bar shows a newer GitHub state, as after a
  merge. The store also reads the GitHub state once.
- `readyOutcome` in [barRuns.ts](barRuns.ts) turns a refusal into the line
  under the bar of the draft. A missing right, another pull request, and
  another refusal of GitHub take the words of the mockups. Another refusal
  adds Open on GitHub. A missing right hides the button at once, and reads
  the access again. Another failure keeps the app's safe words, with Open
  on GitHub.

## Agent actions

- Resolve conflicts and Merge latest read the stored workspace state when
  pressed. They use its queue state to choose a prompt. A failed read
  shows a message under the bar and sends no prompt.
- A press sends the prompt through `sendPrompt` of the kept chat, to the
  session that the member saw last, as
  [the chat](../chat/loads-and-sends.md#fixed-prompts) says. A press while
  a prompt sends does nothing. It sends no message, keeps the view, and
  selects no session.
- A prompt that did not go out shows the chat of its session, where the
  composer names the cause: a missing login, or a failed send. Without an
  open session, the chat shows. A sent prompt keeps the view.
- The chat shows only while the store of the press stays connected. The
  store stops when the member leaves the workspace. It also stops when a
  new member or branch gets a new store, as
  [One action state](#one-action-state) says. A return to the workspace
  makes a new store. A failed result after the stop keeps the view.
  It selects no session, also after a return.
- The stop does not cancel the send. The kept chat still ends it, as
  [the chat](../chat/loads-and-sends.md#fixed-prompts) says. So the
  composer of the session still names the cause. A second try there keeps
  the client ID of the failed send. The draft, its uploads, and a message
  that the Worker accepted stay as they are.
- The kept chat, not the store, holds the prompt that sends and its client
  ID. A new store after a return or on a new branch uses the same kept
  chat. So a press there does nothing while the prompt of an earlier press
  still sends. The Worker gets one message.
- Merge latest of the command palette sends its prompt through the same
  `sendPrompt` of the store, and its result follows the same rules.
  `offersAgentActions` of
  [barView.ts](barView.ts) gives it the access rule of the agent actions.
  `useMergeLatest` of the workspace screen builds it, as
  [the key code of the screen](../shell/workspace/key-code.md) says.

## Continue

`createContinueActions` in [continueActions.ts](continueActions.ts) sends
the Continue routes through the JSON client of the org and checks each
reply.

- A press starts Continue from the branch of the bar, and Continuing shows.
  A pending job is read again after one second.
- A reply with local work ends the run with the question, which
  `ContinueDialog` of the workspace screen asks. Cancel sends nothing.
  Continue anyway starts again with the work allowed.
- The reply reader keeps the optional `displayBaseBranch` of the question
  and `displayUncommittedFiles` of its local work, and the store keeps them
  in the question. `ContinueDialog` names the base by its label. A reply
  can lack that label, such as a reply of an older Worker. The dialog then
  takes the label of the bar when the bar names the same base, or else the
  real name. `LocalWorkList` shows each file by its label, or by its real
  path. The requests keep the real names.
- A `continued` reply names an event number. Continuing shows until the
  ordered stream reaches it, so the workspace on its new branch and the
  note of each session show. The store of the new branch then follows.
- `continueOutcome` keeps the Worker's safe words for each stop. A refusal
  because a turn runs shows the wait.

## Keys

`barCommands` in [barKeys.ts](barKeys.ts) gives the commands that the
keys run while the bar shows, as
[Where a command runs](../../docs/protocol/keyboard-shortcuts.md#where-a-command-runs)
says.

- Each button that takes a click has the command of its click, such as
  Create PR or Merge PR, and its key calls `onAction` as the click does.
  So Merge PR merges at once.
- A busy button, such as Merge while it merges, and a disabled one, such
  as Continue while a turn runs, take no click. Their keys do nothing, and
  their tooltips name no key.
- Open PR on GitHub opens the link of the bar to the pull request in a new
  tab, while the bar shows that link.
- The palette of the app runs Archive workspace, so the app offers no
  key for the Archive button of the bar.

## Key code

- `barActions.ts`: `BarActions`, the store of the access, the runs, the
  outcomes, and the question.
- `barPorts.ts`: `BarActionsPorts`, what the store gets from the app, with
  `PromptResult` and `AccessMemory`.
- `barRuns.ts`: the waits of a pending job and of the stream, and the
  outcomes of a refused merge, Ready for review, or Continue.
- `barView.ts`: `barViewOf`, `localWorkOf`, and `BarControls`.
- `barMessage.ts`: `messageOf`, the message under the bar.
- `barPrompts.ts`: `promptOf` and the checks that block the merge.
- `continueActions.ts`: the Continue client and its reply reader.
- `useBarControls.ts`: `useBarActions` and `useBarControls`.
- `BarButtons.tsx`: the buttons, the line under the bar, and
  `ChecksActions`, the top of the phone Checks tab, with the branch and its
  base of `ChecksBranches`. `ChecksActions.test.tsx` checks that top.
- `barKeys.ts`: `barCommands`, the commands that the keys of the bar run,
  and `buttonKey`, the key that the tooltip of a button names.
- `queueView.ts` and `QueueBarParts.tsx`: the queue facts and words of
  the bar, Add to merge queue, and the line of a queued workspace.
  `queueView.test.ts` checks each state of the line, Add, and the rebase
  prompt, and `storeQueue.test.ts` the queue state of the store.
- `barActions.test.ts`, `barView.test.ts`, and `barPrompts.test.ts`: the
  runs over the fake API with a manual timer, the rules, and the prompts.
- `barReady.test.ts`: the rules and the run of Ready for review.
- `barMovedLabels.test.ts`: the labels of a deleted base, of the branch,
  and of its base, in the filter, the reader, the line under the bar, and
  the top of the phone Checks tab.
- `continueActions.test.ts`: the reader keeps the labels of a question,
  and reads a question without usable labels as before.
