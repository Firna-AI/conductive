# Operator section

The operator section is the part of the web app where an operator sees
the whole app and acts on one org or one user. It lives at `/operator`. It
has the tabs Overview, Orgs, and Users, a page for each org and each user,
and Suspend and Lift on those pages. The Mac app shows the same pages,
because it shows the web app.
[Operator section](../../../docs/protocol/operator-section.md) and
[Operator actions](../../../docs/protocol/operator-actions.md) give the
requirements. The visual spec is the `app/operator` page of the
[mockup catalogue](../../../docs/mockups/catalogue.md).

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

The search lives in `q`, so Back and a link bring it back. A pause of
300 ms in the typing, or Enter, puts the text in the address in place of
the last search.

## Reads and writes

- Each page reads its data when it opens. The page keeps no cache, so a
  return to a page reads it again.
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
- The question stays open while the write runs. Cancel is off, and
  Escape and a press outside do nothing, on desktop and in the sheet of a
  phone. A failed write shows its error in the question, and the question
  stays open.
- The reply of a suspension names the stops that have not finished. The
  page counts them in its notice until the page closes or a lift.
- A suspension of the operator's own account ends every session of the
  operator, so the app then shows the sign-in.

## Parts shared with the mockups

The section reuses the parts of the mockups that import no fixture:
`WorkspaceStates`, `DailyChart`, the words of `operatorCopy.ts`, and the
CSS modules of `docs/mockups/src/components/operator/`. So the app and the
mockups keep the same words, dates, and look.

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
  serves the sample orgs and users of the mockups, and Suspend and Lift
  change them until the page loads again.
- `npm run test -- src/shell/operator` runs the tests of the section.
  They mount the shell in happy-dom over the fake API, with the samples of
  `src/test-support/operator.ts`.

### Key Code

- `OperatorRoutes.tsx`: the access check, the frames, and the page of each
  address.
- `OperatorPage.tsx`: the header and the tabs of each page.
- `OverviewTab.tsx`, `OverviewParts.tsx`, and `OverviewLoading.tsx`: the
  Overview, its tiles, largest orgs, and placeholders. Its charts are
  `DailyChart` of `docs/mockups/src/components/operator/`.
- `OrgsTab.tsx`, `UsersTab.tsx`, `DirectoryList.tsx`, and
  `SearchField.tsx`: the searches and their rows.
- `OrgPage.tsx`, `UserPage.tsx`, `TargetPage.tsx`, and
  `TargetDialogs.tsx`: the pages, Suspend and Lift, and their questions.
- `TargetParts.tsx` and `format.ts`: the rows of users and orgs, and the
  formats of counts and days.
- `../../app/operator-read.ts`: `OperatorRead`, the read of the Overview
  and of a page, and the refusal of a person who is not an operator.
- `../../app/operator-directory.ts`: `OperatorDirectory`, a search, its
  pages, and Show more.
- `../../app/operator-target.ts`: `OperatorTarget`, a page with Suspend
  and Lift.
- `../../app/api/read-operator.ts` and `read-operator-pages.ts`: the
  readers of the replies.

### Related Docs

- [Operator section](../../../docs/protocol/operator-section.md)
- [Operator actions](../../../docs/protocol/operator-actions.md)
- [Web app: data and composition](../../app/README.md)
- [Operator actions in the Worker](../../../worker/operator/README.md)
