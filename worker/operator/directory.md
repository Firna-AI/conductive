# Operator directory

This guide belongs to the [operator backend](README.md).

## Orgs and users

These four reads use the same app gate and operator check as the overview.
Another signed-in user gets 403 `operator_required` on each route.
The path helpers and reply types live in
[`src/shared/operator.ts`](../../src/shared/operator.ts).

| Route | Path helper | Reply |
| --- | --- | --- |
| `GET /api/operator/orgs` | `operatorOrgsPath` | `OperatorOrgsResponse` |
| `GET /api/operator/users` | `operatorUsersPath` | `OperatorUsersResponse` |
| `GET /api/operator/orgs/<orgId>` | `operatorOrgPath` | `OperatorOrgDetail` |
| `GET /api/operator/users/<githubId>` | `operatorUserPath` | `OperatorUserDetail` |

Each list accepts optional `q` and `cursor` query parameters.
It returns at most 20 entries, newest first.
An org creation tie uses the org ID in ascending order.
A user join tie uses the numeric GitHub ID in ascending order.

`total` counts all matches before the cursor.
`nextCursor` is null when no further page exists.
Use the same `q` with the returned cursor to read the next page.
Without `q`, the list includes every record, also suspended users and deleted orgs.

Org search matches part of a name without case sensitivity.
It also matches an exact org ID or a stored computer ID.
Computer IDs include workspaces, builds, cleanup records, preview listeners, and terminal credentials.
The computer ledger supplies those IDs, including deleted computers.
Computer search keeps working after the original resource records are removed.
A preview search accepts a full URL or a bare hostname.
The URL path does not affect the search.
Open and closed previews both count while their records exist.

User search matches part of a GitHub login or name without case sensitivity.
It also matches an exact numeric GitHub ID.
Both searches treat `%`, `_`, and backslash as literal name text.
Each D1 query binds its input values.

Org entries give `id`, `providerAccount`, `name`, `initials`, `createdAt`, `members`, `workspaces`, `running`, `status`, and `match`.
The workspace count includes archived workspaces.
Running counts only workspaces, not builds.
Status is `deleted`, `suspended`, or `active`, in that priority.
Match is `org-id`, `cloud-computer-id`, or `preview-address` for a resource match.
Match is null for a name match or no search.

User entries give `githubId`, `login`, `name`, `joinedAt`, `orgs`, `workspaces`, and `status`.
User status is `active` or `suspended`.
Both user entries and user pages also include `OperatorUserAccess` from
[`operator-waitlist.ts`](../../src/shared/operator-waitlist.ts).
`appAccess` is a waiting record with `waitingSince`, or a granted record
with `grantedAt` and its source. The source identifies the approving
operator, invite label, referral owner, or org and inviting admin.
An `open_signup` source identifies the operator who last turned the
waitlist off before the grant.
It also represents operator and existing-account grants.
`githubCreatedAt` gives the GitHub account creation time, or null.
`hasVerifiedEmail` is a boolean. It reveals no address.
`approvalEmail` gives `state` and `updatedAt`. Its states are `none`,
`pending`, `sent`, and `failed`. An absent email record has no time.
`referralCode` is null without a code. Otherwise it gives the code,
counts, disabled state and actor, and recipients with their GitHub IDs,
logins, names, and use times. A recipient without a GitHub name has the
name null. The code count retains uses by deleted accounts.
The recipient list includes only accounts that still exist.

The org page gives its identity, creation time, and selected repository count.
It gives `workspaceStates`, `running`, and members with their identities, names, roles, and suspension flags.
It also gives `suspension` and `deletion`, each null when absent.
The deletion gives `deletedAt` and `purgeAt`.
The purge time is null when no time is stored.

The state buckets match the overview.
Running separates workspaces from unfinished builds and refreshes.

The user page gives their identity, name, join time, and owned workspace counts.
Its `workspaces` gives `total` and `running`.
Its `orgs` gives each org's identity, initials, and the user's role.
It also gives the suspension, or null.

Each suspension gives `suspendedAt` and its operator's `githubId` and `login`.
The operator is null when its account record is absent.

Names and custom initials are null when absent.
All times use Unix milliseconds.

An unknown org gets 404 `org_not_found`.
An unknown or non-numeric GitHub ID gets 404 `user_not_found`.
These reads return no chat, file, env value, agent login, or email address.
