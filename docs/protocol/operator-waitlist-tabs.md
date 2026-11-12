# Waitlist tabs of the operator section

This doc holds the requirements and the decisions in force for the
Waitlist tab, Approve, the Invite codes tab, and the pause of the operator
section. It belongs to [Operator section](operator-section.md), which
covers the access, the Overview, the Orgs and Users tabs, the Providers
tab, and Suspend and Lift. [Waitlist](waitlist.md) states the waitlist
and the codes. [Sign-ups](sign-ups.md) states the pause, the waitlist
switch, and their controls in the section. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## The Waitlist tab

- The Waitlist tab lists the people who wait, oldest first, 20 at a time,
  with Show more (decision 160). It leaves out suspended people.
- Each row gives the GitHub login, the name on GitHub, the age of the
  GitHub account, and the join day, with an initials disc. It shows no
  picture and no email address.
- The login opens the GitHub profile of the person. Reason: the operator
  judges a person from their GitHub account.
- The search finds a person who waits by GitHub login, name on GitHub, or
  numeric GitHub ID, as on the Users tab.
- Each row has Approve.
- After an approval, the row stays in the list until the list loads again.
  It shows that the person is approved, and the state of the email.
  Reason: the operator sees the result in place.

## Approve

- Approve gives app access to one person who waits (decision 160). It is
  on each row of the Waitlist tab, and on the page of a person who waits.
- Approve works only for a person who waits, one person at a time. For
  anyone else, the operator makes an invite code with one use. Reason: the
  user asked to approve specific users.
- Approve asks first. The question names the person, and says that an
  approval is final.
- When the person has a verified email, the question also says that an
  email tells them at once. Otherwise, it says that the person sees the
  app access at their next visit.
- Reason: an approval cannot be undone, and its email goes at once.
- The approval of a suspended person gets HTTP 409 with the code
  `user_suspended`, and nothing changes. The operator lifts the suspension
  first, as [Suspend and Lift on a page](operator-section.md#suspend-and-lift-on-a-page)
  says.
- A repeat approval, or the approval of a user who already has app
  access, gets HTTP 200, changes nothing, and sends no email.
- Approve also works during the pause, as
  [The pause](sign-ups.md#the-pause) says.
- [The approval email](waitlist.md#the-approval-email) states the email
  and its retries.

## The Invite codes tab

- The Invite codes tab lists the invite codes, newest first
  (decision 160).
- Each row gives the label, the operator who made the code, the day, the
  code with Copy, the state, and the uses out of the use limit. The states
  are Active, Used up, and Disabled.
- A code that still lets people in also has Copy join link and Disable.
- New code asks for a label and a use limit. The app then makes the code,
  as [Codes](waitlist-codes.md#codes) says.
- Disable asks first. The question names the code. It says that the people
  who used it keep their app access, and that Disable is final.
- The search finds any code by its text, also a referral code. It also
  finds an invite code by its label, and a referral code by the GitHub
  login of its owner.
- A referral code in the results opens the page of its owner.
- Reason: a report of misuse often names only a code. An operator
  remembers an invite code by its label more often than by its text.

## The pause

- The section holds the controls of sign-ups: Pause sign-ups and the
  waitlist switch. [The Sign-ups box](sign-ups.md#the-sign-ups-box),
  [The questions](sign-ups.md#the-questions), and
  [The notices](sign-ups.md#the-notices) state them.
