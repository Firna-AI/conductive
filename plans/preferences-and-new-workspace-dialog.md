# Preferences and the New workspace dialog

Status: Active. On branch `calummoore/user-preferences-screen`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 8 November 2026 the user asked for a Preferences screen in the user
settings. The same request asked that a new chat can open as a dialog, as
in a screenshot of the New workspace dialog of Conductor, or as the
current page. In Conductive the user settings are the Account page. A new
chat is a new workspace, because its first message creates the workspace.
This change adds a Preferences tab to the Account page. Its new preference
chooses whether New workspace opens as the current page or as a dialog
over the current screen. The request chose this approach, so no brainstorm
ran.

The change does not cover other preferences, a create in the background,
a picker for the section, or the menu beside Create in the screenshot.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md), which
  Milestone 2 moved out of
  [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md).
- The [web app README](../src/app/README.md) and its
  [Screens](../src/app/screens.md) page.
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Design

Each line that starts with "Agent call" is a design call of the agent, made
on 8 November 2026. The user can change it before the plan is approved.

### The Preferences tab

- The Account page gets two tabs, General and Preferences, as the org
  settings have tabs. Each tab is a link with its own address: `/account`
  and `/account/preferences`. The `?connect=` address still opens the
  Connect form of an agent on General.
- Agent call: tabs give Preferences its own screen, as the request asks,
  and they follow the org settings. A section on the Account page was
  rejected, because the request asks for a screen. A separate page with
  its own entry in the rail was rejected, because it adds an entry to the
  rail for a few settings.
- General keeps the sign-in, This Mac in the Mac app, GitHub, and the
  agents. The New workspaces section, with Model and effort, moves to
  Preferences, as decision 142 says. Its description changes to fit both
  rows, because "Each message can change them" does not fit the way that
  New workspace opens.
- The New workspaces section gets a row for the way that New workspace
  opens, with two choices: a page and a dialog. A segmented control shows the choice, as
  the Connect form of an agent does. Each change saves at once, as Model
  and effort does. The mockups give the words: the section says "How you
  start new workspaces.", the row says "Open New workspace in" with
  "Page" and "Dialog", and its helper line says "A phone always opens the
  page."
- Agent call, after the mockups: a failed save of the row shows "The
  choice wasn't saved. Try again." under the control, in the error line of
  the segmented control, and the row keeps the saved choice. Model and
  effort keeps its toast. A toast for the new row was rejected, because
  the error line of the control is closer to the choice.

### The stored choice

- Agent call: the choice belongs to the account. The Worker stores it in
  D1 beside the default model, so it follows the user to each browser and
  to the Mac app. Storage in the browser was rejected, because a setting
  on the Account page that holds for one browser would surprise the user.
  The web app also keeps only the panel widths in the browser.
- Agent call: a new account gets the page, the current behaviour. The
  request asks to allow the dialog beside the page, so the page stays the
  default.
- Agent call: a migration rebuilds `user_preferences`, so that the
  default model can be unset, and adds the nullable `new_workspace_view`
  column. An unset value uses the default of the app. So a save of the
  choice stores no default model, and a user who never chose a model
  still gets the configured default. A second table was rejected, because
  it splits the preferences of one user. A column on `users` was rejected,
  because it mixes the identity with the preferences. A row with the
  configured model was rejected, because it freezes that model for the
  user.
- Agent call: `PUT /api/account/new-workspace-view` takes `{ view }` and
  answers `{ view }`, as `PUT /api/account/default-model` does. The
  account reply gains `newWorkspaceView`. A value other than `page` or
  `dialog` gets HTTP 400 with the code `invalid_input`, as the other
  account writes do.

### The dialog

- New workspace opens the dialog from three places: the row at the top of
  the list, the button of an org without workspaces, and the item in the
  menu of a section. A workspace from the menu of a section goes into
  that section, as on the page.
- Agent call: a phone always opens the page. A phone shows a dialog as a
  sheet that fills the screen, as the page already does, and the page has
  an address. The Preferences row says so. A window narrower than 640 px
  has the phone layout, so it opens the page too.
- Agent call: the dialog has no address. The address of New workspace
  always shows the page. So links, a reload, a new tab, and the returned
  form of a failed start keep working. A click with a modifier key on the
  row at the top of the list opens the page in a new tab, as a link does.
- Agent call: the dialog follows the screenshot with the parts of
  Conductive. The repository picker is at the top left, and the org and
  the section of the new workspace are at the top right. The message and
  its files fill the middle. The model picker is at the bottom left, and
  the attach button and Create are at the bottom right. The visibility
  and the person picker of the screenshot were left out, because
  Conductive has no visibility of a workspace and the creator owns it.
  The menu beside Create was left out, because the screenshot does not
  show its choices.
