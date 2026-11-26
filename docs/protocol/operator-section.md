# Operator section

This doc holds the requirements and the decisions in force for the operator
section. In this part of the web app, an operator sees the whole app and
acts on one org or one user (decision 142). The operator also runs the
waitlist there (decision 160), sets the weights of new orgs
(e2b decision 222), and sets the stop time of idle cloud computers. [Operator section: the Overview](operator-overview.md)
states the Overview tab, with its counts and its long runs.
[Waitlist tabs](operator-waitlist-tabs.md) holds the Waitlist tab, Approve,
the Invite codes tab, and the pause.
[Operator actions](operator-actions.md) states who is an operator, and what
a suspension and a lift do. [Switch account](switch-account.md) states the
switch of an org to another provider account, with its box on the page of
the org. [Waitlist](waitlist.md) states the waitlist and
the codes. [Sign-ups](sign-ups.md) states the pause, the waitlist switch,
and their controls in the section. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An e2b decision number names a decision of the change that adds E2B as
the second [sandbox provider](workspaces-and-sandboxes.md#the-provider), as
that doc says.

## Access

- Only an operator sees and opens the section. The `OPERATOR_GITHUB_IDS`
  setting of the Worker lists the operators, as
  [The operator](operator-actions.md#the-operator) says.
- The section lives in the web app at `/operator`, behind the sign-in and
  the gate of the app.
- A hosted tool for internal pages and a hostname of its own were
  rejected (decision 142). A hosted tool gives user data to a third party.
  A hostname of its own needs a second gate and a second sign-in.
- An operator opens the section from the rail, above the account. On a
  phone, the operator opens it from the org switcher, under Account.
  Other people see no link to it.
- A signed-in user with app access who is not an operator gets the
  not-found page of the app at `/operator`, as at any unknown address
  (decision 146). A person who waits sees only the
  [waitlist screen](waitlist.md#the-waitlist-screen).
- A page that says that the section is for operators was rejected,
  because it tells every user that the section exists.
- Each request of the section is an operator request. So every other user
  with app access gets HTTP 403 with the code `operator_required`, as
  [The operator](operator-actions.md#the-operator) says. A person who waits
  gets `access_required`, as
  [What a person who waits can reach](waitlist.md#what-a-person-who-waits-can-reach)
  says.
- The section changes five settings of the app: the codes, the pause, and
  the waitlist switch (decisions 160 and 230), the weights of new orgs
  (e2b decision 222), and the stop time. It makes and disables invite
  codes, disables referral codes, turns the pause on and off, turns the
  waitlist off and on, and saves the weights and the stop time. It changes
  no other setting (decision 143). Cal added the stop time on 20 November
  2026.
- The section cannot change who is an operator. Reason: a stolen session
  of an operator then cannot add an operator.

## What the section shows

- The section has the tabs Overview, Orgs, Users, Waitlist, Invite codes,
  Providers, and Settings (decisions 147 and 160, and e2b decision 222).
  Cal chose the Settings tab on 20 November 2026, so that later settings
  of the whole app have a home. A box on the Providers tab, a box on the
  Overview, and a dialog from the header of the section were rejected.
- The section shows only counts, names, IDs, dates, roles, states, codes,
  weights, and the stop time. It shows no chat, file, env value, or agent login. Reason:
  the section then holds the least personal data.
- The only email address that the section shows is the primary verified
  email of a user, on the page of that user. The lists of the Users tab
  and of the Waitlist tab show no email address. Reason: the user asked on
  15 November 2026 for the email address on the page of a user.
- While the pause is on or the waitlist is off, each tab starts with a
  notice, as [The notices](sign-ups.md#the-notices) says.

## The Overview

- [Operator section: the Overview](operator-overview.md) states the live
  counts of the Overview, and its long runs of cloud computers.

## Orgs and Users

- The Orgs tab searches every org by its name or its org ID. It also finds
  the org of a cloud computer ID or of a preview address (decision 147).
- It finds each preview address and each cloud computer ID that the app
  still has a record of. This covers a preview that is open or closed, and
  a cloud computer that runs or not.
- Reason: an abuse report names a cloud computer or a preview address, as
  [The operator](operator-actions.md#the-operator) says. The report can
  come after the preview closed.
- The Users tab searches every user by GitHub login, name on GitHub, or
  numeric GitHub ID (decision 147).
- The Users tab marks each person who waits as Waiting (decision 160).
- The Users tab gives the last active time of each user, in a Last active
  column on a desktop. The page of a user gives it too, as a date and a
  time of day. The last active time is the time of the last real action
  of the person: a new workspace, or a chat message that the person sends
  or sends again from the app (the user's decision of 14 November 2026).
  Reason: the operator sees which accounts still do work.
- Sign-in, reads, and the other actions of the app do not count. An
  action that an agent tool or an automation takes for the person does not
  count either, because the person did not act.
- The column gives the time of day for a time of today, and else the day,
  as Joined does. A user with no recorded action shows Unknown.
- With no search, the Orgs and Users tabs list the newest first, 20 at a
  time, with Show more (decision 147). A search lists its matches in the
  same way.
- Each org in the Orgs tab shows its provider account by its ID
  (e2b decision 221).
- Each org and each user has a page in the section.
- The page of an org gives its ID, its creation day, and the number of
  its repositories. Its Provider account box gives its provider account
  and the switch of that account, as
  [Switch account on a page](#switch-account-on-a-page) says. It also
  gives its workspaces by state and its cloud computers that run now, as
  the Overview counts them. It lists the members, each with their name on
  GitHub and their role (decisions 147 and 149, and e2b decision 221).
- The page of a user gives the GitHub login, the name on GitHub, the GitHub
  ID, the join day, and the last active time. It gives the number of
  workspaces that the user owns, and how many of them run now. It lists
  the orgs of the user, each with the role of the user (decisions 147 and
  149).
- An account with no name on GitHub shows its login and no name
  (decision 149).
- The page of a user also gives the primary verified email of the GitHub
  account. An account without one shows "No verified email". This is the
  address of [the approval email](waitlist.md#the-approval-email).
- The page of a user also gives the age of the GitHub account
  (decision 160). Reason: Approve on that page then has the same facts as
  the Waitlist tab.
- The page of a person who waits says since when the person waits.
- The page of a user with app access gives how and when the user got it:
  the source and the time, as
  [The record of app access](waitlist.md#the-record-of-app-access) states.
  An account from before the waitlist shows "Joined before the waitlist",
  with its join day as the time.
- For an org invitation, the page names the org and the admin who sent the
  invitation.
- After an approval, the page also gives the state of the approval email:
  - sent, with its time
  - not sent yet, while the app tries again
  - not sent, with the reason: no verified email on GitHub, or the end of
    the retries
- The page of a user with a referral code gives the code with Copy, and its
  uses. While the code still lets people in, the page also has Copy join
  link and Disable. A disabled code shows when and by whom it was
  disabled.
- The page lists each person who used the referral code, with the day they
  came in. Each of them opens their page.
- The page of a suspended org or user shows the suspension, with its time
  and its operator. The page of a deleted org shows the deletion.

## The Waitlist tab

[The Waitlist tab](operator-waitlist-tabs.md#the-waitlist-tab) holds these
requirements.

## Approve

[Approve](operator-waitlist-tabs.md#approve) holds these requirements.

## The Invite codes tab

[The Invite codes tab](operator-waitlist-tabs.md#the-invite-codes-tab)
holds these requirements.

## The pause

[The pause](operator-waitlist-tabs.md#the-pause) holds these requirements.

## The Providers tab

- The Providers tab holds the weights of new orgs, as
  [The account of an org](provider-accounts.md#the-account-of-an-org)
  says (e2b decision 222). It names each account by its ID, such as `boat`
  or `e2b` (e2b decision 221).
- Its New orgs box shows the weights as one slider between `boat` and
  `e2b`. Each end gives the share of its account, and the two shares add
  up to 100%.
- The box says that each new org gets an account by chance from the
  weights. It also says that an operator can switch an org later, on its
  page.
- Save weights stays off until the slider moves. It acts at once, with no
  question. Reason: a change applies only to the orgs that are created
  after it, and it moves no org.
- When a save fails, the slider keeps the moved weights, and the box says
  that the weights weren't saved. New orgs keep the saved weights.
- The app records each change of the weights, with its time and its
  operator, as it records each suspension. The box names the operator of
  the last change, and when. Weights that no operator changed have no
  such line.
- When the Worker has only one configured account, the box says that this
  account gets every new org. It shows no slider then.
- Orgs by account counts the orgs on each configured account. As the
  Overview does, it counts a deleted org while its records exist.

## The Settings tab

- The Settings tab holds the Stop time box. The box sets the
  [stop time](stop-and-resume.md#the-stop) of idle cloud computers, for
  every workspace of every org.
- The box offers 15 min, 30 min, 1 hour, 1.5 hours, and 2 hours as one
  choice. It says that a running computer takes a new time at its next
  activity, or when its current time ends.
- Save stop time stays off until the operator picks another time. It acts
  at once, with no question.
- When a save fails, the choice keeps the time that the operator picked,
  and the box says that the stop time wasn't saved. Cloud computers keep
  the saved time.
- The app records each change of the stop time, with its time and its
  operator, as it records each change of the weights. The box names the
  operator of the last change, and when. A stop time that no operator
  changed has no such line.

## Suspend and Lift on a page

- The page of an org or a user has Suspend. When the org or the user is
  suspended, Lift takes its place (decisions 145 and 147).
- A person who waits can be suspended, as any user. The page of a person
  who waits also has Approve. While that person is suspended, the page
  shows Lift and no Approve (decision 160).
- [Suspend a user](operator-actions.md#suspend-a-user),
  [Suspend an org](operator-org-suspension.md#suspend-an-org), and
  [Lift a suspension](operator-actions.md#lift-a-suspension) state what
  each action does.
- Each action asks first. The question before a suspension says what stops
  and what the members keep. It also says that a stopped workspace on the
  `boat` account then gets no restart near day 14, so that its files can
  be deleted.
- The question before the suspension of a user also offers to disable the
  referral code of the user, while the code still lets people in. The
  offer is on by default (decision 160). Reason: the code of an abuser
  must not keep letting people in.
- An automatic disable at each suspension was left out, because no
  decision chose that refusal.
- The question before a lift says what comes back. It also says that a
  workspace on the `boat` account that stopped 14 days ago or more may
  have lost its files.
- While a switch of the org waits for Lift, the question before a lift
  also says that Lift starts the switch build.
  [When the switch build starts](switch-account.md#when-the-switch-build-starts)
  states that rule.
- On the page of the operator's own account, the question before a
  suspension warns that the operator is then signed out. It also warns
  that another operator must lift the suspension. The page still allows
  it, because a warning is enough.
- The page of a deleted org still has Suspend, as
  [Suspend an org](operator-org-suspension.md#suspend-an-org) allows.
- After a suspension, the page shows the suspension and the number of
  cloud computers that are still stopping. The reply of the suspension
  names them, as [Suspend a user](operator-actions.md#suspend-a-user)
  says.

## Switch account on a page

- [The page of the org](switch-account.md#the-page-of-the-org) states the
  Provider account box of the page of an org: the account, the switch and
  the state of its build, the last switch, and the workspaces by account.
  It also states Switch account, Stop switch, and their questions.
