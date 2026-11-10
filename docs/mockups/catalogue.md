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
| `app/tools`         | The terminal, then the Preview tool with its detected servers and its failed list repair, and the hidden Desktop, kept for its return |
| `app/panels`        | The right column, widened by the handle on its inner edge, and then hidden    |
| `mac-app`           | The Mac app: its window, the waitlist, its device commands, and This Mac      |
| `user-flows`        | Sign up, join with an invite link, create a workspace, create one in the dialog, reopen it, open one from the palette, archive one from its row, create an org, run a Mac command, link a workspace, mention a file |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `marketing`, `marketing/docs`, `app`,
`app/sign-in`, `app/sign-in/get-started`, `app/sign-in/waitlist`, `app/sign-in/join`, `app/shell`, `app/workspace-menu`, `app/command-palette`, `app/orgs`,
`app/orgs/suspended`, `app/account`, `app/new-workspace`,
`app/new-workspace/dialog`, `app/org-settings`,
`app/org-settings/cloud-computer`, `app/operator`, `app/operator/user`, `app/operator/codes`, `app/banner`, `app/chat`, `app/workspace-links`, `app/file-mentions`, and `app/tools` do. `marketing/pictures` has no screen of its own. Each picture's capture
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
value of the `lostUpdate` state draws it. The only other notice for a lost
update is the one of the list of servers, under the port form of the
Preview tool, as `app/tools/preview-repair` shows.
`app/chat/unavailable-files` draws the files that the cloud computer
could not read: a finished turn and a stopped turn
without their changed files, All files with its saved list under a notice,
and a new workspace with no list. The `tree` state draws the two states of
All files.

[Workspace links, file mentions, and tools](catalogue-workspace-tools.md)
gives those catalogue pages and their related flows.