- Agent call: the button of the dialog reads Create, as in the
  screenshot. The page keeps its Send arrow, because its composer looks
  like the chat that it becomes.
- The dialog shows the notices of the page: a missing agent login, a
  failed create with Try again, and an org without chosen repositories,
  with Choose repositories for an admin.
- Agent call, after the mockups: the dialog shows only a failed create
  request. A create that the server took closes the dialog. When the
  sandbox of that workspace then does not start, the message comes back
  in the form of the page, at the address of the workspace, as
  [Creation recovery](../src/app/creation-recovery.md) says.
- Agent call, after the mockups: the dialog always names the org and the
  section, also General. The page keeps its subtitle.
- Agent call, after the mockups: in an org without chosen repositories,
  the dialog and the page tell a member who is not an admin that an
  admin chooses them, as the empty page of the org does. The page told
  such a member to choose them, which a member cannot do.
- Agent call: an action of the dialog that opens another page, such as
  Connect Claude or Choose repositories, closes the dialog first. The
  dialog also closes when the address changes, such as with the Back
  button of the browser. The draft stays in each case.
- Agent call: the dialog and the page share the draft of their org and
  section. A close of the dialog keeps the draft, as a move away from the
  page does. So no close loses a message.
- Agent call: Escape and a press outside close the dialog, except while
  the create runs. After the create, the dialog closes and the app opens
  the new workspace, as the page does. A create in the background was
  left out, because it needs a new notice for a create that finished.
- The message takes the focus when the dialog opens. The focus goes back
  to the trigger when the dialog closes, as for the other dialogs.
- On a computer, Enter sends the message from every composer, and
  Shift+Enter adds a line, as decision 143 says. So Enter creates the
  workspace from the dialog and from the page. One shared key rule serves
  the chat, the page, and the dialog. On a phone, Enter adds a line.
- Agent calls after the protocol draft, each the way the app already
  works elsewhere:
  - Back during a create closes the dialog. The create goes on, and the
    app opens the new workspace when the server accepts it, as the page
    does.
  - A window with the phone layout gets the key rule of a phone, as the
    chat does today.
  - When the dialog closes and another screen opens, that screen takes the
    focus. The trigger gets the focus back only when the screen stays.
  - While the screen shows a New workspace form, New workspace opens the
    page, because a dialog over a form would show a second message field.
  - An open app uses a choice that the user saved in another browser after
    its next start, as for Model and effort.
  - While the message cannot go, Enter does nothing. While an input method
    composes a word, Enter belongs to the input method, as in the chat.

### The protocol doc

- Agent call: Milestone 2 moves the section Create a workspace to its own
  page and adds the new rules there. The `documentation` skill splits a
  long doc that a change touches, and this change touches only that
  section. The rest of the split stays with the follow-up item
  [Five protocol docs pass the length target](follow-ups/protocol-docs-split.md),
  because other open workspaces edit the other sections.

## Decisions

The user answered both decisions on 8 November 2026. The options check of the
`plans` skill ran over them on 8 November 2026. It added options C and D
to decision 142. It added options D and E and a wider root question to
decision 143. It kept both recommendations. Its report is
`.context/preferences-and-new-workspace-dialog/options-check.md`.

### 142. Choose where the default model of new workspaces lives

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Mockup.
- **Location:** `src/shell/account/AccountSections.tsx:55` and `docs/mockups/src/components/settings/AccountSections.tsx:150`.
- **Terms:**
  - **New workspaces section:** the part of the Account page with Model and effort: the model and the effort that each new workspace starts with.
- **Background:** The Account page shows the sign-in, This Mac in the Mac app, GitHub, the agents, and the New workspaces section. This plan gives the page two tabs, General and Preferences. Preferences gets the new choice of how New workspace opens.
- **Problem:** When Model and effort stays on General, the two settings of new workspaces sit on two tabs.
- **Impact if no action:** The user looks in two places to set how new workspaces start.
- **Root question:** Where does the user set how new workspaces start?
- **Options:**
  - **A.** Keep the New workspaces section on General. Preferences holds only the new choice. General does not change. Effort: Small.
  - **B.** Move the New workspaces section to Preferences, and add the new choice to it. General then holds the sign-in, This Mac, GitHub, and the agents. Effort: Small.
  - **C.** Added by the options check. Remove Model and effort from the Account page. The Worker saves the model and the effort of each workspace that the user creates as the new default, for the next New workspace and for the agent tools. It deletes a control that is on `origin/main`, and a choice for one task changes later workspaces without a word, also the ones that agents create. Effort: Medium.
  - **D.** Added by the options check. Move the section to Preferences, as B does, and add "Use as default" to the model picker of the New workspace page and of the dialog. It adds a menu item, its save, and its error to the form, which the request does not ask for. Effort: Medium.
