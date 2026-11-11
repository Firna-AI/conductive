# The design of routines

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
parts of routines, the routine page and its runs, and its failed and
unavailable states.

- The parts of routines live in `src/components/routines/`. The routine
  page puts its form beside the Runs column on desktop. A phone shows a
  saved routine in two tabs, Routine and Runs. The Runs list holds the
  newest 50 runs, and Show older runs ends it when older runs exist. A
  phone opens the Add trigger menu and the author filter of a pull request
  trigger in a sheet. A suspended org keeps its Routines link, and shows
  its routines read-only under its notice. `RunLinks` in
  `src/components/workspace/` draws the line under the header of a run
  workspace, which links to its routine and to its pull request. The pull
  request bar names the base branch of a workspace: the default branch, or
  for a pull request run the head branch of its pull request. A long base
  branch ends in an ellipsis at half of the line. The
  bubble of a message keeps its line breaks, as in the app, so the first
  message of a run shows the facts of its trigger on their own lines.
  - `runCopy.ts` gives the words of a failed run from its stored cause, and
    from the agent and the owner of the run itself, not of its routine. So
    a later change of the agent, or a move of the routine to another owner,
    changes no past row. A failed start and a failed first turn keep their
    workspace, and their rows open it, as `app/routines/runs/failed` shows.
  - When the routine page cannot show its routine, the page keeps Routine
    as its name and shows no tabs, no Runs list, and no actions. A routine
    that the org no longer has shows the empty state "This routine is not
    available" with Open Routines. A read that failed shows `LoadFailure`.
    `app/routines/routine/unavailable` and `not-loaded` show them.
