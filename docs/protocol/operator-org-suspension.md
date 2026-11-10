# Org suspension

This doc holds the requirements and the decisions in force for the
suspension of an org by an operator, and for what the members of a
suspended org keep. It belongs to [Operator actions](operator-actions.md),
which covers the operator, the suspension of a user, the lift of a
suspension, and abuse reports. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Suspend an org

An org suspension covers each workspace and each build of the org,
whoever owns or started it (decision 129).

- The request names the org by its ID. An ID without an org gets HTTP 404
  with the code `org_not_found`.
- The operator can also suspend an org that an admin deleted, while the
  org still exists. No admin can restore it while it is suspended.
- The other rules of
  [Suspend a user](operator-actions.md#suspend-a-user) hold for an org
  too. They cover the record of the time and the operator, a repeat, and
  the reply with its pending stops.
- The org suspension stops the sandbox of each workspace and each build of
  the org. A stop that fails runs again until it completes.
- It revokes the workspace token of each workspace of the org. The rule of
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  then refuses each such token, and each runner connection closes.
- [Sandbox access](operator-actions.md#sandbox-access) states how the
  previews, the terminals, and the desktops of the org end.
- Nobody can create, resume, or start a workspace of the org. No build and
  no image refresh of the org runs, by hand or automatically.
- A start of a workspace of the org that waits or runs stops before its
  next step.
- Each unfinished build of the org stops and fails. The app removes its
  build sandbox.
- When the org runs on Boat, a stopped workspace of the org gets no
  restart near day 14 of its stop, also after an owner change
  (decision 125). So Boat can delete its disk, with any unpushed work of
  the members.
- A signed-in member who is not suspended gets each refusal with HTTP 403
  and the code `org_suspended`. It says that the org is suspended, and it
  gives the address for abuse reports.
- This also holds when the owner of the workspace, or the new owner that a
  request names, is suspended.

## What members of a suspended org keep

- An org suspension suspends no user. Each member can still sign in, and
  keeps their sign-in sessions in the browser and in the Mac app.
- Each member keeps their account and their other orgs. The org
  suspension changes nothing in another org.
- The org suspension takes away no access to read. Members can still open
  the org and its workspaces, also archived ones, and read the chat
  history of each workspace.
- The org and each of its workspaces show a notice. It says that the org
  is suspended, and it gives the address for abuse reports.
- While the org is suspended, no member can change anything in it, and
  nobody can join it. The only exception is a leave, when a member leaves
  the org alone.
- Each other change that a member asks for gets the `org_suspended`
  refusal.
- The rules of a leave in
  [Owners and admins](operator-actions.md#owners-and-admins) still hold
  (decision 123). No member can become an admin while the org is
  suspended. So the only active admin cannot leave it until an operator
  lifts the suspension.
- Reason: the org keeps someone who can manage it, as decision 55
  requires.
