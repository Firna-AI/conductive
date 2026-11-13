# Operator section

This doc holds the requirements and the decisions in force for the
operator section. In this part of the web app, an operator sees the whole
app and acts on one org or one user (decision 142). The operator also runs
the waitlist there (decision 160).
[Operator actions](operator-actions.md) states who is an operator, and
what a suspension and a lift do. [Waitlist](waitlist.md) states the
waitlist and the codes. [Sign-ups](sign-ups.md) states the pause, the
waitlist switch, and their controls in the section. The terms are those
of the [architecture doc](../architecture.md#terms). A decision number
names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

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
- The section changes three settings of the app: the codes, the pause,
  and the waitlist switch (decisions 160 and 230). It makes and disables
  invite codes, disables referral codes, turns the pause on and off, and
  turns the waitlist off and on. It changes no other setting
  (decision 143).
- The section cannot change who is an operator. Reason: a stolen session
  of an operator then cannot add an operator.

## What the section shows

- The section has the tabs Overview, Orgs, Users, Waitlist, and Invite
  codes (decisions 147 and 160).
- The section shows only counts, names, IDs, dates, roles, states, and
  codes. It shows no chat, file, env value, agent login, or email address.
  Reason: the section then holds the least personal data.
- While the pause is on or the waitlist is off, each tab starts with a
  notice, as [The notices](sign-ups.md#the-notices) says.

## The Overview

- The Overview reads live counts across every org each time it opens, and
  again on Refresh (decision 144). It keeps no history of the counts, and
  it shows no costs.
- It shows these counts:
  - The users, the orgs, and the workspaces, each with the new ones of the
    last 7 days.
  - The people who wait, in a line under the users. The line opens the
    Waitlist tab (decision 160). As that tab does, the count leaves out
    suspended people.
  - The cloud computers that run now, for the Running workspaces and for
    each unfinished build or refresh of an org image.
  - The workspaces by state: Running, Stopped, Failed, Archived, and
    Removed. They add up to the workspace total.
  - The new workspaces and the new users of each UTC day of the last 30
    days, each with its total for the 30 days.
  - The five orgs with the most workspaces. Their counts hold every
    workspace, also the archived and the removed ones.
- The count of users keeps every account, by join day, also each person
  who waits. Reason: decision 144 chose the counts, and the two numbers
  still show who can use the app.
- Running holds the
  [workspace states](workspace-life.md#workspace-states)
  starting, ready, working, needs input, and finished with unread output.
  Failed holds the error state. Removed holds the
  [removed workspaces](workspace-life.md#removed-workspaces), with the mark
  of Archived, and Archived holds the other archived workspaces.
- Reason: the app keeps the data of a removed workspace, so the operator
  sees it. Its row keeps it apart from the archives that the lists show.
- The 7 days are the 7 times 24 hours before the read.
- The 30 days are UTC days, so that the counts need no time zone of the
  operator. The last of them is the current UTC day.
- The counts read only the records that exist now. So the count of a past
  day can go down, for example after the purge of a deleted org or a
  failed first start.
- The counts include a deleted org and its workspaces while their records
  exist. Only the five largest orgs leave out a deleted org.
- Among the five largest orgs, a tie goes in the order of the org names.
- The Overview lists no suspensions (decision 148). The Orgs and Users
  tabs find a suspended org or user.
- A failed read shows no number. Try again reads the counts again. Reason:
  a count that did not load is not zero.

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
- With no search, the Orgs and Users tabs list the newest first, 20 at a
  time, with Show more (decision 147). A search lists its matches in the
  same way.
- Each org and each user has a page in the section.
- The page of an org gives its ID, its creation day, and the number of
  its repositories. It also gives its workspaces by state and its cloud
  computers that run now, as the Overview counts them. It lists the
  members, each with their name on GitHub and their role
  (decisions 147 and 149).
- The page of a user gives the GitHub login, the name on GitHub, the GitHub
  ID, and the join day. It gives the number of workspaces that the user
  owns, and how many of them run now. It lists the orgs of the user, each
  with the role of the user (decisions 147 and 149).
- An account with no name on GitHub shows its login and no name
  (decision 149).
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
  first, as [Suspend and Lift on a page](#suspend-and-lift-on-a-page)
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

## Suspend and Lift on a page

- The page of an org or a user has Suspend. When the org or the user is
  suspended, Lift takes its place (decisions 145 and 147).
- A person who waits can be suspended, as any user. The page of a person
  who waits also has Approve. While that person is suspended, the page
  shows Lift and no Approve (decision 160).
- [Suspend a user](operator-actions.md#suspend-a-user),
  [Suspend an org](operator-actions.md#suspend-an-org), and
  [Lift a suspension](operator-actions.md#lift-a-suspension) state what
  each action does.
- Each action asks first. The question before a suspension says what stops
  and what the members keep. It also says that a stopped workspace then
  gets no restart near day 14, so that its files can be deleted.
- The question before the suspension of a user also offers to disable the
  referral code of the user, while the code still lets people in. The
  offer is on by default (decision 160). Reason: the code of an abuser
  must not keep letting people in.
- An automatic disable at each suspension was left out, because no
  decision chose that refusal.
- The question before a lift says what comes back. It also says that a
  workspace that stopped 14 days ago or more may have lost its files.
- On the page of the operator's own account, the question before a
  suspension warns that the operator is then signed out. It also warns
  that another operator must lift the suspension. The page still allows
  it, because a warning is enough.
- The page of a deleted org still has Suspend, as
  [Suspend an org](operator-actions.md#suspend-an-org) allows.
- After a suspension, the page shows the suspension and the number of
  cloud computers that are still stopping. The reply of the suspension
  names them, as [Suspend a user](operator-actions.md#suspend-a-user)
  says.
