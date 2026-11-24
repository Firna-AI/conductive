# Chat and automations

This page belongs to [the catalogue](catalogue.md). It gives the child
pages of the chat and of automations.

`app/chat` shows a finished turn, whose work folds into one line. Its child
pages: `app/chat/turns` has the running turn, steer, interrupt, and a
failure, which moved from `app/chat/running`, `steer`, `interrupted`, and
`failed` and declare `movedFrom`. `app/chat/agent-stops` draws a turn that
the agent of another session stopped with a workspace tool, from decision
279. Its line says "Stopped from" and shows the session chip of that
session, for a session of the same workspace and, in `other-workspace`, of
another workspace. In `unknown-source`, the list of the org does not hold
the workspace of that session. So the line shows the whole session link
as text. The link breaks to fit the line.

`app/chat/wakes` draws the line that wakes a session when a turn that it
watched ends, from watch decisions 1 C and 6 B. Its canonical screen has
"A turn finished in" and the session chip of the watched session, then
the new turn, which reads that session. Its variants have a failed turn,
a stopped turn, a session of another workspace whose turn finished at the
time limit of background work, with that end reason after a dot, and a
wake that joins a turn that runs.
`app/chat/work` draws the work of ended
turns, from decisions 150 and 151: the open work of the finished turn with
one message open, a turn with a message that the user sent during it, whose
two parts each fold their own work, a turn whose open work holds a Mac
command card and a lost line at their place, and a turn whose open work
holds two messages with tables, one closed and one open. The `fold` state
opens the folds. `app/chat/tables` draws tables in replies: the resources
of the cloud computer, a short row whose last cell spans the missing
columns, a wide table that scrolls sideways inside the reply, cells with
line breaks, and the reply while the agent writes it, before its
separator row arrives and after its table appears. Its saved states
`short-row`, `wide`, `header`, and `rows` moved into their own folders and
kept their paths, so the page shows only its canonical screen. The new
child page `app/chat/tables/line-break` compares the two address providers
in a table whose cells hold two lines, where the agent wrote `<br>`,
`<br/>`, or `<br />`, from item 1 of the Markdown plan. Each cell stands
at the top of its row, from item 12 B of 18 November 2026. `app/chat/lists` draws a reply with a numbered
list of choices, each with its options in a list under its text, as the
user chose on 10 November 2026, and an open message line in the work of a
turn with a plan whose steps sit under each item. Its `tasks` variant draws
a reply with a task list, whose fixed check boxes take the place of the
bullets, from item 14 B of the Markdown plan of 18 November 2026. Its
`tasks-work` variant draws the work of the same turn: two closed message
lines with the boxes before the words of their tasks, and an open message
line with the boxes in the place of the bullets. `app/chat/headings`
draws headings in a reply, as the user chose on 11 November 2026: a review
with a title at level 1, the section Needs your answer at level 2, a
heading at level 3 for each choice with its bold fields under it, and a
heading at level 4 inside the first choice. Its `work` variant has the
open work of a turn: a closed message line that shows its heading as text
in the line, and an open message line that shows its heading on its own
line, in the weight of a heading.

`app/chat/formatting` draws the quotes, the rules, the emphasis, the
strikethrough, and the line breaks of a reply, from items 8 D and 5 A of
the Markdown plan, which the user chose on 17 November 2026, and item 1 of
16 November 2026. Its canonical screen has an answer that quotes the two
review comments of Priya, with a rule between them, a word in italics, an
option with a line through it, an address on two lines, and a bold label.
Its variants:

- `work` has the open work of a turn. Its closed message lines show a
  quote as its text, a rule as a middle dot, and a line break in a table
  cell as a space. Its open message line shows a quote and a rule as
  blocks, and a line break as a new line.
- `writing` has the same answer while the agent writes it: the bold label
  at its end has no closing `**` yet, and the open mark closes at the end
  of the text, so the label shows bold at once, from item 9 C of
  18 November 2026.
- `as-typed` has marks without a pair, which show as typed, and `<kbd>`
  tags, which show as text.
- `pictures` has a picture at a web address, which shows its alt text as
  a link, a picture at a path that no file has, which shows its alt text
  only, and the screenshot of the workspace, which shows as its picture
  and opens its file, as `app/file-mentions/answers` shows.

`app/chat/links` draws the links of chat text, as the user chose on 10
November 2026 with D of chat link decision 1, C of chat link decision 2,
and B of chat link decision 3. Its canonical screen has an answer with the
bare address of #482, a Markdown link in bold that shows as its label, and
an address alone in code, which is a link inside its code box. Its
variants:

- `label-address` has two Markdown links whose labels read as addresses,
  so each shows its real address in place of its label.
