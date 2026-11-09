# Screens

This guide belongs to [Web app: data and composition](README.md). It
gives the rules of the screens of the app shell: the account and Get
started, sign-in, invitations, orgs, panels and layers, the command
palette, the focus, saved drafts, and New workspace. The
[command palette protocol](../../docs/protocol/command-palette.md) states
what the palette does.

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
- The account of the Mac app shows This Mac after the sign-in section. A
  browser shows none and asks no Mac.
- Each connected login of the account shows its share switch, "Let other
  members use this login", and Get started shows none. The switch saves
  at once through `AccountModel.setNoReuse`. While it saves, it shows the
  new value and takes no other change. A failed save shows its cause under
  the switch until the next change, and the switch shows the saved value.
  A share reply that a later save or remove of the same login overtook does
  not show, so a removed login stays removed.
- Create org asks for the name and the initials, and lists the
  repositories that the person and the GitHub App both reach, from
  `AccountModel.repositories`, before the org exists. The create sends the
  GitHub IDs of the chosen ones. Create org stays off until the person
  chooses at least one, also while the list is empty or did not load.
- The rail, the org switcher, and General show the saved initials of an
  org. An org without them shows the initials of its name.
- A suspended org shows its notice, and no action that it refuses, as
  [A suspended org](suspended-org.md) says.
- The Cloud computer tab names the software of the base image from the
  settings reply. An older reply without it names no software.
- The notice of a changed install script has the same words for an admin
  and a member, from `changedScriptNotice`. Until the org has a good build,
  it says that one more build runs the script while the first build runs,
  and else that the next build runs it. Until the builds load, it says
  only that the next build runs it. An admin gets Build computer in the
  notice only once the org has a good build, because before that the head
  of the builds offers Try again or Build computer. A member never gets it.
- A step of a panel, by a key or a drag, starts from the width that the
  panel shows. It stays in a range that holds that width, so a shrink
  never widens a panel that the layout shows narrower than its range. A
  step that ends at its start width stores nothing.
- A sheet or a dialog makes the rest of its frame inert through
  `OverlayHost`. It keeps Tab and Shift+Tab inside, also from the layer
  itself and from a text field. When it closes, the frame is active again
  before the focus goes back to the trigger. A desktop menu leaves the
  frame active.
- The command palette is a layer of each frame: `PaletteLayer` sits in
  the `OverlayHost` of the frame, and the open palette holds the frame
  inert, as a sheet or a dialog does. Its search field takes the focus,
  and `trapTab` keeps Tab inside. When a control that has the focus goes
  away, such as a filter after a change of the tab, the field takes the
  lost focus back. When the palette closes, the frame is active again
  before the focus goes back.
- Escape closes the palette from its own element, in the capture phase
  of React. An open menu of a filter hears Escape first, on the document,
  and stops it, so Escape closes only that menu. A press outside closes
  the desktop dialog, and Cancel closes the phone page. A change of the
  address and a sign-out close the palette too.
- The palette key comes from `AppServices.onKey`, which hears each key in
  the capture phase and not as a passive listener, so the palette can
  stop the browser's own action. Every UI kit of the app notes its open
  menus and modal layers through `useMenuLayer` and `useModalLayer` of
  `../shell/ui/layers.ts`: the shell, the chat, and the members UI. A
  menu says whether it closed, and a menu whose change runs refuses. A
  modal layer has an owner: the dialog of the palette has the palette.
  The owner of the terminal marks its element with `usePaletteTerminal`,
  where Ctrl+K stays with the terminal.
- `PaletteController.show` is the one way to open the palette, for the
  key and for the Search row. It opens only when no dialog or sheet of
  another owner holds the input, and when every open menu closed. The
  key closes an open palette, and does nothing while a dialog or a sheet
  of another owner is open over it, such as the sheet of a filter.
- A part of the page offers its actions to the palette while it shows,
  through `usePaletteOffer`: the workspace screen, the workspace list
  that the page shows, and the sidebar toggle of the Mac app. A row
  closes the palette first. Its action runs once the palette has left
  the page, so a field that the action opens can take the focus, and a
  question shows alone.
- `AppModel.lastOrg` keeps the org that the tab opened last, in memory
  only. The Account sidebar of the Mac app and the palette on a page
  without an org read it through `keptOrg`.
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
- New workspace sends and uploads one at a time: the create waits for the
  files, and the paperclip is off while the create runs. Send and Try
  again read one readiness: the text, the files, the agent login, the
  image of the org, the repository, and the model.
- While the builds of the org show no good image, New workspace shows the
  notice of the first build over the composer, as
  [Create a workspace](../../docs/protocol/workspaces-and-sandboxes.md#create-a-workspace)
  says, and Send and Try again stay off. Its words come from
  `firstBuildCopy.ts` of the mockups. While the builds load or after a
  failed load, no notice shows, and the Worker refuses a create of an org
  with no good image.
- A create whose sandbox did not start gets its own New workspace form in
  the tab that sent it. The address of that workspace shows the form, with
  "The workspace wasn't created". Try again sends the same message ID, as
  [Creation recovery](creation-recovery.md#the-returned-form) says.
