# Operator section

The operator section is the part of the web app where an operator sees
the whole app, acts on one org or one user, and runs the waitlist. It
lives at `/operator`. It has the tabs Overview, Orgs, Users, Waitlist,
Invite codes, Providers, and Settings, a page for each org and each user,
Suspend and Lift on those pages, Switch account on the page of an org,
Approve for a person who waits, the codes, the pause of sign-ups, the
waitlist switch, and the weights that give each new org its provider
account. The Mac app shows the same pages, because it shows the web app.
[Operator section](../../../docs/protocol/operator-section.md),
[Switch account](../../../docs/protocol/switch-account.md),
[Operator section: the Overview](../../../docs/protocol/operator-overview.md),
[Operator actions](../../../docs/protocol/operator-actions.md),
[Waitlist](../../../docs/protocol/waitlist.md), and
[Sign-ups](../../../docs/protocol/sign-ups.md) give the requirements. The
visual spec is the `app/operator` page of the
[mockup catalogue](../../../docs/mockups/catalogue-operator.md).

## Access

- The account reply says whether the person signed in is an operator.
  Only then does the rail show Operator above the account, and the org
  switcher of a phone show Operator under Account.
- Anyone else gets the not-found page of the app at each operator address,
  and the app sends no operator request.
- When an operator request gets HTTP 403 with `operator_required`, the app
  marks the account as not an operator. The section then shows the
  not-found page, and the rail drops Operator, until the next load.
- The section has no sidebar of an org, also in the Mac app. There the
  window controls sit in the top left corner.

## Addresses

| Page | Address | Helper in `src/app/router.ts` |
| --- | --- | --- |
| Overview | `/operator` | `routes.operator()` |
| Orgs | `/operator/orgs?q=<search>` | `routes.operatorOrgs(search)` |
| Org | `/operator/orgs/<orgId>` | `routes.operatorOrg(orgId)` |
| Users | `/operator/users?q=<search>` | `routes.operatorUsers(search)` |
| User | `/operator/users/<githubId>` | `routes.operatorUser(githubId)` |
| Waitlist | `/operator/waitlist?q=<search>` | `routes.operatorWaitlist(search)` |
| Invite codes | `/operator/codes?q=<search>` | `routes.operatorCodes(search)` |
| Providers | `/operator/providers` | `routes.operatorProviders()` |
| Settings | `/operator/settings` | `routes.operatorSettings()` |

The search lives in `q`, so Back and a link bring it back. A pause of
300 ms in the typing, or Enter, puts the text in the address in place of
the last search. The app access of a user links to the Invite codes tab
with the search of its invite code.

## Reads and writes

- Each page reads its data when it opens. The page keeps no cache, so a
  return to a page reads it again.
- Each page also reads the pause of sign-ups when it opens, and a new
  search reads it not. While the pause is on, the page starts with its
  notice. While the pause loads, or when it did not load, the page shows
  no notice. The Sign-ups box of the Invite codes tab shows placeholders,
  or the failure with Try again.