- `local-address` has the address of the dev server,
  `http://localhost:3000`. A press opens the port preview of port 3000 at
  `app/tools/preview`. The flow `user-flows/open-a-local-server` goes from
  this answer to that preview.
- `sent` has a message of Cal with a bare address and a Markdown link,
  which shows as typed.
- `work` has the open work of a turn: a closed message line that starts
  with a label link, and an open message line whose long address breaks to
  fit the line.

`app/chat/explain` draws Explain, which the user asked for on 17 November
2026 and changed on 20 November 2026. A member selects text in one
finished answer or member message and presses Explain. The app writes a
prompt with the context that the agent needs and sends it at once. The
prompt starts an explanation: a normal session whose first message names
the quote, the parent session with its link, the message ID, and the quote
with the lines around it. The quote keeps a mark in the parent chat. The
answer shows in a small popover by the mark, and a press on the mark shows
the popover again. The docs call the panel a popover, because "preview"
names port previews. The canonical screen has the popover after the
answer: below the mark on a computer, and a sheet at half height on a
phone. The tab of the explanation stands at the end of the row, and the
parent tab stays the shown tab. The `explainMarks`, `explainSession`, and
`explainOpen` states of the workspace screen draw the pages. Its child
pages:

- `app/chat/explain/select` has Explain above the middle of a selection in
  the answer. On a phone the selection menu of the phone stays above the
  selection, so the button stands above the composer. Its `message`
  variant has a selection in a member message, where the button lines up
  with the end of the selection.
- `app/chat/explain/popover` has the popover just after Explain, while the
  agent works with no answer yet. Its child pages:
  - `app/chat/explain/popover/run` has the answer as it comes in. Its
    `starting` variant has the popover while the cloud computer starts,
    with the written prompt in the queue. Its `follow-up` variant has a
    follow-up of Cal that runs. Its `waiting` variant has the request for a
    secret above the follow-up field.
  - `app/chat/explain/popover/failed` has a failed first turn with Try
    again. Its `stopped` variant has a turn that Cal stopped. Its
    `computer-stopped` variant has the popover of an answered explanation
    while the cloud computer is stopped: the bar of a stopped tab, with
    Resume, takes the place of the follow-up field, as it takes the place
    of the composer.
  - `app/chat/explain/popover/long` has a long answer, which scrolls inside
    the popover at its highest height, and in the sheet of a phone at half
    height. Its `full` variant has the sheet of a phone at full height.
  - `app/chat/explain/popover/resized` has the popover of the long answer
    after Cal made it larger with its handles, 560 px wide and 600 px
    high, with the focus on its height handle. The room below the mark
    caps the height in the frame of the catalogue. A phone shows the sheet
    at half height.
- `app/chat/explain/marks` has four marks with no popover open: one whose
  explanation waits for a member, one that runs, one that has its answer,
  and one that failed. Each open explanation has a tab at the end of the
  row. Its `running` variant has the mark of Cal after the popover closes.
  Its `overlap` variant has a mark inside another mark, with a deeper fill
  where they overlap. Its `menu` variant has the menu of both explanations,
  which is a sheet on a phone. Its `stale` variant has a mark whose text no
  longer matches, so the mark covers the whole answer.
- `app/chat/explain/closed` has the popover of an explanation whose tab is
  closed: its chat to read, and the notice that a follow-up or Expand
  reopens it.
- `app/chat/explain/tab` has the explanation in its tab after Expand, with
  the written prompt as its first message.
- `app/chat/explain/read-only` has an archived workspace: the marks stay,
  and a selection shows no Explain. Its `popover` variant has the popover
  to read, with no follow-up field.

The flow `user-flows/explain-chat-text` goes from the selection, through
the popover and the mark, to the tab of the explanation.

`app/chat/lost-data` draws the data that the
chat does not have, from decision 76: tool output and turn files that the
runner left out, and the lines of runner events that the workspace
refused. Its long turn shows 8 files, or 5 on a phone, then a
"Show N more" button. The count of the files that the runner left out
shows after that button opens the list.
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
`app/chat/endpoint-models` shows option G of decision 10 of the own
endpoint plan, which Cal chose on 10 November 2026: the pickers of the
owner of a login hide each model that its endpoint does not list. In a
session of Cal, the picker has All models open, with the models of the app
without Fable 5.1, because the model list of Cal's proxy does not name it.
The menu leaves out the favourite on Fable 5.1 too. Its `not-served`
variant has a stopped turn on Fable 5.1, which the session kept as its
model, and the notice names the model ID and no host. Its `member`
variant has the same notice as Priya sees it. Its `org` variant has the
open picker of Priya in a session on the org login of Acme, without Fable
5.1, because the model list of the gateway of Acme does not name it, from
decision 3 A of the org logins plan of 16 November 2026.

