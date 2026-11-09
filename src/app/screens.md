# Screens

This guide belongs to [Web app: data and composition](README.md). It
gives the rules of the screens of the app shell: the account and Get
started, sign-in, invitations, orgs, panels and layers, the focus, saved
drafts, and New workspace.

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
- On desktop, the toggle at the end of the workspace header hides the
  right column and shows it again. The choice holds for every workspace
  of the tab until the page closes. A hidden column stays mounted, so its
  file lists keep their connection and the terminal keeps its session.
- A sheet or a dialog makes the rest of its frame inert through
  `OverlayHost`. It keeps Tab and Shift+Tab inside, also from the layer
  itself and from a text field. When it closes, the frame is active again
  before the focus goes back to the trigger. A desktop menu leaves the
  frame active.
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
  repository, and the model.
- A create whose sandbox did not start gets its own New workspace form in
  the tab that sent it. The address of that workspace shows the form, with
  "The workspace wasn't created". Try again sends the same message ID, as
  [Creation recovery](creation-recovery.md#the-returned-form) says.
