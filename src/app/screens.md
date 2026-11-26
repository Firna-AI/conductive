# Screens

This guide belongs to [Web app: data and composition](README.md). It
gives the rules of the screens of the app shell: the account and Get
started, sign-in, invitations, orgs, panels and layers, the trees of the
workspace list, the focus, saved drafts, New workspace as a page or a
dialog, and [the waitlist](#the-waitlist).
[Command palette and keys](palette-and-keys.md) gives the rules of the
command palette and of the keyboard shortcuts.
[Feedback](palette-screens.md) gives the rules of the Feedback dialog that
the Help row of the command palette opens.

- The app runs every cloud computer in its own Boat account, so no org has
  a Boat key. The app has no key screen, tab, notice, or Get started step,
  and no text of the app names Boat.
- Get started has three steps: the GitHub App, an org, and Claude or
  Codex. A reply of the API names only these steps.
- Only the GitHub App step comes from that reply. The org step and the org
  of Get started follow the orgs that are not deleted, as the address `/`
  does. A person whose orgs are all deleted gets Create org again, and
  Get started lists those orgs with Restore before its steps. The agent step follows the logins of the account, and the org
  logins that the account names as default logins of the orgs of the
  person (org login decision 4). So a leave of
  the last org offers Create org again, and a connect on Account completes
  its step at once. An accepted invitation to an org whose org login
  serves the person completes it after one read of the account. `setupSteps` in `setup-steps.ts` derives them, and each
  screen reads them through `AppModel.getStarted`.
- Once the org exists, the org step shows its cloud computer from the
  builds of the org, as
  [Get started](../../docs/protocol/orgs-and-members.md#get-started) says:
  preparing with its time, ready, the failure with its saved message, or no
  build yet. A failed load of the builds shows Try again in its place. Only
  a person who may change the settings of the org gets Try again and Open
  the log, or Build computer. The finish takes its words from the same
  state. Until the builds load, it shows Open without words. Open is a
  secondary button after a failed build or with no build.
- The sign-in screen shows the agreement to the Terms and the Privacy
  notice above Continue with GitHub. Its words come from `termsAgreement`
  in `src/marketing/legal-text.ts`, and its links lead to the marketing
  site. Continue with GitHub opens `acceptedTermsSignInPath()`, which
  carries the current revision of the Terms, as
  [Terms consent](../../worker/security/README.md#terms-consent) says.
  `../shell/auth/SignInScreen.test.tsx` checks that address.
- The sign-in screen also takes the place of every screen when the API
  refuses any request with `sign_in_required` while the app is open. The
  client of `AppModel` reports each such refusal, as `watchSession` in
  `boot.ts` says, also the replies of its fetch. Every org client and
  feature client sends through it. A refusal with another code, such as
  `github_reconnect_required`, keeps the screen.
- The address `/` shows the invitations of the user first, in the frame of
  the app: each org with its invited email and Accept invitation, then
  Continue to workspaces. Without invitations, or after Continue to
  workspaces, it opens Get started or the org of Get started. The
  `?invite=` link of an invitation email leads there.
- [Account and agent screens](account-screens.md) describes the account tabs,
  keyboard shortcuts, sharing, own endpoint model lists, and the ChatGPT sign-in.
- Create org asks for the name and the initials, and lists the
  repositories that the person and the GitHub App both reach, from
  `AccountModel.repositories`, before the org exists. The create sends the
  GitHub IDs of the chosen ones. Create org stays off until the person
  chooses at least one, also while the list is empty or did not load.
- Create org of an operator also offers the provider account of the org:
  By weights, the default, or a configured account by its ID, from the
  operator's providers reply. Only a chosen account goes into the create.
  The create does not wait for that reply. Nobody else sees the choice or
  sends its read, as [Provider accounts](../shell/operator/provider-accounts.md#provider-accounts)
  says.
- The rail, the org switcher, and General show the saved initials of an
  org. An org without them shows the initials of its name.
- The tile of the open org shows the colour of the org in its initials
  and its outline. An org without a colour, or with a colour that this
  copy of the app does not know, shows Blue. An admin picks the colour on
  General, and a choice saves at once. A failed save shows a toast and the
  saved colour again.
- The rail and the org switcher show the orgs in the person's own order.
  The person moves an org tile by drag, by its tile menu with Move up and
  Move down, or by Alt and Up or Down on a focused tile. On a phone, a
  long press lifts an org in the org switcher. A move shows at once, and a
  failed save takes back only that move, with a toast. A suspended org
  moves like any other. A deleted org has no tile, as
  [Org rail order](../../docs/protocol/org-rail-order.md) says.
- A suspended org shows its notice, and no action that it refuses, as
  [A suspended org](suspended-org.md) says.
- Only an operator gets the operator section, from the rail and the org
  switcher. Anyone else gets the not-found page at its addresses, as
  [Operator section](../shell/operator/README.md) says.
- The Cloud computer tab names the software of the base image from the
  settings reply. An older reply without it names no software.
- The notice of a changed install script shows only while
  `BuildsResponse.changes.installScript` is true. It has the same words
  for an admin and a member, from `changedScriptNotice`. Until the org
  has a good build, it says that one more build runs the script while the
  first build runs, and else that the next build runs it. An admin gets
  Build computer in it only once the org has a good build, because before
  that the head of the builds offers Try again or Build computer.
- The repository notice of the Repositories and Cloud computer tabs reads
  `BuildsResponse.changes`, as
  [The repository notice](../../docs/protocol/org-image-repositories.md#the-repository-notice)
  says, so each of these tabs reads the builds while it shows. Its state
  comes from `repositoryWaitOf`, and its words and its look from the shared
  `repositoryChangeCopy.ts` and `RepositoryNotice.tsx`. In
  a suspended org it names no admin who can act. The build history stays
  closed while a change of the install script or of the repositories
  waits for a build.
- A save of the install script and each repository save read the builds
  again, so the notices show at once. Done of the Repositories tab starts
  the build of the added repositories, and the build shows at once.
- A step of a panel, by a key or a drag, starts from the width that the
  panel shows. It stays in a range that holds that width, so a shrink
  never widens a panel that the layout shows narrower than its range. A
  step that ends at its start width stores nothing.
- A focused divider takes only its own keys, through `dividerKey` of the
  shortcut model: Left and Right, alone or with Shift for a larger step,
  and Home and End alone. A key with other modifiers, such as ⌥⌘←, goes to
  its shortcut.
- On desktop, the toggle at the end of the workspace header hides the
  right column and shows it again, and so does the key of Hide or show the
  right column. The choice holds for every workspace of the tab until the
  page closes. A hidden column stays mounted, so its file lists keep their
  connection and the terminal keeps its session.
- A menu item that is off keeps its place and fades each of its parts,
  except its note, so that the reader can read why it is off. The arrow
  keys and the first focus of the menu skip it.
- A sheet or a dialog makes the rest of its frame inert through
  `OverlayHost`. It keeps Tab and Shift+Tab inside, also from the layer
  itself and from a text field. When it closes, the frame is active again
  before the focus goes back to the trigger. A desktop menu leaves the
  frame active.
- Each sheet and dialog is a modal layer through `useModalLayer`. A press
  outside it does not move the focus, so the focus goes back to the
  trigger also after a press outside.
- A sheet stops below the top of a phone screen, at 88% of its height, as
  the mockup sheet does. Its handle and title stay, and its body scrolls
  when the content is longer. So the last controls of a long sheet, such
  as Send after a long feedback draft, stay within a swipe.
- Escape closes only the newest open layer, such as a menu in a dialog.
  A press outside closes each layer that it misses.
- The command palette and the keyboard shortcuts follow
  [Command palette and keys](palette-and-keys.md): the layer of the
  palette, the shortcut layer, the owners of the commands, the key hints,
  and the keys of the workspace list.
- [Feedback](palette-screens.md) gives the rules of the Feedback dialog
  that the Help row of the palette opens, with its screenshots.
- The workspace list shows each live sub-workspace nested under the row of
  its parent, in the sidebar and on the list page, as
  [The list](../../docs/protocol/sub-workspaces.md#the-list) says.
  `groupWorkspaces` in `sections.ts` places the rows of each section with
  `placeWorkspaces`, the shared rule of the Worker, so a row whose parent
  is archived shows under the nearest live row above it. Each row that the
  list shows above a row in its tree indents it by one step, through the
  classes `.nested` and `.indent1` to `.indent3` of the shared
  `WorkspaceRow.module.css`. The guide
  lines join the rows of a tree as in a file tree, as
  [the design](../../docs/mockups/design.md) says. A stub runs down from
  the mark of a row with nested rows, and a connector runs to the mark of
  each nested row. A line ends at its last nested row. An outer line runs
  through a row only while its row has a nested row further down.
  `treeRows` in `list-trees.ts` gives each row its lines from `treeLines`,
  a shared helper. The mockups use the same helper, and the shared
  `guideClasses` gives the classes of the lines. A collapsed section
  counts its nested rows too. The Archived group and the command palette
  stay flat.
- Only a top-level row moves, and it takes its whole tree: by a drag, by a
  long press on a phone, by Alt with Up or Down, and by Move to section.
  The lifted row shows the count of the nested rows that move with it,
  the tree stays faint in its place, and the drop line falls only between
  two trees. The place of a move counts the top-level rows of the section
  without the moved one, as the Worker counts them. A move shows the tree
  at its new place at once. A nested row has no drag, no move by keys, and
  no Move to section, and a long press on it does nothing, as
  [Moves](../../docs/protocol/sub-workspaces.md#moves) says.
- An Archive of a workspace gives each live workspace that showed under
  its row the section and the place of the archived workspace, in the
  list of the app as in the Worker (`replaceWorkspace` in
  `list-trees.ts`). So these rows stay where they showed: while the
  Archive runs, after its reply, after an event of the archived record,
  and after the next read of the list.
- The Merge queue group shows at the top of the list while a queue of
  the org has entries, as
  [The Merge queue group](../../docs/protocol/merge-queue-in-the-app.md#the-merge-queue-group)
  says. `groupWorkspaces` leaves each queued workspace out of the
  sections, and `placeWorkspaces` places its live sub-workspaces under the
  nearest workspace above them that is not queued, as for an archived
  parent (decision 318). The list read alone carries the entry, so a
  newer record of a listed row keeps it on the same branch. The group
  has one block for each repository, in the order of the repositories,
  and a block names its repository only while two or more queues have
  entries. A line of the shared `MergeQueue.module.css` joins the marks
  of a block. The group collapses for this view only, as the Archived
  group does, because the collapse has no stored value.
- A member with write access drags an entry inside its block, by a long
  press on a phone, or moves it by Alt with Up or Down. Each moves the
  whole unit of the entry. During each drag of a row of a section, the
  group shows as a drop target. A row that can join takes the outline of
  the block of its repository, or the zone of the group when that
  repository has no queue with entries, or when the group is collapsed.
  A row that cannot join names its reason there and takes no drop. Add,
  Remove, and each move show at once, and go back with a toast when the
  Worker refuses them. The list then reads again, because the Worker can
  change more entries, such as the lower pull requests of a member stack.
- A move of a workspace row by keys keeps the focus on the row. The list
  gives back only a lost focus, as a layer does: when a render takes the
  focused row out of the page and the focus falls to the page, the
  new link of the same workspace takes it, also after a failed move puts
  the row back. When the user moves the focus away, a later read of the
  list leaves the focus there. Focus on any row control counts, including
  Archive. A replacement row takes the focus on its workspace link.
- An editor of a saved value, such as a script or the org name, stays
  mounted through its saves (`useSavedDraft`). When the saved value
  changes, a draft that the user did not change takes the new value, and
  an edited draft stays. A draft that equals the one that went out for a
  save takes the value of the answer. A failed save keeps the draft.
- A form with several fields, such as the automation page, applies these
  rules to each field on its own (`eachField`). A field that the user did
  not change takes the field of the newer saved value, and an edited field
  keeps its edit. So a save sends only the fields that the user changed,
  and a field that changed elsewhere, such as Active after a turn-off,
  shows its new value.
- In such a form, a field that went out for a save keeps its value while
  the save waits, also when a newer saved value arrives in that time, so
  no read acts as the answer of the save. When the save succeeds, each
  field that still equals what went out takes the field of the latest
  saved value. When the save fails, the draft stays.
- Save keeps the focus when a save leaves nothing to save
  (`ActionButton` with `keepFocus`). A browser takes the focus from a
  natively disabled button, so Save stays a native button while it has
  the focus: it looks off, its wrapper says `aria-disabled`, and a press
  does nothing. When the focus leaves, Save is natively disabled.
- New workspace opens as the page or as a dialog over the current
  screen, as [Page or dialog](../../docs/protocol/create-a-workspace.md#page-or-dialog)
  says. Each of its places opens it through `useNewWorkspace`: the row at
  the top of the list, the button of the main area of an org, the item in
  the menu of a section, and the command palette. The dialog opens on a
  computer when the account's view is the dialog. The server gives the
  dialog to an account without a saved view. The place opens the page on
  a phone, when the account's view is the page, while the account loads,
  and while a New workspace form shows. A New workspace form marks itself with `useShownForm`. The
  row stays a link, so a click with a modifier key opens the page in a
  new tab.
- Every desktop frame hosts the dialog, over the whole frame
  (`NewWorkspaceHost`). The frame with the rail and a page alone, such as
  Create org, get it from `DesktopLayers`, with the layer of sheets and
  dialogs, the command palette, the Feedback dialog, and the main area.
  The dialog has no address: it closes in the same render as a change of
  the address, also
  while its create runs. A phone frame has no dialog.
- Escape and a press outside close the dialog, except while the create
  runs. An action of the dialog that opens another page, such as Connect
  or Choose repositories, closes the dialog first.
- The dialog and the page of one org and section share one draft:
  `OrgModel.newWorkspace(sectionId)`. So a close keeps the message, its
  files, and its branch. The menu of General, the default section, opens New workspace
  with no section, as the row does, so General keeps one draft. A create that the server accepts opens the new workspace, also
  when the dialog closed while the create ran. A failed create request
  keeps the dialog open with Try again.
- The section of a draft is its key, and a pick of the Section menu of
  the dialog (`NewWorkspaceModel.setSection`) wins over it. The pick stays
  in the draft of the key, so the page of that key names the picked
  section too. A send ends the pick.
- The message field of the dialog takes the focus as the dialog opens.
  When the dialog closes and the address stays, the focus goes back to
  the control that opened it. When the address changes, such as after
  Connect, Choose repositories, a create, or Back, the main area of the
  new screen takes the focus (`requestScreenFocus`), so the next Tab
  moves into that screen. A page alone, such as Create org, has such a
  main area too. The main area is no tab stop: it can take the focus
  only for such a move, until the focus leaves it. On a phone, no main
  area takes it.
- The page and the dialog share their form (`useNewWorkspaceForm`): the
  repository picker, the branch control with its target choice, as
  [Start from a branch](start-branch.md) says, the notices, the send, and
  one readiness. In an org
  without chosen repositories, an admin gets Choose repositories, and a
  member who is not an admin reads that an admin chooses them, as the
  empty page of the org says. Both ask only after the repositories load.
- New workspace sends and uploads one at a time: the create waits for the
  files, and the paperclip is off while the create runs. Send, Create, Try
  again, and Enter read one readiness: the text outside the chips of its
  files, the files of its chips, a login that serves the agent in the org,
  the own login or the org login, the image of the org, the
  repository and its build, the model, and an org that is not suspended.
  In a suspended org, the refused bar takes the place of the composer of
  the dialog, as on the page.
- While the builds of the org show no good image, New workspace shows the
  notice of the first build on the page and in the dialog, as
  [Create a workspace](../../docs/protocol/create-a-workspace.md#before-the-first-good-build)
  says, and Send, Create, and Try again stay off. The shared form watches
  the builds and owns the notice. Its words come from the shared
  `firstBuildCopy.ts`. When the repositories reply shows a
  good image, through `imageReady` or a ready repository, the builds are
  older, and the notice gives way. `imageReadyOf` reads every repository
  of the reply, also one that the org no longer chose. While the builds
  load or after a failed load, the notice of the first build does not
  show. Send still stays off for a repository that the reply gives
  `ready: false`. A reply of a previous
  Worker has no `ready`. Send can then go, and the Worker refuses a create
  of an org with no good image.
- The shared form shows the
  [waiting repositories](../../docs/protocol/create-a-workspace.md#waiting-repositories):
  off in the repository menu, with the note of `menuNotes`, and in the
  notice over the composer while the repository of the form waits, with
  the words of `waitingFormText`. The note of the cloud computer under the
  picker then gives way. A chosen repository waits when the repositories
  reply gives it `ready: false`, also while the builds load, after a
  failed load, or with older builds (`waitsForBuild`). With `ready: true`,
  it stays on in each case. Without `ready`, the repositories that
  `BuildsResponse.changes` lists as added wait. The builds give how a
  repository waits. Without an answer of the builds, the note and the
  notice name the next build.
- Before the first good build, no repository waits, so this notice and the
  notice of the first build never show together. The form knows that time
  from `imageReady: false`. Without that field, the builds list no added
  repository in that time.
- When the builds show a build that ended or a new image, the repositories
  read again, as [Data lifecycle](data-lifecycle.md) says. A waiting
  repository turns on when that answer gives it `ready: true`. Until then,
  it keeps its notice. Without `ready`, it turns on when the builds no
  longer list it. A draft keeps the repository that the form showed at its
  first text or file (`NewWorkspaceModel`), so a repository that turns on
  moves no written draft.
- Every composer reads its send key through `useSendKey`: the chat, the
  page and the dialog of New workspace, and the Feedback dialog. On a
  computer, Enter sends and Shift+Enter adds a
  line, as [The send key](../../docs/protocol/create-a-workspace.md#the-send-key)
  says. Enter does nothing while the message cannot go, and it belongs to
  an input method that composes a word. In the phone layout, Enter adds a
  line.
- The page and the dialog of New workspace use the chip text field of the
  chat as their message field, as
  [The message field](../../docs/protocol/workspace-links.md#the-message-field)
  says. `OrgLinks` gives its chips the workspaces of the org, which the
  form watches while it shows. The page shows 2 to 8 lines, as the chat
  does, and the dialog shows 7 to 14 lines. The field of the dialog takes
  the focus through the handle of the field. While a create runs, the
  field takes no change, and it keeps the focus.
- The page and the dialog give their field `NewWorkspaceModel.filesSource`.
  So each attached file of the draft is a chip in the text, as
  [The message field](../chat/message-field.md) says. A pick attaches its
  files with `NewWorkspaceModel.attach`, and puts their chips at the caret,
  or at the end, in the same event. The page box and the whole dialog card
  take a drop of files, except during a create and in a suspended org. The
  files of the draft follow its marks, and a create that succeeds or a
  sign-out ends them, as
  [Attached files of a draft](../chat/draft-files.md) says.
- The page and the dialog have the Capabilities icon, the Blocks icon with
  its label as a native tooltip (secrets decision 6 G). On a computer the
  page and the dialog show it after the attach button. Its control opens
  above the icon. On a phone, one + button, "More options",
  holds Attach files and Capabilities, which opens the control as a sheet
  (secrets decision 16 G). The control lists the secrets of the org, which
  it reads each time that it opens, with a checkbox that pre-approves each
  one for the new workspace. A secret for all agents stays checked and
  off. The draft keeps the choices, the create sends them, and a create
  that succeeds ends them, so the next draft starts again from the
  defaults. The create leaves out each pre-approved secret that the last
  read no longer lists, and a refusal of a missing secret reads the
  secrets again for Try again.
- In the Mac app, the control also shows the switch of Mac access, a
  choice of the draft that starts off. The create does not send it. After
  the create, the page starts the grant until Stop of the new workspace on
  this Mac, only while the switch was on. A start that fails shows as a
  notice in the new workspace, with Try again. A browser shows no Mac
  access part, and starts no grant.
- The automation page gives its owner the same icon before the model
  picker, in the bar of the prompt box. Its control has the secrets part
  only, with no Mac access. On a phone the icon stays in the bar and opens
  the control as a sheet. A change of the checks turns Save on, and the
  icon is off while a save runs. Under the prompt, every member reads the
  line that names the chosen secrets. While the triggers hold a pull
  request trigger, the pull request hint follows that line. For the owner,
  both follow the form. For another member, both follow the saved
  automation.
- The Secrets tab of the org settings follows the Agents tab (secrets
  decisions 2, 3, and 6). Its rights come from `secretRights` in
  `permissions.ts`: every member adds secrets, a member replaces and
  deletes only the secrets that the member added, and an admin replaces
  and deletes each one, switches the mark for all agents, and reveals one
  value at a time. A suspended org shows the tab with no action. The list
  shows each value as dots, and the reader of the list keeps no value from
  a reply. A revealed value shows on its own line with Copy and Hide, and
  a new reveal, a Replace of its value, and its Delete hide it. Replace
  sends only the fields that changed, and an empty new value keeps the
  stored value. Delete asks first.
- A create request that fails keeps the message in the form, with "The
  workspace wasn't created". Try again sends the same message ID. A
  refusal of the branch check names its cause and its own action, as
  [Refusals of the branch check](start-branch.md#refusals-of-the-branch-check)
  says. A failed first start keeps its workspace instead, as
  [Creation recovery](creation-recovery.md#a-failed-first-start) says.

## The waitlist

[Waitlist](../../docs/protocol/waitlist.md) and
[Invite and referral codes](../../docs/protocol/waitlist-codes.md) state
the requirements. The mockups `app/sign-in/waitlist`, `app/sign-in/join`,
`mac-app/waitlist`, and `app/account/invites` draw the screens.

- A session without app access shows only the waitlist, at every address,
  also at `/operator`. `Waiting` in `../shell/waitlist/` shows it. Get
  started, the rail, and the command palette stay closed.
- The waitlist shares `SignInFrame` with the sign-in. It names the address
  of the approval email, or, without a verified email, promises no email.
  It shows the invitations of the person with Accept, the code field with
  Use code, and the GitHub account with Sign out. Its words come from
  `waitlistCopy.ts`.
- A typed code that does not work shows its reason under the field, and
  the field keeps its text. The pause shows above the field, and only
  after it stopped a code. Use code with an empty field moves the focus to
  the field and sends nothing.
- When the pause stops an Accept, a notice above the invitations says so,
  and the invitation stays. Another failed Accept shows its cause with Try
  again, as the invitations of `/` do.
- In the Mac app on desktop, the header of the waitlist is the top bar of
  the window. It moves the window, and in a window it keeps the space of
  the window buttons free. The page has no strip of window controls. A
  phone layout keeps the strip of `PhoneFrame`, as other pages do.
- A visitor who is not signed in at a join link, `/join/<code>`, gets the
  sign-in with the code of the link. Continue with GitHub carries the code
  in `acceptedTermsSignInPath`.
- For a person who waits, a join link changes the address to `/` and uses
  its code at once. The loading state shows while the code runs. A code
  that does not work shows the notice of its reason above the empty field.
  The `invite_code_error` of a failed sign-in shows its notice and uses
  the code no more.
- For a person with app access, a join link uses no code, and `/` opens as
  usual.
- The General tab of the Account page ends with the invite code of the
  user: the invite link with Copy, the code, and the invites
  left. It has the states of the pause, of every invite used, and of a code
  that an operator turned off. During [open sign-up](../../docs/protocol/sign-ups.md#open-sign-up),
  it shows the open sign-up notice while invites remain. The pause wins.
  Its words come from `inviteCodeCopy.ts`.
