# GitHub banner

This doc holds the requirements and the decisions in force for the pull
request bar of a workspace and its actions. It also covers the Checks tab
and the GitHub state and events behind them. [Continue](continue.md) states the
action that moves a workspace to its next task after a merge. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The GitHub App

- One GitHub App gives the app its sign-in, its repository access, and its
  GitHub webhooks.
- A user installs the GitHub App on each GitHub account that owns
  repositories that the user wants to use.
- After an install, or a change of an install, GitHub returns the user to
  `https://app.conductive.build/github/setup`.
- From a browser, the return opens the screen where the user started the
  install or the change: Get started, Account, or the screen of a list with
  Manage access, such as Create org or the Repositories tab of org
  settings. A return without a known screen opens Home.
- A browser starts each install or change at the app, which keeps the
  screen in a cookie for up to 1 hour and then sends the browser to GitHub.
  The cookie is HttpOnly, Secure, and SameSite=Lax. The return deletes it.
- The return opens only a screen of the app origin. It never opens an API
  route or another site.
- A screen in `state` alone was rejected. Reason: GitHub drops `state` when
  the user changes an install that exists.
- The return needs no sign-in, and it trusts no value that GitHub adds.
  The app reads the installs with the user's own GitHub token.
- Get started and Account read the installs again each time that the user
  comes back to the page.
- A return through the sign-in callback was rejected. Reason: the callback
  refuses a GitHub reply that the app's own sign-in did not start.
