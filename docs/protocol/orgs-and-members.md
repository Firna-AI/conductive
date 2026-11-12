# Orgs and members

This doc holds the requirements and the decisions in force for orgs, their
sections, and their members. It also covers the first run and the end of
an org. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Orgs

- An org owns its workspaces, its sections, its repositories, and the
  settings of its org image (decision 21).
- An org also has members and [routines](routines.md).
- All orgs share the app's GitHub App. The agent logins of a user serve all
  of that user's orgs (decision 21).
- All orgs share the app's Boat account and its plan limits, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says
  (decision 80). No org has a Boat key.
- Orgs that mirror GitHub accounts were rejected, because a new org would
  then need the GitHub App on another GitHub account.
- The org rail lists the orgs of the user, and the user can create orgs.
- Create org accepts a name, custom initials, and chosen repositories.
- Create org requires at least one repository (decision 151 of PR #92). The create
  screen says so, and Create org stays off until the person chooses one.
  The app refuses a create of an org with no repository.
- Reason: every new org then starts its first build at create, with the
  whole choice of repositories, as
  [The first build](org-image.md#the-first-build) says. A
  first build at the first save on the Repositories tab was rejected,
  because that tab saves each repository on its own. That build could
  start with only part of the choice.
- Before the org exists, the create screen lists repositories that the
  signed-in user and the shared GitHub App can both reach.
- When that list has no repository, Create org stays off. The list then
  asks the person to give the GitHub App access, with its Manage access
  link.
- Each list of the repositories that the GitHub App reaches has a Manage
  access link. The link opens the page of the GitHub App on GitHub. That
  page lists the GitHub accounts of the person, personal and org. There
  the person changes the repositories that the app reaches on an account,
  or installs the app on another account.
- After a save on GitHub, the return opens the screen of the list again,
  as [The GitHub App](github-banner.md#the-github-app) says.
- A link to the settings page of each installation was rejected, because
  it gives no link when no account has the app, and it cannot install the
  app on another account.
- The org rail and General settings show the saved initials.
- Use of the product is free until billing starts, as
  [Before billing starts](pricing.md#before-billing-starts) says. Until
  then, the app has no billing, and no limits of its own on workspaces,
  hours, or members.
- When billing starts, each org has a plan, and the org pays for its
  members and its cloud hours (decision 250).
  [The plans](pricing.md#the-plans) give the price, the hours, and the
  limits of each plan.
- A waitlist stands in front of the app (decision 160). Except during
  [open sign-up](sign-ups.md#open-sign-up), a new account waits for app
  access, as [Waitlist](waitlist.md) says (decision 230).

## Get started

- Get started is the only first run.
- Get started opens only after app access. A person who waits sees the
  [waitlist screen](waitlist.md#the-waitlist-screen) instead. Reason: the
  steps of Get started need app access.
- It has three steps, in this order (decisions 33 and 80):
  1. Install the GitHub App.
  2. Create the first org.
  3. Connect Claude or Codex.
- Get started asks for no Boat account and no Boat key.
- [Chat and events](messages-and-attachments.md#messages) states the notice for a
  missing agent login.
- The second step, the org step, shows the cloud computer of the org once
  the org exists (decision 150 of PR #92). Create org starts its first build, as
  [The first build](org-image.md#the-first-build) says.
- While the org has no good image, the org step shows the state of the
  newest build of the org:
  - While a build runs, the step says that the cloud computer is being
    prepared, with the time since the build began.
  - After a failed build, the step shows the failure with the message
    that the app saved for the build. An admin gets Try again and a link
    to the log of the build on the Cloud computer tab.
  - With no build, such as after a first build that could not start, the
    step says that the org has no build yet. An admin gets Build computer.
- Once the org has a good image, the step says that the cloud computer is
  ready. A later build does not change that, also when it fails
  (decision 9).
- A member who is not an admin sees each state with no action. Reason:
  only an admin builds (decision 57).
- The person can connect an agent while the build runs.
- When every step is done, Get started shows its finish: a line about the
  org, and an Open button for the org, such as "Open Acme".
- The Open button stays on in every state of the build (decision 150 of PR #92).
  New workspace also shows the state of the build, as
  [Create a workspace](workspaces-and-sandboxes.md#create-a-workspace)
  says.
- The finish says that the org is ready for a new workspace only once the
  org has a good image. Before that, it says that the cloud computer of the
  org is still being prepared, did not build, or needs a build.
- Reason: the person sees the build where it starts. The person never
  waits in Get started for the build, which can run for up to 60 minutes.
  A fourth step for the build was rejected for that reason.

## Sections

- Sections are groupings of workspaces that the people of the org define.
  A section is not tied to a repository.
- Each section collapses, and has a menu with New workspace, Rename section,
  New section, and Delete section, in that order.
- New workspace at the top of the list puts the workspace in General, the
  default section. New workspace in the menu of a section puts it in that
  section. The New workspace dialog can pick another section, as
  [The dialog](create-a-workspace.md#the-dialog) says.
- A workspace moves to another section by drag and drop. On a phone, a
  long press lifts the row.
- A focused row also moves by keys.
  [Fixed keys](keyboard-shortcuts-fixed-keys.md#fixed-keys) gives the keys.
- Move to section in the
  [menu of a workspace row](workspace-menu.md#move-to-section) moves it too.
- Deleting a section moves its workspaces to General, also the archived
  ones. Reason: no workspace gets lost, and a Restore always has a section
  to go back to.
- The app keeps the archived workspaces in the Archived group at the end
  of the list. The users do not edit that group.
- A workspace row offers Archive only to its owner and the org's admins.
  Only hover reveals its archive icon over the time without moving the row
  content. Selection and keyboard focus alone keep the time visible.
  The workspace header has no archive control.
- A row of the Archived group offers Restore in the same way, to every
  member, until Restore of its workspace ends, as
  [Restore](workspace-life.md#restore) says.
- A click on a workspace row in the sidebar opens the workspace with the
  focus in its message box, so that the user can type at once. This holds
  also for the row of the open workspace. The message box takes the focus
  when it shows, unless the focus moved to another element before then.
  Reason: the message box never takes the focus from a later choice of the
  user. The list page of a phone opens a workspace without that focus, so
  that no keyboard opens on its own.

## Members and roles

- Orgs have members, so that a workspace can move from one member to
  another.
- The roles are admin and member, as in Conductor (decision 54). An org
  can have several admins.
- A separate owner role above the admins was rejected, because several
  admins already give an org more than one manager.
- An admin invites a person by email, and the app sends the invitation to
  that address (decision 78).
- The person joins with a GitHub account that has that address as a
  verified email. The app reads the verified emails at sign-in, and the
  person accepts each matching invitation.
- Reason: a GitHub login can be renamed and taken by another account. A
  verified email proves the inbox.
- An accepted invitation also gives app access to a person who waits, with
  no count (decision 163).
  [Org invitations](waitlist.md#org-invitations) states the rule.
- Only an admin invites and removes members, changes a role, reassigns a
  workspace, and deletes the org.
- Only an admin changes the repositories, the install script, the startup
  script, and the env vars (decision 57). Other members see them
  read-only.
- Only an admin changes the org's name and initials. Other members see
  them read-only.
- Changes by every member were rejected, because a changed script reaches
  every new sandbox of the org and runs during other members' turns.
- Every member of the org sees all of its workspaces (decision 39).
- Every member also sees all of the routines of the org and their runs.
  Only the owner of a routine changes it, as [Access](routines.md#access)
  says (decision 502 B).
- Every member can send messages in every workspace of the org. Each
  session runs on the agent login of its starter, as
  [Agents and sessions](agents-and-sessions.md#agents) says.
- Every member can move a workspace to another section and rename it,
  while the workspace is not archived.
- A member who is not an admin sees the Members tab and the owner of each
  workspace, without the actions of an admin.
- Only the workspace owner and the admins can archive a workspace
  (decision 42).
- Archive by every member was rejected, because the app deletes the
  sandbox 14 days after an Archive. A member could then start the delete
  of the unpushed work of another member.
- Every member of an org that is not suspended can restore an archived
  workspace (decision 2 of PR #138).
- Reason: Restore deletes nothing. It gives a member only the access that
  a resume gave before the Archive.
- Restore only by the owner and the admins, as for Archive, was rejected
  for that reason. So a member can restore a workspace that its owner
  archived. Only the owner or an admin can archive it again.
- Restore keeps the owner of the workspace. A new owner for the member who
  restores was rejected, because only an admin reassigns a workspace.
- Every member can continue each workspace of the org after its merge
  (decision 224). [Who may continue](continue.md#who-may-continue) gives
  the reason.
- The role does not decide Merge or the agent actions of the pull request
  bar. The GitHub access of each member decides them, as
  [GitHub banner](github-banner.md#merge) says.

## Workspace owners

- The workspace owner is the person who is responsible for the workspace
  (decision 24).
- Each workspace belongs to the person who created it, until an admin
  reassigns it. A move to a suspended member fails, as
  [Owners and admins](operator-actions.md#owners-and-admins) says.
- An admin reassigns a workspace with the owner picker of its header, or
  with Reassign to in the
  [menu of its row](workspace-menu.md#reassign-to).
- The header of a workspace names its workspace owner.
- Model use on an account of the app was rejected. Each session runs on
  the own agent login of its starter.

## When a member leaves

- When a member leaves, or an admin removes them, their workspaces stay in
  the org (decision 39).
- The workspaces move to the admin who removed the member. When the member
  left alone, they move to the earliest admin of the org who is not
  suspended. [Owners and admins](operator-actions.md#owners-and-admins)
  states the choice when no such admin exists (decision 123).
- Reason: each workspace keeps a person in the org who is responsible for
  it.
- Their routines in the org move to the member who gets the workspaces,
  turned off, as [When the owner leaves](routines.md#when-the-owner-leaves)
  says (decision 508 E).
- The last admin can leave only after they make another member an admin,
  or by deleting the org (decision 55). This also holds when the last
  admin deletes their account. For a leave and a change of role, only
  admins who are not suspended count (decision 123).
- Reason: the org always keeps someone who can manage it. The person who
  leaves chooses the next admin, so nobody gets the role by surprise.
- An automatic admin role for the earliest member was rejected for that
  reason.

## Delete org

- Delete org asks for the name of the org.
- It stops every sandbox of the org and hides the org at once
  (decision 30).
- The app deletes everything of the org after 7 days, unless an admin
  restores the org.
- Reason: the work of every member stays safe for 7 days, and a stopped
  sandbox costs no machine time.
- A delete at once was rejected, because an admin could then delete the
  unpushed work of a member.
- The delete also removes the saved snapshots of the org, with the org
  image.
- For 7 days, the deleted org stays faded in the rail of its admins, and
  its page offers Restore. Its other members cannot open it.
- Restore brings the org back as it was. Its workspaces start again when
  they open. A workspace whose owner is suspended does not start, as
  [Operator actions](operator-actions.md#starts-stops-and-builds) says.
- The routines of a deleted org start no runs. After a Restore, each runs
  once for the schedule times that it missed, as
  [Suspensions and deleted orgs](routines.md#suspensions-and-deleted-orgs)
  says.
- An unfinished create continues when its workspace opens after Restore.
  It then gets a new start limit of 20 minutes, the limit of each start in
  [Time limits of builds and starts](workspace-life.md#time-limits-of-builds-and-starts).
  The workspace keeps its original creation date.
- Reason: the create makes no progress while its org is deleted.
