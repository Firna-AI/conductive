# Operator actions

The operator is the person who runs the app, as opposed to the admin of an
org inside the app. This folder holds the operator's API in the Worker. It
has one action: suspend a user, for example after an abuse report. A
suspension signs the user out, stops every cloud computer that the user
owns, and blocks each new start.

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

1. It records the suspension on the user: the time, and the operator who
   sent the request.
2. In one D1 batch, it deletes every session of the user, also the
   sessions of the Mac app. In the same batch, it revokes the preview
   hostnames of each workspace that the user owns. This happens before
   any stop request.
3. It asks the Durable Object of each workspace that the user owns to
   cancel the active start and stop the sandbox, as
   [Suspended users](../lifecycle/README.md#suspended-users) says.
4. It wakes the image coordinator of each unfinished image build that the
   user started. The coordinator stops the build and marks it failed. It
   retries the cleanup until no build sandbox of that build is left.

The reply is a `UserSuspensionResponse`: `userId`, `suspendedAt`,
`pendingWorkspaceIds`, and `pendingBuildIds`. The status is 200 when
nothing is pending. It is 202 when the stop of a workspace has not
finished, or when the user started an unfinished build. The suspension is
in force in both cases. Each pending workspace retries its stop on its own
alarm, without the operator.

The action is idempotent. A repeat keeps the first time and the first
operator, and runs the other steps again. Repeat it to see what is still
pending. No route lifts a suspension.

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

## What a suspension blocks

The suspension stays on the user record. Each of these entries reads it:

- Sign-in, the sign-in exchange of the Mac app, each session, open chat
  tabs, and terminal sockets, as
  [Suspended users](../security/README.md#suspended-users) says.
- New workspaces, resumes, queued starts, image builds, and the disk
  retention restart, as
  [Suspended users](../lifecycle/README.md#suspended-users) says. No
  member can start a workspace that the user owns. The other members can
  still open it and read its history.
- The workspace token of each workspace that the user owns. The runner,
  the agent tools, the git credential route, and the Mac command route
  refuse it.
- The user as the sender of a turn. The chat backend gives the runner no
  agent login of that user. The agent tools and the Mac commands refuse
  that sender.

A stopped workspace of the user gets no disk retention restart. So Boat
can delete its disk after 14 days, as
[Stop and resume](../../docs/protocol/workspaces-and-sandboxes.md#stop-and-resume)
says.

## Settings

| Name | Value |
| --- | --- |
| `OPERATOR_GITHUB_IDS` | Optional. The numeric GitHub user IDs of the operators, separated by commas, such as `1234,5678`. The action ignores spaces around each ID. It is not a secret. |

Put it in `.dev.vars` for local development. A deployment sets it as a
Worker variable.

## Development

Run `npm run test -- worker/operator` from the repository root, with Node
24. The tests use local D1 and the fake GitHub and Boat servers.

### Key Code

- [`route.ts`](route.ts): `handleOperatorRequest`, the route and the
  operator check. `route` in [`worker/routes.ts`](../routes.ts) calls it
  first, after the gate.
- [`suspend-user.ts`](suspend-user.ts): `suspendUser`, the steps and the
  pending lists.
- [`data.ts`](data.ts): `recordUserSuspension`, which records the
  suspension and revokes the sessions and previews, and the reads of the
  owned workspaces and builds.
- [`user-access.ts`](../data/user-access.ts): `requireActiveUser`,
  `suspendedUserError`, and the reads that the other areas use.
- [`workspace-suspension.ts`](../lifecycle/workspace-suspension.ts):
  `suspendWorkspaceLifecycle`, the stop of one workspace and its retries.
- [`202611072200_user_terms_and_suspension.sql`](../../migrations/202611072200_user_terms_and_suspension.sql):
  the columns of the suspension and of the terms consent.

### Related Docs

- [Access and security](../../docs/protocol/access-and-security.md#sign-in)
- [Worker backend](../README.md)
- [Sign-in and request gate](../security/README.md)
- [Workspace lifecycle](../lifecycle/README.md)
