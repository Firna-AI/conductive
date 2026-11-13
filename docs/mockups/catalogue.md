# The catalogue

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

| Path                | What it shows                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `marketing`         | The home page of the site: the app, its features, the Mac app downloads, and Sign up |
| `marketing/docs`    | The overview of the public docs, then a guide, with its Docs menu or its contents open on a phone |
| `marketing/pricing` | The pricing page: four plans with their prices and cloud hours, the tax line, and how cloud hours count |
| `marketing/terms`   | The Terms of use, with the operator details, suspension, and abuse reports     |
| `marketing/privacy` | The Privacy notice, with the operator details and legal contact address       |
| `marketing/not-found` | The page of the site for an address that it does not have                   |
| `marketing/from-conductor` | The page for people who move from Conductor, with no scope note: one table of Conductor features, local and cloud, with a merged cell for each area |
| `marketing/pictures` | One capture page for each picture of the home page, without a frame         |
| `app`               | A ready workspace: two sessions and a file tab, and a pull request to merge   |
| `app/sign-in`       | GitHub sign-in with the agreement to the Terms, the page before GitHub, the waitlist, the sign-in of an invite link, and the invitations that wait after it. Get started, the only first run, in three steps, with the first build of the new org. The return page after a GitHub App install in the Mac app. |
| `app/shell`         | The workspace list, and the sandbox starting, also with a diff tab open, stopped, with an error, and with a refused start |
| `app/sections`      | The menu of a section, and a workspace dragged to another section             |
| `app/workspace-menu` | The menu of a workspace row from a right click: its section and owner choices, Rename, Copy link, Archive from the list with its toast and Restore, and the menus of each role |
| `app/command-palette` | The command palette over the list, with the keys of a browser tab: the All tab, then the other tabs with the Help group, searches and their states, and a search by number |
| `app/feedback`      | The Feedback dialog that Send feedback opens over the list, then its states, the toast after a send, and the files that it does not add |
| `app/orgs`          | The org switcher of a phone, Create org, the first org, new orgs, deleted, suspended, and the order of the orgs |
| `app/account`       | General with the GitHub sign-in, the GitHub App, the agent logins with own endpoints, and the invite code, then Preferences with the model and how New workspace opens, Keyboard shortcuts in a browser, the first run, the Connect forms with the ChatGPT sign-in of Codex, Codex on a ChatGPT plan and its sign-in that stopped working, and a share not saved |
| `app/operator`      | The operator's Overview, Orgs, Users, Waitlist, and Invite codes tabs, the page of an org and of a user with Suspend, Lift, and Approve, the pause of sign-ups, the waitlist switch, and where an operator opens the section |
| `app/banner`        | The pull request bar and Checks: no pull request, its other states, Merge, local work, the agent actions in the chat, and Continue |
| `app/new-workspace` | An empty chat, the first build of a new org, a repository that waits for its build, its error, files on the first message, the dialog, a pasted workspace link, the start, a queued second message, the first turn, a failed start, Try again |
| `app/routines` | The routines of the org, a routine, its triggers, its runs, and a run workspace |
| `app/org-settings`  | General with Delete org, then Repositories and Cloud computer with the notice of a repository change, the first build of a new org, and Members |
| `app/chat`          | A finished turn with its work folded, then running turns, turns that an agent stopped, open work, tables in replies, lists in replies, headings in replies, lost data, lost updates, unread files, and the time limit of background work |
| `app/mac-commands`  | A command that an agent runs on the Mac of the sender, in the chat            |
| `app/sessions`      | A new session, the history, closing one while it works, and a linked session  |
| `app/reassign`      | The owner of a workspace, its reassign menu, a member's view, a stopped turn  |
| `app/archive`       | An archived workspace with Restore, the toast after Archive, the Archived group, the restored workspace, the end of Restore, and the bar after the delete |
| `app/composer`      | Two uploaded files in a sentence, the picker, another member's login, and a missing agent |
| `app/attachments`   | A file that uploads in the text, then a drop, a failed upload, a file over 100 MB, sent files, the file tab of a sent screenshot, and a first message with files |
| `app/workspace-links` | Chips in a message and an answer, then Copy link and its failure, a pasted link, a link of another org, session chips, and messages that an agent sent |
| `app/file-mentions` | The list of `@` with a query, then the list without one, its other states, and the file chips of the composer and of a sent message |
| `app/files`         | All files, Changes with its summary, and a file, Markdown, diff, and image tab |
| `app/tabs`          | A dragged tab, the moved row, a full row, the tab menu, and the rename field  |
| `app/transcripts`   | Copy a transcript from the tab menu: the toast after a copy, a failed copy, and the menu of an archived workspace |
| `app/tools`         | The terminal tabs and their states, then the Preview tool with its detected servers and its failed list repair, and the hidden Desktop, kept for its return |
| `app/panels`        | The right column, widened by the handle on its inner edge, and then hidden    |
| `mac-app`           | The Mac app: its window, the waitlist, its device commands, This Mac, Keyboard shortcuts, and the palette with keys |
| `user-flows`        | Sign up, sign up during open sign-up, join with an invite link, create a workspace, create one in the dialog, reopen it, open one from the palette, send feedback, archive one from its row, create an org, run a Mac command, create a routine, link a workspace, open a session link, merge and continue, mention a file, drop a file |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `marketing`, `marketing/docs`, `app`,
`app/sign-in`, `app/sign-in/get-started`, `app/sign-in/waitlist`, `app/sign-in/join`, `app/shell`, `app/workspace-menu`, `app/command-palette`, `app/command-palette/search`, `app/feedback`, `app/orgs`,
`app/orgs/suspended`, `app/account`, `app/account/connect-codex`, `app/new-workspace`,
`app/new-workspace/dialog`, `app/org-settings`,
`app/org-settings/cloud-computer`, `app/operator`, `app/operator/user`, `app/operator/user/access`, `app/operator/codes`, `app/banner`, `app/chat`, `app/archive`, `app/workspace-links`, `app/routines`, `app/routines/routine`,
`app/routines/triggers`, `app/orgs/suspended/routines`, `app/file-mentions`, `app/attachments`, `app/files`, `app/tools`, `app/account/shortcuts`, and `mac-app/shortcuts` do. `marketing/pictures` has no screen of its own. Each picture's capture
page is its own entry at `marketing/pictures/<picture>`, so each page shows
one screen. `marketing/from-conductor` has no screen of its own either. Its
index document, `index.md`, gives the notes of the page and where its
content comes from, and links to `marketing/from-conductor/one-table`,
which links back to it. `app/org-settings/cloud-computer` and its building
and build-failed states moved from `app/repository-settings` and its updating
and update-failed states, and declare `movedFrom`. The states of `app/shell`,
`app/account`, `app/sign-in/waitlist`, `app/new-workspace`,
`app/new-workspace/dialog`, `app/org-settings/cloud-computer`,
`app/operator/user/access`, `app/archive`, `app/command-palette/search`, `app/attachments`, and
`app/files` moved into their own folders and kept their paths. Each page
shows only its canonical screen. `app/sign-in/get-started` moved into its
own folder and
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
  notice. The running build, `failed`, and `no-build` link an admin to the
  Cloud computer tab, and `member` shows a failed build to a member,
  without the link.
