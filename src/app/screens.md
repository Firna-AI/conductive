# Screens

This guide belongs to [Web app: data and composition](README.md). It
gives the rules of the screens of the app shell: the account and Get
started, sign-in, invitations, orgs, panels and layers, the focus, saved
drafts, New workspace as a page or a dialog, and
[the waitlist](#the-waitlist).
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
  Get started lists those orgs with Restore before its steps. The agent step follows the logins of the account. So a leave of
  the last org offers Create org again, and a connect on Account completes
  its step at once. `setupSteps` in `setup-steps.ts` derives them, and each
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
- The rail, the org switcher, and General show the saved initials of an
  org. An org without them shows the initials of its name.
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
  [The repository notice](../../docs/protocol/org-image.md#the-repository-notice)
  says, so each of these tabs reads the builds while it shows. Its state
  comes from `repositoryWaitOf`, and its words and its look from
  `repositoryChangeCopy.ts` and `RepositoryNotice.tsx` of the mockups. In
  a suspended org it names no admin who can act. The build history stays
  closed while a change of the install script or of the repositories
  waits for a build.
- A save of the install script and each repository save read the builds
  again, so the notices and the build that an add starts show at once.
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
- A form with several fields, such as the routine page, applies these
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
  `OrgModel.newWorkspace(sectionId)`. So a close keeps the message and its
  files. The menu of General, the default section, opens New workspace
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
  repository picker, the notices, the send, and one readiness. In an org
  without chosen repositories, an admin gets Choose repositories, and a
  member who is not an admin reads that an admin chooses them, as the
  empty page of the org says. Both ask only after the repositories load.
- New workspace sends and uploads one at a time: the create waits for the
  files, and the paperclip is off while the create runs. Send, Create, Try
  again, and Enter read one readiness: the text outside the chips of its
  files, the files of its chips, the agent login, the image of the org, the
  repository and its build, the model, and an org that is not suspended.
  In a suspended org, the refused bar takes the place of the composer of
  the dialog, as on the page.
- While the builds of the org show no good image, New workspace shows the
  notice of the first build on the page and in the dialog, as
  [Create a workspace](../../docs/protocol/create-a-workspace.md#before-the-first-good-build)
  says, and Send, Create, and Try again stay off. The shared form watches
  the builds and owns the notice. Its words come from
  `firstBuildCopy.ts` of the mockups. While the builds load or after a
  failed load, no notice shows, and the Worker refuses a create of an org
  with no good image.
- The shared form shows the
  [waiting repositories](../../docs/protocol/create-a-workspace.md#waiting-repositories)
  that `BuildsResponse.changes` lists as added: off in the repository
  menu, with the note of `menuNotes`, and in the notice over the
  composer while the repository of the form waits, with the words of
  `waitingFormText`. The note of the cloud computer under the picker then
  gives way. The Worker lists no waiting repository before the first good
  build, so this notice and the notice of the first build never show
  together. The builds read again while a build runs, so a waiting
  repository turns on when a build that holds it succeeds. A draft keeps
  the repository that the form showed at its first text or file
  (`NewWorkspaceModel`), so a repository that turns on moves no written
  draft.
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
- A create request that fails keeps the message in the form, with "The
  workspace wasn't created". Try again sends the same message ID. A failed
  first start keeps its workspace instead, as
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
- The Account page ends with the invite code of the user, after the model
  of new workspaces: the invite link with Copy, the code, and the invites
  left. It has the states of the pause, of every invite used, and of a code
  that an operator turned off. During [open sign-up](../../docs/protocol/sign-ups.md#open-sign-up),
  it shows the open sign-up notice while invites remain. The pause wins.
  Its words come from `inviteCodeCopy.ts`.
