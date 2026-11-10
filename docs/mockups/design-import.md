# The design of branches and the import from Conductor

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
branch picker of New workspace, a workspace from Conductor, and the links
of its controls. It also gives `LinkedControl`, the terminal of each
workspace, and the mixed mark of Select all.

- `BranchLine` in `src/components/new-workspace/` draws the line under the
  repository picker of the New workspace page: New branch from the default
  branch, and the quiet link Use an existing branch, in the link colour.
  A chosen branch or pull request shows on the line, with Change.
  `BranchPicker` beside it is the picker, with a search field, New branch,
  the open pull requests, and the branches without one. It leaves out the
  default branch. A pull request whose branch is in another repository,
  such as a fork, is a row that is off, with its reason and Open on
  GitHub. The picker finds such a pull request by the ID of its head
  repository, never by its branch name, and a search reads only its
  number and its title. The New workspace dialog shows the same choice as a
  quiet picker beside its repository picker. The screen of each form, the
  page or the dialog, derives its branch links from its full state, and
  the phone view of the dialog keeps the links of the dialog. A state that
  differs from the base example of its form apart from the branch and the
  picker, such as another draft, org, notice, or viewer, keeps every
  branch control static.
- A workspace from Conductor shows the flag From Conductor, a Firna badge,
  after its label in the header. `src/components/conductor-import/` holds
  its parts: the links to its old sessions in place of an empty chat, the
  question Activate this workspace in place of the composer, the notice of
  a failed activation above the composer, and the text of its panels. Its
  activation is its first start, so the chat shows the steps of a start,
  and a failed activation keeps the composer, as a failed first start does.
  The Markdown of an old session opens in `FilePage`, the Markdown view of
  every file, and a phone opens it in the Chat tab. After the activation,
  each session from Conductor has an ordinary session tab. Its chat shows
  only its new turns, under `ResumedLine`, a first line in the look of the
  line of a linked session, which opens its old document. A session that
  could not resume starts fresh, and its first message names its old chat
  in `.context/conductor/`. An activation whose work does not fit the free
  disk names both sizes in the notice of a failed activation. The shared sandbox
  notices of `sandboxNoticeState.ts` stay as they are, because the app
  draws them too. Before an activation, or after a failed one, the
  workspace has no cloud computer to check, so `ImportedArchiveDialog`
  asks Archive with no check. It says that the workspace can no longer be
  activated and that its old sessions stay readable. After that Archive,
  `ArchivedImportBar` names the day and the readable old sessions, and no
  deleted cloud computer, because the workspace never had one.
- `MobileTabBar`, `ToolsPanel`, the list tabs of `FilesPanel`, and
  `WorkspaceTabs` take optional links for a workspace whose screens are not
  those of every workspace. A tab with no screen there, or with null, stays
  static. An imported workspace passes the screens of its state from one
  record that names every state, so its tabs never open another workspace
  or another state.
- `WorkspaceHeader` takes the same record as `links`. Back of a phone then
  opens the list of the record, and the owner opens the owner screen of the
  record. Neither falls back to the list of Acme or to the owner menu of
  the mockups. `OwnerPicker` takes that screen as `to`. The record gives
  screens only for the viewer and the org of the imported entries, an
  admin of Acme while Acme is active. So a member in the serve controls
  gets static controls.
- `RailState` takes the screen of the tile of the current org as
  `currentTo`. The views of an imported workspace, the list after the
  import, and the import pages after the import give it. `ListHeader` and
  `HomeList` take the screen of the org switcher as `switcherTo`, which the
  list after the import gives as null. Null keeps a control static. A
  caller that gives no screen keeps the native one.
- `LinkedControl` in `src/components/common/` makes one control, such as a
  button, a link to a screen, or keeps it static where the screen is null.
- The import flow of the Mac app derives the links of its own controls
  from its full state. A control opens a step only from a state that
  equals the example of its flow in every field apart from the step, as
  every saved step does: the first import, or the list after an upload
  that stopped. The chip, the sidebar row, and the tile of Acme open the
  drawn imported workspace and its list only where the sidebar shows both
  imported workspaces, for the viewer of those entries. Every other state
  keeps the control static.
- The terminal of a workspace belongs to it. `terminalProcesses` in
  `src/fixtures/terminal.ts` holds the process of each workspace that runs
  one, today the dev server of Checkout address autocomplete. Every other
  terminal waits at an idle prompt on the repository and the branch of its
  own workspace. The port state does not decide it, because a session can
  open a port while the terminal stays idle.
- `CheckOption` in `src/components/common/` draws the boxes of the import
  list, as it draws the option of the Suspend question in
  [the operator section](design-operator.md). A box that stands for
  several options shows a mixed mark while only some are checked, as
  Select all of the import from Conductor does. CSS draws the mark, with
  `aria-checked` set to mixed, because a view runs no script.