- [The Mac app](desktop-sign-in.md#github-app-install) has its own return.
- The GitHub App sends pull request, review, and push webhooks to the
  Worker, at `https://api.conductive.build/v1/github/webhooks`.
- A pull request webhook can also start the runs of routines, as
  [Pull request runs](pull-request-runs.md) says.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.

## State of a branch

- The Worker routes each pull request, review, and push event to the
  workspace whose branch the event names. A workspace has one branch at a
  time, so after [Continue](continue.md) the events of its earlier branch
  no longer reach it.
- The Worker pushes the new state to every open tab of that workspace.
- When a tab opens, the Worker reads the current pull request and the
  current checks of the branch from the GitHub API.
- While a tab stays open, the Worker reads them again for that tab 5
  minutes after its last read.
- The Worker reads nothing for a check event or a status event, and no
  workspace changes for one. The user chose this on 11 November 2026.
- So a check that starts or ends shows at the next read of its branch:
  when a tab opens, at the timed read of an open tab, or at the next
  pull request, review, or push event.
- A fresh read of each workspace of the repository for each check or
  status event was rejected. Reason: a run of checks sends many of these
  events, and those reads used up GitHub's rate limits.
- Events do not reach an archived workspace. Its open tab still reads the
  state when it opens. The user chose this on 11 November 2026.
- Reason: each event read every workspace of the repository, also the
  archived ones, and these reads used up the hourly GitHub limit of the
  App.

## Banner states

The bar shows one state of the branch of the workspace (decision 18):

- no pull request
- checks running
- checks failed
- ready to merge
- merged
- merge conflict
- changes requested
- draft
- closed without a merge
- blocked: GitHub blocks the merge for a reason that no other state
  names, such as a missing approval or a branch behind its base
  (decision 64)

Rules for the bar:

- The bar names the branch of the workspace and its base branch, as
  [Base branches](base-branches.md) says (decision 507 G). A narrow column
  cuts each name with an ellipsis, and the full name shows as a tooltip.
- Reason: one layout of the bar serves every workspace, also a pull request
  run whose base branch is not the default branch.
- The bar offers "Create PR" for commits of the branch that its
  base branch does not have, and for local work, as [Actions](#actions)
  says. Create PR opens a pull request into the base branch.
- The bar of a pull request run shows the state of its own branch, not the
  pull request that started it (decision 505 A).
- A bar that shows that pull request was rejected. The run's own work would
  then get no "Create PR", and the header of the run already
  links to that pull request.
- The bar shows each state that blocks a merge, also to a member without
  GitHub write access.
- The bar shows Blocked only when no other state applies. Its number opens
  the pull request on GitHub, where GitHub names the reason.
- Each state shows an icon and words, never only a colour.
- A state tints the whole bar. No edge of the bar gets its own colour.

## Actions

The bar shows one main action for each state (decision 220). The agent
does each step that changes code, on a fixed prompt. The app merges,
continues, and archives.

| Bar state | Main action | Done by |
| --- | --- | --- |
| No pull request, with commits on GitHub or local work | Create PR | The agent |
| Checks failed | Fix checks | The agent |
| Merge conflict | Resolve conflicts | The agent |
| Changes requested | Address review | The agent |
| An open pull request with local work, in any state | Commit and push | The agent |
| Ready to merge, for a member who may merge | Merge, named by its method | The app |
| Merged | Continue and Archive | The app |
| No commits and no local work | None: "No commits yet" | None |
| Checks running, draft, blocked, and closed | None | None |

- The bar counts the local work of the current branch: its changed files,
  also untracked files, and its commits that no remote branch holds.
- Local work comes first (decision 228). While an open pull request has
  local work, Commit and push takes the place of Merge and of the fixes. A
  merged or a closed pull request is not open.
- Reason: no merge leaves work behind in the sandbox.
- In each state that has a pull request, the number of the pull request
  opens it on GitHub. An arrow after the number marks the link. The bar has
  no other link to the pull request. The user chose this on 10 November
  2026.
- On a phone, the row is one link to the Checks tab, so its number stays
  plain. "Open on GitHub" stays at the top of that tab.
- A branch without a pull request has no link to GitHub. Create pull
  request asks the agent to open the pull request. The user chose this on
  10 November 2026.
- An archived workspace and a workspace of a suspended org show no action,
  only the links to GitHub.
- Reason: the agent changes the code, and the app merges at once under
  GitHub's own checks, as in Conductor.
- These ways were rejected (decision 220):
  - Links to GitHub only. Members then leave the app to merge, and type
    each request for a fix.
  - The agent does each step, also the merge, with the GitHub CLI. A merge
    then waits for a running sandbox and a turn, and it uses the model
    quota of the session.
  - The app does each step itself. A conflict and failed checks then keep
    only their link to GitHub, and a push outside a turn needs a new way
    to name the sender.
  - Fixed prompts, with the merge left on GitHub. The user asked for Merge
    in the app.

## Agent actions

- An agent action sends its fixed prompt at once, as a message of the
  member who clicks, as
  [Messages from the bar](messages-and-attachments.md#messages-from-the-bar)
  says.
- A member sees the agent actions only when GitHub gives that member write
  access or more to the repository. When the Worker cannot read that
  access, the bar still shows them.
- Reason: each action ends in a push as that member, and a typed message
  can still ask for the same work.
- The prompts are fixed text of the app. Each one names the facts of its
  step: the number of the pull request, the target branch, the failed
  checks, or the reviewers who asked for changes.
- Fix checks asks the agent to read the results of the checks and the logs
  of failed GitHub Actions jobs with the GitHub CLI. For a check of another
  service, it asks the agent to read its details, or to run it locally.
  [The Actions permission](github-tokens.md#the-actions-permission) says
  why the agent can read those logs.
- No prompt asks for a reply on GitHub, and Address review asks the agent
  not to reply there. Reason: a reply posts as the member who clicked, and
  that member did not ask for one.
- A workspace from an older org image can lack the GitHub CLI. The bar
  still offers the actions, and each prompt that needs the CLI says what
  the agent does without it.
- The mockups at `app/banner` give the words of each label, each message,
  and each prompt.

## Merge

- A member sees Merge only when GitHub gives that member write access or
  more to the repository (decision 221). The Worker reads that access with
  the member's own GitHub token, as
  [Merge as the member](github-tokens.md#merge-as-the-member) says.
- When the Worker cannot read the access, the bar shows no Merge. Reason:
  a button that is sure to fail helps nobody.
- GitHub keeps the final say, because it checks the rules of the branch at
  the merge.
- Merge for every member was rejected, because a member without the right
  then sees a button that fails. Merge for the workspace owner and the
  admins only was rejected, because a reviewer with the right then must
  merge on GitHub.
- The button names the merge method, such as "Squash and merge". The
  method is the member's default merge method on GitHub when the
  repository allows it, or else a method that the repository allows. The
  bar has no menu of methods.
- Merge runs on one click, with no question (decision 228). The merge
  carries the head commit that the bar shows, so GitHub refuses commits
  that the member did not see.
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
- Merge queues, stacked pull requests, auto-merge, and a bypass of the
  rules of the branch are not part of the bar. A direct merge into a branch
  that needs a merge queue gets the refusal of GitHub.

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

## Checks

- The Checks tab lists each check that GitHub reports for the pull
  request, in GitHub's order, with its state.
- A finished check shows how long it ran.
- While the branch has no pull request, the Checks tab shows that it waits
  for one.
- For the bar and the GitHub state, a failed, cancelled, timed-out, or
  action-required check is a failure. A queued or running check runs. Each
  other check counts as passed.
- The list mark of the workspace shows its
  [GitHub state](#the-github-state) in one colour, as
  [The list mark](workspace-life.md#the-list-mark) says.

## The GitHub state

[The GitHub state](github-summary.md) gives the requirements and their reasons.

## Layouts

- On desktop, the pull request bar sits at the top of the right column,
  above the All files, Changes, and Checks lists. A message of the bar
  shows under it.
- On a phone, a compact pull request row at the top of the workspace shows
  the state. The row opens the Checks tab, also for a branch without a pull
  request when the bar has an action or a link.
- On a phone, the actions of the bar, its message, and its links to GitHub
  show at the top of the Checks tab.
- Reason: a button cannot sit inside the link of the row, and two states
  have two actions.
- A row of a branch without commits and without local work is not a link.
