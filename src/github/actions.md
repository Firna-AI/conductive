# The actions of the bar

This guide belongs to [the GitHub banner UI](README.md). It gives the one
action state of the pull request bar: the member's access, Merge, the fixed
prompts of the agent, Continue, and their keys. [GitHub banner](../../docs/protocol/github-banner.md)
and [Continue](../../docs/protocol/continue.md) state the requirements, and
the mockups under `app/banner` draw them.

## One action state

The desktop bar and the top of the phone Checks tab share one `BarActions`
store, so they make one read of the access and run one merge or Continue
at a time. `useBarActions` in [useBarControls.ts](useBarControls.ts) makes
it for each workspace through `useWorkspaceStore`, from a stable `ports`
function. A new workspace, member, or branch gives a new `ports` function,
and so a new store. The stop of the old store aborts its reads and its run,
and drops its question, so nothing of the old branch stays.

The ports are the action clients, the prompt send of the chat, the timer of
the app, the GitHub state, a fresh GitHub read, and two numbers of the
ordered stream: `last`, and `reconnects`.

`useBarControls` turns the store, the GitHub state, the local work, the
turns, and the permissions of the screen into `BarControls`: the
`BarView` of the state that shows, and `onAction`, the press of a button.
The views draw only `BarControls`.

## The rules

`barViewOf` in [barView.ts](barView.ts) gives the actions, the link, the
message, and the note of a GitHub state. It applies `barModel` of the
mockups, so the app and the mockups share one rule. It adds what the app
knows:

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
- Fix checks shows only while the checks name a check that blocks the
  merge: failed, timed out, cancelled, or one that needs an action. Its
  prompt lists them.
- An archived workspace and a suspended org show only the links.
- After the merge, every member sees Continue. Archive needs the Archive
  of the screen, which archives at once and asks no question. Continue
  waits while a turn runs in any session, open or closed.

`promptOf` in [barPrompts.ts](barPrompts.ts) fills `agentPrompt` of the
mockups' `barCopy.ts` with the number, the target branch, the blocking
checks in GitHub's order, and the reviewers.

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

## Agent actions

- A press sends the prompt through `sendPrompt` of the kept chat, to the
  session that the member saw last, as
  [the chat](../chat/loads-and-sends.md#fixed-prompts) says. A press while
  a prompt sends does nothing.
- A prompt that did not go out shows the chat of its session, where the
  composer names the cause: a missing login, or a failed send. Without an
  open session, the chat shows. A sent prompt keeps the view.

## Continue

`createContinueActions` in [continueActions.ts](continueActions.ts) sends
the Continue routes through the JSON client of the org and checks each
reply.

- A press starts Continue from the branch of the bar, and Continuing shows.
  A pending job is read again after one second.
- A reply with local work ends the run with the question, which
  `ContinueDialog` of the workspace screen asks. Cancel sends nothing.
  Continue anyway starts again with the work allowed.
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
- `barRuns.ts`: the waits of a pending job and of the stream, and the
  outcomes of a refused merge or Continue.
- `barView.ts`: `barViewOf`, `localWorkOf`, and `BarControls`.
- `barPrompts.ts`: `promptOf` and the checks that block the merge.
- `continueActions.ts`: the Continue client and its reply reader.
- `useBarControls.ts`: `useBarActions` and `useBarControls`.
- `BarButtons.tsx`: the buttons, the line under the bar, and
  `ChecksActions`, the top of the phone Checks tab.
- `barKeys.ts`: `barCommands`, the commands that the keys of the bar run,
  and `buttonKey`, the key that the tooltip of a button names.
- `barActions.test.ts`, `barView.test.ts`, and `barPrompts.test.ts`: the
  runs over the fake API with a manual timer, the rules, and the prompts.
