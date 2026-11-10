# The catalogue

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

| Path                | What it shows                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `marketing`         | The home page of the site: the app, its features, the Mac app downloads, and Sign up |
| `marketing/docs`    | The overview of the public docs, then a guide, with its Docs menu or its contents open on a phone |
| `marketing/terms`   | The Terms of use, with the operator details, suspension, and abuse reports     |
| `marketing/privacy` | The Privacy notice, with the operator details and legal contact address       |
| `marketing/not-found` | The page of the site for an address that it does not have                   |
| `marketing/from-conductor` | The page for people who move from Conductor Cloud: one table of Conductor Cloud features, with a merged cell for each area |
| `marketing/pictures` | One capture page for each picture of the home page, without a frame         |
| `app`               | A ready workspace: two sessions and a file tab, and a pull request to merge   |
| `app/sign-in`       | GitHub sign-in with the agreement to the Terms, the page before GitHub, the waitlist, the sign-in of an invite link, and the invitations that wait after it. Get started, the only first run, in three steps, with the first build of the new org. The return page after a GitHub App install in the Mac app. |
| `app/shell`         | The workspace list, and the sandbox starting, stopped, with an error, and with a refused start |
| `app/sections`      | The menu of a section, and a workspace dragged to another section             |
| `app/workspace-menu` | The menu of a workspace row from a right click: its section and owner choices, Rename, Archive from the list, and the menus of each role |
| `app/command-palette` | The command palette over the list: the All tab, then the other tabs, a search, and a search by number |
| `app/orgs`          | The org switcher of a phone, Create org, the first org, new orgs, deleted, suspended |
| `app/account`       | General with the GitHub sign-in, the GitHub App, the agent logins, and the invite code, then Preferences with the model and how New workspace opens |
| `app/operator`      | The operator's Overview, Orgs, Users, Waitlist, and Invite codes tabs, the page of an org and of a user with Suspend, Lift, and Approve, the pause of sign-ups, and where an operator opens the section |
| `app/banner`        | The pull request bar and Checks: no pull request, then its other states       |
| `app/new-workspace` | An empty chat, the first build of a new org, its error, files on the first message, the dialog, a pasted workspace link, the start, a queued second message, the first turn, a failed start, Try again |
| `app/routines` | The routines of the org, a routine, its triggers, its runs, and a run workspace |
| `app/org-settings`  | General with Delete org, then Repositories, Cloud computer with the first build of a new org, and Members |
| `app/chat`          | A finished turn with its work folded, then running turns, open work, tables in replies, lost data, lost updates, and unread files |
| `app/mac-commands`  | A command that an agent runs on the Mac of the sender, in the chat            |
| `app/sessions`      | A new session, the history, closing one while it works, and a linked session  |
| `app/reassign`      | The owner of a workspace, its reassign menu, a member's view, a stopped turn  |
| `app/archive`       | Archive with its check for unpushed work, and the Archived group              |
| `app/composer`      | Attached files, the picker, another member's login, and a missing agent       |
| `app/attachments`   | A file that uploads, a failed upload, a file over 25 MB, sent files, and a first message with files |
| `app/workspace-links` | Chips in a message and an answer, then Copy link and its failure, a pasted link, and a link of another org |
| `app/file-mentions` | The list of `@` with a query, then the list without one, its other states, and the file chips of the composer and of a sent message |
| `app/files`         | All files, Changes with its summary, and a file, Markdown, and diff tab       |
| `app/tabs`          | A dragged tab, the moved row, a full row, the tab menu, and the rename field  |
| `app/tools`         | The terminal, a port preview, no preview, and the hidden Desktop, kept for its return |
| `app/panels`        | The right column, widened by the handle on its inner edge, and then hidden    |
| `mac-app`           | The Mac app: its window, the waitlist, its device commands, and This Mac      |
| `user-flows`        | Sign up, join with an invite link, create a workspace, create one in the dialog, reopen it, open one from the palette, archive one from its row, create an org, run a Mac command, link a workspace, create a routine, mention a file |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `marketing`, `marketing/docs`, `app`,
`app/sign-in`, `app/sign-in/get-started`, `app/sign-in/waitlist`, `app/sign-in/join`, `app/shell`, `app/workspace-menu`, `app/command-palette`, `app/orgs`,
`app/orgs/suspended`, `app/account`, `app/new-workspace`,
`app/new-workspace/dialog`, `app/org-settings`,
`app/org-settings/cloud-computer`, `app/operator`, `app/operator/user`, `app/operator/codes`, `app/banner`, `app/chat`, `app/workspace-links`, `app/routines`, `app/routines/routine`,
`app/routines/triggers`, `app/orgs/suspended/routines`, and `app/file-mentions` do. `marketing/pictures` has no screen of its own. Each picture's capture
page is its own entry at `marketing/pictures/<picture>`, so each page shows
one screen. `marketing/from-conductor` has no screen of its own either. Its
index document, `index.md`, gives the notes of the page and where its
content comes from, and links to `marketing/from-conductor/one-table`,
which links back to it. `app/org-settings/cloud-computer` and its building
and build-failed states moved from `app/repository-settings` and its updating
and update-failed states, and declare `movedFrom`. The states of `app/shell`,
`app/account`, `app/sign-in/waitlist`, `app/new-workspace`,
`app/new-workspace/dialog`, and `app/org-settings/cloud-computer` moved
into their own folders and kept their paths, so that each of those pages
shows only its canonical screen. `app/sign-in/get-started` moved into its own folder and
kept its path. Its saved states `installed`, `org-created`, `connected`,
and `no-org` moved into their own folders and kept their paths, so that
the page shows only its canonical screen. Get started is the only first
run, so the first run of `app/shell` and the not-connected state of
`app/orgs/new` are gone, and their links lead to Get started. Its second
step opens `app/orgs/new/first`, whose Create org and Cancel return to Get
started. The entries
of `app/orgs/new`, `app/orgs/empty`, and `app/orgs/deleted` moved into their
own folders and kept their paths, so `app/orgs` shows only its canonical
screen. `app/orgs/empty/another` moved from `app/orgs/empty/team` when the
paid plan went away, and declares `movedFrom`.

