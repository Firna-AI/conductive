# Sign-ups

This doc holds the requirements and the decisions in force for the two
controls of sign-ups: the pause and the waitlist switch. The pause stops
all sign-ups for a time (decision 160). The waitlist switch turns the
waitlist off, so that each new person can get in without a wait
(decision 230). The doc also covers the controls in the operator section
and the main action of the marketing site. [Waitlist](waitlist.md) states
who waits and the ways in. [Operator section](operator-section.md) states
the other parts of the section. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws each screen of
this doc, on desktop and on a phone.

## The pause

- An operator can pause sign-ups (decision 160). Reason: the operator can
  then stop all sign-ups for a time.
- While the pause is on, invite codes, referral codes, the org invitations
  of people who wait, and [open sign-up](#open-sign-up) let nobody in
  (decisions 160 and 230).
- A code that the pause stops stays unused, as
  [Codes](waitlist-codes.md#codes) says. The person can use it again after
  the pause.
- During the pause, the Accept of an org invitation by a person who waits
  gets HTTP 403 with the code `signups_paused`. It gives no membership and
  no app access. The invitation stays, so the person can accept it after
  the pause.
- The pause changes nothing for a user with app access. Such a user still
  accepts an org invitation.
- A new GitHub sign-in still creates an account that waits, also while the
  waitlist is off. Reason: the pause wins over the waitlist switch,
  because the pause exists to stop all sign-ups.
- The approval of an operator still works. Reason: an approval is one
  deliberate act.
- The app keeps the time and the operator of the last change of the pause.
- When the pause ends, sign-ups return to the state of the waitlist
  switch. So open sign-up starts again while the waitlist is off.
- The waitlist screen names the pause only after the pause stopped a code
  or the Accept of an org invitation. Reason: an approval still works
  during the pause.
- No email goes out when the pause ends. An email to each person whom the
  pause stopped was rejected, because it adds a second kind of email and a
  burst of email at the end of each pause.

## The waitlist switch

- An operator can turn the waitlist off, and turn it on again
  (decision 230). Reason: the operator can then let every new person in,
  and later make new people wait again, without a deploy.
- The waitlist is on until an operator turns it off, also on a new
  database. Reason: the waitlist is the rule in force.
- The app keeps the time and the operator of the last change of the
  switch.
- A turn-off while the waitlist is off, or a turn-on while it is on,
  changes nothing. It keeps the time and the operator of the last change.
  The same holds for a repeat of Pause sign-ups or Resume sign-ups.
- These approaches were rejected (decision 230):
  - one Sign-ups control with the three states Open, Waitlist, and Paused,
    because it reworks the pause, and Resume must then remember the
    earlier state
  - open sign-up through one open invite code, because each open period
    then needs a new code and a use limit, and the record names a code
    that the person never typed
  - app access for every person who waits at the moment that open sign-up
    starts, because each of them gets it while away, and a turn-off by
    mistake then lets all of them in for good
  - a deploy setting, because each change then needs a deploy
  - a lesser app access during open sign-up, such as a limit on cloud
    computers, because the product is free with no limits
- The switch has no end time and no cap on the number of open sign-ups
  (decision 230). An end time or a cap can come later with no rework.
- Risk: during open sign-up, anyone with a GitHub account gets app access,
  and the app's Boat account pays for their cloud computers. The pause
  stops open sign-up at once.

## Open sign-up

- Open sign-up is on while the waitlist is off and sign-ups are not paused
  (decision 230).
- During open sign-up, each sign-in of a user without app access gives app
  access, with the source "open sign-up". So a new GitHub sign-in creates
  an account with app access.
- An operator still gets the source "operator" at a sign-in, as
  [Ways in](waitlist.md#ways-in) says.
- During open sign-up, a person who waits gets app access at their next
  request. So the waitlist screen opens the app when the person comes back
  to the tab or the window.
- Reason: a waitlist that is off holds nobody. App access for every person
  who waits at the moment of the change would also count people who never
  come back.
- During open sign-up, a join link signs the person in with no use of its
  code. Reason: [The join link](waitlist-codes.md#the-join-link) already
  keeps a code for someone who needs it.
- When the waitlist turns on again, nobody loses app access, and the next
  new sign-in waits. Reason: app access is final, as
  [Who waits](waitlist.md#who-waits) says.
- The record of an open sign-up names the operator who last turned the
  waitlist off, as
  [The record of app access](waitlist.md#the-record-of-app-access) says.
  Reason: each grant then traces back to a person, as an approval does.
- No email goes out when the waitlist turns off, or when a person gets in
  by open sign-up. Reason: the person is at the app when the grant
  happens.
- An email to each person who waits when the waitlist turns off was
  rejected. Reason: the app sends an email only at an approval
  (decision 162). A burst of email at the end of a pause was rejected too.
- During open sign-up, the Account page shows a notice about the invites
  of the user, as [Referral codes](waitlist-codes.md#referral-codes) says.

## The Sign-ups box

- The Sign-ups box at the top of the Invite codes tab names the state of
  sign-ups (decisions 160 and 230).
- While the waitlist is on, the box says "Waitlist on". It holds Turn off
  the waitlist and Pause sign-ups.
- While the waitlist is off, the box says "Open". It holds Pause sign-ups.
  The notice of the switch holds Turn on the waitlist.
- So the box says "Open" only during open sign-up. Reason: the box must
  not read as open while new people wait.
- While the pause is on, the notice of the pause takes the place of the
  whole box. So Turn off the waitlist shows only while sign-ups are not
  paused.
- Reason: the pause is an emergency stop, and a turn-off during the pause
  would need a second form of the question.

## The questions

- Pause sign-ups asks first. The question says that codes and org
  invitations let nobody in until sign-ups resume, and that each code
  keeps its uses. It also says that new people wait, also while the
  waitlist is off, and that Approve still works.
- Turn off the waitlist asks first. The question says that each new
  sign-in gets app access at once.
- The question also gives the number of people who wait, as the
  [Waitlist tab](operator-section.md#the-waitlist-tab) counts them. It
  says that each of them gets app access at their next visit.
- It also says that no email goes out, and that nobody loses app access
  when the waitlist turns on again. Reason: each grant is final, so the
  operator decides with these facts.
- The button of this question says "Turn off". The title of the question
  keeps the full words. Reason: "Turn off the waitlist" does not fit beside
  Cancel in the sheet of a phone.
- Resume sign-ups and Turn on the waitlist act at once, with no question.
  Reason: each of them brings back the usual state.

## The notices

- While the pause is on, each tab of the section starts with the notice
  of the pause (decision 160). The notice names the operator who paused
  sign-ups, and when. It says what waits, and it holds Resume sign-ups.
- The notice of the pause also says that new people wait, also while the
  waitlist is off. Reason: the pause wins over the switch, and the
  operator must see that.
- While the waitlist is off, each tab of the section shows the notice of
  the switch at its top (decision 230). The notice names the operator who
  turned the waitlist off, and when. It holds Turn on the waitlist.
- The notice of the switch says that each new sign-in gets app access at
  once, and that people who wait get it at their next visit.
- While both notices show, the notice of the pause comes first. Reason:
  the pause decides who gets in.
- While both notices show, the notice of the switch says that each new
  sign-in gets app access when sign-ups resume. Reason: the notice must
  not promise app access while the pause stops it.

## The main action of the site

- The main action of the marketing site reads "Sign up" in each state of
  sign-ups: while the waitlist is on, during open sign-up, and during the
  pause. Each main action of the site uses these words, also the one in
  the footer.
- Reason: the user chose "Sign up" on 10 November 2026, so that no button
  of the site names the waitlist.
- Words that follow the state of sign-ups were rejected: "Start free with
  GitHub" during open sign-up, and "Join the waitlist" at other times.
  Reason: the user chose one set of words for each button of the site.
- So the pages of the site do not change with the waitlist switch or the
  pause. A change of either takes effect at the next sign-in or request,
  as [Open sign-up](#open-sign-up) says.
- The sentence under the last call to action says that the app opens when
  the account gets access. Reason: the sentence then promises no use at
  once, and it is true in each state of sign-ups.
