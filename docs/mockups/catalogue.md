# The catalogue

The [mockups README](README.md) gives the commands, the folder layout,
how a screen is built, and links to the other pages.

| Path                | What it shows                                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| `marketing`         | The home page of the site: the app, its features, and Join the waitlist                 |
| `marketing/docs`    | The overview of the public docs, then a guide, with its Docs menu or its contents open on a phone |
| `marketing/terms`   | The Terms of use, with the operator details, suspension, and abuse reports     |
| `marketing/privacy` | The Privacy notice, with the operator details and legal contact address       |
| `marketing/not-found` | The page of the site for an address that it does not have                   |
| `marketing/pictures` | One capture page for each picture of the home page, without a frame         |
| `app`               | A ready workspace: two sessions and a file tab, and a pull request to merge   |
| `app/sign-in`       | GitHub sign-in with the agreement to the Terms, the page before GitHub, the waitlist, the sign-in of an invite link, and the invitations that wait after it. Get started, the only first run, in three steps, with the first build of the new org. The return page after a GitHub App install in the Mac app. |
| `app/shell`         | The workspace list, and the sandbox starting, stopped, with an error, and with a refused start |
| `app/sections`      | The menu of a section, and a workspace dragged to another section             |
| `app/command-palette` | The command palette over the list: the All tab, then the other tabs, a search, and a search by number |
| `app/orgs`          | The org switcher of a phone, Create org, the first org, new orgs, deleted, suspended |
| `app/account`       | General with the GitHub sign-in, the GitHub App, the agent logins, and the invite code, then Preferences with the model and how New workspace opens |
| `app/operator`      | The operator's Overview, Orgs, Users, Waitlist, and Invite codes tabs, the page of an org and of a user with Suspend, Lift, and Approve, the pause of sign-ups, and where an operator opens the section |
| `app/banner`        | The pull request bar and Checks: no pull request, then its other states       |
| `app/new-workspace` | An empty chat, the first build of a new org, its error, the dialog, a pasted workspace link, the start, a queued second message, the first turn, a failed start, Try again |
| `app/org-settings`  | General with Delete org, then Repositories, Cloud computer with the first build of a new org, and Members |
| `app/chat`          | A finished turn with its work folded, then running turns, open work, lost data, lost updates, and unread files |
| `app/mac-commands`  | A command that an agent runs on the Mac of the sender, in the chat            |
| `app/sessions`      | A new session, the history, closing one while it works, and a linked session  |
| `app/reassign`      | The owner of a workspace, its reassign menu, a member's view, a stopped turn  |
| `app/archive`       | Archive with its check for unpushed work, and the Archived group              |
| `app/composer`      | Attached files, the picker, another member's login, and a missing agent       |
| `app/workspace-links` | Chips in a message and an answer, then Copy link and its failure, a pasted link, and a link of another org |
| `app/files`         | All files, Changes with its summary, and a file, Markdown, and diff tab       |
| `app/tabs`          | A dragged tab, the moved row, a full row, the tab menu, and the rename field  |
| `app/tools`         | The terminal, a port preview, no preview, and the hidden Desktop, kept for its return |
| `app/panels`        | The right column, widened by the handle on its inner edge, and then hidden    |
| `mac-app`           | The Mac app: its window, the waitlist, its device commands, and This Mac      |
| `user-flows`        | Sign up, join with an invite link, create a workspace, create one in the dialog, reopen it, open one from the palette, create an org, run a Mac command, link a workspace |

A folder page shows at most five screens, saved states included. A folder
with child folders shows only its canonical screen, as `marketing`, `marketing/docs`, `app`,
`app/sign-in`, `app/sign-in/get-started`, `app/sign-in/waitlist`, `app/sign-in/join`, `app/shell`, `app/command-palette`, `app/orgs`,
`app/orgs/suspended`, `app/account`, `app/new-workspace`, `app/org-settings`,
`app/org-settings/cloud-computer`, `app/operator`, `app/operator/user`, `app/operator/codes`, `app/banner`, `app/chat`, and `app/workspace-links` do. `marketing/pictures` has no screen of its own. Each picture's capture
page is its own entry at `marketing/pictures/<picture>`, so each page shows
one screen. `app/org-settings/cloud-computer` and its building
and build-failed states moved from `app/repository-settings` and its updating
and update-failed states, and declare `movedFrom`. The states of `app/shell`,
`app/account`, `app/sign-in/waitlist`, `app/new-workspace`, and `app/org-settings/cloud-computer` moved into their own
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
create request that failed, an org without chosen repositories, and a
pasted workspace link as a chip. A phone
always opens the page, so each phone view shows the New workspace page in
the same state. `user-flows/create-workspace-dialog` goes from Preferences
through the dialog to the new workspace. The `first-build` variant shows
Firna before its first good build, with the notice and Create off.

