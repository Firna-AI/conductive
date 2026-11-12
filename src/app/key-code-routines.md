# Key code: routines

This page is part of the [web app guide](README.md), beside
[Key code](key-code.md). It names the entry points of the routines:
their readers, models, and drafts, the Routines page, the routine page,
and the Runs list. Each path is relative to `src/app/`, the folder of
this page. [Routines](../../docs/protocol/routines.md) gives their
requirements.

- `api/read-routines.ts`: the readers of the routines, each with its newest run, and of one routine. `api/read-routine-runs.ts`: the readers of the runs.
- `routine-model.ts`: `RoutineModel`, one routine with its reads, its
  saves, and its runs, and `routineModel`, the model that the org keeps for
  each routine. Its `client` sends the other requests of the routine page,
  and a `routine_not_found` from any of them reads the routine again.
  `routine-actions.ts`: create, update, Turn off, Delete, and Run now,
  which also update the Routines list.
- `routine-runs.ts`: `RoutineRuns`, the Runs list of one routine: the
  pages that it shows, which each read gets again from the newest run
  while the page shows them, Show older runs, which adds a page, and Run
  now.
- `routine-draft.ts`: the draft of the routine page, the equality of each
  of its fields, its create and update requests, and whether Save can send
  it. `routine-triggers.ts`: the
  defaults of a new trigger and the edits of an author filter.
  `routine-cron.ts`: the rule of a custom cron, which the Worker applies
  too.
- `../shell/routines/RoutinesScreen.tsx`: the Routines page, which the
  Routines link of the sidebar and of the phone list opens.
  [Routines](../../docs/protocol/routines.md#the-routine-pages) states what
  it shows.
- `../shell/routines/RoutineScreen.tsx`: the routine page and the page of
  a new routine. `RoutineEditor.tsx` is the form of the owner, and
  `RoutineReader.tsx` the read-only view of every other member, with Turn
  off and Delete for an admin. `useRoutineSave.ts` is Save, with the login
  that a save refused. `RoutineFrame.tsx` puts the Runs list beside the
  form on desktop, and on the Runs tab of a phone. It alone shows the
  notice of a suspended org, in every view of the page. `RoutineNote.tsx`
  is the note above a routine, which reads the saved repository from the
  repository list of the org.
- `../shell/routines/RunsPanel.tsx` and `RunList.tsx`: the Runs list, with
  the mark, the state, the trigger, the pull request, and the time of each
  run, and the link to its workspace. `run-copy.ts`: the mark of a run, the
  cause of a failed run in words, from the agent and the owner of the run
  itself, and the reason of a skipped run, with the login of an account
  outside the org. `RunNow.tsx`: Run now of the owner.
- `../shell/workspace/RunLine.tsx`: the line under the header of a run
  workspace, which links to its routine, and to the pull request of a pull
  request run.
