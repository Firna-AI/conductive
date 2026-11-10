# Conductor comparison

This doc holds the requirements and the decisions in force for the public
page that compares Conductor with Conductive. Conductor is a Mac app for
parallel coding agents at `conductor.build`. Its local workspaces run on
the Mac of its user. Conductor Cloud is its set of cloud workspaces. The
read-only day of Conductor Cloud is 13 November 2026, and its shut-down day
is 20 November 2026. The terms are those of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue.md) draws the page at
`marketing/from-conductor/one-table`, and that mockup is its visual spec.

## The page

- The page lives at `https://conductive.build/from-conductor`, on the
  [marketing site](../architecture/marketing-site.md). Visitors need no
  sign-in.
- It shows people who move from Conductor which of its features work in
  Conductive today, which are on the way, and which work differently.
- A page of the marketing site won over a Markdown page in the repository,
  a public GitHub board, and a view in the app. Reason: visitors decide
  before they sign up, and links and searches reach the site.
- The page and its two entry links call the product that visitors come
  from "Conductor", not "Conductor Cloud".
- "Conductor" won over "Conductor Cloud". Reason: the list covers every
  Conductor feature, so the words of the page match its rows.
- The page has the header and the footer of the site. It ends with the
  last call to action of the site. Its main action, "Sign up", starts the
  GitHub sign-in. A new account then waits for app access, as
  [Waitlist](waitlist.md) says. Its second action, "Download for Mac",
  leads to the Mac app section of the home page.
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

- The page lists every Conductor feature, local and cloud, in one table.
  No note limits the list to one kind of Conductor workspace.
- Every Conductor feature in one list won over Conductor Cloud features
  only, and over two lists, one for each kind of Conductor user. Reason:
  the user chose it.
- The top of the page gives the read-only day and the shut-down day of
  Conductor Cloud. Their words stay true after each day.
- The page calls them the days of the cloud workspaces of Conductor,
  because they do not apply to its local workspaces.

## The check time

- The check time is the date and the time of the last full check of every
  row against the product.
- The top of the page ends with the check time, on a line of its own, such
  as "Last checked 10 November 2026 at 02:07 UTC".
- The check time is in UTC on the 24-hour clock, to the minute, with "UTC"
  in its words. Reason: a page without a script cannot read the time zone
  of the visitor.
- Only a full check of every row moves the check time. A change to one row
  between two full checks does not move it.
- The time of the last full check won over the time of the last change
  that Git records, and over a day on each row. Reason: it stays true after
  each check, also when no row changes, and it needs no change to the build
  or the deploy.

## The table

- One table lists every feature, under one header row with the columns
  Area, Conductor feature, In Conductive, and Notes.
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

## Row links

- Each row has an address: the address of the page, `#`, and the id of the
  row, such as `/from-conductor#file-tree`.
- A row keeps its id when its name, its status, or its note changes, so a
  shared address keeps working.
- Each id of the page is unique.
- A quiet link icon after the name of the feature links to the address of
  its row.
- A visitor copies the address with the menu of the browser, or from the
  address bar after a click.
- A link icon won over a copy button that needs a script, and over the name
  of each feature as the link. Reason: the page still runs no script and
  keeps its security policy, and the icon stays quiet.
- On a device that can hover, the icon shows only while the pointer is over
  the name, the status, or the note of its row. It also shows while the
  link has keyboard focus, and on the opened row.
- The pointer over the merged Area cell shows no icon, because that cell
  spans every row of its area.
- On a device without hover, the icon always shows.
- In the phone layout, the touch area of the link is at least 44 px by
  44 px. The touch area moves no text.
- The opened row is the row whose address the visitor opens. It stops a
  small gap under the top of the window.
- The opened row has a quiet fill and no coloured edge.
- On a computer, the fill covers the name, the status, and the note of the
  opened row, never the merged Area cell. In the phone layout, the fill
  covers the whole row.
- An address with an unknown id opens the top of the page.

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
- A new row gets Not planned only with a decision of the user.
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
- Each row link is named "Link to" and the name of its feature, such as
  "Link to File tree", so that its name says where it leads.
- The row header keeps the name of the feature as its only accessible name.
  Reason: a screen reader reads the row header with each cell of its row,
  so more words there repeat for each cell.
- The keyboard and screen readers reach each row link also while its icon
  is hidden.
- A row link with keyboard focus shows the focus ring of the other links of
  the site.
