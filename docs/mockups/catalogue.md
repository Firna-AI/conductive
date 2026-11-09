# The catalogue

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

| Path                | What it shows                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `marketing`         | The home page of the site: the app, its features, and sign-up                 |
| `marketing/terms`   | The Terms of use, a draft for lawyer review, with suspension and abuse reports |
| `marketing/privacy` | The Privacy notice, a draft for lawyer review                                 |
| `marketing/not-found` | The page of the site for an address that it does not have                   |
| `marketing/pictures` | One capture page for each picture of the home page, without a frame         |
| `app`               | A ready workspace: two sessions and a file tab, and a pull request to merge   |
| `app/sign-in`       | The GitHub sign-in with the agreement to the Terms, the page before GitHub, the invitations that wait after it, Get started, the only first run, in three steps, and the page back from a GitHub App install in the Mac app |
| `app/shell`         | The workspace list, and the sandbox starting, stopped, with an error, and with a refused start |
| `app/sections`      | The menu of a section, and a workspace dragged to another section             |
| `app/command-palette` | The command palette over the list: the All tab, then the other tabs and a search |
| `app/orgs`          | The org switcher of a phone, Create org, the first org, new orgs, deleted, suspended |
| `app/account`       | General with the GitHub sign-in, the GitHub App, and the agent logins, then Preferences with the model and how New workspace opens |
| `app/operator`      | The operator's Overview, Orgs, and Users tabs, the page of an org and of a user with Suspend and Lift, and where an operator opens the section |
| `app/banner`        | The pull request bar and Checks: no pull request, then its other states       |
| `app/new-workspace` | An empty chat, its error, the dialog, the start, a queued second message, the first turn, a failed start, Try again |
| `app/org-settings`  | General with Delete org, then Repositories, Cloud computer, and Members       |
| `app/chat`          | A finished turn with its work folded, then running turns, open work, lost data, lost updates, and unread files |
| `app/mac-commands`  | A command that an agent runs on the Mac of the sender, in the chat            |
| `app/sessions`      | A new session, the history, closing one while it works, and a linked session  |
| `app/reassign`      | The owner of a workspace, its reassign menu, a member's view, a stopped turn  |
| `app/archive`       | Archive with its check for unpushed work, and the Archived group              |
| `app/composer`      | Attached files, the picker, another member's login, and a missing agent       |
| `app/files`         | All files, Changes with its summary, and a file, Markdown, and diff tab       |
| `app/tools`         | The terminal, a port preview, no preview, and the hidden Desktop, kept for its return |
| `app/panels`        | The right column, widened by the handle on its inner edge, and then hidden    |
| `mac-app`           | The Mac app: its window, its device commands, and This Mac                    |
| `user-flows`        | Sign up, create a workspace, create one in the dialog, reopen it, open one from the palette, create an org, run a Mac command |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `marketing`, `app`,
`app/sign-in`, `app/shell`, `app/command-palette`, `app/orgs`, `app/orgs/suspended`,
`app/account`, `app/new-workspace`, `app/org-settings`,
`app/org-settings/cloud-computer`, `app/operator`, `app/banner`, and `app/chat` do. `marketing/pictures` has no screen of its own. Each picture's capture
page is its own entry at `marketing/pictures/<picture>`, so each page shows
one screen. `app/org-settings/cloud-computer` and its building
and build-failed states moved from `app/repository-settings` and its updating
and update-failed states, and declare `movedFrom`. The states of `app/shell`,
`app/account`, `app/new-workspace`, and `app/org-settings/cloud-computer` moved
into their own folders and kept their paths, so that each of those pages shows
only its canonical screen. `app/sign-in/get-started`
moved into its own folder and kept its path. Get started is the only first
run, so the first run of `app/shell` and the not-connected state of
`app/orgs/new` are gone, and their links lead to Get started. Its second
step opens `app/orgs/new/first`, whose Create org and Cancel return to Get
started. The entries
of `app/orgs/new`, `app/orgs/empty`, and `app/orgs/deleted` moved into their
own folders and kept their paths, so `app/orgs` shows only its canonical
screen. `app/orgs/empty/another` moved from `app/orgs/empty/team` when the
paid plan went away, and declares `movedFrom`.

