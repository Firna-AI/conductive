# Orgs and members

This doc holds the requirements and the decisions in force for orgs, their
Boat keys, their sections, and their members. It also covers the first run
and the end of an org. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Orgs

- An org owns its workspaces, its sections, its repositories, and the
  settings of its org image (decision 21).
- An org also has members and one Boat key.
- All orgs share the app's GitHub App. The agent logins of a user serve all
  of that user's orgs (decision 21).
- Orgs that mirror GitHub accounts were rejected, because a new org would
  then need the GitHub App on another GitHub account.
- The org rail lists the orgs of the user, and the user can create orgs.
- The product is free (decision 45). It has no plans, no billing, and no
  limits of its own on workspaces, minutes, or members.
- The plan limits of the org's Boat account apply to its sandboxes.

## The Boat key

- Each org has one Boat key. Every sandbox and the org image of the org
  run on that Boat account (decision 46).
- An admin adds the key on the Boat key tab of the org settings. Only
  admins see that tab.
- The Boat key screen names Boat, and links to Boat's sign-up page and to
  its key page (decision 47).
- A new key must reach the same Boat account as the old key. The key
  screen refuses a key of another Boat account, and says why (decision
  56).
- A Boat key for each member was rejected. A workspace that moves to
  another member would then have to move to another Boat account.
- [Access and security](access-and-security.md#boat-keys) states how the
  Worker keeps the key.

## Get started

- Get started is the only first run.
- It has four steps, in this order (decision 33):
  1. Install the GitHub App.
  2. Create the first org.
  3. Add the org's Boat key.
  4. Connect Claude or Codex.
- Reason for the order: the Boat key belongs to the org, so the org comes
  first.
- Get started says that users need their own Boat account (decision 47).
- [Chat and events](chat-and-events.md#messages) states the notice for a
  missing Boat key or a missing agent login.

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
- An admin invites a person by GitHub login.
- Only an admin invites and removes members, changes a role, reassigns a
  workspace, adds the Boat key, and deletes the org.
- Only an admin changes the repositories, the install script, the startup
  script, and the env vars (decision 57). Other members see them
  read-only.
- Only an admin renames the org. Other members see the name read-only.
- Changes by every member were rejected, because a changed script reaches
  every new sandbox of the org and runs during other members' turns.
- Every member of the org sees all of its workspaces (decision 39).
- Every member can send messages in every workspace of the org. Each turn
  runs on the login of its sender, as
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
  reassigns it.
- The header of a workspace names its workspace owner.
- Model use on an account of the app was rejected. Each turn runs on the
  own login of its sender.

## When a member leaves

- When a member leaves, or an admin removes them, their workspaces stay in
  the org (decision 39).
- The workspaces move to the admin who removed the member. When the member
  left alone, they move to the earliest admin of the org.
- Reason: each workspace keeps a person in the org who is responsible for
  it.
- The last admin can leave only after they make another member an admin,
  or by deleting the org (decision 55). This also holds when the last
  admin deletes their account.
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
  they open.