- `app/org-settings/cloud-computer/first-build` has the Cloud computer tab
  of Firna: the first build with its log, then its `failed` and `no-build`
  variants. A new org has empty scripts and no env vars, and its history
  shows once a build has ended. Its `script-changed` variant has an install
  script that Cal saved during the first build. One more build runs it
  when the first build succeeds, so its notice has no Build computer.

Repositories that wait for a build come from decisions 240 and 241 of
10 November 2026. A waiting repository is a chosen repository that the
cloud computer of the org does not hold yet. An added repository starts a
build, and a removed one leaves at the next build. The mockups draw it for
Acme, which adds acme/admin-dashboard and removes acme/marketing-site:

- `app/new-workspace/waiting-repository` has the open repository menu.
  acme/admin-dashboard keeps its place, off, with a note that says when it
  is ready, and the form holds the first ready repository. Its
  `kept-draft` variant has a kept draft in acme/admin-dashboard, with a
  notice over the composer and Cloud computer settings for an admin, and
  Send is off. Its `none-ready` variant has
  no chosen repository ready after a failed build, with Cloud computer
  settings for an admin, and its `member` variant has the same notice
  without the link. The dialog shows the same repository menu and the
  same notices, as the `repositories`, `repositoryMenu`, and
  `waitingBuild` controls of `app/new-workspace/dialog` show, so the
  dialog page gets no more variants.
