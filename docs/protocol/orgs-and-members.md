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
- An org owner adds the key on the Boat key screen of the org settings.
  Open decision 54 asks whether an admin role can add it too.
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
- It has steps that install the GitHub App, create the first org, add the
  org's Boat key, and connect Claude or Codex (decision 33).
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
- The roles are owner and member. Open decision 54 asks whether orgs get an
  admin role.
- An org owner invites a person by GitHub login.
- Only an org owner invites and removes members, changes a role, reassigns
  a workspace, adds the Boat key, and deletes the org.
- Every member of the org sees all of its workspaces (decision 39).
- A member who is not an owner sees the Members tab and the owner of each
  workspace, without the actions of an owner.
- Only the workspace owner and the org owners can archive a workspace
  (decision 42).
- Archive by every member was rejected, because a member could then delete
  the sandbox and the unpushed work of another member.
- Open decision 49 sets what a member may do in a workspace that another
  member owns, and who may edit the scripts of the org.

## Workspace owners

- Each workspace belongs to the person who created it, until an org owner
  reassigns it (decision 24).
- The agents of a workspace use the agent logins of its workspace owner.
  Model use on an account of the app was rejected, because each workspace
  owner's own account pays.
- The header of a workspace names its workspace owner.
- Reassigning a workspace stops its sandbox first. Reason: a sandbox gets
  the logins of the new owner only at its next start.

## When a member leaves

- When a member leaves, or an org owner removes them, their workspaces
  stay in the org (decision 39).
- The workspaces move to the org owner who removed the member. When the
  member left alone, they move to the earliest owner of the org.
- Reason: the agents must not keep using the logins of a person who left.
  The same reason rejects a person who left as a workspace owner.
- Open decision 55 sets what happens when the last owner leaves.

## Delete org

- Delete org asks for the name of the org.
- It stops every sandbox of the org and hides the org at once
  (decision 30).
- The app deletes everything of the org after 7 days, unless an org owner
  restores the org.
- Reason: the work of every member stays safe for 7 days, and a stopped
  sandbox costs no machine time.
- A delete at once was rejected, because an owner could then delete the
  unpushed work of a member.
- The delete also removes the saved snapshots of the org, with the org
  image.
- For 7 days, the deleted org stays faded in the rail of its owners, and
  its page offers Restore. Its members cannot open it.
- Restore brings the org back as it was. Its workspaces start again when
  they open.
