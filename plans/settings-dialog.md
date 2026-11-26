# Settings dialog

Status: Active. [PR #569](https://github.com/Firna-AI/conductive/pull/569) is open, as a draft. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive has two settings pages. The Account page has six tabs across
the top: General, Agents, Preferences, Keyboard shortcuts, Stats, and, in
the Mac app only, This Mac. The org settings have five tabs: General,
Repositories, Cloud computer, Secrets, and Members. Command-comma opens
only the Account page. On a phone the tabs wrap onto a second line. Cal
asked on 17 November 2026 for one place for both, which Command-comma
opens, with the sections in a list on the left instead of tabs at the top.

The change puts both in one Settings dialog over the whole window. The
dialog has a list of sections on its left, in an Account group and an org
group, and the open section on its right. A phone shows the list as a
full screen, and each row opens its section as a full screen with a way
back. The change does not add, remove, or move a setting inside a
section.

Decisions:

- 20 November 2026: Cal chose option D of decision 1, the dialog over the
  whole window, after he reviewed the mockups at `app/settings-options`.
  The other options were these. A kept two pages, each with its own list.
  B made one page with the list inside it, beside the workspace sidebar.
  C made one page whose list took the place of the workspace sidebar. The
  brainstorm recommended C.
- Decisions 2 and 3 are open. They are below.

Design calls, all mine, made on 20 November 2026:

- Each section keeps its address, such as `/account/agents` and
  `/orgs/<id>/settings/secrets`. The address opens the dialog over the
  page that the person came from. A direct load of the address opens the
  dialog over the workspace list of the org. For an Account section, it
  opens the dialog over the workspace list of the org that the palette
  works on, or over Get started when the person has no org. Reason: the
  protocol docs require an address for each tab, and links, palette rows,
  and bookmarks then keep working. The address `/` only redirects, so it
  cannot lie below the dialog.
- A new address, `/settings`, shows the list on a phone, and Account ›
  General on a desktop. Reason: the phone list needs an address, and
  `/account` already means Account › General.
- Close and Esc close the dialog and go back to the page below it. A
  direct load goes to the page that the dialog lies over. Reason: the
  other dialogs of the app close in the same way.
- A phone shows the dialog as full-screen pages: first the list, then a
  section with a back button to the list. Reason: the New workspace
  dialog also opens as a page on a phone, and a dialog with two columns
  does not fit a phone.
- The avatar of the rail opens Account › General, as today. The cog of
  the sidebar opens the General section of its org, as today. The Account
  row of the org switcher of a phone opens the list at `/settings`.
  Reason: on a phone, the list shows the person both groups, and Account
  › General is one tap away.
- While the dialog is open, only Esc and the keys of its own fields run.
  ⌘, does nothing then. Reason: the layer rule of
  [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md) lets only
  the open dialog own the keys.
- The shortcut command "Account page" becomes "Settings". Its keys stay
  ⌘, and Ctrl+,. Its id `account-page` stays, so saved key changes keep
  working.
- When the org group lists more than one org, it uses the rail order of
  the person. A deleted org never shows.
- A person without an org sees only the Account group. A member who is
  not an admin sees the org sections read-only, as today. A suspended org
  shows its notice above each org section, as today.
- This Mac stays the last row of the Account group, in the Mac app only.
- The review pages `app/settings-options` go away in Milestone 1.

Design calls, all mine, made on 20 November 2026 while building:

- The rows of the list keep the name "tab". Reason: "section" already
  names the parts inside a tab, such as the Sign-in section. "Account
  settings" names the Account group, as the Delete org question already
  says.
- The page below stays mounted while Settings opens and closes. Reason: a
  workspace below keeps its chat, its terminals, and its connections, so
  Close returns to it as it was.
- The focus starts on the row of the open tab, and stays in the dialog
  while the person moves between tabs.
- While a native dialog of the members UI is open, such as Delete org,
  Esc closes only that dialog. Reason: the app's own Esc layers did not
  see those dialogs, so Esc closed Settings with them.
- The Terms and Privacy pages keep their effective dates. Reason: their
  changed sentences only name the new place, Account settings.
- The org group heading and the rail order follow decision 2. Until then
  the dialog shows the current org only, which every option shows.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md), for the
  tabs of the Account page.
- [Command palette actions](../docs/protocol/command-palette-actions.md),
  for the rows that open a section.
- [Keyboard shortcuts: keys](../docs/protocol/keyboard-shortcuts-keys.md),
  for the Settings command.
- The [mockups README](../docs/mockups/README.md) and the
  [design](../docs/mockups/design.md).

Replaced ways:

