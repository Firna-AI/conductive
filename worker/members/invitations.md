# Invitations

This guide belongs to the [members backend](README.md). It gives the
email of an invitation, the diagnostics of a failed send, the match of
verified emails, and the acceptance.

## The invitation email

An invitation names an email.
The invite route sends it through `createInvitationMailer` in `worker/invitation-mailer.ts`.
`AppDependencies.invitationMailer` replaces that mailer when it is set.
The mailer posts to Resend with the `RESEND_API_KEY` Worker secret, from `invites@mail.conductive.build`.
[Secrets](../../docs/deployment.md#secrets) says which domain Resend must verify for this sender.
With a local `APP_ORIGIN`, such as `http://127.0.0.1:5173`, the mailer always writes each invitation link to the log and sends no email.
This is also true when the key is set.
On every other origin, the mailer needs the key and fails each send without it.
`createEmailMessages` in [`email-messages.ts`](../email-messages.ts) takes the effective `APP_ORIGIN` of the invite request.
Its `invitation()` builds the subject, the body, and the link of the email.
The link opens that origin with the invite ID in its `invite` query parameter.

## A failed send

A failed send returns 502 `invite_email_failed`.
The invitation stays saved, so the admin can invite the same email again.
Before that reply, the Worker logs a warning with a safe summary of the failure.
Find the warning in Workers Logs, Cloudflare's store of the log lines of the Worker.
Filter on `error.kind = mail`.

The summary has four fields:

- `reason` names the failure case:
  - `not_configured`: the Worker has no `RESEND_API_KEY`.
  - `provider_refused`: Resend sent an error reply.
  - `request_failed`: the request failed, for example by a time-out or a runtime error.
- `status` gives the HTTP status of the reply from Resend.
- `code` gives the error code of that reply, such as `validation_error`.
- `errorType` gives the type of the error that stopped the request, such as `TypeError`.

A field that does not apply is null.
`reason`, `code`, and `errorType` keep only values from fixed lists.
Each other value logs as `unknown`, so new text from Resend or the runtime stays out of the log.
`warnWorker` checks each field again before it writes the warning.
The summary copies no message from Resend or from the runtime.
It holds no email address, token, request body, or secret.

## Verified emails and acceptance

Each sign-in calls `saveVerifiedEmails`.
It replaces the user's stored emails with the verified emails from GitHub's `GET /user/emails`.
A failed read fails the sign-in.
Emails match without case. An unverified email matches no invitation.
The private `org_invite_users` table keeps a durable match of each invitation to each user whose verified email it named.
An insert trigger on `org_invites` records a match for each user with a stored verified email that the new invitation names.
An insert trigger on `user_verified_emails` records a match for each invitation that names an email that a sign-in stores.
A later sign-in without that email keeps the match.
Only the deletion of its invitation or its user removes a match.
The shared browser contracts expose `GET /api/invites` for the pending list.
`POST /api/invites/:inviteId/accept` explicitly accepts an invitation.
The [invitation route](../app-api/invitations.ts) uses the signed-in user and the existing verified-email checks.
Call `pendingOrgInvites` with the signed-in user's ID to list their pending invitations.
The list holds the invitations of active orgs that name one of the user's current verified emails.
It leaves out the invitations of orgs where the user is already a member.
Call `acceptOrgInvite` after an explicit acceptance by a signed-in user.
It accepts only an invitation that names one of that user's current verified emails.
A durable match alone does not permit acceptance.
Sign-in alone does not accept an invitation.
Acceptance also includes the [app access grant](../waitlist/README.md) in
its D1 batch. The record retains the org, invitation ID, and inviting
admin after the invitation row is deleted. Invitations use no code count.
The batch preserves the invitation while sign-ups are paused for a user
without app access. It still accepts for a user who already has access.
A membership-delete trigger cancels each invitation of the membership's org that has a durable match to the departing user.
It runs in the same statement as the membership delete, so the removal and the cancellation apply together.
