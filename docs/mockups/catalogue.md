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
| `app/sign-in`       | The GitHub sign-in with the agreement to the Terms, the page before GitHub, the invitations that wait after it, and Get started, the only first run, in three steps, with the first build of the new org |
| `app/shell`         | The workspace list, and the sandbox starting, stopped, with an error, and with a refused start |
| `app/sections`      | The menu of a section, and a workspace dragged to another section             |
| `app/command-palette` | The command palette over the list: the All tab, then the other tabs and a search |
| `app/orgs`          | The org switcher of a phone, Create org, the first org, new orgs, deleted, suspended |
| `app/account`       | The GitHub sign-in, the GitHub App, the agent logins, and the default model   |
| `app/banner`        | The pull request bar and Checks: no pull request, then its other states       |
| `app/new-workspace` | An empty chat, the first build of a new org, its errors, the start, a held second message, the first turn |
| `app/org-settings`  | General with Delete org, then Repositories, Cloud computer with the first build of a new org, and Members |
| `app/chat`          | A finished turn, then running turns, lost data, lost updates, and unread files |
| `app/mac-commands`  | A command that an agent runs on the Mac of the sender, in the chat            |
| `app/sessions`      | A new session, the history, closing one while it works, and a linked session  |
| `app/reassign`      | The owner of a workspace, its reassign menu, a member's view, a stopped turn  |
| `app/archive`       | Archive with its check for unpushed work, and the Archived group              |
| `app/composer`      | Attached files, the picker, another member's login, and a missing agent       |
| `app/files`         | All files, Changes with its summary, and a file, Markdown, and diff tab       |
| `app/tools`         | The terminal, a port preview, no preview, and the desktop                     |
| `app/panels`        | The right column, widened by the handle on its inner edge                     |
| `mac-app`           | The Mac app: its window, its device commands, and This Mac                    |
| `user-flows`        | Sign up, create a workspace, reopen it, open one from the palette, create an org, run a Mac command |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `marketing`, `app`,
`app/sign-in`, `app/sign-in/get-started`, `app/shell`, `app/command-palette`, `app/orgs`,
`app/orgs/suspended`, `app/new-workspace`, `app/org-settings`,
`app/org-settings/cloud-computer`, `app/banner`, and `app/chat` do. `marketing/pictures` has no screen of its own. Each picture's capture
page is its own entry at `marketing/pictures/<picture>`, so each page shows
one screen. `app/org-settings/cloud-computer` and its building
and build-failed states moved from `app/repository-settings` and its updating
and update-failed states, and declare `movedFrom`. The states of `app/shell`,
`app/new-workspace`, and `app/org-settings/cloud-computer` moved into their own
folders and kept their paths, so that each of those pages shows only its
canonical screen. `app/sign-in/get-started` moved into its own folder and
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

`app/command-palette` shows the All tab of the command palette over the
list of Acme. Its child pages:

- `app/command-palette/workspaces` has the Workspaces tab. Its
  `repository` variant has the menu of the repository filter, and its
  `archived` variant has the archived workspaces. Its `empty` variant has
  the Archived filter of `acme/marketing-site`, which holds no archived
  workspace, and the line that says where they show.
- `app/command-palette/actions` has the Actions tab over the list. Its
  `workspace` variant has the tab over an open workspace, whose actions
  come first.
- `app/command-palette/settings` has the Settings tab.
- `app/command-palette/search` has a search that finds a workspace and an
  archived one. Its `no-results` variant has a search without results.

`app/banner` shows a branch with commits and no pull request. Its child
pages show the other states of decision 18: `app/banner/checks` has the
running, failed, and passed checks and the merge, which moved from
`app/banner/checks-running`, `checks-failed`, `ready-to-merge`, and `merged`
and declare `movedFrom`. `app/banner/blocked` has a merge conflict, requested
changes, a draft, and a pull request closed without a merge. A conflict and
requested changes tint the bar amber. `app/banner/no-commits` has a branch
without commits, whose bar offers no Create pull request, as in
`app/new-workspace/creating` and `first-turn`.

`app/chat` shows a finished turn. Its child pages: `app/chat/turns` has the
running turn, steer, interrupt, and a failure, which moved from
`app/chat/running`, `steer`, `interrupted`, and `failed` and declare
`movedFrom`. `app/chat/lost-data` draws the data that the chat does not
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
