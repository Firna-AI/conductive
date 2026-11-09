---
title: From Conductor
description: The page for people who move from Conductor Cloud, at conductive.build/from-conductor, with the rows that the site shows.
---

# From Conductor

The page at `conductive.build/from-conductor` shows people who move from
Conductor Cloud which of its features work in Conductive today, which are
on the way, and which work differently.
[The comparison page](mock:marketing/from-conductor/one-table) draws it at
phone and desktop sizes, in light and dark.

## The content

- The rows, the statuses with their meanings, the due dates, and the words
  of the page come from the modules in `src/marketing/from-conductor/`. The
  site and the mockup read the same modules, so they show the same rows.
- An In progress or Planned row shows its due date only when the team
  records a dated commitment. Without one, it shows "No date yet".
- `docs/protocol/conductor-cloud-comparison.md` states the claim rule of
  each status.

## The page

- The top says that the list covers Conductor Cloud features only, and
  leaves out the features of local Conductor workspaces. It gives the days
  of Conductor Cloud beside the announcement of Conductor, in words that
  stay true after each day, and the day of the last check of the list.
- The legend comes next. Then one table with one header lists the features
  in the order of their areas, with the columns Area, Conductor Cloud
  feature, In Conductive, and Notes.
- On a computer, each area is one merged cell, with its name at the top.
  Only the darker hairline at the end of the area crosses that cell. The
  other columns keep a hairline under each feature.
- A phone stacks the cells of each row, with the area on top.
- One table serves both layouts. Each row also has an area cell of its
  own. CSS shows the merged cell on a computer and the cell of each row on
  a phone, so the page needs no script.
- A line under the table says that Conductive is not affiliated with
  Conductor. The last call to action is Join the waitlist.
- The home page links to the page from a short link above its headline.
  The footer of the site links to it from its Product column.

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
