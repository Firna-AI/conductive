# Chat and routines

This page belongs to [the catalogue](catalogue.md). It gives the child
pages of the chat and of routines.

`app/chat` shows a finished turn, whose work folds into one line. Its child
pages: `app/chat/turns` has the running turn, steer, interrupt, and a
failure, which moved from `app/chat/running`, `steer`, `interrupted`, and
`failed` and declare `movedFrom`. `app/chat/work` draws the work of ended
turns, from decisions 150 and 151: the open work of the finished turn with
one message open, a turn with a message that the user sent during it, whose
two parts each fold their own work, a turn whose open work holds a Mac
command card and a lost line at their place, and a turn whose open work
holds two messages with tables, one closed and one open. The `fold` state
opens the folds. `app/chat/tables` draws tables in replies: the resources
of the cloud computer, a short row whose last cell spans the missing
columns, a wide table that scrolls sideways inside the reply, and the
reply while the agent writes it, before its separator row arrives and
after its table appears. `app/chat/lists` draws a reply with a numbered
list of choices, each with its options in a list under its text, as the
user chose on 10 November 2026, and an open message line in the work of a
turn with a plan whose steps sit under each item. `app/chat/lost-data` draws the data that the
chat does not have, from decision 76: tool output and turn files that the
runner left out, and the lines of runner events that the workspace
refused.
`app/chat/lost-updates` draws a failed repair, from decision 96. After a
refused update that belongs to no session, such as a file update, the
workspace asks for a fresh full report, and nothing shows. Only when that
report is lost too does a notice name the data that stays unavailable,
beside that data: under the file lists for a file list, and under the
header for other data, such as the workspace name. The `failed-repair`
value of the `lostUpdate` state draws it. The only other notice for a lost
update is the one of the list of servers, under the port form of the
Preview tool, as `app/tools/preview-repair` shows.
`app/chat/unavailable-files` draws the files that the cloud computer
could not read: a finished turn and a stopped turn
without their changed files, All files with its saved list under a notice,
and a new workspace with no list. The `tree` state draws the two states of
All files.
`app/chat/endpoint-models` is a proposal for option G of decision 10 of
the own endpoint plan, not chosen yet. In a session of Cal, the picker
marks Fable 5.1 as "Not listed", because the model list of Cal's proxy
does not name it, and the model stays a choice. Its `not-served` variant
has a turn on Fable 5.1 that stopped, whose notice names the model ID and
no host. Its `member` variant has the same notice as Priya sees it.

`app/routines` lists the routines of Acme, which the Routines link below
New workspace opens. Its child pages:

- `app/routines/empty` has an org without routines.
- `app/routines/routine` has the owner's view of a saved routine. Its
  child pages: `new` has a new routine, `member` the view of a member,
  `admin` the view of an admin with Turn off and Delete, `owner-left` a
  routine that moved, turned off, to Cal, the admin who got the
  workspaces of a member who left, `turned-off` a routine that turned
  off after three runs in a row failed, and `delete` the question that
  Delete asks first, because a deleted routine cannot come back. The first
  four were saved states of the page. They moved into their own folders
  and kept their paths, so the page shows only its canonical screen.
  `unavailable` has the page of a routine that the org no longer has,
  because it was deleted or the address is wrong, with Open Routines.
  `not-loaded` has the page after the read of the routine failed, with
  the load failure of the other lists of the app and Try again. The
  `read` state of the routine screen draws both. `repository-removed` has
  a routine that turned off when an admin removed its repository from the
  chosen repositories of Acme. While Acme does not choose that repository,
  the notice names it, for Cal and, in the `member` variant, for Priya.
  The `chosen-again` and `chosen-again-member` variants have the routine
  after an admin chose the repository again: it stays off until Cal turns
  it on, and the notice names no repository, because the page cannot tell
  that repository from another one that Cal saved.
- `app/routines/triggers` has the open Add trigger menu. Its child page
  `app/routines/triggers/schedules` has the Hourly, Daily, and Weekly
  editors with the time zone, and a custom cron that the form refuses.
  Its child page `app/routines/triggers/author-filter` has the author
  filter of a pull request trigger: Author is with the entry Members of
  Acme and a bot, the suggestions that offer that entry, and a login that
  the save refused.
- `app/routines/runs` has the newest 50 runs, in each state of their
  workspaces, with Show older runs at the end. Its variants have a failed
  run for each cause, skipped runs, and, as `saved` and `run-now`, the
  routine of the flow before and after Run now. In `failed`, a run that a
  check failed has no workspace, and a run whose first start or first
  turn failed opens its workspace. A phone shows a saved routine in two
  tabs, Routine and Runs. These pages open on the Runs tab, except
  `saved`.
- `app/routines/run-workspace` has the workspace of a pull request run,
  its start, and the workspace of a run of Run now. Its `start-failed`
  and `turn-failed` variants have the workspaces of the two failed runs
  of `app/routines/runs/failed` that kept their workspaces: a first start
  that failed, with Try again in the bar, and a first turn that failed,
  with Try again in the chat. It draws the workspace screen with its `run`
  state, which no other workspace page sets. The base branch of a pull
  request run is the head branch of its pull request, so its bar names
  that branch, and Changes lists only the work of the run. The run of Run
  now keeps `main`.
