# Operator section

The operator section is the part of the web app where an operator sees
the whole app, acts on one org or one user, and runs the waitlist. It
lives at `/operator`. It has the tabs Overview, Orgs, Users, Waitlist,
Invite codes, and Providers, a page for each org and each user, Suspend and
Lift on those pages, Approve for a person who waits, the codes, the pause of
sign-ups, and the weights that give each new org its provider account. The Mac app shows the same pages, because it shows the web app.
[Operator section](../../../docs/protocol/operator-section.md),
[Operator actions](../../../docs/protocol/operator-actions.md), and
[Waitlist](../../../docs/protocol/waitlist.md) give the requirements. The
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
- The question before the suspension of a user offers to disable a
  referral code that still lets people in, on by default. With the offer
  on, the app disables the code after the suspension, and a failed disable
  names what failed in a toast. On the operator's own page the code goes
  first, because the suspension ends the session.
- Copy and Copy join link put a code, or its join link on the app host
  from `AppServices.appOrigin`, on the clipboard, and a toast says so.
- The question stays open while the write runs. Cancel is off, and
  Escape and a press outside do nothing, on desktop and in the sheet of a
  phone. A failed write shows its error in the question, and the question
  stays open.
- The reply of a suspension names the stops that have not finished. The
  page counts them in its notice until the page closes or a lift.
- A suspension of the operator's own account ends every session of the
  operator, so the app then shows the sign-in.

## Provider accounts

- The Providers tab reads `GET /api/operator/providers` when it opens. The
  reply lists every configured account in ID order, with its weight for new
  orgs and its orgs, and the last change with its operator. A failed read
  shows Try again and no weight, because a weight that did not load is not
  the default.
- Two accounts share one slider. One account gets a line that it gets every
  new org, and no control. Three or more accounts get a whole-percent field
  each, and a line with the total. The tab names each account by its ID.
- Save weights sends `PUT` with `{weights}`, a whole percent for every
  account. It is on only while the weights differ from the saved ones and
  add up to 100%, and it ignores presses while the save runs. The reply
  shows at once, with "Changed on" and its operator. A failed save keeps the
  weights that the operator chose and shows that they were not saved.
- The Orgs tab gives the account of each org in an Account column, and a
  phone gives it in a second line under the name. The page of an org gives
  it in Details. Each shows the ID that the reply gives, also an ID that
  the settings no longer hold.
- Create org of an operator reads the same accounts for its Provider account
  choice: By weights, the default, and every configured ID. Only an
  operator's screen sends that read, and only a chosen account goes into
  the create as `providerAccount`. The create does not wait for the read.
  While it runs, a spinner takes the place of the choice, and a failed read
  shows Try again.
- `operator_required` on any of these reads or writes takes the section and
  the choice away, as on the other tabs.

## Parts shared with the mockups

The section reuses the parts of the mockups that import no fixture:
`WorkspaceStates`, `DailyChart`, `InlineText`, `WeightSlider`,
`WeightFields`, `AccountCounts`, `AccountChoice`, the words of
`operatorCopy.ts`, `accessCopy.ts`, `codeCopy.ts`, and `providerCopy.ts`,
and the CSS modules of `docs/mockups/src/components/operator/`, of
`CheckOption`, and of the Providers screen. So the app and the mockups keep
the same words, dates, and look. On a phone, the six tabs use the `flow`
mode of `LinkTabs`, as the mockups do.

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
  mockups. Suspend, Lift, Approve, New code, Disable, and the pause change
  them until the page loads again. The waitlist and the Account page of
  the dev fake read the same codes and pause. The approval email of Sam
  Okafor does not go at once, and Kenji Watanabe has no verified email.
- The dev fake configures `boat` and `e2b`, with every new org on `boat`.
  `?providers=one`, `three`, or `fail` gives `boat` only, a third account
  `e2b-us`, or a failed read, and `?providerSave=fail` fails each save. An
  org that Create org makes in the page joins the Orgs tab, its page, the
  Overview, and the counts of the Providers tab, with the account that the
  operator chose or a draw from the weights.