The waitlist comes from decisions 160 to 163. A new GitHub sign-in creates
an account without app access, and the person waits until an operator
approves them, or a code or an org invitation lets them in. Its pages:

- `app/sign-in/waitlist` has the only screen of a person who waits, Sam
  Okafor, with the address that gets the approval email. Its child pages
  were its variants and kept their paths. `code-failed` has a typed code
  that was not found, and `paused` has a code that the pause of sign-ups
  stopped. `invited` has an org invitation that lets Sam in, and its
  `paused` variant has the same invitation after the pause stopped Accept:
  the invitation stays, and a notice asks Sam to accept it again when
  sign-ups resume. `no-email` has an account with no verified email. The
  code control of `mockups:serve` shows each reason that a code does not
  work: unknown, disabled, used up, and the pause.
- `mac-app/waitlist` has the same waitlist in a window of the Mac app, and
  its `full-screen` variant has it without the window buttons.
- `app/sign-in/join` has the sign-in page that an invite link opens, with
  its code. Its child page `app/sign-in/join/failed` has the waitlist after
  the code of the link did not work, here a used-up code, and its `paused`
  variant has the pause.
- `app/account` shows the invite code of the user at the end of the
  General tab, with 3 of 5 invites left. Its child page `app/account/invites` has the
  pause, and its variants have every invite used and a code that an
  operator turned off.
- The Sign up flow ends on the waitlist. The Join with an invite link flow
  goes from the link through Get started, so the people of each flow stay
  the same.

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
org, as decision 144 chose for now. A line under the users counts the
people on the waitlist, from decision 160. The Orgs and Users tabs come from
decision 147, and they find a suspended org or user. The Waitlist and
Invite codes tabs come from decision 160. Its child pages:

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
- `app/operator/users` has the Users tab: the newest users, with Waiting
  under a person on the waitlist, a search, and a search with no match.
- `app/operator/user` has the page of a user, with the name, the age of
  the GitHub account, how and when they got app access, their referral
  code with Copy, Copy join link, and who used it, and Suspend user. Its
  child pages are below.
- `app/operator/waitlist` has the Waitlist tab: the people who wait, oldest
  first, a search, the question before Approve, the list after two
  approvals, one with its email not sent yet, and an empty waitlist.
- `app/operator/codes` has the Invite codes tab: Sign-ups with Pause
  sign-ups, the search, and the invite codes with their uses and states.
  Each code has Copy, and a code that works also has Copy join link. Its
  child pages are below.
- `app/operator/error` has the numbers that could not load, with Try
  again. Its `loading` variant has the page while it reads the numbers.

The child pages of `app/operator/user` follow. The first two were variants
of `app/operator/user` and kept their paths:

- `app/operator/user/suspend` has the question before a suspension, with
  the offer to disable the referral code of the user. Its `self` variant
  has the warning before the operator suspends their own account. The
  variant moved from `app/operator/user/self` and declares `movedFrom`.
- `app/operator/user/suspended` has the suspended user, whose referral
  code the suspension disabled. Its `lift` variant has the question before
  the lift. The variant moved from `app/operator/user/lift` and declares
  `movedFrom`.
- `app/operator/user/waiting` has a person on the waitlist, with Approve
  beside Suspend user. Its variants have the question before Approve, the
  page after the approval with its email not sent yet, and with its email
  sent. Its `approve-no-email` variant has the question for a person whose
  GitHub account has no verified email: no email goes out, and the person
  sees the app access at their next visit.
- `app/operator/user/access` has a user who came in with an invite code.
  Its variants have a user who came in with a referral code, with an org
  invitation, which names the org and the admin who sent it, and as an
  operator. Its `email-not-sent` variant has an approval whose email never
  went, because the GitHub account has no verified email.
- `app/operator/user/referral` has the question before the disable of a
  referral code. Its `disabled` variant has the disabled code.

The child pages of `app/operator/codes`:

- `app/operator/codes/new` has New code with its label and use limit. Its
  `made` variant has the new code at the top of the list.
- `app/operator/codes/disable` has the question before the disable of an
  invite code. Its `disabled` variant has the disabled code in the list.
- `app/operator/codes/search` has a search that finds an invite code by
  its text. The search also takes the label of an invite code and the
  GitHub login of the owner of a referral code. Its variants have a search
  that finds the referral code of a user, and a search with no match.
- `app/operator/codes/pause` has the question before Pause sign-ups. Its
  variants have the Invite codes tab while sign-ups are paused, with
  Resume sign-ups, and the same notice on the Waitlist and the Overview.

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
and in the `workspace-link` variant of `app/new-workspace/dialog`.
The flow `user-flows/link-a-workspace` goes from the copy to the answer,
and ends with a press on the chip, which opens
`app/new-workspace/first-turn`.