- **Left out:** The same section on both tabs, because B is better on every point: a second copy of one control adds nothing. A default in the org settings, because it breaks a requirement that stays: an agent tool gives a new workspace the default model of its owner, as [Agent tools](../docs/protocol/agent-tools.md) says.
- **Wider fix:** None. The item is a design question, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** B. All the settings of new workspaces then sit together, and General keeps the sign-in and the connections. Under A, the only row of Preferences does not apply on a phone.
- **Action:** ask the user, because B moves a control of the Account page, a visible change that the request does not cover.
- **Chosen:** B, by the user on 8 November 2026.

### 143. Choose the send key of each composer

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/new-workspace/Composer.tsx:72` and `src/chat/components/Composer.tsx:73`.
- **Terms:**
  - **Composer:** the message field with its buttons: in the chat of a workspace, on the New workspace page, and in the new dialog.
- **Background:** On a computer, Enter sends a message in the chat of a workspace, and Shift+Enter adds a line. On the New workspace page, Enter adds a line, and only Send creates the workspace. No doc, test, or plan records either key. The screenshot shows "Create ↵" in the dialog, so Enter creates the workspace there. On a phone, Enter adds a line in every composer.
- **Problem:** With the dialog, Enter creates the workspace in the dialog but adds a line on the page.
- **Impact if no action:** A user who changes the preference, or who sends chat messages with Enter, adds a line when they meant to create the workspace, or the reverse.
- **Root question:** Which key sends the message from each composer on a computer: the chat, the New workspace page, and the dialog?
- **Options:**
  - **A.** Enter creates only in the dialog, as in the screenshot. The page keeps Enter for a new line. Effort: Small.
  - **B.** Enter sends from every composer, and Shift+Enter adds a line, as in the chat today. The chat, the page, and the dialog use one shared key rule. The page changes. Effort: Small.
  - **C.** Enter adds a line on the page and in the dialog, and Cmd+Enter or Ctrl+Enter creates the workspace in both. The dialog then differs from the screenshot and from the chat. Effort: Small.
  - **D.** Added by the options check. Cmd+Enter or Ctrl+Enter sends from every composer, also in the chat, and Enter adds a line everywhere. It protects every composer from an accidental Enter. It changes the chat key on `origin/main`, which users already know, and the dialog differs from the screenshot. Effort: Small.
  - **E.** Added by the options check. A second preference on the Preferences tab chooses the send key of every composer: Enter, or Cmd+Enter and Ctrl+Enter. A new account gets Enter, as in B. It adds a stored column, a write route, a row on Preferences, and a read of the account in the chat. The request does not ask for it. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B. One shared key rule then sets the key of each composer, also of a later one.
- **Previous examples:** The key rule of the chat composer in `src/chat/components/Composer.tsx:60`.
- **Recommendation:** B. One rule in every composer is easier to learn, and the chat already teaches it.
- **Action:** ask the user, because B changes how the existing page reacts to Enter, which the request does not cover.
- **Chosen:** B, by the user on 8 November 2026.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Account mockup gets its two tabs. The New workspace dialog gets its
own page, and a user flow shows the way from Preferences to a created
workspace. Each screen has its desktop and its phone view.

- [x] Give `AccountScreen` in `docs/mockups/src/screens/` the tabs General
      and Preferences. Draw Preferences with the choice of how New
      workspace opens, in the New workspaces section that moves there
      from General. Give the section a description that fits both rows.
      Add the tab to `app/account`, and keep each page within five
      screens, as the `mockups` skill says.
- [x] Add a screen component for the dialog over a ready workspace, with
      its own page `app/new-workspace/dialog`. Draw the empty dialog,
      a draft with a file and the notice of a missing agent login, a
      failed create, and an org without chosen repositories. The phone
      view shows the page, because a phone always opens it.
- [x] Add a user flow: choose the dialog in Preferences, choose New
      workspace in the list, write the task in the dialog, and see the
      new workspace open.
- [x] Update `docs/mockups/catalogue.md` and `docs/mockups/design.md`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages in light
      and dark, and save the screenshots under
      `.context/preferences-and-new-workspace-dialog/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Screenshots and check logs: `.context/preferences-and-new-workspace-dialog/mockups/`
and `.context/preferences-and-new-workspace-dialog/m1-*.log`.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol states the preference and the dialog before the code
changes.

- [x] Move the section Create a workspace of
      `docs/protocol/workspaces-and-sandboxes.md` to the new page
      `docs/protocol/create-a-workspace.md`. Update each link to it, also
      in `docs/protocol/chat-and-events.md`, and add the page to the lists
      of protocol docs in `docs/architecture.md` and `README.md`.
