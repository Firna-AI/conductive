# The comparison page

This page is part of the [marketing site README](../README.md#the-comparison-page).
It covers the page at `/from-conductor` and the modules of this folder.

The page at `/from-conductor` shows people who move from Conductor Cloud
the status of each Conductor Cloud feature in Conductive.
[Conductor Cloud comparison](../../../docs/protocol/conductor-cloud-comparison.md)
states its requirements. The link above the home headline and the "From
Conductor Cloud" link in the Product column of the footer lead to it. Its
last call to action has the sentence and the two actions of the home page.

The modules in `from-conductor/` are the one source of the rows, the
statuses, the dates, and the words of the page. The chosen mockup,
`marketing/from-conductor/one-table`, reads the same modules, so the page
and its mockup show the same rows. One table serves both layouts with CSS
only: a computer shows the merged Area cell of each area, and a phone shows
the Area cell of each row. The [key code](../README.md#key-code) of the marketing README names each module and part.
[AGENTS.md](../../../AGENTS.md) says when a change must update a row.

To change a row, edit it in the file of its area under
`from-conductor/areas/`, and keep its `id`. A new area also needs its entry
in `areas.ts` and its place in `features.ts`.

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
