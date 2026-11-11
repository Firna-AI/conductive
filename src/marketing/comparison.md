# The comparison page

[The comparison page](README.md#the-comparison-page) in the marketing site
README says what the page at `/from-conductor` shows and which protocol
doc states its requirements. This page gives the source of its rows, the
steps to change a row, and its key code.

The modules in `from-conductor/` are the one source of the rows, the
statuses, the dates, and the words of the page. The chosen mockup,
`marketing/from-conductor/one-table`, reads the same modules, so the page
and its mockup show the same rows. One table serves both layouts with CSS
only: a computer shows the merged Area cell of each area, and a phone shows
the Area cell of each row. [Key code](#key-code) names each module and part.

## Change a row

To change a row, edit it in the file of its area under
`from-conductor/areas/`. A new area also needs its entry in `areas.ts` and
its place in `features.ts`.

The `id` of a row is the end of its address, such as `file-tree` in
`/from-conductor#file-tree`. Keep the `id` when the name, the status, or
the note of the row changes, so that a shared address keeps working. Give
each new row an `id` that no other id of the page has.

Keep each row true:

- Check each status with the claim rules of the protocol doc. A mockup or
  a plan alone never proves Available.
- Give a new row Not planned only after a decision of the user.
- Write each note in one or two plain sentences, with at most 25 words.
  Say what Conductive does, or what to do instead. Name a limit only with
  the way around it.
- Name no sandbox provider, internal name, or decision number in a note.
  Copy no Conductor text.
- Check each note that names a protection of logins, tokens, or
  environment values against
  [Access and security](../../docs/protocol/access-and-security.md),
  [Tokens and secrets](../../docs/protocol/tokens-and-secrets.md), the
  Terms, the Privacy page, and the [Security guide](docs/security.md).
  Claim no protection that they do not state.
- Give a due date only for a dated commitment that the team recorded.
  Never add an example date.
- Keep the evidence of each status and the scope audit out of the rows and
  out of the page.
- After a full check of every row, set the check time that the page
  shows: the current time in UTC, to the minute, as `YYYY-MM-DDTHH:MMZ`.
  A change to one row does not move it.

## Key code

- `pages/from-conductor.astro`: the comparison page. `ParityIntro.astro`,
  `ParityLegend.astro`, and `ParityTable.astro` in `components/` draw its
  top, its legend, and its one table.
- `from-conductor/`: the one source of the comparison page and its mockup.
  - `areas.ts` and `areas/`: the 15 areas in their order, and one file of
    rows for each area.
  - `features.ts`: the rows in area order, `featuresOf`, and the check
    time `parityCheckedAt`.
  - `model.ts`: the row types. Only an In progress or Planned row can have
    a due date.
  - `statuses.ts`: the word, the meaning, the icon, and the tone of each
    status, in the order of the legend.
  - `dates.ts`: the days of the Conductor Cloud shutdown, the announcement
    link, the due rule, and the words of a day and of a time.
  - `copy.ts`: the words of the page and of its two entry links, and the
    name of a row link, as text without markup.
- `styles/comparison.css`, `styles/comparison-table.css`: the comparison
  page and its table, in the cascade that `layouts/Document.astro` keeps.
- [Key code](key-code.md) of the marketing site names the
  shared parts that the page also uses, such as `StatusMark.astro`,
  `DueDay.astro`, `CopyText.astro`, `ClosingCall.astro`, and
  `access-copy.ts`.
