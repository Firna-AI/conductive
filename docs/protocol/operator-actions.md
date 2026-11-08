# Operator actions

This doc holds the requirements and the decisions in force for the
operator, the suspension of a user, the suspension of an org, the owners
and admins that a suspension leaves, and abuse reports. All users share the
app's Boat account, so misuse by one user puts the sandboxes of every user
at risk, as [Sign-in](access-and-security.md#sign-in) says. The terms are
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
- The request of a suspension goes to the app hostname, behind its gate:
  a signed-in session, a matching `Origin` header, and a JSON body.
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) states
  that gate.
- A request from a user who is not an operator gets HTTP 403 with the code
  `operator_required`.

## Suspend a user

- The request names the user by their numeric GitHub user ID. An ID
  without an account gets HTTP 404 with the code `user_not_found`.
- The suspension records its time and the operator who asked for it.
- A repeat of the request keeps the first time and the first operator. It
  runs every other step again.
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
  seconds, as [Orgs and workspaces](access-and-security.md#orgs-and-workspaces)
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
  [Messages](chat-and-events.md#messages) states what a message of another
  member does when the login of the starter cannot be used.
- A message of a suspended sender never reaches the agent. A suspended
  sender gets no Mac command.
- The suspension revokes no workspace token of a workspace that another
  member owns. A copy that the suspended user made of such a token keeps
  working, as
  [Agent logins in a sandbox](access-and-security.md#agent-logins-in-a-sandbox)
  says (decision 124).

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
  until the sandbox stops, as [Desktop](access-and-security.md#desktop)
  says.

## Previews and their viewers

- Each preview grant and each preview cookie belongs to one viewer: the
  user and the sign-in session that launched the preview.
- Each request to a preview and each batch of its data checks the preview
  and its viewer together.
- The redemption of a grant checks its viewer too.
- When a viewer is suspended, leaves or is removed from the org, or signs
  out, the grants, cookies, requests, and streams of that viewer stop
  working.
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

## Suspend an org

An org suspension covers each workspace and each build of the org,
whoever owns or started it (decision 129).

- The request names the org by its ID. An ID without an org gets HTTP 404
  with the code `org_not_found`.
- The operator can also suspend an org that an admin deleted, while the
  org still exists. No admin can then restore it.
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
- The org and each of its workspaces show a notice. It says that the org
  is suspended, and it gives the address for abuse reports.
- While the org is suspended, no member can change anything in it, and
  nobody can join it. The only exception is a leave, when a member leaves
  the org alone.
- Each other change that a member asks for gets the `org_suspended`
  refusal.
- The rules of a leave in [Owners and admins](#owners-and-admins) still
  hold (decision 123). No member can become an admin while the org is
  suspended, so the only active admin cannot leave it.
- Reason: the org keeps someone who can manage it, as decision 55
  requires.

## Abuse reports

- The footer of the marketing site and the Terms give an address for abuse
  reports: `abuse@` at the product domain (decision 28).
- The Terms pass on the acceptable-use rules of the cloud computer
  provider, and name no provider (decision 28).
- The Terms say that the operator can suspend an account or an org that
  breaks them.
