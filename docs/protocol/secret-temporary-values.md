# Secret requests: temporary values

This doc holds the requirements and the decisions in force for the values
that a member types into a secret request. It covers temporary values and
mixed requests. It belongs to [Secret requests](secret-requests.md), which
covers the calls, the requests, and their time limit. The terms are those
of [Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue-secrets.md) draws a request for a
value at `app/secret-requests/temporary`, and a mixed request at
`app/secret-requests/several/mixed`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## Temporary values

- When a run names a name that the org has no secret for, and no
  temporary value covers it, the request asks for a value.
- The member who answers types the value. That member chooses how long
  the value lasts: 15 minutes, This workspace, or Save as secret
  (secrets decision 7). A line says what the chosen one does.
- Allow stays off until each value is typed.
- A value for 15 minutes serves each run of the session that asked, for
  15 minutes from the answer.
- A value for this workspace serves each run of each session of the
  workspace, until the workspace is archived.
- Reason: the 15 minutes bound a short task, and This workspace names its
  own scope.
- Save as secret creates a secret of the org with that name. The member
  who answers is its creator, and the reason of the agent is its
  description. The session gets an approval of it.
- Reason: the reason says why the value is needed, and the card stays
  short.
- Save as secret needs each name that gets a value to follow
  [New names](secret-variables.md#new-names). Otherwise Save as secret
  shows but stays off, with a line under the choices that says why.
  15 minutes and This workspace stay.
- The Worker checks each name of a Save as secret answer before it writes.
  It refuses an answer with a name that breaks the rule. The request then
  stays open, with no new secret and no approval.
- The other two choices create no secret of the org.
- The Durable Object of the workspace keeps a temporary value encrypted
  for the time of that value.
- A value for one run only, a value for the rest of the turn, and a value
  for the rest of the session were rejected. Reason: the user asked for
  the choice of 15 minutes or this workspace.
- While a value for this workspace exists, a run that names it makes no
  request. A member removes a wrong value in Capabilities, as
  [Grants](secrets.md#grants) says.
- On a phone, a request for a value shows Deny and Give a value. Give a
  value opens a sheet with each value field, the choice of how long the
  values last, and Allow.
- Reason: the forms of a phone open as sheets, and a sheet leaves room for
  the keyboard.

## Mixed requests

- A request can name secrets of the org and names that the org has no
  secret for.
- Allow then gives the session an approval of each secret of the org. It
  takes a value for each other name, each in a field of its own.
- One choice of how long covers every value.
- A line says that Allow also allows the secrets of the org for this
  session.
- Reason: one task keeps one card.
