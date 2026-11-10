# Routines

This doc holds the requirements and the decisions in force for routines. A
routine is a saved prompt that runs an agent without a person. This doc
covers a routine, its pages, who may see and change it, and its schedules.
It also says what happens when the owner leaves or a suspension stops the
runs. Two linked pages cover the rest:

- [Routine runs](routine-runs.md): the runs, the run text, the run states,
  and the failed runs.
- [Pull request runs](pull-request-runs.md): the pull request triggers, and
  whose events may start a run.

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## A routine

- A routine belongs to one org. It has a name, a prompt, one repository of
  the org, and a section. It also has a model with its effort, an Active
  switch, one time zone, and its triggers.
- Each trigger starts a run. Each run creates a new workspace, with its own
  cloud computer and branch (decision 501 A).
- One workspace for each routine, with a new session for each run, was
  rejected. Its runs would share one branch and one set of files. A pull
  request run would then switch branches under the earlier work.
- One session that gets each run as a new message was rejected too. Its
  conversation grows without end, and parallel runs cannot share one turn.
- The cloud computer of a run still holds the other chosen repositories of
  the org, as [Repository folders](repository-folders.md) says.
- An empty name saves as "Untitled routine".
- The prompt must have text (decision 511 B). Save stays off until the
  prompt has text. The Worker refuses a routine whose prompt is empty or
  holds only spaces.
- Reason: a run without a prompt has no task, but it still spends a start.
  A routine without a prompt was rejected, also as a draft that stays off.
- A new routine starts active. It gets the first repository of the org, the
  General section, and the default model of its owner.
- A routine can have no trigger. Then only Run now starts it.
- Deleting a section moves its routines to General, as it moves its
  workspaces.
- When the repository of a routine stops being a chosen repository of the
  org, the routine turns off, and its page says why. Reason: no run of it
  can succeed, and a turn-off names the cause before any run fails.
- A deleted routine keeps its run workspaces, because they are normal
  workspaces (decision 504 A).

## The routine pages

- The sidebar of each org has a Routines link below New workspace. The org
  list of a phone has the same link.
- The Routines page lists the routines of the org. Each row shows the name,
  the repository, the triggers, and the owner. It also shows whether the
  routine is on, and the state and the time of its last run.
- The page of an org without routines says what a routine does. New
  routine starts the first one.
- New routine opens an empty routine page. The first save creates the
  routine.
- The routine page shows the name, the Active switch, the repository, the
  section of the run workspaces, and "By" with the owner. Then it shows the
  triggers, the prompt with the model picker, and the Runs list.
- A line under the prompt names the member whose agent login and GitHub
  access the runs use.
- Save stays off while nothing changed, while the prompt is empty, and
  while the form refuses a cron.
- A desktop shows the Runs list in a column at the right. A phone shows a
  saved routine in two tabs, Routine and Runs.
- Reason: a member who reads the runs must not scroll past the whole form.
- The [mockup catalogue](../mockups/catalogue.md) draws each page and each
  state under `app/routines`, with its copy.

## Access

- Every member of the org sees every routine, with its prompt, its
  triggers, and its runs (decision 502 B).
- Every member who can create a workspace can create a routine. The member
  who creates it is its owner.
- Only the owner changes a routine, turns it on, and uses Run now.
- Reason: each run acts as the owner, with the owner's logins. So only the
  owner decides what runs on those logins.
- The owner can delete the routine. An admin can turn it off and delete it.
- Every member who is not the owner reads the routine without fields. A
  line says that only the owner can change it.
- An admin who is not the owner gets only Turn off and Delete. Turn off
  shows only while the routine is on.
