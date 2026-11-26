# GitHub banner

This doc holds the requirements and the decisions in force for the pull
request bar of a workspace and its actions. It also covers the Checks tab
and the GitHub state and events behind them. [Continue](continue.md) states the
action that moves a workspace to its next task after a merge.
[Merge queue in the app](merge-queue-in-the-app.md) states what the bar
shows of the merge queue. The terms
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
- The GitHub App sends pull request, check, status, push, and repository
  webhooks to the Worker, at `https://api.conductive.build/v1/github/webhooks`.
  [Repository changes on GitHub](repository-changes-on-github.md) says what
  a repository webhook changes.
- A pull request webhook can also start the runs of automations, as
  [Pull request runs](pull-request-runs.md) says.
- The Worker accepts a GitHub webhook only with a valid GitHub signature.

## State of a branch

- The Worker routes each event to the workspace whose branch the event
  names. A workspace has one branch at a time, so after
  [Continue](continue.md) the events of its earlier branch no longer reach
  it.
- The Worker pushes the new state to every open tab of that workspace.
- When a tab opens, the Worker reads the current pull request and the
  current checks of the branch from the GitHub API.
- While that read runs, the tab shows the last state that the Worker
  stored for the branch, when it has one. The fresh state replaces it
  when the read answers. The user chose this on 12 November 2026.
- Reason: a read from GitHub takes seconds, while the list already shows
  the GitHub state of the workspace, so the bar must not show a loading
  state for a known state.
- A failed fresh read keeps the stored state on the screen, and the
  GitHub events of the branch keep it current.
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
- Reason: one layout of the bar serves every workspace. This includes a
  workspace whose base branch is not the default branch, such as a stack or
  a pull request run.
- On a phone, the top of the Checks tab names them while the branch has
  no pull request (decision 306).
  [The branch and its base on a phone](github-banner-layouts.md#the-branch-and-its-base-on-a-phone)
  gives the rules.
- The Worker moves a base branch that GitHub deleted to the default branch,
  as [A base branch that GitHub deleted](base-branches.md#a-base-branch-that-github-deleted)
  says. A message under the bar then says so (decision 304). It names the
  default branch as the new target, and the branch that GitHub no longer
  has.
- That message is a status, not a refusal. It shows until a pull request
  opens. Reason: a pull request names its own base branch on GitHub.
- On a phone, that message shows at the top of the Checks tab, as
  [Layouts](github-banner-layouts.md#layouts) says. The `base-moved`
  variant of the mockup `app/new-workspace/start-branch/stacked` gives its
  words.
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
- The bar of a workspace in the merge queue keeps its state, and a line
  under the bar names its place, as
  [The bar of a queued workspace](merge-queue-in-the-app.md#the-bar-of-a-queued-workspace)
  says.

## Actions

The bar shows one main action for each state (decision 220). The agent
does each step that changes code, on a fixed prompt. The app merges,
marks a draft ready for review, continues, and archives.

| Bar state | Main action | Done by |
| --- | --- | --- |
| No pull request, with commits on GitHub or local work | Create PR | The agent |
| Checks failed | Fix checks | The agent |
| Merge conflict | Resolve conflicts | The agent |
| Changes requested | Address review | The agent |
| An open pull request with changed files that are not committed, in any state | Commit and push | The agent |
| An open pull request with only commits that no remote branch holds, in any state | Push | The agent |
| Ready to merge, for a member who may merge | Merge, named by its method | The app |
| Draft, for a member with write access | Ready for review | The app |
| Merged | Continue and Archive | The app |
| No commits and no local work | None: "No commits yet" | None |
| Checks running, blocked, and closed | None | None |

- The bar counts the local work of the current branch: its changed files,
  also untracked files, and its commits that no remote branch holds.
- Local work comes first (decision 228). While an open pull request has
  local work, Commit and push or Push takes the place of Merge, of Ready
  for review, and of the fixes. A merged or a closed pull request is not
  open.
- Reason: no merge leaves work behind in the sandbox.
- The button names the step that the agent does. When a file is not
  committed, the button is Commit and push, and its prompt asks the agent
  to commit and push. When the local work is only commits, the button is
  Push, and its prompt asks the agent to push the branch. The user chose
  this on 12 November 2026.
- Reason: Commit and push on a clean tree made members look for files that
  were not committed.
- Push and Commit and push share one command and one key, as
  [the default keys](keyboard-shortcuts-keys.md#the-default-keys) say.
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
- Add to merge queue is a second control beside the main action. It
  changes decision 220 for this one action, as
  [Add to merge queue](merge-queue-in-the-app.md#add-to-merge-queue) says
  (decision 317).

## Agent actions

- An agent action sends its fixed prompt as a message of the
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
- Resolve conflicts checks the stored queue state when clicked. On a
  queued workspace it asks for a rebase, as
  [The prompts of a queued workspace](merge-queue-in-the-app.md#the-prompts-of-a-queued-workspace)
  says.
- The mockups at `app/banner` give the words of each label, each message,
  and each prompt.

## Merge

[Merge](github-banner-merge.md#merge) states who sees Merge, its method,
its one click, and its refusals.

## Ready for review

[Ready for review](github-banner-merge.md#ready-for-review) states the
action that marks a draft ready for review.

## After the merge

[After the merge](github-banner-merge.md#after-the-merge) states Continue
and Archive after the merge.

## The GitHub state

[The GitHub state](github-summary.md) gives the requirements and their reasons.

## The merge record

[The merge record](github-banner-merge.md#the-merge-record) states when the
Worker records a merged pull request.

## Checks and layouts

[Checks and layouts](github-banner-layouts.md) gives the Checks tab, and
where the bar, its message, and its actions show on desktop and on a
phone.