- `npm run test -- src/shell/operator` runs the tests of the section.
  They mount the shell in happy-dom over the fake API, with the samples of
  `src/test-support/operator.ts`. `operator-test-kit.tsx` mounts the
  shell or the page of a user, and lists the operator requests. It leaves
  out the reads of the pause unless a test asks for them.
  `waitlist-test-kit.ts` and `codes-test-kit.ts` give the replies and the
  rows of the samples that the tests of those two tabs share, and
  `providers-test-kit.ts` gives the replies and the controls of the tests
  of the Providers tab.

### Key Code

- `OperatorRoutes.tsx`: the access check, the frames, the page of each
  address, and the pause that each page reads when it opens.
- `OperatorPage.tsx`: the header, the tabs, and the notice of the pause of
  each page.
- `OverviewTab.tsx`, `OverviewParts.tsx`, and `OverviewLoading.tsx`: the
  Overview, its tiles with the count of the people who wait, largest orgs,
  and placeholders. Its charts are `DailyChart` of
  `docs/mockups/src/components/operator/`.
- `OrgsTab.tsx`, `UsersTab.tsx`, `DirectoryList.tsx`, and
  `SearchField.tsx`: the searches and their rows.
- `WaitlistTab.tsx` and `ApproveDialog.tsx`: the Waitlist tab, Approve,
  and its question.
- `CodesTab.tsx`, `CodeParts.tsx`, and `CodeDialogs.tsx`: the Invite codes
  tab, a code with Copy and Copy join link, New code, and Disable.
- `PauseParts.tsx` and `pause-context.ts`: the notice of the pause with
  Resume sign-ups, and the Sign-ups box with Pause sign-ups.
- `ProvidersTab.tsx` and `provider-weights.ts`: the Providers tab, its
  weights that the operator changed, and Save weights.
  `../orgs/AccountField.tsx`: the account choice of Create org.
- `OrgPage.tsx`, `UserPage.tsx`, `UserDetails.tsx`, `AccessSections.tsx`,
  `TargetPage.tsx`, and `TargetDialogs.tsx`: the pages, the app access and
  the referral code of a user, Suspend with its offer, Lift, and their
  questions. `useQuestion.ts`: a question that holds while its write runs.
  `CheckOption.tsx`: the checkbox of the offer.
- `TargetParts.tsx` and `format.ts`: the rows of users and orgs, the links
  to a GitHub profile, and the formats of counts, days, and the age of a
  GitHub account.
- `../../app/operator-read.ts`: `OperatorRead`, the read of the Overview
  and of a page, and the refusal of a person who is not an operator.
- `../../app/operator-directory.ts`: `OperatorDirectory`, a search, its
  pages, Show more, a new read after a write, and `write`, a write that
  changes one row, such as Approve or Disable. It also gives the count
  that leaves out the approved rows. `DirectoryList` takes the key of a
  row from it. `../../app/operator-row-changes.ts`: `RowChanges`, the
  changes that the writes confirmed, by the key of the row.
- `../../app/operator-target.ts`: `OperatorTarget`, a page with Suspend
  and Lift.
- `../../app/operator-pause.ts`: `OperatorPause`, the pause with Pause and
  Resume sign-ups. `../../app/operator-access.ts`: Approve, New code, and
  Disable. `../../app/operator-providers.ts`: `OperatorProviders`, the
  provider accounts and the save of their weights.
- `../../app/api/read-operator.ts`, `read-operator-pages.ts`,
  `read-operator-waitlist.ts`, and `read-operator-providers.ts`: the
  readers of the replies.

### Related Docs

- [Operator section](../../../docs/protocol/operator-section.md)
- [Operator actions](../../../docs/protocol/operator-actions.md)
- [Waitlist](../../../docs/protocol/waitlist.md)
- [Invite and referral codes](../../../docs/protocol/waitlist-codes.md)
- [Web app: data and composition](../../app/README.md)
- [Operator actions in the Worker](../../../worker/operator/README.md)
- [Provider weights in the Worker](../../../worker/operator/providers.md)