- `app/org-settings/repositories` has the repository notice in each
  state: `building` while the build of an add runs, `build-failed` with
  Try again, and `removed` with Build computer. Its `member` variant has
  the notice of a failed build without a button. The notice names the
  repositories, so the rows of the list stay as they are.
- `app/org-settings/cloud-computer/repositories-changed` has the same
  notice under the intro while the build of an add runs. On this tab the
  notice has no button, also for an admin, because the build card under
  it has the same action. Its `build-failed` and `no-build` variants have
  the notice above the Try again and the Build computer of the card. Its
  `with-script` variant has a removal and a changed install script, each
  with its own notice, and the notice of the install script keeps its
  Build computer. `app/org-settings/cloud-computer/member/repositories-changed`
  has the notice of a member. `app/org-settings/cloud-computer/script-changed`
  keeps the notice of the install script, which shows only for a change
  of the install script.

`app/account` shows the General tab of the account, with Claude connected
by a subscription token and Codex by an API key. Its three tabs are links, as
the tabs of the org settings are. Its child pages:

- `app/account/preferences` shows the Preferences tab, from decision 142
  of PR #73: the New workspaces section with Model and effort, and the
  choice of how New workspace opens on a computer, the page or a dialog.
  Its `not-saved` variant shows a save that failed, which keeps the saved
  choice.
- `app/account/setup` shows General at the first run, with nothing
  connected.
- `app/account/connect-claude` has the Connect form of Claude, whose
  switch starts on Subscription token. Its `api-key` variant has that form
  with API key selected.
- `app/account/connect-codex` has the Connect form of Codex, whose switch
  starts on API key. Its child page `app/account/connect-codex/chatgpt` has
  that form with ChatGPT plan selected, before the sign-in starts, with the
  link to the ChatGPT settings and Get a code. Its `code` variant shows the
  one-time code while the page waits for the sign-in. Its `expired` variant
  has a code that expired, with Get a new code. Its `refused` variant has a
  first request for a code that OpenAI refused, with the link and Get a
  code.
- `app/account/codex-token` has Codex connected by a sign-in to a ChatGPT
  plan, whose share switch starts off.
  Its `not-usable` variant has a sign-in that OpenAI did not renew: the row
  says Signed out, with the cause and Sign in again. Its `sign-in-again`
  variant has the ChatGPT sign-in form that Sign in again opens under that
  row, which keeps Remove and the share switch. Its `sign-in-again-code`
  variant has the code in that form.
- `app/account/share-not-saved` shows General after a login share setting
  failed to save, with its saved value and the cause beside the switch.
- `app/account/invites` has the invite code while sign-ups are paused.
  [The waitlist, suspensions, and the operator](catalogue-operator.md)
  gives its variants.
- `app/account/deleted-orgs` has the Deleted orgs section at the end of
  General, with Acme Labs and Restore. Its `suspended` variant
  has the org after a suspension, without Restore. Its `failed` variant
  has a Restore that failed, with the error under the row.
- `app/account/shortcuts` shows the Keyboard shortcuts tab in a browser, as
  the keyboard shortcuts section below gives.

`app/account/own-endpoint` shows the form of Claude on the own endpoint
kind, while Codex runs on an own endpoint. Its `typed` variant has a
typed address, and the hint names the address that the form saves from
it. Its `codex` variant has the form of Codex on that kind. Its `refused`
variant has an `http://localhost` address that the shared address rule
refused. Its `connected` variant has both agents on an own endpoint, each
with its host and its share switch on.
`app/account/endpoint-models` shows option G of decision 10 of the own
endpoint plan, which Cal chose on 10 November 2026: the pickers of the
owner of a login hide each model that its endpoint does not list. Both
agents run on Cal's proxy, whose model list does not name Fable 5.1. The
Claude row says that Fable 5.1 is hidden from Cal's model pickers, and
why, with the model ID, the time of the last read of the list, and
Refresh.

`app/new-workspace/dialog` draws New workspace as a dialog over the ready
workspace of `app`, for a new account or a user who chose the dialog.
Its states are child pages. `first-build` shows Firna before its first
good build, with the notice and Create off. `section` shows the open menu of the sections at
the top right. The other child pages show files that upload, a
drop of files on the whole dialog card, a draft with uploaded files and
the notice of a missing agent login, a
create request that failed, an org without chosen repositories, and a
pasted workspace link as a chip. The dialog uses the file chips of
`app/new-workspace/files`. A phone always opens the page, so each phone
view shows the New workspace page in the same state.
`user-flows/create-workspace-dialog` goes from Preferences through the
dialog to the new workspace.

