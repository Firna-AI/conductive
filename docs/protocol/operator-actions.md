# Operator actions

This doc holds the requirements and the decisions in force for the
operator. It covers the suspension of a user or an org, the owners and
admins that a suspension leaves, and the lift of a suspension. It also
covers abuse reports. [Operator section](operator-section.md) states the
pages of the operator in the web app. All users share the app's Boat
account, so misuse by one user puts the sandboxes of every user at risk,
as [Sign-in](access-and-security.md#sign-in) says. The terms are
those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## The operator

- Only an operator can suspend a user (decision 28) or an org
  (decision 129).
- An org suspension is a second action, beside the suspension of a user.
  It changes no rule of a user suspension.
- Reason: a user suspension alone may not stop misuse. An abuse report
  names a cloud computer or a preview address, not a person. Each member
  of an org can run code in its workspaces.
- The Worker knows each operator by a numeric GitHub user ID in its
  settings. Without that setting, nobody is an operator.
- Each operator request goes to the app hostname, behind its gate: a
  signed-in session, a matching `Origin` header, and a JSON body for each
  write. [Hostnames and gates](access-and-security.md#hostnames-and-gates)
  states that gate.
- A request from a user who is not an operator gets HTTP 403 with the code
  `operator_required`. A person who waits gets HTTP 403 with the code
  `access_required` instead, as
  [What a person who waits can reach](waitlist.md#what-a-person-who-waits-can-reach)
  says.

## Suspend a user

- The request names the user by their numeric GitHub user ID. An ID
  without an account gets HTTP 404 with the code `user_not_found`.
- The suspension records its time and the operator who asked for it.
- A repeat of the request while the user is suspended keeps the first
  time and the first operator. It runs every other step again.
- The suspension is in force as soon as the reply comes, also when a stop
  has not finished.
- The reply names each workspace and each build whose stop has not
  finished. Its status is 202 while one is pending, and 200 when none is.
- A workspace counts as finished only when its stop is confirmed. A call
  that the workspace skipped keeps it in the reply as pending.

## Sessions and sign-in

- A suspension ends every sign-in session of the user at once, in the
  browser and in the Mac app.
- A suspended user cannot sign in. The GitHub sign-in and the sign-in
  exchange of the Mac app refuse the user with the code `user_suspended`.
- Each open tab and each terminal socket of the user closes within 30
  seconds, as [Orgs and workspaces](isolation.md#orgs-and-workspaces)
  says for a user who loses access.

## Workspace tokens and runners

These rules hold for each workspace that the suspended user owns.

- The suspension revokes the workspace token of each such workspace, in
  the same step that ends the sign-in sessions of the user.
- A revoked token never works again. A workspace whose token is revoked
  gets a new workspace token at its next start.
- The Worker accepts a workspace token only while all of these are true:
  - The token is not revoked.
  - Its workspace is not archived.
  - The org of the workspace is not deleted.
  - The org of the workspace is not suspended.
  - The owner of the workspace is not suspended.
- An open runner connection checks that rule before each message that it
  sends or receives, and every 15 seconds while it is idle. It closes when
  the rule fails or the check fails.
- The agent tools, the git credential route, and the requests for Mac
  commands use the same rule.
- The workspace uses no agent login of a suspended starter, and the
  session record shows that the login cannot be used.
  [Messages](messages-and-attachments.md#messages) states what a message of another
  member does when the login of the starter cannot be used.
- A message of a suspended sender never reaches the agent. A suspended
  sender gets no Mac command.
- The suspension revokes no workspace token of a workspace that another
  member owns. A copy that the suspended user made of such a token keeps
  working, as
  [Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox)
  says (decision 124).

## Starts, stops, and builds

[Starts, stops, and builds](suspension-workspaces.md#starts-stops-and-builds) states these suspension requirements.

## Sandbox access

[Sandbox access](suspension-workspaces.md#sandbox-access) states these suspension requirements.

## Previews and their viewers

[Previews and their viewers](suspension-workspaces.md#previews-and-their-viewers) states these suspension requirements.

## Owners and admins

[Owners and admins](suspension-workspaces.md#owners-and-admins) states these suspension requirements.

## What other members keep

[What other members keep](suspension-workspaces.md#what-other-members-keep) states these suspension requirements.

## Suspend an org

An org suspension covers each workspace and each build of the org,
whoever owns or started it (decision 129).

- The request names the org by its ID. An ID without an org gets HTTP 404
  with the code `org_not_found`.
- The operator can also suspend an org that an admin deleted, while the
  org still exists. No admin can restore it while it is suspended.
- The other rules of [Suspend a user](#suspend-a-user) hold for an org
  too. They cover the record of the time and the operator, a repeat, and
  the reply with its pending stops.
- The org suspension stops the sandbox of each workspace and each build of
  the org. A stop that fails runs again until it completes.
- It revokes the workspace token of each workspace of the org. The rule of
  [Workspace tokens and runners](#workspace-tokens-and-runners) then
  refuses each such token, and each runner connection closes.
- [Sandbox access](#sandbox-access) states how the previews, the
  terminals, and the desktops of the org end.
- Nobody can create, resume, or start a workspace of the org. No build and
  no image refresh of the org runs, by hand or automatically.
- No routine of the org starts a run, as
  [Suspensions and deleted orgs](routines.md#suspensions-and-deleted-orgs)
  says.
- A start of a workspace of the org that waits or runs stops before its
  next step.
- Each unfinished build of the org stops and fails. The app removes its
  build sandbox.
- A stopped workspace of the org gets no restart near day 14 of its stop,
  also after an owner change (decision 125). So Boat can delete its disk,
  with any unpushed work of the members.
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
- Members can also read the routines of the org and their runs. The
  routine pages show no actions.
- The org and each of its workspaces show a notice. It says that the org
  is suspended, and it gives the address for abuse reports.
- While the org is suspended, no member can change anything in it, and
  nobody can join it. The only exception is a leave, when a member leaves
  the org alone.
- Each other change that a member asks for gets the `org_suspended`
  refusal.
- The rules of a leave in [Owners and admins](#owners-and-admins) still
  hold (decision 123). No member can become an admin while the org is
  suspended. So the only active admin cannot leave it until an operator
  lifts the suspension.
- Reason: the org keeps someone who can manage it, as decision 55
  requires.

## Lift a suspension

A lift ends the suspension of a user or of an org (decision 145).

- Only an operator lifts the suspension of a user or of an org. A lift by
  the suspended user or by an admin of the org was rejected, because the
  target could then end its own suspension.
- A suspension does not end on its own after a set time. Reason: a
  suspension for abuse must not end on its own.
- The request names the user or the org as the request of a suspension
  does. An unknown target gets HTTP 404 with the code `user_not_found` or
  `org_not_found`.
- A lift replies with HTTP 200, the target, and the time of the lift.
- A repeat of a lift changes nothing. A lift of a user or an org that is
  not suspended also changes nothing. Such a lift replies with HTTP 200
  and the target, with no time, because nothing changed.
- A lift clears the suspension. The rules above for a suspended user or
  org then no longer apply to that user or org.
- A lifted user can sign in again. No sign-in session that the suspension
  ended comes back.
- A revoked workspace token never works again. So each workspace gets a
  new token at its next start, as
  [Workspace tokens and runners](#workspace-tokens-and-runners) says.
- No preview that the suspension revoked comes back. No build that the
  suspension failed comes back.
- A lift gives back the restart near day 14 of the stop. It covers each
  stopped workspace that the user owns, or each stopped workspace of the
  org.
- A restart whose day 14 has already passed runs at once after the lift.
  Reason: lifts are rare, and the disk may still exist.
- A workspace whose owner or org is still suspended gets no restart, as
  [Starts, stops, and builds](#starts-stops-and-builds) says.
- A disk that Boat deleted while the suspension lasted stays lost, with
  any unpushed work on it.
- A lift of an org that an admin deleted leaves the org deleted. An admin
  can then restore it while its 7 days last, as
  [Delete org](orgs-and-members.md#delete-org) says.
- The app records each suspension and each lift, with its time and its
  operator. It keeps every record.
- The [operator section](operator-section.md) shows the suspension in
  force, but no log of these records.
- An open page of a member learns of the lift at its next load. Reason:
  lifts are rare.

## Abuse reports

- The footer of the marketing site and the Terms give an address for abuse
  reports: `abuse@` at the product domain (decision 28).
- The Terms pass on the acceptable-use rules of the cloud computer
  provider, and name no provider (decision 28).
- The Terms say that the operator can suspend an account or an org that
  breaks them.