- [x] Add the requirements of the new page: New workspace opens as a
      page or as a dialog, as the preference of the user says. The
      choice belongs to the account, and a new account gets the page. A
      phone always opens the page. The address of New workspace always
      shows the page. A close of the dialog keeps the message.
- [x] Add the key rule of decision 143 to the new page: on a computer,
      Enter creates the workspace from the page and from the dialog, and
      Shift+Enter adds a line, as in the chat.

## Milestone 3: The stored preference

Depends on: 2

The Worker stores the choice, and the account model of the web app reads
and saves it.

- [x] Reserve a free range for this plan in `migrations/README.md`, and
      add the migration that rebuilds `user_preferences` with an unset
      default model and the nullable `new_workspace_view` column. Describe
      it in the README.
- [x] Make `accountDefault` in `worker/app-api/account-data.ts` and the
      default model read in `worker/tools/store.ts` skip an unset default
      model.
- [x] Add the view type, `newWorkspaceView` in `AccountResponse`, and the
      path, the request, and the reply of the write in
      `src/shared/account.ts`.
- [x] Serve the choice in the account reply and save it with
      `PUT /api/account/new-workspace-view` in `worker/app-api/boot.ts`.
- [x] Test in `worker/app-api/boot.test.ts`: a saved choice comes back in
      the account reply, a new account gets the page, a save of the
      choice keeps the configured default model, and an unknown value
      gets HTTP 400.
- [x] Read the choice in `src/app/api/read-core.ts`, and save it with
      `AccountModel.setNewWorkspaceView`. Serve it in the dev fake
      `src/app/dev/account-routes.ts` and in the fake API of
      `src/test-support/`.
- [x] Update `worker/app-api/README.md`, `migrations/README.md`, and the
      account model line of `src/app/README.md`.

Report and check logs: `.context/preferences-and-new-workspace-dialog/m3/` and
`.context/preferences-and-new-workspace-dialog/m3-tests.log`.

## Milestone 4: The Preferences tab

Tags: ui

Depends on: 3

The Account page gets its tabs, and Preferences saves the choice.

- [x] Give the account route a tab in `src/app/router.ts`, with the
      address `/account/preferences`.
- [x] Show General and Preferences with `LinkTabs` in
      `src/shell/account/AccountScreen.tsx`, as in the mockup.
- [x] Add the Preferences tab with the New workspaces section, moved
      from General, and the new choice in it.
- [x] Test in `src/shell/account/AccountScreen.test.tsx` and
      `src/app/router.test.ts`: the address opens Preferences, the tab
      shows the saved choice, a change saves it, and a failed save shows
      the error and keeps the saved choice.
- [x] Update `src/app/screens.md` with the tabs of the account.

Screenshots, test proofs, and logs: `.context/preferences-and-new-workspace-dialog/m4/`.

## Milestone 5: The New workspace dialog

Tags: ui

Depends on: 3

New workspace opens the dialog when the user chose it. Milestone 5 can
run beside Milestone 4, because the two change different files.

- [ ] Move the parts that the page and the dialog share out of
      `src/shell/new-workspace/NewWorkspaceScreen.tsx`: the repository
      picker, the readiness of the message, and the send. Keep each file
      under 300 lines.
- [ ] Add the dialog in `src/shell/new-workspace/`, as in the mockup. It
      uses the draft of `OrgModel.newWorkspace` and the notices of
      `notices.tsx`. It closes before an action opens another page, and
      when the address changes. In an org without chosen repositories,
      the dialog and the page tell a member who is not an admin that an
      admin chooses them.
- [ ] Add one way to open New workspace that each entry point uses: the
      row in `src/shell/list/Sidebar.tsx`, the button in
      `src/shell/list/OrgHome.tsx`, and the menu item through
      `src/shell/list/useListActions.ts`. It opens the dialog on a
      computer when the user chose it, and the page in every other case,
      also while the screen shows a New workspace form.
- [ ] Give the dialog, the page, and the chat in
      `src/chat/components/Composer.tsx` one shared key rule: on a
      computer, Enter sends and Shift+Enter adds a line.
- [ ] Test with happy-dom: each entry point opens the dialog with the
      preference and the page without it, a phone opens the page, a
      section keeps its section, Escape keeps the draft, Connect closes
      the dialog first, the create opens the new workspace, and a failed
      create keeps the dialog with Try again. Test that Enter creates the
      workspace from the page and from the dialog, and that Shift+Enter
      adds a line. Run each new test 10 times.
- [ ] Update `src/app/screens.md` and `src/app/README.md` with the
      dialog, its entry points, the shared draft, and the key rule.
- [ ] Smoke-test with `npm run dev`: choose the dialog in Preferences,
      then open New workspace from each entry point, in the browser and
      in a phone size. Save the screenshots under
      `.context/preferences-and-new-workspace-dialog/`.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
