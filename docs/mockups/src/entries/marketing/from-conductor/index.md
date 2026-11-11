---
title: From Conductor
description: The page for people who move from Conductor, at conductive.build/from-conductor, with the rows that the site shows.
---

# From Conductor

The page at `conductive.build/from-conductor` shows people who move from
Conductor which of its features work in Conductive today, which are on the
way, and which work differently. It lists the features of Conductor, local
and cloud.
[The comparison page](mock:marketing/from-conductor/one-table) draws it at
phone and desktop sizes, in light and dark.

## The content

- The rows, the statuses with their meanings, the due dates, and the words
  of the page come from the modules in `src/marketing/from-conductor/`. The
  site and the mockup read the same modules, so they show the same rows.
- An In progress or Planned row shows its due date only when the team
  records a dated commitment. Without one, it shows "No date yet".
- `docs/protocol/conductor-comparison.md` states the claim rule of
  each status.

## The page

- The top has no scope note, because the list covers every Conductor
  feature. It gives the days of the cloud workspaces of Conductor beside
  the announcement of Conductor, in words that stay true after each day.
- The last line of the top gives the date and the time of the last full
  check of the rows, in UTC on the 24-hour clock, after "Last checked". It
  has the quiet type of the line above it.
- The legend comes next. Then one table with one header lists the features
  in the order of their areas, with the columns Area, Conductor feature,
  In Conductive, and Notes.
- On a computer, each area is one merged cell, with its name at the top.
  Only the darker hairline at the end of the area crosses that cell. The
  other columns keep a hairline under each feature.
- A phone stacks the cells of each row, with the area on top.
- One table serves both layouts. Each row also has an area cell of its
  own. CSS shows the merged cell on a computer and the cell of each row on
  a phone, so the page needs no script.
- A line under the table says that Conductive is not affiliated with
  Conductor. The last call to action has the actions of the home page:
  Sign up, and Download for Mac, which leads to the Mac app section of the
  home page.
- The home page links to the page from a short link above its headline.
  The footer of the site links to it from its Product column.

## Row links

- Each row has the id of its feature as its address, such as
  `conductive.build/from-conductor#file-tree`. A quiet link icon after the
  name of the feature leads there. A visitor copies the address with the
  menu of the browser, or from the address bar after a click, so the page
  still needs no script.
- On a computer, the icon shows while the pointer is over a cell of the
  feature, while the link has the keyboard focus, and on the opened row. A
  device without hover always shows it, as the phone view does. On a phone,
  its touch area is 44 px.
- The link is named "Link to" and the name of the feature, such as "Link
  to File tree". The row header keeps only the name of the feature as its
  name.
- The row that the address opens stops 16 px under the top of the window,
  with a quiet fill. On a computer, the fill covers the cells of the
  feature, not the merged Area cell. On a phone, it covers the whole row.
  [The opened row](mock:marketing/from-conductor/one-table#file-tree)
  shows it.

## Statuses

| Status | Icon colour |
| --- | --- |
| Available | Green |
| In progress | Amber |
| Planned | Blue |
| Works differently | Green |
| Under consideration | Grey |
| Not planned | Red |

Each status has a word and an icon, so its colour only supports it. The
legend of the page gives the meaning of each status.