- The Account page and the org settings page, with tabs at the top →
  the Settings dialog, with its list of sections. Consumers:
  `src/shell/account/AccountScreen.tsx`,
  `src/shell/settings/OrgSettingsScreen.tsx`, the account and settings
  routes of `src/shell/Shell.tsx` and `src/shell/OrgRoutes.tsx`, the
  mockups `docs/mockups/src/screens/AccountScreen.tsx` and
  `docs/mockups/src/screens/OrgSettingsScreen.tsx` with every entry under
  `app/account`, `app/org-settings`, `app/orgs/suspended/settings`, and
  `mac-app`, and the protocol docs and guides that say "Account page" or
  "tab of the org settings". Moved in Milestones 1 to 4. Deleted in
  Milestone 4.
- `AccountTabs` and `SettingsTabs` of the mockups, and the tab lists of
  the two app screens → the section list. Deleted in Milestones 1 and 3.

## Open decisions

### 2. Which orgs does the dialog show?

The options check added option D on 20 November 2026.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** A person can belong to several orgs. Each org has five
  settings sections. The rail at the far left of the window holds a tile
  for each org.
- **Problem:** The dialog covers the rail. So a person cannot pick
  another org with the rail while the dialog is open.
- **Impact if no action:** A person with several orgs must leave the
  dialog to change the settings of another org. The org group of the
  mockups also stays open.
- **Root question:** How does a person reach the settings of another org
  from the Settings dialog?
- **Options:**
  - **A.** The dialog shows only the current org. To reach another org,
    the person closes the dialog, picks its tile, and opens Settings
    again. Effort: Small.
  - **B.** The dialog shows every org, each as its own group of five
    sections. The list gets long with three or more orgs. Effort: Small.
  - **C.** The dialog shows one org. The heading of the org group is a
    menu that switches the dialog to another org. It uses the menu of
    `src/shell/ui/Menu.tsx`, which already has checked items and a phone
    sheet. The menu hides the other orgs until a person opens it. Effort:
    Medium.
  - **D.** The org group shows the five sections of the current org.
    Under them, one row for each other org opens the General section of
    that org, and the group then shows that org. The list gets one row
    for each other org. Effort: Small.
- **Left out:**
  - A rail that stays usable beside the dialog. It breaks the layer rule
    of [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md), and
    it changes the look of decision 1 D.
  - The Switch to org keys or the palette over the dialog. They break the
    layer rule, and a pointer or touch user cannot use the keys.
  - An Account section that lists the orgs with links. Option D is better
    on every point.
- **Wider fix:** None, because this is a design question.
- **Previous examples:** None found.
- **Related:** Item 3, the same code. With A, the key and the section
  list both start from the org of the page.
- **Recommendation:** A. Most changes are to the org that the person
  works in, and the list stays short. D best serves a person with several
  orgs, for one more row for each org.
- **Action:** Ask the user, because the options have real trade-offs.

### 3. Where does ⌘, open?