- Each page also reads the waitlist switch when it opens, in a read of its
  own, so a failure of one read leaves the other in place. While the
  waitlist is off, the notice of the switch follows the notice of the
  pause. Its words depend on the pause, so it waits for both reads. While
  either loads, or when either did not load, the page shows no notice of
  the switch. While the switch loads, the Sign-ups box shows a placeholder
  line. A switch that did not load shows its failure in the Sign-ups box
  with Try again, and Pause sign-ups stays.
  [The Sign-ups box](../../../docs/protocol/sign-ups.md#the-sign-ups-box)
  and [The notices](../../../docs/protocol/sign-ups.md#the-notices) state
  their words.
- Refresh, in the desktop header of the Overview, reads the numbers again.
  The numbers stay until the answer, and the charts dim. A phone has no
  Refresh.
- A failed read shows a notice with Try again and no number, because a
  count that did not load is not zero.
- A new search keeps the rows of the last one until its answer. An answer
  of an older search, or after the page closed, changes nothing.
- Suspend sends `POST` and Lift sends `DELETE` to the suspension path of
  the target, each with the body `{}`, as the gate of the app asks. After
  either, the page reads the target again.
- Switch account sends `POST` to the switch path of the org, from
  `operatorOrgSwitchPath`, with `providerAccount` and `endRunningJob`.
  Stop switch sends `DELETE` to the same path with `{}`. After either, the
  page reads the org again.
- Approve sends `POST` with `{}` to the approval path of the person. On the
  Waitlist tab, the row then shows Approved and the state of the email of
  the reply until the list loads again, and the count leaves the row out.
  On the page of a user, the page reads the user again.
- New code sends the label and the use limit. Make code stays off until
  the label holds text and the use limit is a whole number of 1 or more.
  The list then loads again with no search, so the new code leads it.
- Disable sends `POST` with `{}` to the disable path of the code. The row
  shows the code of the reply, and the page of a user reads the user again.
- A row that Approve or Disable changed keeps the change over the answer
  of each read that started before the reply of the write. Such a read can
  be Show more, a new search, or the read after New code. The answer of a
  first read that started after that reply shows the row of the server.
- Show more adds its rows under the rows that show, and takes the total of
  its page. While an approved row shows, or an approval runs, Show more
  keeps the earlier total, because the newer total can already leave the
  person out. So the count leaves out each approval once.
- Pause sign-ups sends `POST`, and Resume sign-ups `DELETE`, to the path of
  the pause, each with `{}`. Each page shows the pause of the reply at
  once, and the answer of an older read changes nothing. Resume asks
  nothing, and a failed resume names what failed in a toast.
- Turn off the waitlist asks first, with the number of people who wait
  from the last read of the switch. It sends `DELETE`, and Turn on the
  waitlist `POST`, to the path of the switch, each with `{}`. Each page
  shows the switch of the reply at once, and the answer of an older read
  changes nothing. Turn on asks nothing, and a failed turn-on names what
  failed in a toast.
- The question before the suspension of a user offers to disable a
  referral code that still lets people in, on by default. With the offer
  on, the app disables the code after the suspension, and a failed disable
  names what failed in a toast. On the operator's own page the code goes
  first, because the suspension ends the session.
- Copy and Copy join link put a code, or its join link on the app host
  from `AppServices.appOrigin`, on the clipboard, and a toast says so.
  Copy beside a cloud computer ID of Long runs does the same with the ID.
  A copy that fails names the value in its toast.
- The question stays open while the write runs. Cancel is off, and
  Escape and a press outside do nothing, on desktop and in the sheet of a
  phone. A failed write shows its error in the question, and the question
  stays open.
- The reply of a suspension names the stops that have not finished. The
  page counts them in its notice until the page closes or a lift.
- A suspension of the operator's own account ends every session of the
  operator, so the app then shows the sign-in.

## Last active

- The Users tab gives the last active time of each user in a Last active
  column on a desktop. A time of today shows its time of day, such as
  14:32, and another time its day, as Joined does. The phone keeps User
  and Workspaces.
- The page of a user gives the same time in Details, as a day with its
  year and a time of day.
- A user with no recorded action shows Unknown in both places.
  [Orgs and Users](../../../docs/protocol/operator-section.md#orgs-and-users)
  says which actions count.

## Long runs

- Long runs on the Overview lists the `longRuns` of the reply in their
  order: the workspaces whose cloud computers have run the longest since
  their last start, up to 10.
  [Long runs](../../../docs/protocol/operator-overview.md#long-runs)
  gives the rules.
- Each run length is `readAt - runningSince`, and each last activity is
  the words of `formatWhen` at `readAt`. So the rows agree with "Updated
  at" in the header, and a render does not move with the clock. Refresh
  reads them again.
- A run without a cloud computer ID shows a dash and no Copy. A run without
  a saved last activity says Unknown, as an unknown account age does on
  the Waitlist tab.
- The org opens the org page, also for a deleted org, and the login opens
  the user page. On a phone, a row keeps the org and the run length with
  the state mark. For a suspended owner, it adds the login and the mark
  under the org.
- While the numbers load, the box keeps its place with 10 placeholder
  rows.

## Stop time

- The Settings tab reads `GET /api/operator/idle-stop` when it opens. The
  reply gives the stop time of idle cloud computers and its last change
  with its operator. A failed read shows Try again and no choice, because a
  time that did not load is not the default.
- The Stop time box offers 15 min, 30 min, 1 hour, 1.5 hours, and 2 hours
  as one segmented control, `StopTimeChoice`.
- Save stop time sends `PUT` with `{minutes}`. It is on only while the
  choice differs from the saved time, and not while the save runs. The
  reply shows at once, with "Changed on" and its operator. A failed save
  keeps the chosen time and shows that it was not saved.

## Provider accounts and Switch account

[Provider accounts and Switch account](provider-accounts.md) gives the
Providers tab, the account choice of Create org, and the Provider account
box of the page of an org with Switch account and Stop switch.
The page offers Switch account only when its org detail gives
`switchAvailable: true`. A false or absent value keeps the account details
and Stop switch, with no new-switch action or question.

## Parts shared with the mockups

The section and the mockups both import the shared parts in `src/ui/`:
`WorkspaceStates`, `DailyChart`, `InlineText`, `StatusGlyph`,
`WeightSlider`, `WeightFields`, `AccountCounts`, `AccountChoice`, the words
of `operatorCopy.ts`, `accessCopy.ts`, `codeCopy.ts`, `longRunsCopy.ts`
with its run length format, `providerCopy.ts`, `switchCopy.ts`, and `stopTimeCopy.ts`, the state words of
`status.ts`, the workspace label of `label.ts`, and the CSS modules of
`src/ui/components/operator/`, of `CheckOption`, and of the
Providers screen. So the app and the mockups keep the same words, dates,
and look. `StopTimeChoice` comes from there too. On a phone, the seven tabs use the `flow` mode of `LinkTabs`, as
the mockups do.

`AccountSection` and `SwitchDialogs` of the mockups import the fixtures of
`AccessSections.tsx` and the links of the catalogue. So the app draws the
Provider account box and its questions in `AccountBox.tsx` and
`AccountSwitchDialogs.tsx`, with the same words, CSS modules, and states.

Each text of an org in `operatorCopy.ts` takes its deletion, with the day
when everything of it is deleted. So the questions and the notices of a
deleted org claim nothing that its members can open. They say that no
admin can restore the org while it is suspended, and that a lift leaves
the org deleted. The questions before a suspension also say that each
unfinished build fails, and that a lift does not bring it back.

`DailyChart` names each point and each label of its axis with the words
of its UTC day, such as "10 Oct", in British English. So no time zone and
no locale of the browser changes a date. The axis has one slot for each
day, and it shows every few labels, so the labels leave out the year. The
table of the Firna chart cannot name its first column, so `DailyChart`
turns it off and lists the UTC days in its own table. A day of another
year than the last day has its year there.

## Development

- `npm run dev` with `?operator=1`, such as
  `http://127.0.0.1:5173/operator?operator=1`, makes the dev user an
  operator, as [Run it](../../app/README.md#run-it) says. The dev fake
  serves the sample orgs, users, people who wait, and codes of the
  mockups. Suspend, Lift, Approve, New code, Disable, the pause, and the
  waitlist switch change them until the page loads again. The waitlist and
  Account settings of the dev fake read the same codes, pause, and switch.
  The approval email of Sam Okafor does not go at once, and Kenji
  Watanabe has no verified email.
- Add `&waitlist=off` to start with the waitlist off, by the operator of
  the samples. Each page then shows the notice of the switch. Zed K, who
  waited, has app access by open sign-up, so the page of that user names
  the source.
- The dev fake configures `boat` and `e2b`, with every new org on `boat`.
  `?providers=one`, `three`, or `fail` gives `boat` only, a third account
  `e2b-us`, or a failed read, and `?providerSave=fail` fails each save. An
  org that Create org makes in the page joins the Orgs tab, its page, the
  Overview, and the counts of the Providers tab, with the account that the
  operator chose or a draw from the weights. Long runs list only the runs
  of the samples.
- Switch account and Stop switch change the switch of an org until the
  page loads again. A switch waits for the build of Northwind, for Lift of
  Hexwave, for an admin of Dana's Lab, or for Restore of Pinecrest, and else
  its build runs until Stop switch. Lift starts a switch build that waits
  for Lift. `?switches=1` gives sample orgs each state: Blue Harbor builds,
  Orbit Studio failed, Kestrel Labs switched, and Northwind, Hexwave, Dana's
  Lab, and Pinecrest wait. `?switchSave=fail` fails each switch and stop.
- `npm run test -- src/shell/operator` runs the tests of the section.
  They mount the shell in happy-dom over the fake API, with the samples of
  `src/test-support/operator.ts`. `operator-test-kit.tsx` mounts the
  shell or the page of a user, and lists the operator requests. It leaves
  out the reads of the pause and of the waitlist switch unless a test asks
  for them with `pause: true` or `waitlistSwitch: true`.
  `waitlist-test-kit.ts` and `codes-test-kit.ts` give the replies and the
  rows of the samples that the tests of those two tabs share, and
  `providers-test-kit.ts` gives the replies and the controls of the tests
  of the Providers tab, and `switch-test-kit.ts` the page of an org with a
  switch. `OrgSwitchStates.test.tsx` checks each state of the Provider
  account box, `OrgSwitch.test.tsx` checks Switch account, the account
  choice, the offer to end a job, and the line of Lift, and
  `OrgSwitchStop.test.tsx` checks Stop switch and a failed write.
  `WaitlistSwitch.test.tsx` checks the question and the turn-off,
  the notice and Turn on the waitlist, the order of the two notices, and a
  switch that did not load. `UserAccess.test.tsx` checks the source of an
  open sign-up with its operator. `LongRuns.test.tsx` checks the rows of
  Long runs on desktop and on a phone, their links, Copy, the empty box,
  and the run length format. `OverviewTab.test.tsx` checks its
  placeholder rows.

### Key Code

[Operator key code](key-code.md) names the files, the types, and the
functions of the operator section that a reader opens first.

### Related Docs

- [Operator section](../../../docs/protocol/operator-section.md)
- [Switch account](../../../docs/protocol/switch-account.md)
- [Operator section: the Overview](../../../docs/protocol/operator-overview.md)
- [Operator actions](../../../docs/protocol/operator-actions.md)
- [Waitlist](../../../docs/protocol/waitlist.md)
- [Invite and referral codes](../../../docs/protocol/waitlist-codes.md)
- [Sign-ups](../../../docs/protocol/sign-ups.md)
- [Web app: data and composition](../../app/README.md)
- [Operator actions in the Worker](../../../worker/operator/README.md)
- [Provider weights in the Worker](../../../worker/operator/providers.md)
