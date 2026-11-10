# Invitations

This guide belongs to the [members backend](README.md). It gives the
email of an invitation, the match of verified emails, and the acceptance.

## The invitation email

An invitation names an email.
The invite route sends it through `createInvitationMailer` in `worker/invitation-mailer.ts`.
`AppDependencies.invitationMailer` replaces that mailer when it is set.
The mailer posts to Resend with the `RESEND_API_KEY` Worker secret, from `invites@mail.conductive.build`.
[Secrets](../../docs/deployment.md#secrets) says which domain Resend must verify for this sender.
With a local `APP_ORIGIN`, such as `http://127.0.0.1:5173`, the mailer always writes each invitation link to the log and sends no email.
This is also true when the key is set.
On every other origin, the mailer needs the key and fails each send without it.
A failed send returns `invite_email_failed` and keeps the invitation, so the admin can invite the same email again.
The link opens the app origin with the invite ID in its `invite` query parameter.

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
