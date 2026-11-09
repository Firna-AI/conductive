# Comparison rows

This folder holds the rows of the comparison page of the
[marketing site](../README.md). The page at `/from-conductor` shows people
who move from Conductor Cloud the status of each Conductor Cloud feature in
Conductive.
[Conductor Cloud comparison](../../../docs/protocol/conductor-cloud-comparison.md)
states its requirements. The link above the home headline and the "From
Conductor Cloud" link in the Product column of the footer lead to it. Its
last call to action is the one of the site: the shared sentence of
`access-copy.ts`, and the main action, whose words follow the state of
sign-up, as the [marketing site README](../README.md) says.

## The rows

The modules in this folder are the one source of the rows, the statuses,
the dates, and the words of the page. The chosen mockup,
`marketing/from-conductor/one-table`, reads the same modules, so the page
and its mockup show the same rows. One table serves both layouts with CSS
only: a computer shows the merged Area cell of each area, and a phone shows
the Area cell of each row. [Key code](#key-code) names each module, and the
[key code of the marketing site](../README.md#key-code) names each part of
the page. [AGENTS.md](../../../AGENTS.md) says when a change must update a
row.

To change a row, edit it in the file of its area under `areas/` in this
folder, and keep its `id`. A new area also needs its entry in `areas.ts`
and its place in `features.ts`.

Keep each row true:

- Check each status with the claim rules of the protocol doc. A mockup or
  a plan alone never proves Available.
- Write each note in one or two plain sentences, with at most 25 words.
  Say what Conductive does, or what to do instead. Name a limit only with
  the way around it.
- Name no sandbox provider, internal name, or decision number in a note.
  Copy no Conductor text.
- Give a due date only for a dated commitment that the team recorded.
  Never add an example date.
- Keep the evidence of each status and the scope audit out of the rows and
  out of the page.
- After a full check of every row, set the check date that the page shows.

## Key code

- `areas.ts` and `areas/`: the 15 areas in their order, and one file of
  rows for each area.
- `features.ts`: the rows in area order, `featuresOf`, and the check date.
- `model.ts`: the row types. Only an In progress or Planned row can have a
  due date.
- `statuses.ts`: the word, the meaning, the icon, and the tone of each
  status, in the order of the legend.
- `dates.ts`: the days of Conductor Cloud, the announcement link, the due
  rule, and the words of a day.
- `copy.ts`: the words of the page and of its two entry links, as text
  without markup.