- The owner changes only when the owner leaves the org, as
  [When the owner leaves](#when-the-owner-leaves) says.
- Routines that only their owner sees were rejected, because every member
  already sees the run workspaces. Routines that every member edits, where
  each save makes the saver the owner, were rejected too.
- An installation token of the GitHub App for the pushes of each run was
  rejected. Org routines on an agent login of the org were rejected too.
  Each breaks the rule that pushes show as their sender (decision 50).
- Run now does not show on a routine whose triggers are all pull request
  triggers (decision 510 C). Reason: such a run needs a pull request.
- A routine with a schedule, or with no trigger, keeps Run now. A Run now
  that asks for a pull request and an event is a later change
  (decision 510 B).
- Run now works while the routine is off. Reason: the owner can test a
  routine before its triggers start runs.

## Schedules

- Add trigger offers two groups. Scheduled has Hourly, Daily, Weekdays,
  Weekly, and Custom (cron). GitHub has PR opened, PR pushed, and PR merged.
- Reason: these are the triggers of Conductor's routines. Run now lets the
  owner test a routine at once.
- Hourly asks for a minute. Daily and Weekdays ask for a time. Weekly asks
  for a day and a time. Times use the 24-hour clock.
- Custom asks for a cron expression with five fields. They are the minute,
  the hour, the day of the month, the month, and the day of the week.
- A schedule runs at most once an hour (decision 503 B). So the minute
  field of a custom cron must name one minute. Each preset meets this rule.
- The form refuses a cron that breaks the rule, and says why. The Worker
  refuses it too. It also refuses a cron without five fields and an unknown
  time zone.
- Reason: all orgs share the daily starts of the app's Boat account. A cron
  that runs each minute makes 1,440 starts a day.
- Pull request triggers have no limit.
- Caps on the runs of a routine, of an org, or of all routines were
  rejected. Each would skip wanted runs, such as pull request runs late in
  the day. The product also sets no limits of its own on workspaces
  (decision 81).
- One run for all pushes to a pull request within a set time was rejected.
  That run starts later, and each routine needs a timer for each pull
  request.
- Each routine has one time zone. Every schedule of the routine uses it,
  also a custom cron.
- Reason: "Daily at 09:00" must mean 09:00 for the owner.
- The routine page shows the time zone while the routine has a schedule.
  The owner can change it.

## When the owner leaves

- When the owner leaves the org, or an admin removes them, their routines
  in that org move to a new owner (decision 508 E).
- The new owner is the member who gets their workspaces, as
  [When a member leaves](orgs-and-members.md#when-a-member-leaves) says.
  That member is usually an admin.
- Each moved routine turns off. It keeps its triggers, its prompt, and its
  runs.
- Its page tells the new owner that it moved from the member who left. It
  stays off until the new owner turns it on.
- Reason: its runs would now use the logins of the new owner. So the new
  owner decides when it runs.
- The new owner can change it, turn it on, use Run now, and delete it.
- The move keeps the routine and its runs in one place, and it follows the
  rule that moves the workspaces. A Duplicate, a transfer that a member
  accepts, and a take-over by the first member who acts were rejected for
  that reason.
- Runs on the logins of the member who left were rejected, because the
  owner of a routine must be a member of the org.

## Suspensions and deleted orgs

- The routines of a suspended owner start no runs. The routines of a
  suspended org start no runs either.
  [Operator actions](operator-actions.md) states both suspensions.
- A run that waits in the queue when its owner or its org is suspended
  becomes skipped, as [Run states](routine-runs.md#run-states) says.
- A suspended org still shows its Routines link and its routine pages. The
  pages show the notice of the org and no actions.
- Reason: an org suspension takes away no access to read, and nothing in a
  suspended org can change.
- The routines of a deleted org start no runs. After a Restore, each
  routine of the org runs once for the schedule times that it missed.

## Limits

- Routines add no limit beyond the hourly rule of schedules
  (decision 503 B). The plan limits of the app's Boat account still apply,
  as [The provider](workspaces-and-sandboxes.md#the-provider) says.
- Risk: routines can still use up the daily starts that all orgs share. A
  few hourly routines can do it. The restarts near day 14 of kept run
  workspaces can do it too.

## Risks that stay open

- Risk: comments, reviews, and description edits by other GitHub accounts
  reach the agent of a pull request run. The rule of
  [Who may start a run](pull-request-runs.md#who-may-start-a-run) checks
  only the author of the pull request and the sender of the event.
- Risk: such text can steer the agent. The run uses the owner's agent
  login and GitHub token, and the env vars of the org. The agent can copy
  the GitHub token and the env vars, or push them to a branch.
- The run's access to the agent login follows the sandbox's version pin.
  With a pin of 2 or later, the sandbox holds only a turn token that
  spends the owner's login through the gateway. With a pin of 1, an
  older runner can receive the agent login itself.
- The owner's GitHub token reaches each repository where the owner
  installed the GitHub App and has access, as
  [GitHub tokens](github-tokens.md) says
  (decision 121).
- Risk: the agent of a run can create more workspaces through the agent
  tools, and their first messages also come from the owner. Those
  workspaces spend starts, and the Runs list does not show them.
- Risk: a member with a terminal in a run workspace can read the owner's
  GitHub token and the credential of a running turn, as in each workspace.
  That credential is a turn token on a newer runner, or the agent login
  itself on an older runner.
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  states that risk (decision 105).
- An instruction or a classifier that makes the agent ignore commands in a
  pull request was rejected. It makes an injection less likely, but it
  does not stop it.
- A network allowlist for the sandboxes of runs was rejected, because a
  controlled run can still push a secret to a branch.
- A first agent without logins that summarizes the pull request was
  rejected, because the agent that pushes a fix must read the code itself.
- Decision 506 C chose the author rule. A token of the GitHub App that
  reaches only the routine's repository was rejected for pull request runs.
  It breaks the rule that pushes show as their sender (decision 50).
