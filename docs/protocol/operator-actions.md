# Operator actions

This doc holds the requirements and the decisions in force for the
operator. It covers the suspension of a user or an org, the owners and
admins that a suspension leaves, and the lift of a suspension. It also
covers abuse reports. [Org suspension](operator-org-suspension.md) holds
the suspension of an org. [Operator section](operator-section.md) states
the pages of the operator in the web app. All orgs on one provider account
share that account, so misuse by one user puts the sandboxes of every org
on it at risk, as [Sign-in](access-and-security.md#sign-in) says. The
terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
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

[Suspend an org](operator-org-suspension.md#suspend-an-org) holds these
requirements.

## What members of a suspended org keep

[What members of a suspended org keep](operator-org-suspension.md#what-members-of-a-suspended-org-keep)
holds these requirements.

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
- On Boat, a lift gives back the restart near day 14 of the stop. It
  covers each stopped workspace on Boat that the user owns, or each
  stopped workspace of the org when the org runs on Boat.
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