`app/chat/background-limit` draws a turn that waited for the background
work of its agent, a watch of the checks of pull request #482. The checks
still ran at the time limit, so the turn ends as finished, with
"Background work stopped at the time limit" above its duration and its
files. Its `waiting` variant draws the same turn before the limit, which
shows as any running turn.

`app/chat/standard-speed` draws a fast turn that ran at standard speed,
from fast mode decision 257. Fast is on in the trigger. Claude reached its
fast limit, so the end line shows the duration, then "Standard speed · Fast
limit reached", with the files of the turn under that note. Its
`older-software` variant has a cloud computer with older software, which
ignores fast mode, so the note says "Standard speed · Older cloud computer
software". Its `stopped` variant has a stopped turn, whose line ends with
the same words after a dot. A fast turn at fast speed ends as any turn
does, as `app/fast-mode/trigger` shows.

`app/chat/menu-placement` draws menus that show whole over a box that
scrolls. Its canonical screen has the model menu, with the favourites
first, over the requests that wait above the composer. Its `history` variant has the session history
beside a full tab row. Its `allow` variant has More ways to allow of the
first of four requests in the Mac app. The app opens these menus in the
top layer, so no box cuts them.

`app/automations` lists the automations of Acme, which the Automations link below
New workspace opens. Its child pages:

- `app/automations/empty` has an org without automations.
- `app/automations/automation` has the owner's view of a saved automation,
  with the Capabilities icon in the bar of its prompt box. Under the box, a
  line names the secrets that its runs can use with no question, and the
  hint of its pull request triggers follows. Its child pages: `new` has a
  new automation, whose `org-login` variant has a
  new automation of Priya whose runs use the org login of Acme, from decision
  5 A of the org logins plan, and whose `org-models` variant has its open
  model picker without the favourite on Fable 5.1, from decision 3 A. `member` has
  the view of a member, with the secrets of the runs read-only and the pull
  request hint, whose `org-login` variant has the runs of Cal on the org
  login of Acme: "Runs use Acme's Claude login and Cal's GitHub access.",
  `admin` the view of an admin with Turn off and Delete and the secret of
  the runs of Priya read-only, `owner-left` an
  automation that moved, turned off, to Cal, the admin who got the
  workspaces of a member who left, `turned-off` an automation that turned
  off after three runs in a row failed, and `delete` the question that
  Delete asks first, because a deleted automation cannot come back. The first
  four were saved states of the page. They moved into their own folders
  and kept their paths, so the page shows only its canonical screen.
  `capabilities` has the Capabilities control of the owner open, with two
  secrets checked for each run workspace and the pull request hint, from
  automation capabilities decisions 1 A to 3 A. A phone opens the control
  as a sheet.
  `unavailable` has the page of an automation that the org no longer has,
  because it was deleted or the address is wrong, with Open Automations.
  `not-loaded` has the page after the read of the automation failed, with
  the load failure of the other lists of the app and Try again. The
  `read` state of the automation screen draws both. `repository-removed` has
  an automation that turned off when an admin removed its repository from the
  chosen repositories of Acme. While Acme does not choose that repository,
  the notice names it, for Cal and, in the `member` variant, for Priya.
  The `chosen-again` and `chosen-again-member` variants have the automation
  after an admin chose the repository again: it stays off until Cal turns
  it on, and the notice names no repository, because the page cannot tell
  that repository from another one that Cal saved.
- `app/automations/triggers` has the open Add trigger menu. Its child page
  `app/automations/triggers/schedules` has the Hourly, Daily, and Weekly
  editors with the time zone, and a custom cron that the form refuses.
  Its child page `app/automations/triggers/author-filter` has the author
  filter of a pull request trigger: Author is with the entry Members of
  Acme and a bot, the suggestions that offer that entry, and a login that
  the save refused.
- `app/automations/runs` has the newest 50 runs, in each state of their
  workspaces, with Show older runs at the end. Its variants have a failed
  run for each cause, skipped runs, and, as `saved` and `run-now`, the
  automation of the flow before and after Run now. In `failed`, a run that a
  check failed has no workspace, and a run whose first start or first
  turn failed opens its workspace. A phone shows a saved automation in two
  tabs, Automation and Runs. These pages open on the Runs tab, except
  `saved`.
- `app/automations/run-workspace` has the workspace of a pull request run,
  its start, and the workspace of a run of Run now. Its `start-failed`
  and `turn-failed` variants have the workspaces of the two failed runs
  of `app/automations/runs/failed` that kept their workspaces: a first start
  that failed, with Try again in the bar, and a first turn that failed,
  with Try again in the chat. It draws the workspace screen with its `run`
  state, which no other workspace page sets. The base branch of a pull
  request run is the head branch of its pull request, so its bar names
  that branch, and Changes lists only the work of the run. The run of Run
  now keeps `main`.
