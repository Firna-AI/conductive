# The catalogue: own computers

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives the pages of own computers: Linux servers that an
admin adds to an org, where each workspace runs in its own container.
[The design of own computers](design-own-computers.md) gives their parts.

Cal chose own computer decisions 1 to 8 on 22 November 2026, and
decisions 9 to 13 on 23 November 2026. Only admins add an own computer,
and each one serves the whole org (decision 2 A). New workspace and each
automation choose a computer, with the cloud computer as the default
(decision 3 A). The mockups draw Acme with four own computers: build-01
with room, build-02 full, lab-server offline, and build-03, which Cal adds
in the flow `user-flows/add-own-computer`. old-runner is an own computer
of Acme that an admin removed. Every other page of the catalogue draws
Acme without own computers, so its forms show no computer choice.

## The Own computers tab

`app/org-settings/own-computers` has the Own computers tab of Acme for
Cal, an admin: each computer with its size, its builds, its state, and its
workspaces of its limit, the note that links to the Cloud computer tab,
and Add computer. It has child pages, so it shows only its canonical
screen:

- `member` has the same rows as Priya, a member who is not an admin, sees
  them, without Add computer.
- `empty` has an org without own computers, and its `member` variant has
  the same tab for Priya.
- `waiting` has build-03 after Cal closed Add computer before its first
  connection, with Show command. Its `expired` variant has the code of
  build-03 expired, with New code.
- `add` has the name step of Add computer. Its `command` variant has the
  install command with its one-time code and the wait for the first
  connection, its `connected` variant has the first connection, and its
  `expired` variant has the code that expired while the dialog stayed open.
- `computer` has the page of build-01: its facts, its builds in the build
  card of the Cloud computer tab, its limit, and Remove computer. Its
  `full` variant has the page of build-02, its `offline` variant the page
  of lab-server with its notice, its `member` variant the page of build-01
  for Priya, and its `remove` variant the question before Remove computer.
- `build` has the first build of build-03 with its live log. Its `failed`
  variant has that build after it failed, with the saved message and Try
  again, its `rebuild-failed` variant a later build of build-01 that
  failed while its good build stays in use, and its `failed-member` variant
  the failed first build for Priya.

`app/org-settings/cloud-computer/own-computers` has the Cloud computer tab
of Acme with own computers: its intro says that own computers build the
same repositories, scripts, and env vars.
`app/orgs/suspended/settings/own-computers` has the own computers of the
suspended Acme, read-only, which run no workspace.

## New workspace and automations

`app/new-workspace/own-computer` has New workspace in Acme, with the
computer choice after the branch control, on Cloud computer. Its `menu`
variant has the open menu, its `picked` variant has build-01 with the note
that names it, its `offline` variant has lab-server with its notice, and
its `full` variant has build-02 with its notice. A phone opens the menu as
a sheet. `app/new-workspace/dialog/own-computer` has the same choice in the
header of the dialog, with its `menu`, `offline`, and `full` variants.

Cal chose option B of own computer decision 9 on 23 November 2026: a
start on a full own computer waits for a free place. It waits until the
20-minute limit of a start, as a start on an offline computer waits for
its connection. Then it fails with Try again, and its message says that the
computer is full. The `full` pages draw the notice before the send, and
`app/shell/own-computer/full` draws the wait and the failure.

`app/automations/automation/own-computer` has the automation that reviews
pull requests with its runs on build-01, for Cal, its owner. Its `menu`
variant has the open menu, its `member` variant the facts that Priya
reads, and its `computer-removed` variant the automation that turned off
after an admin removed old-runner, the own computer of its runs.

## The workspace and the operator

`app/shell/own-computer` has Saved carts, which starts on build-01: the
first step of the start names it. Its states moved into their own folders
and kept their paths, so the page shows only its canonical screen. Its
child pages:

- `menu` has the menu of the header state, whose first line says that
  the workspace runs on build-01.
- `went-offline` has Checkout address autocomplete after lab-server lost
  its connection while the workspace was open. After a grace time of 2
  minutes, the workspace shows stopped, and the saved message says that
  lab-server went offline (decision 10 B). Resume leads to `waiting`. Its
  `during-turn` variant has the same stop while the agent worked, so the
  chat says "The agent stopped".
- `waiting` has a resume that waits for lab-server, which is offline.
- `offline` has the start that failed at the 20-minute limit while
  lab-server stayed offline, with Try again.
- `full` has a resume that waits for a free place on build-02, which runs
  4 of its 4 workspaces (decision 9 B). Its `failed` variant has the start
  that failed at the 20-minute limit. Its saved message says that build-02
  is full and names the limit, with Try again.
- `removed` has the refused start of a workspace whose own computer an
  admin removed.

`app/archive/computer-removed` has Checkout address autocomplete after an
Archive, on old-runner. The app deletes no file on a removed computer. So
the bar says that the files stay on old-runner, and it gives no day of a
delete. Nothing offers Restore, because the app cannot reach those files.
Cal has not chosen yet whether such a workspace offers Restore, so these
pages draw the recommendation. Its `removed` variant has the same
workspace after its 14 days, with the bar "Removed on".
[Archive and Restore](catalogue-archive.md) gives the other pages of
`app/archive`.

`app/operator/org/own-computers` has the operator page of Hexwave with its
Own computers box: the number of its own computers and the count of each
state, without names.

## Flows

- `user-flows/add-own-computer` goes from the name step of Add computer,
  through the install command and the first connection, to the list where
  build-03 builds.
- `user-flows/create-workspace-on-own-computer` goes from New workspace on
  Cloud computer, through the menu and the pick of build-01, to the start
  of Saved carts on build-01.
