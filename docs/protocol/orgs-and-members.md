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
- Before the org exists, the create screen lists repositories that the
  signed-in user and the shared GitHub App can both reach.
- Each list of the repositories that the GitHub App reaches has a Manage
  access link. The link opens the page of the GitHub App on GitHub. That
  page lists the GitHub accounts of the person, personal and org. There
  the person changes the repositories that the app reaches on an account,
  or installs the app on another account.
- A link to the settings page of each installation was rejected, because
  it gives no link when no account has the app, and it cannot install the
  app on another account.
- The org rail and General settings show the saved initials.
- The product is free, with no limits (decisions 45 and 81). It has no
  plans, no billing, and no limits of its own on workspaces, minutes, or
  members.
- Limits for each user, billing, and an invite-only sign-up were rejected
  for now. Billing can come later (decision 81).

## Get started

- Get started is the only first run.
- It has three steps, in this order (decisions 33 and 80):
  1. Install the GitHub App.
  2. Create the first org.
  3. Connect Claude or Codex.
- Get started asks for no Boat account and no Boat key.
- [Chat and events](chat-and-events.md#messages) states the notice for a
  missing agent login.

## Sections

- Sections are groupings of workspaces that the people of the org define.
  A section is not tied to a repository.
- Each section collapses, and has a menu with Rename, New workspace, New
  section, and Delete section.
- New workspace at the top of the list puts the workspace in General, the
  default section. New workspace in the menu of a section puts it in that
  section.
- A workspace moves to another section by drag and drop. On a phone, a
  long press lifts the row.
- Deleting a section moves its workspaces to General. Reason: no workspace
  gets lost.
- The app keeps the archived workspaces in the Archived group at the end
  of the list. The users do not edit that group.

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
  says (decision 202 B).
- Every member can send messages in every workspace of the org. Each
  session runs on the agent login of its starter, as
  [Chat and events](chat-and-events.md#agents) says.
- A member who is not an admin sees the Members tab and the owner of each
  workspace, without the actions of an admin.
- Only the workspace owner and the admins can archive a workspace
  (decision 42).
- Archive by every member was rejected, because a member could then delete
  the sandbox and the unpushed work of another member.

## Workspace owners

- The workspace owner is the person who is responsible for the workspace
  (decision 24).
- Each workspace belongs to the person who created it, until an admin
  reassigns it. A move to a suspended member fails, as
  [Owners and admins](operator-actions.md#owners-and-admins) says.
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
  says (decision 208 E).
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
  [Time limits of builds and starts](workspaces-and-sandboxes.md#time-limits-of-builds-and-starts).
  The workspace keeps its original creation date.
- Reason: the create makes no progress while its org is deleted.
