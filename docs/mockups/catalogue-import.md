# The catalogue: branches and the import from Conductor

This page belongs to [the catalogue](catalogue.md), which lists each path
of the catalogue, the rules of its folder pages, and the entries that
moved. This page gives the branch of a new workspace and a workspace that
the Mac app imported from Conductor, with their child pages.

`app/new-workspace/branch` draws the branch of a new workspace. New branch
stays the default, so the line under the repository picker of the page says
that the workspace starts on a new branch from main, with the quiet link
Use an existing branch. The canonical screen has the branch picker open: a
search field, New branch, the open pull requests, and the branches without
a pull request. The picker leaves out the default branch, and it shows the
pull request of a workspace that is still open with no warning. The pull
request #477 has its branch in the fork lena-ko/storefront, so its row is
off: it says that its branch is in another repository, and Open on GitHub
opens that pull request in a new tab. The picker compares the ID of the
head repository with the ID of acme/storefront, not the branch name, which
is main here. Every open picker, on the page, in the dialog, and in the
sheet of a phone, shows that row. A phone opens the picker in a sheet. In each picker, New branch leads back to the default
form, and the sample branch and pull request lead to their chosen states,
in the dialog when the picker is in the dialog. Its child pages:

- `app/new-workspace/branch/chosen` has a chosen branch, whose line says
  that the workspace continues it, with Change. Its `pull-request` variant
  has a chosen open pull request. Its `change` and `pull-request-change`
  variants have the picker open again from Change, with the choice still
  checked.
- `app/new-workspace/branch/dialog` has the picker open in the New
  workspace dialog, where a quiet picker beside the repository says New
  branch. Its `chosen` and `pull-request` variants have a chosen branch and
  a chosen pull request, and its `change` and `pull-request-change`
  variants have the picker open again with that choice checked.
- `app/new-workspace/branch/search` has a search that finds a pull
  request. Its variants have a search with no match, a search that finds
  the pull request from the fork by its title, the list while it loads,
  and the list that did not load. A search reads the number and the title
  of a pull request from another repository, not its branch.
- `app/new-workspace/branch/start` has the first start of the workspace
  that Send makes on the chosen branch: it fetches that branch and checks
  it out with tracking. Send of `app/new-workspace/branch/chosen` opens it.
- `app/new-workspace/branch/gone` has the failed first start of a
  workspace whose chosen branch was gone from GitHub before its start. The
  bar names the branch and says to restore it on GitHub, with Try again,
  and the composer stays.

`app/imported` shows Coupon totals at checkout, a workspace that the Mac
app imported from Conductor, before its activation. The header shows the
flag From Conductor and the state Not active, whose mark is the four
corners. The old sessions are links in place of the empty chat, and the
question Activate this workspace takes the place of the composer. Its
child pages:

- `app/imported/list` has the workspace list after the import, with the
  section Import from Conductor at the top. The tile of Acme in its rail
  opens the same list. No entry draws the org switcher over this list, so
  its org switcher on a phone and in a narrow window stays static.
- `app/imported/old-session` has the Markdown file of an old session in the
  Markdown view of the app, before the activation. Its `active`, `failed`,
  and `stopped` variants have the same file after the activation, after a
  failed activation, and while the activated workspace is stopped, and its
  `history` variant has the old sessions in the session history. Each link
  to the file, its tab, and the way back of a phone keep the state of the
  workspace.
- `app/imported/files` has the Files tab of a phone before the activation.
  Its `terminal` and `preview` variants have the other tabs before the
  activation, and its `stopped` and `stopped-terminal` variants have the
  Files and Terminal tabs while the activated workspace is stopped.
- `app/imported/activating` has the activation: the first start of the
  workspace, which copies in the work from Conductor and restores the
  memory of each session from Conductor.
- `app/imported/failed` has a failed activation with Try again. Its `files`
  variant has the Files tab of a phone. Its `disk-space` variant has an
  activation that stopped before it changed the checkout, because the work
  needs 41.3 MB of disk space to unpack and the cloud computer has 23.6 MB
  free. The notice names both sizes, says that the work is kept, and keeps
  Try again.
- `app/imported/ready` has the activated workspace. Each session from
  Conductor has its own ordinary session tab, oldest first, before the
  tab of the new session that the activation opened. Its `files`,
  `terminal`, and `preview` variants have the tabs of a phone after the
  activation, and its `stopped` variant has the same workspace after its
  cloud computer stopped.
- `app/imported/resumed` has the tab of Apply coupons before tax after its
  first new turn. The session continues with the memory of its agent, so
  the chat shows only the new turn, under a first line that opens its old
  document. Its `document` variant has that document, opened from the
  session: the tab of the session stays, and the way back of a phone
  returns to it. Its `fallback` variant has Coupon edge cases in tests,
  whose memory file came along but could not resume. Its tab holds a fresh
  session, and its first message names its old chat in
  `.context/conductor/`. A session whose memory file was gone on the Mac
  never imported, so no tab shows it.
- `app/imported/archive` has the question of Archive before the
  activation: the workspace can no longer be activated after Archive, and
  its old sessions stay readable. Its `failed` variant has the same
  question after a failed activation. The Archive button of the row of a
  workspace that was never activated opens it, and its Archive leads to
  `app/imported/archived`.
- `app/imported/archived` has the workspace after that Archive. Its bar
  names the day of the archive and says that the old sessions stay
  readable, and it names no deleted cloud computer. Its `old-session`
  variant has the file of an old session in that state.

The controls of an imported workspace open only screens of the same
workspace in the same state, for the same viewer and org: the tabs of a
phone, the list tabs of its Files panel, its tool tabs, its session
history, its old documents, its selected row, Activate and Try again, the
Archive question, the way back of a phone, the owner, and the tile of Acme
in the rail. One record in `src/screens/importedScreens.ts` names the
screens of every state, with no fallback, and a state that no entry draws,
such as a refused start, keeps each control static. It names the activated
workspace by the session that its chat shows or that opened its document,
the `resume` state, and a failed activation by its saved message. So a
document opened from a session from Conductor returns to that session, and
no control of that session opens the new session in its place. Only the state before
the activation matches a drawn list, `app/imported/list`, so the way back
and the tile of Acme open it there and stay static in the other states. No
entry draws the menu of the owner for an imported workspace, so the owner
stays static. Every imported entry shows an admin of Acme while Acme is
active. Another viewer or org in the serve controls, such as a member,
keeps every control of the record static. The terminal of the activated
workspace waits at a prompt on its own branch.

[The Mac app](mac-app.md#the-import-from-conductor) gives the pages of the
import itself, under `mac-app/import`. The flow
`user-flows/import-from-conductor` goes from the offer of the Mac app,
through the upload and its result, to the activated workspace, a resumed
session, and its old document.
