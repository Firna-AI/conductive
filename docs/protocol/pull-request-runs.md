# Pull request runs

This doc holds the requirements and the decisions in force for the runs
that GitHub pull request events start. It belongs to
[Routines](routines.md). [Routine runs](routine-runs.md) states the rules
of every run. [Base branches](base-branches.md) states the branch and the
base branch of a pull request run. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Events

- PR opened starts a run when a pull request opens. PR pushed starts a run
  when new commits reach the head branch of a pull request. PR merged
  starts a run when a pull request merges.
- In the GitHub webhook, these are the actions `opened`, `synchronize`, and
  `closed` with `merged` set to true. Other actions start no run.
- An event can start a run of each routine that is on, has the repository
  of the pull request, and has a matching trigger. The rules below decide
  whether it does.
- The GitHub App sends the pull request webhooks, as
  [The GitHub App](github-banner.md#the-github-app) says.
- A pull request from a fork never starts a run.
- Reason: its code is untrusted, and a run holds the owner's GitHub access
  and the org's env vars.
- The Worker answers GitHub before the runs start. Reason: GitHub waits
  only 10 seconds for an answer.
- A failed refresh of a pull request bar does not stop a run of the same
  event. A failed run does not stop the refresh either.

## Who may start a run

- The author of the pull request must be a member of the org, or an
  account that "Author is" names (decision 206 C).
- The sender of the event must pass the same rule. The sender is the
  account that caused the event, such as the account that pushed the new
  commits or merged the pull request.
- So a bot, such as Dependabot, starts runs only when the owner names it in
  "Author is".
- Reason: a run holds the owner's logins and the org's env vars. The author
  can write instructions into the code or the text that the agent reads.
- Each pull request trigger can have an author filter with two lists of
  GitHub accounts, "Author is" and "Author is not".
- An event starts a run only when the author of its pull request passes the
  filter. An author passes "Author is" when that list names the author. An
  author passes "Author is not" when that list does not name the author.
- "Author is" can hold the entry "Members of <org>", which names every
  member of the org. An empty "Author is" means every member.
- When the owner adds a first account to an empty "Author is", the list
  adds "Members of <org>" first. The owner can remove that entry to limit
  runs to the named accounts.
- Reason: a bot in "Author is" would otherwise stop every run of the
  members, and nothing would say so.
- The app matches each account by its GitHub account ID, not by its login.
  The form takes logins, and the Worker resolves each login to its account
  ID at each save.
- Reason: a GitHub login can be renamed and then taken by another account.
  Invitations use a verified email for the same reason (decision 78).
- A save refuses a login that names no GitHub account. The form names that
  login.
- An event whose author or sender is neither a member nor named in "Author
  is" gives a skipped run. Its row in the Runs list shows the reason.
- The Runs list shows nothing for an author whom the filter leaves out.
  Reason: the owner chose that exclusion, and a row for each such event is
  noise.
- The filter decides first. An event whose author the filter leaves out
  gives no row, also when its author or sender is outside the org.
- Runs for each pull request of the repository were rejected. A
  collaborator outside the org could then steer a run that holds the
  owner's logins.
- Trust in the role that GitHub gives an author, such as a member of the
  GitHub organization, was rejected. It trusts accounts that no admin of
  the org invited.
- Runs without the env vars and with a GitHub token that can only read were
  rejected. The agent login still reaches the sandbox, and such runs need a
  new kind of start.
- A run that waits for the approval of the owner was rejected, because it
  needs a new run state.
- [Risks that stay open](routines.md#risks-that-stay-open) states what this
  rule does not stop.

## Loops

- A routine starts no run for a pull request whose head branch is the
  branch of one of its run workspaces.
- Reason: a run that opens or pushes to its own pull request must not start
  its routine again.
- A routine ignores the events that its owner sends for a pull request,
  while one of its runs for that pull request starts or works.
- Reason: a run pushes with the owner's GitHub access. So its push to the
  pull request that started it has the owner as its sender.

## The workspace of a pull request run

- The run creates its own branch from the pull request, and it gets a base
  branch, as [Base branches](base-branches.md) says (decisions 205 A and
  207 G).
- The pull request bar of the run shows the run's own branch, not the pull
  request of the event, as
  [Banner states](github-banner.md#banner-states) says.
- The run text names the pull request, as
  [The run text](routine-runs.md#the-run-text) says.
- The line under the header of the run workspace and the row of the run
  link to the pull request on GitHub. Reason: the members see which pull
  request started the run.
