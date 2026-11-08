# Screens

This guide belongs to [Web app: data and composition](README.md). It
gives the rules of the screens of the app shell: the account and Get
started, sign-in, invitations, orgs, panels and layers, the focus, saved
drafts, and New workspace as a page or a dialog.

- The app runs every cloud computer in its own Boat account, so no org has
  a Boat key. The app has no key screen, tab, notice, or Get started step,
  and no text of the app names Boat.
- Get started has three steps: the GitHub App, an org, and Claude or
  Codex. A reply of the API names only these steps.
- Only the GitHub App step comes from that reply. The org step and the org
  of Get started follow the org list, also a deleted org, as the address
  `/` does. The agent step follows the logins of the account. So a leave of
  the last org offers Create org again, and a connect on Account completes
  its step at once. `setupSteps` in `setup-steps.ts` derives them, and each
  screen reads them through `AppModel.getStarted`.
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
- The account has two tabs, General and Preferences, as the org settings
  have. Each tab is a link with its own address. General holds the
  sign-in, This Mac, GitHub, and the agents. The `?connect=` address of an
  agent opens its Connect form on General. Preferences holds the New
  workspaces section: Model and effort, and
  [the choice of how New workspace opens](../../docs/protocol/create-a-workspace.md#the-preference).
- The account of the Mac app shows This Mac after the sign-in section. A
  browser shows none and asks no Mac.
- Create org asks for the name and the initials, and lists the
  repositories that the person and the GitHub App both reach, from
  `AccountModel.repositories`, before the org exists. The create sends the
  GitHub IDs of the chosen ones.
- The rail, the org switcher, and General show the saved initials of an
  org. An org without them shows the initials of its name.
- A suspended org shows its notice, and no action that it refuses, as
  [A suspended org](suspended-org.md) says.
- The Cloud computer tab names the software of the base image from the
  settings reply. An older reply without it names no software.
- A step of a panel, by a key or a drag, starts from the width that the
  panel shows. It stays in a range that holds that width, so a shrink
  never widens a panel that the layout shows narrower than its range. A
  step that ends at its start width stores nothing.
- A sheet or a dialog makes the rest of its frame inert through
  `OverlayHost`. It keeps Tab and Shift+Tab inside, also from the layer
  itself and from a text field. When it closes, the frame is active again
  before the focus goes back to the trigger. A desktop menu leaves the
  frame active.
- Each sheet and dialog is a modal layer through `useModalLayer`. A press
  outside it does not move the focus, so the focus goes back to the
  trigger also after a press outside.
- Escape closes only the newest open layer, such as a menu in a dialog.
  A press outside closes each layer that it misses.
- A move of a workspace row by keys keeps the focus on the row. The list
  gives back only a lost focus, as a layer does: when a render takes the
  focused row link out of the page and the focus falls to the page, the
  new link of the same workspace takes it, also after a failed move puts
  the row back. When the user moves the focus away, a later read of the
  list leaves the focus there.
- An editor of a saved value, such as a script or the org name, stays
  mounted through its saves (`useSavedDraft`). When the saved value
  changes, a draft that the user did not change takes the new value, and
  an edited draft stays. A draft that equals the one that went out for a
  save takes the value of the answer. A failed save keeps the draft.
- Save keeps the focus when a save leaves nothing to save
  (`ActionButton` with `keepFocus`). A browser takes the focus from a
  natively disabled button, so Save stays a native button while it has
  the focus: it looks off, its wrapper says `aria-disabled`, and a press
  does nothing. When the focus leaves, Save is natively disabled.
- New workspace opens as the page or as a dialog over the current
  screen, as [Page or dialog](../../docs/protocol/create-a-workspace.md#page-or-dialog)
  says. Each of its places opens it through `useNewWorkspace`: the row at
  the top of the list, the button of the main area of an org, and the
  item in the menu of a section. The dialog opens on a computer when the
  user chose it. The place opens the page on a phone, without that
  choice, while the account loads, and while a New workspace form shows.
  A New workspace form marks itself with `useShownForm`. The row stays a
  link, so a click with a modifier key opens the page in a new tab.
- The desktop frame hosts the dialog, over the whole frame
  (`NewWorkspaceHost`). The dialog has no address: it closes in the same
  render as a change of the address, also while its create runs. A phone
  frame has no dialog.
- Escape and a press outside close the dialog, except while the create
  runs. An action of the dialog that opens another page, such as Connect
  or Choose repositories, closes the dialog first.
- The dialog and the page of one org and section share one draft:
  `OrgModel.newWorkspace(sectionId)`. So a close keeps the message and its
  files. The menu of General, the default section, opens New workspace
  with no section, as the row does, so General keeps one draft. A create that the server accepts opens the new workspace, also
  when the dialog closed while the create ran. A failed create request
  keeps the dialog open with Try again.
- The message field of the dialog takes the focus as the dialog opens.
  When the dialog closes and the address stays, the focus goes back to
  the control that opened it. When the address changes, such as after
  Connect, Choose repositories, a create, or Back, the main area of the
  new screen takes the focus (`requestScreenFocus`), so the next Tab
  moves into that screen. The main area is no tab stop: it can take the
  focus only for such a move, until the focus leaves it. On a phone, no
  main area takes it.
- The page and the dialog share their form (`useNewWorkspaceForm`): the
  repository picker, the notices, the send, and one readiness. In an org
  without chosen repositories, an admin gets Choose repositories, and a
  member who is not an admin reads that an admin chooses them, as the
  empty page of the org says. Both ask only after the repositories load.
- New workspace sends and uploads one at a time: the create waits for the
  files, and the paperclip is off while the create runs. Send, Create, Try
  again, and Enter read one readiness: the text, the files, the agent
  login, the repository, the model, and an org that is not suspended. In
  a suspended org, the refused bar takes the place of the composer of the
  dialog, as on the page.
- Every composer reads its send key through `useSendKey`: the chat, the
  page, and the dialog. On a computer, Enter sends and Shift+Enter adds a
  line, as [The send key](../../docs/protocol/create-a-workspace.md#the-send-key)
  says. Enter does nothing while the message cannot go, and it belongs to
  an input method that composes a word. In the phone layout, Enter adds a
  line.
- A create whose sandbox did not start gets its own New workspace form in
  the tab that sent it. The address of that workspace shows the form, with
  "The workspace wasn't created". Try again sends the same message ID, as
  [Creation recovery](creation-recovery.md#the-returned-form) says.