`marketing/docs` shows the overview of the public docs, at `/docs`. Its
child page `marketing/docs/get-started` shows the Get started guide, with
each part of a guide: lists, two guide actions, a table, and code. Its
`menu` variant has the Docs menu of a phone open, and its `contents`
variant has "On this page" open. A desktop always shows the guides and
the contents, so its view of each variant is the guide.
[The docs](marketing-site.md#the-docs) gives the layout and its parts.

The first build of a new org shows in three places, from decision 150.
Create org starts it, and Create org needs at least one repository, from
decision 151. The mockups draw it for Firna, the first org of the sign-up:

- `app/orgs/new` draws the rule on Create org. The hint under Repositories
  says to add at least one, in each state. Its `no-repository` variant has
  the first org with a name and no repository chosen, and Create org is
  off. Its `no-access` variant has a GitHub App that reaches no
  repository: the list asks for access with Manage access, and Create org
  is off.
- Get started shows it in the org step. `app/sign-in/get-started/org-created`
  has the build that runs, with its time, while the person connects an
  agent. `preparing` has every step done while the build runs: Open Firna
  stays on, and the finish says that the cloud computer is still being
  prepared. `connected` has the good build, and the finish says that Firna
  is ready. `build-failed` has the saved message of a failed build, with
  Try again and a link to its log, and the finish does not say ready.
  `no-build` has an org with repositories and no build, such as after a
  first build that did not start, with Build computer.
- `app/new-workspace/first-build` has a notice over the composer with the
  time of the build, and Send is off. The notice shows only while the org
  has no good image. Its `ready` variant has the good build, without a
  notice. `failed` and `no-build` link an admin to the Cloud computer tab,
  and `member` shows a failed build to a member, without the link.
- `app/org-settings/cloud-computer/first-build` has the Cloud computer tab
  of Firna: the first build with its log, then its `failed` and `no-build`
  variants. A new org has empty scripts and no env vars, and its history
  shows once a build has ended. Its `script-changed` variant has an install
  script that Cal saved during the first build. One more build runs it
  when the first build succeeds, so its notice has no Build computer.

`app/account` shows the General tab of the account. Its tabs are links, as
the tabs of the org settings are. `app/account/preferences` shows the
Preferences tab, from decision 142 of PR #73: the New workspaces section
with Model and effort, and the choice of how New workspace opens on a
computer, the page or a dialog. Its `not-saved` variant shows a save that failed, which
keeps the saved choice. `app/account/setup`, `app/account/connect-claude`,
and `app/account/connect-codex` show General before the first connections,
and with the Connect form of each agent open.
`app/account/share-not-saved` shows General after a login share setting
failed to save, with its saved value and the cause beside the switch.

`app/new-workspace/dialog` draws New workspace as a dialog over the ready
workspace of `app`, for a user who chose the dialog. Its states are child
pages. `first-build` shows Firna before its first good build, with the
notice and Create off. The other child pages show files that upload, a
draft with uploaded files and the notice of a missing agent login, a
create request that failed, an org without chosen repositories, and a
pasted workspace link as a chip. The dialog uses the file chips of
`app/new-workspace/files`. A phone always opens the page, so each phone
view shows the New workspace page in the same state.
`user-flows/create-workspace-dialog` goes from Preferences through the
dialog to the new workspace.

[The waitlist, suspensions, and the operator](catalogue-operator.md)
gives the pages of the waitlist and the child pages of
`app/orgs/suspended`. It also gives the operator section, `app/operator`,
with its child pages.

`app/workspace-menu` shows the menu of Apple Pay button, a row of the list
of Acme, at the pointer of a right click: Move to section, Reassign to,
Rename, and Archive. Shift+F10 and the Menu key open it too, and a phone
layout opens it as a sheet. No row has a button for the menu. The user
chose these four actions on 9 November 2026. Its child pages:

- `app/workspace-menu/move` has the sections beside the menu, with the
  current one checked. Its `general-only` variant has Acme with General
  only, whose menu has no Move to section.
- `app/workspace-menu/reassign` has the members beside the menu, with the
  owner checked. Its `archived` variant has the archived row of an admin,
  whose menu has only Reassign to.
- `app/workspace-menu/rename` has the field of Rename in the row, with the
  name selected. Its `failed` variant keeps the draft in the field, under
  the toast of the list that names the failure.
- `app/workspace-menu/archive` has the question of Archive over the list,
  which `app/archive` also asks. Its `check-failed` variant has
  a check that a stopped cloud computer refused, and its `archived`
  variant has the list after the archive.
  `user-flows/archive-from-list` goes from the list through the menu and
  the question to that list.
- `app/workspace-menu/roles` has the menu of a member who is not an
  admin, then her own workspace, her archived row without a menu, and a
  suspended org, whose rows have no menu.

`app/command-palette` shows the All tab of the command palette over the
list of Acme. Its child pages:

- `app/command-palette/workspaces` has the Workspaces tab. Its
  `repository` variant has the menu of the repository filter, and its
  `archived` variant has the archived workspaces. Its `empty` variant has
  the Archived filter of `acme/marketing-site`, which holds no archived
  workspace, and the line that says where they show. Its `unavailable`
  variant has a workspace list that did not load: the notice with Try
  again fills the tab.
- `app/command-palette/actions` has the Actions tab over the list. Its
  `workspace` variant has the tab over an open workspace, whose actions
  come first.
- `app/command-palette/settings` has the Settings tab.
- `app/command-palette/search` has a search that finds a workspace and an
  archived one. Its `no-results` variant has a search without results.
  Its `loading`, `unavailable`, and `repositories-unavailable` variants
  have a search for "new" while the repository names load, after the
  workspace list did not load, and after the repository names did not
  load. A spinner, or a notice with Try again, stands first in place of
  the workspace groups, and the actions and the setting that match follow.
  With an empty field, the All tab needs only the list. While the list
  loads, or after it did not load, the status part stands before Actions,
  in place of Recent workspaces.
- `app/command-palette/number-search` has a search that finds a workspace
  by its label, `W-395`, from decision 212. Its `number-part` variant
  finds each workspace whose label holds `39`, with the label before the
  name in each row.

In `search/unavailable` and `workspaces/unavailable`, the list behind the
palette on desktop shows the same failure, because it reads the same
workspace list.

`app/banner` shows a branch with commits and no pull request. Its child
pages show the other states of decision 18: `app/banner/checks` has the
running, failed, and passed checks and the merge, which moved from
`app/banner/checks-running`, `checks-failed`, `ready-to-merge`, and `merged`
and declare `movedFrom`. `app/banner/blocked` has a merge conflict, requested
changes, a draft, and a pull request closed without a merge. A conflict and
requested changes tint the bar amber. `app/banner/no-commits` has a branch
without commits, whose bar offers no Create pull request, as in
`app/new-workspace/creating` and `first-turn`.

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
after its table appears. `app/chat/lost-data` draws the data that the
chat does not have, from decision 76: tool output and turn files that the
runner left out, and the lines of runner events that the workspace
refused.
`app/chat/lost-updates` draws a failed repair, from decision 96. After a
refused update that belongs to no session, such as a file update, the
workspace asks for a fresh full report, and nothing shows. Only when that
report is lost too does a notice name the data that stays unavailable,
beside that data: under the file lists for a file list, and under the
header for other data, such as the workspace name. The `failed-repair`
value of the `lostUpdate` state draws it, and no other screen shows a
notice for a lost update. `app/chat/unavailable-files` draws the files that
the cloud computer could not read: a finished turn and a stopped turn
without their changed files, All files with its saved list under a notice,
and a new workspace with no list. The `tree` state draws the two states of
All files.

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
`app/workspace-links` draws the workspace numbers and the chips of
decisions 211 and 212. Its canonical screen has a message and an answer
with chips in Checkout address autocomplete, `W-395`. Its child pages:

- `app/workspace-links/copy-link` has the header of Saved carts, `W-402`,
  just after a press on the label, with the note "Link copied". Its
  `failed` variant has a copy that failed, with the note "The link didn't
  copy. Try again." in the danger colour.
- `app/workspace-links/messages` has a pasted link as a chip in the
  message box. Its `sent` variant has the sent message while the agent
  works, and its `other-org` variant has a link of another org as plain
  text.

The message box of New workspace shows a pasted link as a chip in
`app/new-workspace/workspace-link`, a child page of `app/new-workspace`,
and in the `workspace-link` child page of `app/new-workspace/dialog`.
The flow `user-flows/link-a-workspace` goes from the copy to the answer,
and ends with a press on the chip, which opens
`app/new-workspace/first-turn`.

`app/file-mentions` draws the list of `@` and the file chips of decisions
213 to 217. Its canonical screen has the query `@addr` in Checkout address
autocomplete, with the best matches above the message box. Its child
pages:

- `app/file-mentions/list` has the list without a query, folders first.
  Its `no-match` variant says "Nothing matches “zipcode”", its `loading`
  variant says "Loading files…", and its `unavailable` variant says that
  the list of all files is unavailable.
- `app/file-mentions/chips` has a file chip and a folder chip in the
  message box. Its `pointer` variant has the pointer over the icon of the
  file chip, where a × takes the place of the icon. Its `sent` variant has
  the sent message with both chips. Its `workspace-chip` and
  `attached-file` variants show the same × on a pasted workspace link and
  on an attached file.

On a phone each chip of the composer keeps its icon and ends with a ×.
The flow `user-flows/mention-a-file` goes from the query to the sent
message, and ends with a press on the file chip, which opens
`app/files/code`.