`app/account` shows the General tab of the account. Its tabs are links, as
the tabs of the org settings are. `app/account/preferences` shows the
Preferences tab, from decision 142: the New workspaces section with Model
and effort, and the choice of how New workspace opens on a computer, the
page or a dialog. Its `not-saved` variant shows a save that failed, which
keeps the saved choice. `app/account/setup`, `app/account/connect-claude`,
and `app/account/connect-codex` show General before the first connections,
and with the Connect form of each agent open.
`app/account/share-not-saved` shows General after a login share setting
failed to save, with its saved value and the cause beside the switch.

`app/new-workspace/dialog` draws New workspace as a dialog over the ready
workspace of `app`, for a user who chose the dialog. Its variants show a
draft with an attached file and the notice of a missing agent login, a
create request that failed, and an org without chosen repositories. A phone
always opens the page, so each phone view shows the New workspace page in
the same state. `user-flows/create-workspace-dialog` goes from Preferences
through the dialog to the new workspace.

`app/orgs/suspended` shows Acme after the operator suspended it, from
decision 129. Its notice is at the top of the list, and every workspace
shows stopped. Its child pages:

- `app/orgs/suspended/workspace` has a workspace with the refused bar of the
  org. Its `archived` variant has an archived workspace, with the notice of
  the org above the archived bar. Its `files` variant has the Files tab of a
  phone, whose panel shows the words of the org.
- `app/orgs/suspended/new-workspace` has the New workspace page, which an
  old tab can still open. The refused bar takes the place of the composer.
- `app/orgs/suspended/settings` has the four tabs, read-only also for an
  admin.
- `app/orgs/suspended/leave` has Leave org for a member who is not an
  admin, and its `confirm` variant has the question before the leave. Acme
  is the only org of that member, so Leave org opens
  `app/sign-in/get-started/no-org`: no org, and the agent still connected.
- `app/orgs/suspended/deleted` has a deleted org that is also suspended:
  the notice of the org above the page of the deleted org, with its date,
  and no Restore.

`app/operator` shows the Overview tab of the operator, the person who runs
the app for everyone, from decision 142. It holds live counts across every
org, as decision 144 chose for now. The Orgs and Users tabs come from
decision 147, and they find a suspended org or user. Its child pages:

- `app/operator/menu` has Operator in the rail, above the account, and in
  the org switcher of a phone, under Account. Only an operator sees it.
- `app/operator/orgs` has the Orgs tab: the newest orgs, a search by name,
  a search by preview address, and a search with no match.
- `app/operator/org` has the page of an org, with the names of its
  members, and Suspend org. Its child pages have the question before the
  suspension, the suspended org with Lift, the question before the lift,
  from decision 145, and a deleted org. The child page of the deleted org
  has its question before a suspension, the deleted org that is also
  suspended, and its question before a lift. They say that no admin can
  restore a suspended org, and that a lift leaves the org deleted.
- `app/operator/users` has the Users tab: the newest users, a search, and
  a search with no match.
- `app/operator/user` has the page of a user, with the name, and Suspend
  user. Its variants have the question before the suspension, the warning
  before the operator suspends their own account, the suspended user, and
  the question before the lift.
- `app/operator/error` has the numbers that could not load, with Try
  again. Its `loading` variant has the page while it reads the numbers.

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
two parts each fold their own work, and a turn whose open work holds a Mac
command card and a lost line at their place. The `fold` state opens the
folds. `app/chat/lost-data` draws the data that the chat does not
have, from decision 76: tool output and turn files that the runner left out,
and the lines of runner events that the workspace refused.
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
