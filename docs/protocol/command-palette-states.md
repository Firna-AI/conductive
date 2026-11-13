# Command palette: empty and unavailable states

This doc holds the requirements and the decisions in force for the empty
and unavailable states of the command palette. It covers workspace data
that loads or did not load, a tab without workspaces, and a search without
a match. It belongs to [Command palette](command-palette.md), which covers
the other parts of the palette. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [mockup catalogue](../mockups/catalogue.md) draws these states at
`app/command-palette/workspaces` and `app/command-palette/search`.

## Data that did not load

- The workspace groups of a tab need the workspace list. With a query,
  they also need the repository names, because a search looks at them.
- While that data loads, or after its read failed, a status part takes the
  place of the workspace groups (decision 164).
- Reason: no tab gives a partial answer as a complete one. A failure only
  when a search finds no row, and repository names sent with the workspace
  list, were rejected, because each still leaves partial answers.
- On the All tab, the status part stands first. The action and setting rows
  stay under it. On the Workspaces tab, it fills the tab.
- While the data loads, the status part is a spinner. After a read failed,
  it is a notice with Try again, which reads again each read that failed.
- The notice says "The workspaces didn't load" for the list, and "The
  repositories didn't load" for the repository names.
- When one read that the tab needs failed and the other still loads, the
  status part is the notice of the failed read. Reason: the person can act
  on a failure at once.
- When both reads failed, the notice says "The workspaces didn't load".
  Reason: a failed list hides every workspace row.
- Only a read that fails before its data arrives shows the notice. After a
  later read fails, the palette keeps the data that it has, as the rest of
  the app does.

## Empty states

- When the Workspaces tab has no workspace to show, no status part, and an
  empty search field, one line says where its workspaces show.
- With the Active filter, the line says
  `Workspaces of <org or repository> show here`.
- With the Archived filter, the line says
  `Archived workspaces of <org or repository> show here for 14 days`.
  Reason: the line says why an older archive does not show. It left the
  list, as [Removed workspaces](workspace-life.md#removed-workspaces) says.
- `<org or repository>` names the chosen repository, such as
  acme/marketing-site, or the org while the filter shows all repositories.
- Without an org, the line has no name: `Workspaces show here`, or
  `Archived workspaces show here for 14 days`.
- With a query, the palette says `Nothing matches “<query>”` when the tab
  has no row and no status part. `<query>` is the text of the search field.
- Under it, the palette says "Try a workspace name, a branch, or a
  repository."
