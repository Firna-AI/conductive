# Invite and referral codes

This doc holds the requirements and the decisions in force for the codes
of the [waitlist](waitlist.md). An invite code or a referral code gives
app access to a person who waits (decision 160). The doc also covers the
join link and the use of a code. [The pause](sign-ups.md#the-pause) states
when no code works. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Codes

- A code is an invite code or a referral code (decision 160). Each use of
  a code gives app access to one person who waits.
- The app makes each code at random, with 10 characters and no look-alike
  characters. Reason: nobody can guess a random code, so a code check
  needs no limit on attempts.
- The app shows a code in two groups of five, such as `K7QHM-3XP2R`. A
  typed code works with or without the hyphen, in upper or lower case.
- A code works in the field of the
  [waitlist screen](waitlist.md#the-waitlist-screen) and in a
  [join link](#the-join-link).
- A code has no end date.
- Disable is final. A disabled code never works again, and the operator
  makes a new code instead. Reason: a wrong click cannot bring back a
  leaked code.
- The people who used a disabled code keep their app access.
- A code that does not work names its reason: unknown, disabled, used up,
  or the pause. Reason: the person then knows whether to ask for another
  code or to wait.
- A use of a code that does not work gets the reply of its reason. The
  replies are the same for both kinds of code:
  - unknown: HTTP 404 with the code `invite_code_not_found`
  - disabled: HTTP 409 with the code `invite_code_disabled`
  - used up: HTTP 409 with the code `invite_code_used_up`
  - the pause: HTTP 403 with the code `signups_paused`
- When more than one reason holds, the reply gives the first of this
  order: unknown, disabled, used up, the pause. Reason: the person first
  learns what is wrong with the code itself, so a mistyped code during
  the pause does not ask the person to wait.
- A refusal takes no use of the code.
- A typed code that does not work shows its reason under the field, and
  keeps its text. The code of a join link that does not work opens the
  waitlist screen, with a notice that names the reason.

## Invite codes

- An operator makes each invite code, with a label and a use limit
  (decision 160).
  [The Invite codes tab](operator-section.md#the-invite-codes-tab) states
  New code.
- Only operators see the label.
- Each invite code lets in at most as many people as its use limit.

## Referral codes

- Each user with app access has one referral code with 5 uses
  (decision 160). A user who came in by a referral code has one too.
- The user gets the code with their app access.
- A used use does not come back.
- The Account page shows the referral code at its end: the join link with
  Copy, the code, and how many uses are left. Reason: on a phone, the forms
  that connect Claude and Codex then stay near the top.
- The user does not see who used the code. The operator sees the uses and
  who used them. Reason: users see the least personal data, and the
  operator gets a trace.
- While the pause is on, a notice on the Account page says that the code
  works again after the pause. A code that is used up or disabled shows no
  join link.
- During [open sign-up](sign-ups.md#open-sign-up), a notice on the Account
  page says that anyone can sign up now, and that the invites stay for
  later (decision 230). It shows only for a code with uses left. Reason:
  the invites stay for later only while some are left.
- While the pause is on, the Account page shows the notice of the pause,
  also while the waitlist is off. Reason: the pause wins over the waitlist
  switch.
- An operator can disable a referral code. A disabled referral code stays
  disabled, and the user gets no new code. Reason: an operator can give a
  good user an invite code instead.
- A suspension does not stop the referral code of the user. The question
  before the suspension offers to disable it, as
  [Suspend and Lift on a page](operator-section.md#suspend-and-lift-on-a-page)
  says.

## The join link

- Each code has a join link: `https://app.conductive.build/join/<code>`
  (decision 160). Reason: a shared link needs no typing.
- The join link opens the sign-in page, which shows its code. The page
  names no owner of the code. Reason: a shared code can travel far, and
  the login of its owner would travel with it.
- The join link carries its code through the Terms page and the GitHub
  sign-in, inside the signed sign-in state. A code in the address of the
  callback counts for nothing.
- The sign-in uses the code only for an account without app access. A code
  that works gives app access in the same sign-in.
- During open sign-up, a join link signs the person in with no use of its
  code, as [Open sign-up](sign-ups.md#open-sign-up) says.
- For a signed-in person who waits, the join link uses its code at once.
- When a person with app access opens a join link, the app uses no code.
  The app opens as usual, with no notice. Reason: that person needs no
  code, so the code stays for someone else.

## The use of a code

- One step uses a code and gives app access. Both happen, or neither
  happens (decision 160).
- The step takes a use only while all of these are true:
  - The code is not disabled.
  - The code has a use left.
  - The pause is off.
  - The person has no app access.
- A person with app access who uses a code gets HTTP 200, and nothing
  changes. The code stays unused.
- Each person uses at most one code.
- A code never passes its use limit, also when two people take its last
  use at the same time.
- So a double submit takes one use. A code use at the moment of an org
  invitation takes no use when the invitation gives app access first.
