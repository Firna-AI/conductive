# Workspaces during a suspension

This page belongs to [Operator actions](operator-actions.md). It states
how a suspension affects workspace starts, sandbox access, preview viewers,
and workspace owners. The terms come from the
[architecture doc](../architecture.md#terms).

## Starts, stops, and builds

- The suspension stops the sandbox of each workspace that the user owns.
  A stop that fails runs again until it completes.
- That stop goes on after an admin assigns the workspace to another
  member. A running workspace whose workspace token is revoked stops,
  whoever owns it, and the stop runs again every 30 seconds until it is
  confirmed. Only a start that waits keeps it running, because that
  start gives the workspace a new token.
- After such a stop, a workspace keeps its restart near day 14 while
  neither its owner nor its org is suspended. Each owner change makes the
  workspace check its stop and its restart at once.
- No member can start a workspace whose owner is suspended. This covers a
  create and a resume.
- The refusal of a resume has the code `user_suspended`. It says that
  the workspace owner is suspended, and that an admin can assign another
  member.
- A refused start keeps the workspace page open, with its chat history,
  its header, and its owner control. The notice of the refusal ends when
  the workspace gets another owner.
- A start of such a workspace that waits or runs stops before its next
  step.
- A stopped workspace whose owner is suspended gets no restart near day 14
  of its stop (decision 125). So Boat can delete its disk, with any
  unpushed work of the members. An admin can assign the workspace to
  another member, as the refusal above says.
- A suspended user can create no workspace and start no build.
- The routines of a suspended user start no runs, as
  [Suspensions and deleted orgs](routines.md#suspensions-and-deleted-orgs)
  says.
- Each unfinished build that the user started stops and fails. The app
  removes its build sandbox.
- An automatic refresh of an org image, after a push or on the daily
  timer, runs for an admin who is not suspended. An org without such an
  admin gets no automatic refresh.

## Sandbox access

These rules hold for each member, for each workspace whose owner or org
is suspended.

- No member can open a new preview, launch a preview, open a terminal, or
  get a desktop address. The Worker refuses each before any call to Boat,
  with the same reply as the refusal of a resume.
- Each request to a preview of the workspace gets the answer of an unknown
  preview, and the data of an open preview stops.
- An open terminal socket closes within 30 seconds.
- An open desktop stream does not pass through the Worker. So it can play
  until the sandbox stops, as [Desktop](terminal-previews-and-desktop.md#desktop)
  says.

## Previews and their viewers

- Each preview grant and each preview cookie belongs to one viewer: the
  user and the sign-in session that launched the preview.
- Each request to a preview and each batch of its data checks the preview
  and its viewer together. One check covers that viewer for 1 second, as
  [Port previews](terminal-previews-and-desktop.md#port-previews) says.
- The redemption of a grant checks its viewer too.
- When a viewer is suspended, leaves or is removed from the org, or signs
  out, the grants, cookies, requests, and streams of that viewer stop
  working within 1 second, plus the time of one read.
- Other viewers of the same preview keep their access.

## Owners and admins

An active admin is an admin who is not suspended. One rule of active
admins decides who gets the workspaces of a member who leaves, and who
must stay an admin (decision 123). The same rule decides whether a Restore
of a deleted org takes effect.

- When a member leaves the org alone, their workspaces move to the
  earliest active admin.
- When the org has no active admin, the workspaces move to the earliest
  remaining member who is not suspended. Only when no such member remains
  do they move to the earliest admin.
- The routines of the member who leaves move to the same member as the
  workspaces (decision 508 E).
- For a leave and a change of role, the last-admin rule counts only
  active admins. An admin can leave the org, or lose the admin role, only
  while another active admin remains.
- A member who is not an admin can always leave.
- A manual move of a workspace to a suspended member fails with HTTP 409
  and the code `owner_suspended`, and nothing changes. The owner picker
  shows the error.
- A [Restore](orgs-and-members.md#delete-org) brings a deleted org back
  only while the admin who asked for it is an active admin. When that admin
  is suspended before the org comes back, the org stays deleted.
- Reason: a suspension stops each other write of that admin. A Restore that
  still takes effect after the suspension of its admin was rejected for
  that reason.
- [When a member leaves](orgs-and-members.md#when-a-member-leaves) states
  the other rules of a leave.

## What other members keep

- Other members keep their sign-in sessions, their own workspaces, and
  their own previews.
- They can still open a workspace whose owner is suspended, and read its
  chat history, also when the workspace is archived.
- They can still list and close the previews of that workspace, and read
  the status of its terminal.
