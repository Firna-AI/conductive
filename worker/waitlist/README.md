# Waitlist backend

This area owns app access, invite codes, referral codes, and the sign-up
pause. The [waitlist protocol](../../docs/protocol/waitlist.md) and
[code protocol](../../docs/protocol/waitlist-codes.md) state the rules.
New GitHub accounts wait unless an operator identity or signed join code
grants app access through [sign-in](../security/README.md#app-access-at-sign-in).
The [app access gate](../security/README.md#app-access-gate) admits these
routes while the user waits. A grant applies to the existing session at once.

## Routes

The signed-in user's routes use paths and reply types from
[`src/shared/waitlist.ts`](../../src/shared/waitlist.ts).

| Method and path | Reply type |
| --- | --- |
| `GET /api/waitlist` | `WaitlistStateResponse` |
| `POST /api/waitlist/code` | `UseInviteCodeResponse` |

Code use takes `UseInviteCodeRequest`. Its successful reply has the same
state as the read. The personal referral code includes its displayed code,
use limit, uses taken, and disabled state. It reveals no recipients.

Code errors use the shared API error envelope. The order is unknown,
disabled, used up, then paused. A user with access gets an unchanged
successful state for every code.

| HTTP status | Error code |
| --- | --- |
| 404 | `invite_code_not_found` |
| 409 | `invite_code_disabled` |
| 409 | `invite_code_used_up` |
| 403 | `signups_paused` |

## Integration

`appAccessGrantStatements` returns the access insert and the personal
referral code insert. Callers include both statements in their own D1
batch. `grantAppAccess` runs them as a standalone batch. Each repeat keeps
the first source, time, and referral code, including a disabled code.
Approval grants accept an operator ID for the operator backend.
The [operator approval](../operator/README.md#waitlist-codes-and-sign-ups)
includes these statements in the batch that saves its pending email.

`redeemInviteCode` inserts a use under the live code limit, pause, and user
access checks. The same batch runs the grant and reads the error result.
The unique user key in `access_code_uses` prevents a second use.
Deleting a recipient clears the user reference and retains the use, so
the code never regains a spent use.
[`invite-data.ts`](../members/invite-data.ts) includes the grant with the
membership and invitation deletion. Its grant reads the inviting admin
from the invitation before deletion. The stored org and admin IDs retain
the source when the org or invitation is later removed.

## Development

Run `npm run test -- worker/waitlist worker/security/waitlist-auth.test.ts worker/security/waitlist-join.test.ts`.
Tests use local D1 with directly created waiting accounts. They cover
code limits, duplicate submissions, the invitation race, pause changes,
and rollback when a referral code cannot be saved.

### Key Code

- [route.ts](route.ts) dispatches the two user routes after the app gate.
- [grant.ts](grant.ts) supplies the reusable D1 grant statements.
- [use-code.ts](use-code.ts) batches code use and access.
- [data.ts](data.ts) reads personal state and owns the pause predicate.
- [codes.ts](codes.ts) generates, normalizes, and formats codes.
- [errors.ts](errors.ts) maps code failures to public replies.
- [Migrations](../../migrations/README.md) describes the D1 records.
