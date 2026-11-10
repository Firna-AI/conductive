# Conductor Cloud comparison

This doc holds the requirements and the decisions in force for the public
page that compares Conductor Cloud with Conductive. Conductor is a Mac app
for parallel coding agents at `conductor.build`. Conductor Cloud is its set
of cloud workspaces. Its read-only day is 13 November 2026, and its
shut-down day is 20 November 2026. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws the page at
`marketing/from-conductor/one-table`, and that mockup is its visual spec.

## The page

- The page lives at `https://conductive.build/from-conductor`, on the
  [marketing site](../architecture/marketing-site.md). Visitors need no
  sign-in.
- It shows people who move from Conductor Cloud which of its features work
  in Conductive today, which are on the way, and which work differently.
- A page of the marketing site won over a Markdown page in the repository,
  a public GitHub board, and a view in the app. Reason: visitors decide
  before they sign up, and links and searches reach the site.
- The page has the header and the footer of the site. It ends with the
  last call to action of the site. Its main action, "Join the waitlist",
  starts the GitHub sign-in. A new account then waits for app access, as
  [Waitlist](waitlist.md) says.
- The page is static content. It runs no script, sets no cookie, has no
  tracking, and reads no user data.
- So the page has no search, filter, or sort control. A visitor uses the
  find of the browser.
- The page and its mockup show the same rows, statuses, and notes.
- The page names Conductor in plain text and shows no Conductor logo. A
  line under the table says that Conductive is not affiliated with
  Conductor. Reason: the page compares another product.
- The page names no sandbox provider, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says. It names
  the agents as [Names in the product](agents-and-sessions.md#names-in-the-product)
  says.

## Entry points

- The home page links to the page from a short link above its headline.
- The footer of each page of the site links to the page from its Product
  column.
- The header of the site keeps its links. Reason: the home page link meets
  the chosen approach, and the header has no free width on a phone.

## Scope

- The page lists Conductor Cloud features only. A note at the top of the
  page says so.
- Conductor Cloud features only won over all Conductor features, and over
  two lists, one for each kind of Conductor user. Reason: Conductive
  replaces Conductor Cloud.
- A feature that works only in local Conductor workspaces on a Mac is out.
  It stays out also when another device controls it, such as remote
  control from a phone.
- A cloud feature with a Mac client stays in, such as a copy of the files
  of a cloud workspace to a Mac.
- The top of the page gives the read-only day and the shut-down day of
  Conductor Cloud. Their words stay true after each day.
- The page shows the date of the last full check of its rows against the
  product.

## The table

- One table lists every feature, under one header row with the columns
  Area, Conductor Cloud feature, In Conductive, and Notes.
- One table with an Area column won over a table for each area, sections
  by status, and cards by task. Reason: a visitor reads every feature in
  one run and compares the statuses down one column.
- The rows of an area stay together. The areas, and the rows in each area,
  keep a fixed order.
- In Conductive shows the status of the feature. An In progress or Planned
  row also shows its due date, or "No date yet".
- A note says what Conductive does, or what to do instead, in plain words.
  It can name a limit together with the way around it.
- A legend before the table gives the meaning of each status, in words
  that match its claim rule. It also gives the rule for due dates.

## Layouts

- On a computer, one merged Area cell spans the rows of its area, with the
  name of the area at the top. The other three columns keep a line under
  each feature. A darker line ends each area.
- The merged Area cell won over the name of the area on the first row of
  its area only. Reason: the user chose it after a look at both in the
  mockup.
- In the phone layout of the site, each row stacks its cells, with its area
  on top.
- The table fits the width of the page at each width from 320 px. It never
  scrolls sideways.

## Statuses

Each row has one of six statuses. A row gets a status only when its claim
rule holds. A status tells what Conductive does for a user with app
access. It promises no use at once to a person who waits.

| Status | Icon colour | Claim rule |
| --- | --- | --- |
| Available | Green | Production code on `main` gives the main part of the feature. A mockup or a plan alone does not count. |
| In progress | Amber | An open pull request or a pushed branch holds production code for the feature. |
| Planned | Blue | An approved plan or a recorded user decision includes the feature as future scope. A paused tool with an approved return counts. |
| Works differently | Green | A Conductive feature that works today does the same job through another design. The note says how. |
| Under consideration | Grey | The feature has no committed delivery scope and no standing exclusion. |
| Not planned | Red | A standing product decision leaves the feature out. The note says what to do instead. |

- A general workaround, such as the terminal, does not make a feature Works
  differently.
- An unchosen proposal, such as a brainstorm with open decisions, is not a
  plan. Its row stays Under consideration.
- A row keeps the status that a recorded decision gives.
- Each status shows a word and an icon. The colour only supports them.
- Several statuses with optional real dates won over the earlier call to
  show no dates. Reason: the page must reassure Conductor users that a
  missing feature can still come, and the user asked for firm dates on
  some features.
- Red for Not planned, amber for In progress, and green for Works
  differently replaced the study colours: grey, blue, and the text colour.
  Reason: the user chose them after a look at the mockup.

## Due dates

- Only an In progress or a Planned row can show a due date.
- A row shows a due date only when the team records a dated commitment to
  deliver the feature. Without one, it shows "No date yet".
- A row of any other status shows no date.
- The page never shows an example date.
- A due date names the day, the month, and the year.

## Accessibility

- The table has a header cell for each column. The name of each feature is
  the header of its row, and each Area cell is the header of the rows of
  its area.
- A screen reader reads each row with its area, its feature, its status,
  and its note, in both layouts.
- Each icon is decoration. The word of each status and each date is text.
- Each icon colour has a contrast of at least 3 to 1 with its background,
  in both colour schemes.
- A keyboard reaches each link of the page in reading order.
