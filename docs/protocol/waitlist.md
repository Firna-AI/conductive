# Waitlist

This doc holds the requirements and the decisions in force for the
waitlist. A new person waits for app access, and the app shows them only
the waitlist screen (decision 160). The approval of an operator, an invite
code, a referral code, or an org invitation gives app access. The doc also
covers the pause, the approval email, and the record of app access.
[Invite and referral codes](waitlist-codes.md) states the codes, the join
link, and the use of a code. [Operator section](operator-section.md)
states the tabs where an operator runs the waitlist. The terms are those
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. The
[mockup catalogue](../mockups/catalogue-operator.md) draws each screen of the
waitlist, on desktop and on a phone.

## Who waits

- A new GitHub sign-in creates an account without app access
  (decisions 160 and 161). The sign-in also starts a sign-in session, as
  for every account.
- A user without app access waits until one of the [ways in](#ways-in)
  gives app access.
- App access is final. No action takes it away. An operator can still
  suspend the user, as [Suspend a user](operator-actions.md#suspend-a-user)
  says.
- These approaches were rejected (decision 161):
  - a waitlist entry with no account and no session, because the person
    must then sign in again after the approval, and the Mac app cannot
    show the waitlist
  - a full account where only the start of a cloud computer or a build
    waits for app access, because a person who waits can then reach many
    more requests, and sees an app that cannot run yet
  - an email form on the marketing site, because the operator then cannot
    judge a person from their GitHub account, and the operator section
    must show email addresses
- Risk: the app keeps the GitHub token of each person who waits, as for
  every account. A sign-in that keeps no token for a person who waits can
  come later.
- A waiting account stays until a deletion on request, as other accounts
  do. A time limit for a waiting account can come later.

## What a person who waits can reach

- A sign-in session of a user without app access reaches only these
  requests (decision 161):
  - the session
  - Sign out
  - the waitlist state of its user
  - the [use of a code](waitlist-codes.md#the-use-of-a-code)
  - the org invitations of its user, and Accept
- The waitlist state of a user gives whether the user has app access,
  whether the pause is on, the referral code of the user with its uses,
  and the address of the approval email. That address is the primary
  verified email of the GitHub account, or none.
- Every other API request and every WebSocket upgrade of that session gets
  HTTP 403 with the code `access_required`. So a person who waits gets
  this code also for a request of an operator or of an org.
- The check uses the method and the path that the browser sent.
- Reason: one allow list fences the new kind of session in one place. It
  also refuses each route that a later change adds.
- A check only at Create org and at the org routes was rejected. Reason:
  the account routes, such as Save agent login, then stay open to people
  who wait, and so does each later route outside an org.
- The requests that need no sign-in do not change, as
  [Hostnames and gates](access-and-security.md#hostnames-and-gates) says.
  So a person who waits can sign in, also in the Mac app.
- The reply of the session says whether the user has app access. Reason:
  the app then picks the waitlist screen before it reads anything else.

## The waitlist screen

- Until a person gets app access, the app shows them only the waitlist
  screen (decision 161). The screen stands alone, as the sign-in page does.
- The screen shows the GitHub account of the person, with Sign out.
- It names the address that gets the approval email: the primary verified
  email of the GitHub account.
- For an account with no verified email, it promises no email. It says
  that the app opens there once the person is approved.
- It has a field for a code, with Use code. A code that does not work names
  its reason, as [Codes](waitlist-codes.md#codes) says.
- It shows the org invitations of the person, each with Accept.
- It shows no place in line. Reason: operators approve people in any
  order.
- It has no Delete account. A person asks for a deletion, as the Privacy
  page says. Reason: the app has no self-service deletion of an account.
- The screen reads the app access again when the person comes back to the
  tab or the window, and after Use code. It sets no timer. Reason: a
  person usually comes back from the approval email.
- When a code works, Get started opens. When the person accepts an org
  invitation, its org opens.
  [Get started](orgs-and-members.md#get-started) opens only after app
  access.
- The Mac app shows the same screen in its window, with the window buttons
  in its top bar, as [The window](desktop-app.md#the-window) says.
- While the user waits, the device connection of the Mac app gets the
  `access_required` refusal. When app access arrives, the Mac app connects
  it again, with no new launch. Reason: the Mac is then available for
  [Mac commands](desktop-app.md#mac-commands) without a wake or a new
  launch.

## Ways in

- Four ways give app access to a person who waits (decision 160):
  - the approval of an operator, as [Approve](operator-section.md#approve)
    says
  - an [invite code](waitlist-codes.md#invite-codes)
  - a [referral code](waitlist-codes.md#referral-codes)
  - an [org invitation](#org-invitations)
- Each operator has app access. Each sign-in gives app access, with the
  source "operator", to a user whom the settings of the Worker name as an
  operator, as [The operator](operator-actions.md#the-operator) says
  (decision 161). This also holds for an account that waits.
- Reason: an operator must reach the waitlist, also on a fresh local
  database.
- Risk: a wrong ID in that setting lets one person in. Only the deployer
  sets the value, and it already gives more power than app access.
- Each account that existed before the waitlist keeps app access, with the
  source "existing account". Its join day is the start of its app access.
  Reason: the project is not in production, and these accounts belong to
  the team and the testers.

## Org invitations

- An accepted org invitation gives app access to a person who waits, in
  the same step as the membership (decision 163). Reason: a person never
  joins an org that they cannot use.
- Org invitations have no count. Each accepted invitation lets its person
  in, so a team joins at once.
- Reason: the page of each user traces each invited person to one admin
  and one org, and the operator can suspend both.
- Risk: one user can let in any number of people, until an operator acts.
- These limits were rejected:
  - one use of the referral code of the admin for each such invitation,
    because a team of more than 6 people then needs an invite code from an
    operator
  - a separate allowance of invitations for each admin, because it needs a
    second counter and a control in the operator section
- Only org admins send org invitations, as
  [Members and roles](orgs-and-members.md#members-and-roles) says.

## The pause

- An operator can pause sign-ups (decision 160). Reason: the operator can
  then stop all sign-ups for a time.
- While the pause is on, invite codes, referral codes, and the org
  invitations of people who wait let nobody in.
- A code that the pause stops stays unused, as
  [Codes](waitlist-codes.md#codes) says. The person can use it again after
  the pause.
- During the pause, the Accept of an org invitation by a person who waits
  gets HTTP 403 with the code `signups_paused`. It gives no membership and
  no app access. The invitation stays, so the person can accept it after
  the pause.
- The pause changes nothing for a user with app access. Such a user still
  accepts an org invitation.
- The waitlist stays open. A new GitHub sign-in still creates an account
  that waits.
- The approval of an operator still works. Reason: an approval is one
  deliberate act.
- The app keeps the time and the operator of the last change of the pause.
- The waitlist screen names the pause only after the pause stopped a code
  or the Accept of an org invitation. Reason: an approval still works
  during the pause.
- No email goes out when the pause ends. An email to each person whom the
  pause stopped was rejected, because it adds a second kind of email and a
  burst of email at the end of each pause.

## The approval email

- The approval of an operator sends one email to the primary verified
  email of the GitHub account (decision 162). Reason: an approval happens
  while the person is away.
- Resend, the email service of the org invitations, sends it. The email
  comes from the same sender as the org invitations, on
  `mail.conductive.build`.
- The subject is "Your Conductive account is ready". The body is "You can
  now use Conductive. Sign in with GitHub to get started:", then the
  address of the app.
- A person with no verified email gets no email. The question before the
  approval says whether an email goes out, as
  [Approve](operator-section.md#approve) says.
- The app saves the email as pending with the grant of app access, and
  sends it at once.
- When the send fails, the app sends the email again, with the same
  idempotency key, until Resend accepts it or 24 hours pass. Then the app
  stops.
- Reason: the operator section shows no email address, so the operator
  cannot tell the person in another way. Resend keeps an idempotency key
  for 24 hours, so a later retry can send a second copy.
- The person keeps app access, also when no email goes, and sees it at the
  next visit.
- The operator sees whether the email went, as
  [Orgs and Users](operator-section.md#orgs-and-users) says.
- These approaches were rejected:
  - no message, because an approved person who does not come back by
    chance never uses the app
  - a second email when a person joins the waitlist, because it sends an
    email for each sign-up
  - a Send again button, because the app sends again without the operator

## The record of app access

- The app records when and how each user got app access: the time and the
  source (decision 160). Reason: the operator can trace misuse back to a
  code or a person.
- The sources are:
  - an approval, with its operator
  - an invite code, with the code
  - a referral code, with its owner
  - an org invitation, with its org and the admin who sent it
  - an operator, at a sign-in
  - an existing account, from before the waitlist
- The record keeps the org and the admin of an org invitation, because an
  accepted invitation does not stay.
- Each sign-in keeps the primary verified email and the creation date of
  the GitHub account. The approval email uses the address. The operator
  section shows the age of the account.
- The Privacy page says what the waitlist, the codes, and each record of
  app access keep. It names the GitHub token of a person who waits, the
  verified emails that the sign-in keeps, and Resend, which sends the
  emails.

## Names in the product

- User-facing text writes "waitlist" as one word.
- The screens of people who wait and of users call both kinds of code an
  "invite code", and a join link an "invite link". They never say
  "referral". Only the operator section says "referral code" and "join
  link".
- User-facing text names the pause with the word "sign-ups", as in
  "Sign-ups are paused".