The options check changed the root question, added options D and E, and
changed the recommendation from A to D on 20 November 2026.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/Shell.tsx:113`
- **Background:** Today ⌘, always opens Account › General. The tooltip
  of the avatar of the rail shows ⌘,. A rule of
  [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md) says that
  a key does the same as the control whose tooltip shows it.
- **Problem:** The dialog holds ten or more sections, and a phone starts
  at the list. So the key needs a target in each layout.
- **Impact if no action:** The key keeps a target that may not be the
  one that the person expects.
- **Root question:** Where should the Settings key open the dialog, on a
  desktop and on a phone?
- **Options:**
  - **A.** The last section that the person opened, with Account ›
    General the first time. It needs a saved last section, and a rule for
    an org section of another org. The avatar hint then shows a key that
    can open another section. Effort: Medium.
  - **B.** Always Account › General. Effort: Small.
  - **C.** The General section of the org on an org page, and Account ›
    General on other pages. The avatar hint then shows a key that can
    open another section. Effort: Small.
  - **D.** The same target as the Account control of the layout: Account
    › General on a desktop, as the avatar opens, and the list on a phone,
    as the Account row of the org switcher opens. Effort: Small.
  - **E.** B, and a new command "Org settings" with no default key. It
    opens the General section of the org, as the cog does. It adds a
    command id that the Worker shares. Effort: Medium.
- **Left out:**
  - A key that opens the section nearest to the page, such as Preferences
    from New workspace. No control does the same, so it breaks the rule
    on keys and controls.
  - A second press of ⌘, that moves to the other group. Keys run only
    what a control of the app does.
  - A desktop dialog that opens with the list and no section. B is better
    on every point.
- **Wider fix:** D. The key takes its target from the Account control, so
  it follows that control when the control changes.
- **Previous examples:** None found.
- **Related:** Item 2, the same code.
- **Recommendation:** D, first A. It keeps the target of today on a
  desktop and follows the rule on keys and controls.
- **Action:** Ask the user, because the options have real trade-offs.

## Milestone 1: Mockups

Tags: mockup

Depends on: none. The org group waits for decision 2.

Draw the Settings dialog for every screen of the account and of the org
settings, on desktop and on a phone, in the browser and in the Mac app.

- [x] Add a `SettingsDialog` component under
      `docs/mockups/src/components/settings/`, from `SettingsNav` and the
      option D parts of `app/settings-options`.
- [x] Change `AccountScreen` and `OrgSettingsScreen` of the mockups to
      draw the dialog over the page below. Keep every state, dialog, and
      form of each section.
- [x] Move every entry under `app/account`, `app/org-settings`, and
      `app/orgs/suspended/settings` to the dialog. Keep their paths.
- [x] Draw This Mac and Keyboard shortcuts in the dialog in the Mac app
      entries `mac-app/this-mac` and `mac-app/shortcuts`.
- [x] Draw the phone list and a phone section for both groups.
- [ ] Draw the org group in the shape of decision 2. The mockups show the
      current org, which every option of decision 2 shows. Waits for
      decision 2.
- [x] Delete `AccountTabs`, `SettingsTabs`, and the review pages
      `app/settings-options`.
- [x] Update the catalogue, the design, and the mockups README.
- [x] Check which marketing pictures in
      `docs/mockups/src/screens/marketingPictures.tsx` show a settings
      page. Capture them again with `npm run marketing:pictures`.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. Design call of 20 November 2026: the rows keep the
      name "tab", because "section" already names the parts inside a tab,
      such as the Sign-in section. The words "Account settings" name the
      Account group, as the Delete org dialog already says.

## Milestone 2: Documentation and protocol

Depends on: 1

State the dialog in the protocol docs and in the public guides.

- [x] Add a protocol doc `docs/protocol/settings.md` with the dialog,
      its groups, its addresses, Close and Esc, the phone pages, and
      decisions 1, 2, and 3.
- [x] Update each protocol doc that says "Account page" or "tab of the
      org settings": `create-a-workspace.md`, `account-stats.md`,
      `keyboard-shortcuts.md`, `keyboard-shortcuts-tab.md`,
      `keyboard-shortcuts-keys.md`, `command-palette.md`,
      `command-palette-actions.md`, `desktop-commands.md`,
      `delete-org.md`, `secrets.md`, `org-image.md`, `waitlist-codes.md`,
      `sign-ups.md`, `isolation.md`, `fast-mode.md`,
      `own-endpoint-logins.md`, and `tokens-and-secrets.md`. The lines of
      `secrets.md` and `org-image.md` about the tabs of the org settings
      stay true, so they keep their words.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence about the account page or the org settings, such as in
      `agent-logins.md` and `orgs-and-members.md`.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.

## Milestone 3: The dialog in the app

Tags: ui

Depends on: 2

Show the account and the org settings in one dialog, at their current
addresses.

- [x] Add the section list and the dialog under `src/shell/settings/`,
      with focus inside the dialog, Close, and Esc.
- [x] Open the dialog over the page below for each account and settings
      address. Open it over the workspace list or the home page on a
      direct load.
- [x] Add the address `/settings`: the list on a phone, and Account ›
      General on a desktop.
- [x] Show the phone list and the phone section pages.
- [x] Let only Esc and the keys of the fields of the dialog run while it
      is open.
- [ ] Draw the org group in the shape of decision 2. The dialog shows the
      current org, which every option of decision 2 shows. Waits for
      decision 2.
- [x] Move the tab content of `AccountScreen` and `OrgSettingsScreen`
      into the dialog. Keep the saved drafts of each form.
- [x] Update the tests of both screens and add tests for the dialog.
- [x] Update each `README.md` under `src/` that names the two screens or
      their addresses, such as `src/app/README.md`.

## Milestone 4: Ways into the dialog

Tags: ui

Depends on: 3. The Settings key waits for decision 3.

- [x] Rename the shortcut command "Account page" to "Settings". Keep its
      id.
- [ ] Open the target of decision 3 with the Settings key. The key keeps
      its target of today, Account › General, until then. Waits for
      decision 3.
- [x] Open the dialog from the avatar of the rail, the cog of the
      sidebar, and the org switcher of a phone.
- [x] Open the dialog from the palette rows and from every link to a
      settings address, such as the notices of New workspace.
- [x] Delete the old page screens, their tab lists, and their dead
      styles. Search `docs/`, `plans/`, and each `README.md` for their
      names.
- [x] Update the tests of the shortcut, the palette, and the links.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Smoke-test the dialog in a browser on desktop and on a phone size.
      The script and its screenshots are in `.context/settings-dialog/`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Mark the pull request ready. Its description gives the decisions
      and the design calls of this plan with their dates, a permalink to
      this plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Open Settings with ⌘, on `conductive.build`, in a browser and in
      the Mac app.
