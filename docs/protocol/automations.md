# Automations

This doc holds the requirements and the decisions in force for automations. An
automation is a saved prompt that runs an agent without a person. This doc
covers an automation, its pages, who may see and change it, its chosen
secrets, and its schedules. It also says what happens when the owner leaves
or a suspension stops the runs. Three linked pages cover the rest:

- [Automation runs](automation-runs.md): the runs, their secrets, the run text,
  the run states, and the failed runs.
- [Pull request runs](pull-request-runs.md): the pull request triggers, and
  whose events may start a run.
- [Automation risks](automation-risks.md): the risks that stay open while no
  person watches a run.

The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An automation capabilities
decision number, such as automation capabilities decision 1, names the
dated record of one decision of the change that adds
[Capabilities](capabilities.md) to automations. Its plan keeps these
records while the change is open. Its pull request keeps them after the
merge.

## An automation

- An automation belongs to one org. It has a name, a prompt, one repository of
  the org, and a section. It also has a model with its effort and its
  [fast mode](fast-mode.md), an Active switch, one time zone, its
  triggers, and its [chosen secrets](#chosen-secrets).
- Each trigger starts a run. Each run creates a new workspace, with its own
  cloud computer and branch (decision 501 A).
- One workspace for each automation, with a new session for each run, was
  rejected. Its runs would share one branch and one set of files. A pull
  request run would then switch branches under the earlier work.
- One session that gets each run as a new message was rejected too. Its
  conversation grows without end, and parallel runs cannot share one turn.
- The cloud computer of a run still holds the other chosen repositories of
  the org, as [Repository folders](repository-folders.md) says.
- An empty name saves as "Untitled automation".
- The prompt must have text (decision 511 B). Save stays off until the
  prompt has text. The Worker refuses an automation whose prompt is empty or
  holds only spaces.
- Reason: a run without a prompt has no task, but it still spends a start.
  An automation without a prompt was rejected, also as a draft that stays off.
- A new automation starts active, with no chosen secret. It gets the first
  repository in the org's [repository order](orgs-and-members.md#repository-order),
  the General section, and the default model of its owner, with its effort
  and its fast mode.
- An automation can have no trigger. Then only Run now starts it.
- Deleting a section moves its automations to General, as it moves its
  workspaces.
- When the repository of an automation stops being a chosen repository of the
  org, the automation turns off, and its page says why. Reason: no run of it
  can succeed, and a turn-off names the cause before any run fails.
- A deleted automation keeps its run workspaces, because they are normal
  workspaces (decision 504 A).

## The automation pages

- The sidebar of each org has an Automations link below New workspace. The org
  list of a phone has the same link.
- The Automations page lists the automations of the org. Each row shows the name,
  the repository, the triggers, and the owner. It also shows whether the
  automation is on, and the state and the time of its last run.
- The page of an org without automations says what an automation does. New
  automation starts the first one.
- New automation opens an empty automation page. The first save creates the
  automation.
- The automation page shows the name, the Active switch, the repository, the
  section of the run workspaces, and "By" with the owner. Then it shows the
  triggers, the prompt with the model picker, and the Runs list.
- A line under the prompt names the agent login and the GitHub access that
  the runs use. The login is the default login of the owner, such as the
  org login. The line names that login for every reader, including a
  member who does not own the automation. GitHub access still belongs to
  the automation owner.
- The automation reply names the resolved login owner for its saved agent.
  It names no login owner when no login serves the automation owner.
- For the owner, the bar of the prompt box holds the Capabilities icon,
  before the model picker. The owner checks the secrets of the runs in its
  control, as
  [The control of an automation](capabilities.md#the-control-of-an-automation)
  says.
- After the line of the logins, a line names the chosen secrets, such as
  "Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question." It hides
  while no secret is chosen. It names only the chosen secrets, not the
  secrets for all agents, because it says what the automation adds.
- Reason: the closed icon shows no choice, and the hint below needs the
  names that it means.
- While the automation has a pull request trigger and a chosen secret, a
  hint follows that line (automation capabilities decision 3 A). It says
  "Text in a pull request, such as a comment, can steer the agent to use
  these secrets."
- Every member sees the line and the hint. For the owner, the hint follows
  the triggers of the form, also before Save. For each other member, it
  follows the saved triggers.
- Reason: an admin who is not the owner can still turn the automation off.
- Save stays off while nothing changed, while the prompt is empty, and
  while the form refuses a cron.
- A desktop shows the Runs list in a column at the right. A phone shows a
  saved automation in two tabs, Automation and Runs.
- Reason: a member who reads the runs must not scroll past the whole form.
- The [mockup catalogue](../mockups/catalogue.md) draws each page and each
  state under `app/automations`, with its copy.

## Access

- Every member of the org sees every automation, with its prompt, its
  triggers, and its runs (decision 502 B).
- Every member who can create a workspace can create an automation. The member
  who creates it is its owner.
- Only the owner changes an automation, also its chosen secrets. Only the
  owner turns it on and uses Run now.
- Reason: each run acts as the owner, with the owner's GitHub access and
  the owner's default login. So only the owner decides what runs in the
  owner's name.
- The owner can delete the automation. An admin can turn it off and delete it.
- Every member who is not the owner reads the automation without fields. A
  line says that only the owner can change it.
- An admin who is not the owner gets only Turn off and Delete. Turn off
  shows only while the automation is on.
- The owner changes only when the owner leaves the org, as
  [When the owner leaves](#when-the-owner-leaves) says.
- Automations that only their owner sees were rejected, because every member
  already sees the run workspaces. Automations that every member edits, where
  each save makes the saver the owner, were rejected too.
- An installation token of the GitHub App for the pushes of each run was
  rejected. Org automations, which act as the org and not as a member, were
  rejected too. Each breaks the rule that pushes show as their sender
  (decision 50).
- A run can still take the org login for its turns. The org login changes
  only the agent login of the run. The run still acts as its owner, as
  [A run acts as its owner](automation-runs.md#a-run-acts-as-its-owner) says.
- Run now does not show on an automation whose triggers are all pull request
  triggers (decision 510 C). Reason: such a run needs a pull request.
- An automation with a schedule, or with no trigger, keeps Run now. A Run now
  that asks for a pull request and an event is a later change
  (decision 510 B).
- Run now works while the automation is off. Reason: the owner can test an
  automation before its triggers start runs.

## Chosen secrets

- The chosen secrets of an automation are secrets of its org. Each run
  workspace starts with them as pre-approvals, so the agents of the run use
  them with no request (automation capabilities decision 1 A).
  [The secrets of a run](automation-runs.md#the-secrets-of-a-run) states
  the rules of the run.
- Reason: no person watches a run. Without a grant, a run that needs a
  secret waits until a member answers its request.
- The owner can choose each secret of the org, because every member uses
  each secret (secrets decision 3 B).
- Every member sees the chosen secrets, read-only, as
  [The automation pages](#the-automation-pages) says.
- One list serves each run of the automation: the runs of its schedules,
  its pull request runs, and the runs of Run now (automation capabilities
  decision 3 A).
- Pull request runs without the chosen secrets, a choice for each trigger,
  and a rule by the visibility of the repository were rejected. Reason: an
  owner can save a second automation without chosen secrets for the pull
  request triggers.
- A rule by the author of each event was rejected, because the author rule
  already decides who starts a run, and comments come from other accounts.
- A chosen secret belongs to its secret, not to its name. So a Replace
  keeps the choice. A deleted secret leaves the chosen secrets of each
  automation, and a new secret with its name is not chosen.
- A save drops each secret ID that names no secret of the org, and it
  saves the rest. Reason: a secret that a member deleted while the form
  was open must not block the save.
- An update that leaves out the chosen secrets keeps them. Reason: an
  older copy of the app then keeps the choices.

## Schedules

- Add trigger offers two groups. Scheduled has Hourly, Daily, Weekdays,
  Weekly, and Custom (cron). GitHub has PR opened, PR pushed, and PR merged.
- Reason: these are the triggers of Conductor's routines. Run now lets the
  owner test an automation at once.
- Hourly asks for a minute. Daily and Weekdays ask for a time. Weekly asks
  for a day and a time. Times use the 24-hour clock.
- Custom asks for a cron expression with five fields. They are the minute,
  the hour, the day of the month, the month, and the day of the week.
- A schedule runs at most once an hour (decision 503 B). So the minute
  field of a custom cron must name one minute. Each preset meets this rule.
- The form refuses a cron that breaks the rule, and says why. The Worker
  refuses it too. It also refuses a cron without five fields and an unknown
  time zone.
- Reason: the orgs of one provider account share its daily starts, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says. A cron
  that runs each minute makes 1,440 starts a day.
- Pull request triggers have no limit.
- Caps on the runs of an automation, of an org, or of all automations were
  rejected. Each would skip wanted runs, such as pull request runs late in
  the day. The product also sets no limits of its own on workspaces
  (decision 81).
- One run for all pushes to a pull request within a set time was rejected.
  That run starts later, and each automation needs a timer for each pull
  request.
- Each automation has one time zone. Every schedule of the automation uses it,
  also a custom cron.
- Reason: "Daily at 09:00" must mean 09:00 for the owner.
- The automation page shows the time zone while the automation has a schedule.
  The owner can change it.

## When the owner leaves

- When the owner leaves the org, or an admin removes them, their automations
  in that org move to a new owner (decision 508 E).
- The new owner is the member who gets their workspaces, as
  [When a member leaves](orgs-and-members.md#when-a-member-leaves) says.
  That member is usually an admin.
- Each moved automation turns off. It keeps its triggers, its prompt, its
  chosen secrets, and its runs.
- Its page tells the new owner that it moved from the member who left. It
  stays off until the new owner turns it on.
- Reason: its runs would now act as the new owner, with the GitHub access
  and the default login of the new owner. So the new owner decides when it
  runs.
- The new owner can change it, turn it on, use Run now, and delete it.
- The move keeps the automation and its runs in one place, and it follows the
  rule that moves the workspaces. A Duplicate, a transfer that a member
  accepts, and a take-over by the first member who acts were rejected for
  that reason.
- Runs on the logins of the member who left were rejected, because the
  owner of an automation must be a member of the org.

## Suspensions and deleted orgs

- The automations of a suspended owner start no runs. The automations of a
  suspended org start no runs either.
  [Operator actions](operator-actions.md) states both suspensions.
- A run that waits in the queue when its owner or its org is suspended
  becomes skipped, as [Run states](automation-runs.md#run-states) says.
- A suspended org still shows its Automations link and its automation pages. The
  pages show the notice of the org and no actions. They keep the line of
  the chosen secrets.
- Reason: an org suspension takes away no access to read, and nothing in a
  suspended org can change.
- The pages show no pull request hint, because no run starts.
- The automations of a deleted org start no runs. After a Restore, each
  automation of the org runs once for the schedule times that it missed.

## Limits

- Automations add no limit beyond the hourly rule of schedules
  (decision 503 B). The plan limits of the provider account of the org
  still apply, as [The provider](workspaces-and-sandboxes.md#the-provider)
  says.
- Risk: automations can still use up the daily starts that the orgs of one
  provider account share. A few hourly automations can do it. On Boat, the
  restarts near day 14 of kept run workspaces can do it too.

## Risks that stay open

See [Automation risks](automation-risks.md#risks-that-stay-open).
