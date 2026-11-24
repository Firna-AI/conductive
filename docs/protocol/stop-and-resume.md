# Stop and resume

This doc holds the requirements and the decisions in force for the stop
and the resume of the sandbox of a workspace. It also covers the restart
near day 14 of a stop. It belongs to
[Life of a workspace](workspace-life.md). The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A services decision number names a decision of the change that adds
[services](services.md).

## The stop

- A sandbox stops after the stop time without user activity on its
  workspace and without a running agent turn (decisions 11 and 29).
- The operator sets one stop time for every workspace of every org, on the
  [Settings tab](operator-section.md#the-settings-tab). The choices are 15,
  30, 60, 90, and 120 minutes. The stop time is 30 minutes until an
  operator changes it.
- Reason: the operator can then weigh the cost of idle sandboxes against
  the work of the users. Cal asked for this on 20 November 2026. Cal chose
  the fixed list, so that no typo keeps idle sandboxes running for hours.
  Any whole number of minutes from 5 to 240, and from 5 to 1,440, were
  rejected.
- A changed stop time reaches a running sandbox at its next activity, at
  the start or the end of a turn, or when its current stop time ends.
  Reason: the app then needs no call to each running sandbox. Cal chose
  this on 20 November 2026. A check of each running sandbox at once, a new
  time only for later starts, and a provider stop fixed at the longest
  time were rejected.
- Activity is input in the tabs of the workspace, such as typing, clicks,
  and scrolling. Terminal input is activity too.
- A request to a port preview is not activity (decision 293). A preview
  works while the sandbox runs, but it never makes the sandbox run longer.
  Reason: a page that polls by itself, or a page that a user forgot, must
  not keep a sandbox running. The user chose this on 16 November 2026. A
  count of only the page loads that the user starts, and a count of the
  user's clicks in the frame, were rejected.
- An open tab alone is not activity. An open connection is not activity
  either, such as the live reload of a dev server.
- Reason: a forgotten tab must not keep a sandbox running, and a stop must
  not cut off real work.
- A [service](services.md) is not activity either (services decision 1 B).
  Its processes, its output, its reports, and the reads of its log never
  keep a sandbox running, as [Activity](services.md#activity) says.
- A stop ends every process in the sandbox. Its files and its agent
  sessions stay. The stop also ends each service, with its definition and
  its log.

## The resume

- Opening a stopped workspace resumes its sandbox. A workspace whose owner
  is suspended does not start, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
- While the open of a workspace resumes its sandbox, the chat shows the
  composer, not the stopped bar with Resume. The same holds for the error
  bar with Try again when the open resumes after a later failed start. A
  bar shows if that Resume fails.
- The header of the workspace shows Starting from the open, before the
  reply of that Resume.
- Meanwhile the tools, and a file, diff, or skill tab without content,
  show that they wait for the sandbox, with no Resume, also on a phone.
  The file lists keep their saved copy, as during the start that follows,
  which [Start steps](workspace-life.md#start-steps) describes.
- Reason: the open already resumes the sandbox, so a bar that offers
  Resume for a moment is noise, and so is a Stopped state. Cal asked for
  these on 12 November 2026. Cal chose to keep the saved lists. A wait in
  place of the lists was rejected, because the saved lists can still be
  read.
- When a sandbox stops while its workspace is open, the tab shows the
  stopped state with Resume (decision 11).
- A resume at once when the tab shows again was rejected. Resume avoids a
  start that the user did not ask for.
- Opening a file tab, a diff tab, or a [skill tab](skill-tabs.md) also
  resumes the sandbox, in the same cases as opening the workspace
  (decision 247). A click on a file or on a skill chip, on its tab, or on
  a link to it opens the tab. A move back or forward to its address opens
  it too.
- Reason: the tab can show its file or its skill only from a running
  sandbox, so the open asks for the start. A tab that showed the stopped
  state, or an error with Try again, until a member pressed Resume was
  rejected, because the open of the tab already asks for the file.
- A message from `send_message` or `create_session` of the agent tools
  also starts the sandbox (decision 260). It does so in the same cases as
  an open, and with the same checks. These cases are a stopped workspace
  and a workspace whose later start failed, such as a failed resume.
- An accepted written prompt of [Explain](explain.md) also starts the
  sandbox in the same cases, with the same checks.
- An accepted notice for a late Allow or value answer to a secret request
  also starts the sandbox in the same cases, with the same checks. The
  notice starts a turn in the asking session, as
  [Late answers](secret-requests.md#late-answers) says.
- An accepted wake of a watch also starts the sandbox of the calling
  session in the same cases, with the same checks. The wake starts or joins
  a turn there, as [Delivery](session-watches.md#delivery) says.
- A restack turn of the merge queue also starts the sandbox in the same
  cases, with the same checks, as
  [Restack turns](merge-queue-stack.md#restack-turns) says.
- A failed first start keeps waiting for Try again, as
  [A failed first start](create-a-workspace.md#a-failed-first-start)
  says. An empty session from the agent tools starts nothing.
- Reason: every member can already start each workspace of the org with an
  open. A delegated task then runs while no member watches.
- A message that waits until a member opens its workspace was rejected.
  Its task could wait for hours, and the agent that sent it would not learn
  why.
- A refusal of such a message was rejected, because it adds a refusal, and
  the agent must then ask a member to open the workspace.
- Each such start counts toward the starts that the orgs of its provider
  account share, as [The provider](workspaces-and-sandboxes.md#the-provider)
  says.
- While the sandbox is stopped, the chat history shows, and the stopped
  state takes the place of the composer.
- A resume starts no service, as [Lifetime](services.md#lifetime) says.
- A start that fails shows the error state with Try again. The chat history
  stays.

## The restart near day 14

- On Boat, near day 14 of a stop, the app starts the sandbox briefly and
  stops it again, so that Boat keeps its disk (decision 43). A workspace
  whose owner is suspended gets no such restart, as
  [Starts, stops, and builds](operator-actions.md#starts-stops-and-builds)
  says (decision 125).
- Reason: Boat can delete the disk of a sandbox that is stopped for more
  than 14 days, and a resume then fails.
- Each such restart uses a start and some minutes of the app's Boat
  account.
- A sandbox on E2B gets no such restart. Reason: E2B keeps the disk of a
  stopped sandbox with no time limit.
- An archived workspace gets this restart only when Boat's 14 days end
  before the app deletes its sandbox, as
  [Archive](workspace-life.md#archive) says. So a sandbox that Archive
  stopped gets none.
- The restart of an archived sandbox gets none of the secrets of its
  workspace and its org, and it runs no startup script. It only resumes the
  sandbox and stops it again.
- Reason: Archive revokes the workspace token, and an archived workspace
  has no tools.
- After a [Restore](workspace-life.md#restore), a workspace on Boat gets
  this restart again, near day 14 of its last stop. When that time has
  passed, the restart runs at once.
- An automatic Archive near day 14 was rejected, because the delete 14 days
  after an Archive loses unpushed work. A copy of the disk in the app's own
  storage was rejected, because the app would then hold a copy of each
  user's code.
