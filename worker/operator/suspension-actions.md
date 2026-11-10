# Suspension actions

The [operator API](README.md) serves these actions.
[Access during a suspension](suspension-access.md) describes their access checks.

## Suspend a user

Send `POST /api/operator/users/<githubId>/suspension` to the app hostname.
`userSuspensionPath` in [`src/shared/operator.ts`](../../src/shared/operator.ts)
builds the path. `<githubId>` is the numeric GitHub user ID of the target
user. GitHub keeps that ID when the user renames their login.

Access:

- The normal app gate runs first. It needs the session cookie of a
  signed-in user, a matching `Origin` header, and a JSON object body, as
  the [request gate](../security/README.md) says. The action reads nothing
  from the body, so send `{}`.
- The action then checks that the GitHub ID of the signed-in user is in
  `OPERATOR_GITHUB_IDS`. Otherwise it answers 403 `operator_required`.
  Without that setting, every request gets this answer.
- A GitHub ID without an account gets 404 `user_not_found`.

The action takes these steps, in this order:

1. In one D1 batch, it records the suspension, its event, and all access revocations.
   The suspension records its time and the operator who sent the request.
   The batch deletes every sign-in session of the user, also
   the sign-in sessions of the Mac app. In the same batch, it revokes the
   workspace token and the preview hostnames of each workspace that the
   user owns. This happens before any stop request. A workspace whose
   token is revoked gets a new token at its next start.
2. It asks the Durable Object of each workspace that the user owns to
   cancel the active start and stop the sandbox, as
   [The stop of one workspace](suspension-access.md#the-stop-of-one-workspace) says.
3. It wakes the image coordinator of each unfinished image build that the
   user started. The coordinator stops the build and marks it failed. It
   retries the cleanup until no build sandbox of that build is left.
4. It reads the live computer ledger and stops detached computers.
   One native task per org saves their concrete IDs and its alarm before Stop.
   Each failed Stop stays in the pending lists and retries every 30 seconds.
   The task keeps its work after an owner change, a lift, or a runtime restart.
   Failed task admission fails the request before a detached Stop is sent.

The reply is a `UserSuspensionResponse`: `userId`, `suspendedAt`,
`pendingWorkspaceIds`, and `pendingBuildIds`. The status is 200 when
nothing is pending. It is 202 when the stop of a workspace has not
finished, or when the user started an unfinished build. A call that the
workspace object skipped also counts as not finished. The suspension is
in force in both cases. Each pending workspace retries its stop on its own
alarm, without the operator.

The action is idempotent. A repeat keeps the first time and the first
operator, and runs the other steps again. Repeat it to see what is still
pending.
Each repeat runs the access revocations in the same batch as its state read.
Any failed revocation rolls back the whole batch.

To send the request from a terminal, sign in to the app in a browser as an
operator. Copy the value of the `__Host-conductive-session` cookie from the
developer tools of the browser. `gh api users/<login> --jq .id` gives the
GitHub ID of a login. Then run:

```sh
APP=https://app.conductive.build
curl -X POST "$APP/api/operator/users/<githubId>/suspension" \
  -H "Origin: $APP" \
  -H 'Content-Type: application/json' \
  -H 'Cookie: __Host-conductive-session=<cookie value>' \
  --data '{}'
```

## Suspend an org

Send `POST /api/operator/orgs/<orgId>/suspension` with `{}` through the same operator gate.
`orgSuspensionPath` builds the encoded path.
The reply is `OrgSuspensionResponse`, with `orgId`, `suspendedAt`, and the two pending lists of the user action.
An unknown org gets 404 `org_not_found`.
A repeat keeps the first suspension time and operator.
Only internal storage holds the operator ID.

One D1 batch records the org suspension, its event, and every workspace token and preview hostname revocation.
This batch completes before the action asks for stops.
It stops every workspace and unfinished build of the org, whoever owns or started it.
The native workspace and image alarms retry incomplete cleanup after runtime restarts.
Failed creates stay in `pendingWorkspaceIds` while their ledger entries have pending cleanup, including after their workspace rows are removed.
The action reads live ledger entries after workspace processing and stops detached computers.
Both suspension actions use the same persistent org Stop task.
The task runs without another suspension request.
It clears a computer only after confirmed Stop, not found, or ledger deletion.
It lists each pending workspace or build ID once.
The existing native cleanup alarm retries Delete for computers with pending cleanup.
Cleanup remains pending until Delete succeeds.
The org remains readable, and members keep their account sessions and other orgs.
`OrgSummary.suspension` gives members the suspension time.

Org writes get 403 `org_suspended`, with the abuse address from the product domain.
The exact POST Leave route stays open under its existing active-admin rule.
The shared org SQL predicate also guards member mutations, invitation acceptance, build admission, publication, and refresh claims.
Account sign-in still saves verified emails without accepting an invitation.

Every sandbox and token check uses the shared workspace rule, which also requires an org that is not suspended.
Each start and build step uses the same suspension check as user suspension.
An image source grant cannot issue or release credentials for a suspended org.
A pending allocation still recovers its saved request before cleanup removes the resource.
An org suspension prevents every disk retention resume, including deleted-org maintenance and a later owner change.
It also blocks lifecycle activity and turn deadline extensions inside the workspace queue.
An activity body that finishes after suspension gets 403 `org_suspended`.
The refusal keeps the activity time, provider deadline, and pending stop alarm unchanged.
