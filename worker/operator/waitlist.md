# Operator waitlist and code routes

This guide belongs to the [operator backend](README.md).

## Waitlist, codes, and sign-ups

These routes use the normal app gate and `isOperator` check.
They return 403 `operator_required` for another user.
Each write requires a JSON object and a matching `Origin`.
The path helpers and reply types live in
[`operator-waitlist.ts`](../../src/shared/operator-waitlist.ts).

| Method and path | Request | Reply |
| --- | --- | --- |
| `GET /api/operator/waitlist` | `OperatorDirectoryQuery` | `OperatorWaitlistResponse` |
| `POST /api/operator/users/<githubId>/approval` | `EmptyRequest` | `OperatorApprovalResponse` |
| `GET /api/operator/invite-codes` | `OperatorDirectoryQuery` | `OperatorCodesResponse` |
| `POST /api/operator/invite-codes` | `CreateOperatorCodeRequest` | `OperatorAccessCode` |
| `POST /api/operator/invite-codes/<code>/disable` | `EmptyRequest` | `OperatorAccessCode` |
| `GET /api/operator/signup-pause` | none | `OperatorSignupPause` |
| `POST /api/operator/signup-pause` | `EmptyRequest` | `OperatorSignupPause` |
| `DELETE /api/operator/signup-pause` | `EmptyRequest` | `OperatorSignupPause` |
| `GET /api/operator/waitlist-switch` | none | `OperatorWaitlistSwitch` |
| `POST /api/operator/waitlist-switch` | `EmptyRequest` | `OperatorWaitlistSwitch` |
| `DELETE /api/operator/waitlist-switch` | `EmptyRequest` | `OperatorWaitlistSwitch` |

`EmptyRequest` comes from [`api.ts`](../../src/shared/api.ts).
The waitlist search uses the same login, name, and numeric ID matching as
the user search. It excludes suspended users and granted users. Its page
has at most 20 entries, oldest first, with numeric GitHub IDs as ties.
It returns creation times and verified email flags, never addresses.

The code list shows invite codes by default. A search also finds referral
codes. It matches code text with either case and with or without its
hyphen, invite labels, and referral owner logins. Name symbols stay literal.
Pages have at most 20 entries, newest first, with stored code text as ties.
Both lists return the total before the cursor and a nullable `nextCursor`.
Use the same search with the next cursor.

Code creation trims the label. The label must have 1 to 80 characters.
The use limit must be a positive safe integer. Success returns 201.
Bad fields return 400 `invalid_invite_code`.
Disable accepts either kind and keeps the first disable time and operator.
An unknown code returns 404 `invite_code_not_found`.
Its successful reply and each repeat have status 200.

Approval returns 404 `user_not_found` for an absent or invalid GitHub ID.
It returns 409 `user_suspended` for a suspended target.
It returns 200 without a change or email for a user who already has access.
A new approval uses the shared grant batch, including during the pause.
The batch saves a pending email with its recipient and message when a
verified email exists. Without an address, it saves only the `none` state.
The sender then tries delivery at once. The reply gives `changed`, the
email state, and `emailFailed` for a failed immediate send.
An email failure keeps app access and the pending message.

POST to the pause turns it on. DELETE turns it off.
The reply records `paused`, `updatedAt`, and the operator.
A repeat preserves the first time and operator and returns 200.

`operatorWaitlistSwitchPath` builds the path of the waitlist switch.
POST turns the waitlist on. DELETE turns it off.
The reply gives `waitlistOn`, `updatedAt`, and the operator of the last change.
It also gives `waiting`, the count of the Waitlist tab: accounts without
app access and without a suspension.
A repeat keeps the time and operator of the last change and returns 200.
A change grants nobody access in bulk, and it saves or sends no email.
During open sign-up, [sign-in](../security/README.md#app-access-at-sign-in)
and the [app access gate](../security/README.md#app-access-gate) grant
access to one user at a time.

### Approval email delivery

[`approval-email.ts`](approval-email.ts) builds the plain text email from
the brand and retries pending messages. The stored subject, recipient,
and body keep retries unchanged after a later sign-in or deployment.
[`mail-sender.ts`](../mail-sender.ts) sends both approval and invitation
emails through Resend. It uses the same sender and local logging policy.
Invitations retain their content hash in their delivery key.
Approvals use `waitlist-approval/<userId>` for every attempt.

The scheduled Worker entry retries pending messages every 15 minutes.
It marks a message failed at or after 24 hours from approval, before
another send. Each successful send records its time and leaves the retry
list. A send failure logs fixed warning text without the address.