`app/orgs/reorder` draws the order of the orgs that each person keeps,
from decisions 515 C, 516 A, and 517 B of 11 November 2026. Its canonical
screen has Firna dragged from the bottom of the rail to the top, and on a
phone the same drag in the org switcher after a long press. Its variants:

- `moved` has the rail and the org switcher after the move: Firna, Acme,
  then Futex.
- `menu` has the menu of Firna, the first tile, at the pointer of a right
  click: Move up, which is off, and Move down. A phone has no tile menu,
  so its view is the org switcher.
- `long-press` has a long press that lifts Futex in the org switcher of a
  phone, with the line at its place. Its desktop view has the start of a
  drag of Futex on the rail.
- `suspended` has the menu of Acme after the operator suspended it, with
  both items on, and on a phone the drag of Acme in the org switcher.

The state comes from the `orgOrder` control of the workspace list, which
`src/screens/orgOrderStates.ts` describes.

[The waitlist, suspensions, and the operator](catalogue-operator.md)
gives the pages of the waitlist and the child pages of
`app/orgs/suspended`. It also gives the operator section, `app/operator`,
with its child pages.

`app/workspace-menu` shows the menu of Apple Pay button, a row of the list
of Acme, at the pointer of a right click: Move to section, Reassign to,
Rename, Copy link, and Archive. Shift+F10 and the Menu key open it too,
and a phone layout opens it as a sheet. No row has a button for the menu.
The user chose the four actions that change the workspace on 9 November
2026, and added Copy link on 12 November 2026. Its child pages:

- `app/workspace-menu/move` has the sections beside the menu, with the
  current one checked. Its `general-only` variant has Acme with General
  only, whose menu has no Move to section.
- `app/workspace-menu/reassign` has the members beside the menu, with the
  owner checked. Its `archived` variant has the archived row of an admin,
  whose menu has only Reassign to and Copy link, while Restore stays on
  the row.
- `app/workspace-menu/rename` has the field of Rename in the row, with the
  name selected. Its `failed` variant keeps the draft in the field, under
  the toast of the list that names the failure.
- `app/workspace-menu/archive` has the list just after Archive from the
  menu, with no check and no question: the row in the collapsed Archived
  group, and the toast with Restore. Its `stopped` variant archives a
  stopped workspace at once too. Its `restored` variant has the list after
  Restore from the toast, with the workspace back in its section, stopped.
  `user-flows/archive-from-list` goes from the list through the menu and
  the toast to that Restore.
- `app/workspace-menu/roles` has the menu of a member who is not an
  admin, then her own workspace, her archived row, whose menu has only
  Copy link, and a suspended org, whose menus have only Copy link.

[The command palette and feedback](catalogue-palette.md) gives the
child pages of `app/command-palette` and of `app/feedback`, and the flow
that sends feedback.

The catalogue draws the Keyboard shortcuts tab in the Mac app and in a
browser, from decisions 190 to 196. The pages of
`app/account` and `mac-app/this-mac` show it as the third tab of the
account.

- `app/account/shortcuts` shows the tab in a normal Chrome tab on a Mac.
  The search field of decision 195 stands at the top. The lines under it
  say which keys the terminal keeps, and where the dimmed keys work. A
  key that the tab keeps, or that decisions 192 and 196 leave to the
  browser, is dimmed. Its child pages:
  - `app/account/shortcuts/windows` has a normal Chrome tab on Windows,
    with the keys of decision 194 and the terminal line of Windows.
  - `app/account/shortcuts/linux` has a normal Chrome tab on Linux, with
    the keys of Windows and Linux. From decision 196, the app leaves
    Ctrl+1 to Ctrl+9, Alt+1 to Alt+9, and Ctrl+L to Chrome, so Switch to
    org 1 to 9 show only dimmed keys. Its `firefox` variant has a normal
    Firefox tab on Linux, where the app leaves only Alt+1 to Alt+9 and
    Ctrl+L to Firefox, so Ctrl+1 to Ctrl+9 are not dimmed.
  - `app/account/shortcuts/firefox` has a normal Firefox tab on a Mac,
    which keeps ⌥⌘↑, ⌥⌘↓, and ⇧⌘P and lets the page take ⇧⌘T.
  - `app/account/shortcuts/installed` has the installed app of Chrome on
    a Mac, where no key is dimmed.
  - `app/account/shortcuts/search` has a search for "tab", with dimmed
    keys in its rows. Its `no-match` variant has a search without a
    match.
  - `app/account/shortcuts/recording` has a row that records new keys,
    with Remove beside Cancel. Its `adding` variant has the recorder of +,
    which adds a shortcut and shows only Cancel. Its `fixed-key` variant
    has ⌘Z, a text key that the recorder did not take. Its `enter-key`
    variant has ⇧⌘Enter, a fixed key that no row lists, so the line says
    only that it is fixed. Its `conflict` variant has a recorded shortcut
    of another command, with Replace and Cancel.
  - `app/account/shortcuts/changes` has changed rows with Reset, and Reset
    all. Its `reset-conflict` variant has a search for "model" and the
    Reset of Model picker, whose default shortcut Keyboard shortcuts now
    holds, with Replace and Cancel. Its `reset-all` variant has the
    question before Reset all, a sheet on a phone. Its `reset-all-failed`
    variant has a Reset all that failed. Its `not-saved` variant has a
    save that failed.

  The phone views of these pages put the shortcuts of each row on a line
  under its label.
