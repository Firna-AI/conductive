# Waitlist backend

This area owns app access, invite codes, referral codes, and the checks
of the sign-up pause and of open sign-up. Open sign-up is on while the
waitlist switch is off and sign-ups are not paused.
The [waitlist protocol](../../docs/protocol/waitlist.md),
[code protocol](../../docs/protocol/waitlist-codes.md), and
[sign-ups protocol](../../docs/protocol/sign-ups.md) state the rules.
New GitHub accounts wait unless an operator identity, open sign-up, or a
signed join code grants app access through
[sign-in](../security/README.md#app-access-at-sign-in). During open
sign-up, the [app access gate](../security/README.md#app-access-gate) also
grants access to a waiting user at their next request. Otherwise the gate
still admits these routes while the user waits. A grant applies to the
existing session at once.

## Routes

The signed-in user's routes use paths and reply types from
[`src/shared/waitlist.ts`](../../src/shared/waitlist.ts).

| Method and path | Reply type |
| --- | --- |
| `GET /api/waitlist` | `WaitlistStateResponse` |
| `POST /api/waitlist/code` | `UseInviteCodeResponse` |

Code use takes `UseInviteCodeRequest`. Its successful reply has the same
state as the read. The state gives `appAccess`, `signupsPaused`,
`waitlistOn`, `approvalEmail`, and `referralCode`. `waitlistOn` is the
state of the waitlist switch. The personal referral code includes its
displayed code, use limit, uses taken, and disabled state. It reveals no
recipients.

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

An `open_signup` grant inserts access only during open sign-up. Its
insert checks the one `signup_settings` row itself, so a pause or a
turn-on that commits first stops the grant. The record names the
operator of the last change of the switch. `openSignupPredicate` and
`isOpenSignup` in [data.ts](data.ts) hold the condition. Sign-in and the
app access gate use this grant. Each open sign-up check reads the switch
and the pause from D1. The grant saves no approval email. A
later turn-on of the waitlist removes no grant.

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

Run `npm run test -- worker/waitlist worker/security/waitlist-auth.test.ts worker/security/waitlist-join.test.ts worker/security/waitlist-open-signup.test.ts`.
Tests use local D1 with directly created waiting accounts. They cover
code limits, duplicate submissions, the invitation race, pause changes,
and rollback when a referral code cannot be saved. They also cover open
sign-up grants, a pause that commits before the grant, a new switch
operator before the grant, and a grant that another request saves first.
`setPaused` and `setWaitlist` in
[waitlist.test-support.ts](waitlist.test-support.ts) change the sign-up
settings directly in D1.

### Key Code

- [route.ts](route.ts) dispatches the two user routes after the app gate.
- [grant.ts](grant.ts) supplies the reusable D1 grant statements, with
  the condition of an open sign-up grant.
- [use-code.ts](use-code.ts) batches code use and access.
- [data.ts](data.ts) reads personal state and owns the pause and open
  sign-up predicates.
- [codes.ts](codes.ts) generates, normalizes, and formats codes.
- [errors.ts](errors.ts) maps code failures to public replies.
- [Migrations](../../migrations/README.md) describes the D1 records.