- `mac-app/shortcuts` shows the Keyboard shortcuts tab of the account in
  the Mac app, which gives the page every key. The search field of
  decision 195 stands at the top, and the line under it says which keys
  the terminal keeps. Its child pages:
  - `mac-app/shortcuts/search` has a search for "tab". It finds commands
    by their labels and by their search words, and fixed rows. Its
    `fixed-keys` variant has a search for "move". It finds the fixed keys
    of decision 193, those of a focused workspace row and of a focused
    divider, and the text keys that move by word or by line. Its
    `no-match` variant has a search without a match.
  - `mac-app/shortcuts/recording` has a row that records new keys, with
    Remove beside Cancel. Its `adding` variant has the recorder of +, which
    adds a shortcut and shows only Cancel. Its `fixed-key` variant has a
    fixed shortcut that the recorder did not take. Its `space-key` variant
    has Space, which presses a focused button, so the line names that row.
    Its `conflict` variant has a recorded shortcut of another command, with
    Replace and Cancel.
  - `mac-app/shortcuts/changes` has changed rows with Reset, and Reset
    all. Its `reset-conflict` variant has a search for "model" and the
    Reset of Model picker, whose default shortcut Keyboard shortcuts now
    holds, with Replace and Cancel. Its `reset-all` variant has the
    question before Reset all. Its `reset-all-failed` variant has a Reset
    all that failed. Its `not-saved` variant has a save that failed.
- `mac-app/command-palette` shows the All tab of the palette over a
  workspace in the Mac app, with the key of each command row. The Search
  row of each Mac app page opens it. Its `actions` and `settings` variants
  have those tabs. The Settings tab adds This Mac to the Account group,
  which ends with Keyboard shortcuts. Its `changed-key` variant has the
  Search row with ⇧⌘P, the person's key of the palette.

[The pull request bar](catalogue-bar.md) gives `app/banner`, the bar of a
workspace with its actions, its child pages, and the flow
`user-flows/merge-and-continue`.

`app/archive` draws Archive and Restore of Checkout address autocomplete,
from decisions 1 and 2 of PR #138. Its canonical screen has the archived
workspace, whose bar gives the last day of Restore, with Restore. Its child
pages:

- `app/archive/just-archived` has the workspace just after Archive from the
  pull request bar, with the toast and its Restore. Archive on a row and in
  the palette leads there too.
- `app/archive/group` has the list with the Archived group open, and
  Restore on the hover of a row.
- `app/archive/restored` has the workspace back in its section, stopped,
  where each Restore leads.
- `app/archive/restore-ended` has the archived workspace after its last day
  of Restore, while a failed delete of its cloud computer tries again. The
  bar gives the day when Restore ended, and offers no Restore.
- `app/archive/deleted` has the archived workspace after the app deleted
  its cloud computer, with no Restore.

[Chat and routines](catalogue-chat-and-routines.md) gives those catalogue
pages, their child pages, and their related flows.

[Workspace links, file mentions, and tools](catalogue-workspace-tools.md)
gives those catalogue pages and their related flows.

[Attachments and files](catalogue-attachments-and-files.md) gives the child
pages of `app/attachments` and `app/files`, and their related flow.
