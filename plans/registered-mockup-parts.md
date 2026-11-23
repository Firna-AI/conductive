# Registered mockup parts

Status: Active. [PR #607](https://github.com/Firna-AI/conductive/pull/607) is open with Milestones 1 to 4. The pull request that completes the work deletes this plan, as the `plans` skill says.

Mokly builds the mockup catalogue in `docs/mockups/`. Its Changes view
compares the catalogue of a branch with `origin/main`. Today the catalogue
registers no component with Mokly: each entry is a `defineScreen` that
renders plain React parts. An edit to a shared part therefore gives one
Changes row for each screen and variant that looks different, and no row
names the part. Commit `cc3ea647` changed `WorkspaceMark`, which 196 screen
modules import. This change registers every part of the catalogue with
Mokly's `defineComponent`: 357 parts. Changes then lists an edit to a
registered part under the part, with a row for each of its own pages that
changes, and the screens that use it go under its Affected screens. The
change adds no HTML entry, changes no screen picture, and changes no app
code.

On 2026-11-13 the user chose decision 519 A in a brainstorm: register the
shared React parts with `defineComponent`, in batches, the widest first.
On 2026-11-16 the branch merged `main`, which removed the Conductor
comparison page with its 7 `parity` parts and added 9 parts: `TextLink`,
3 `pricing` parts, 2 chat parts, and 3 settings parts. The counts below
follow that merge. A second merge on the same day brought the rename of
routines to automations (#397), and two new parts: `NewSectionDialog`
and `LongRuns`. Milestone 2 split out one more chat part, `NewTabAnchor`,
and Milestone 3 split out `TurnFileChip`, because `TurnFileList` takes its
chip as a callback. A third merge on the same day added nine parts:
`CodeBlock`, `MentionChip`, `FileLinkText`, `ChipCopyText`,
`StatsNumbers`, `StatsLoading`, `StatsFailed`, `SessionTabIcon`, and the
helper `StatsTab`.

On 2026-11-13 the user asked that this plan include every part, not
only a first batch. The milestones register the parts folder by folder,
the widest folders first. The alternatives were:

- B: change Mokly so that it finds unregistered React parts. This needs a
  change of Mokly's protocol, which says "There is no inference for a
  component".
- HTML screens and HTML components, with React only where the app shares a
  part. This was the user's first idea. Mokly gives HTML and React
  components the same attribution. HTML has no loops, no data imports, no
  CSS Modules, and no Firna theme, and a React screen cannot use an HTML
  component. It would also break the rule that `brand.ts` is the one source
  of the product name.
- HTML only in the areas that the app does not use. A is better on every
  point.
- Mokly's review-ignore marker around the app frame. It hides the change
  instead of naming its cause.

On 2026-11-20 the user answered decision 522, how the work reaches
`main`: merge `main` once more, then open a pull request with Milestones
1 to 4. The merges of `main` had grown to 39 and then 41 conflicted files,
because this branch touches almost every mockup file. The alternatives
were one pull request at the end (A), and stopping after the first pull
request with Milestones 5 and 6 as follow-up items (C). Whether
Milestones 5 to 8 then go on in a second pull request (B) or become
follow-up items (C) still waits for the user. The first pull request
keeps this plan, because the work spans more than one pull request.

Decision 520, a rule in the shared `mockups` skill that keeps shared parts
registered, moved on 2026-11-13 to the workspace "Mockups skill rule for
registered Mokly components" in the `Firna-AI/skills` repository. The user
manages it there. This plan does not depend on it. The decisions take
519 and 520 because 518 was the highest number on `main`.

Contract owners:

- The [mockups README](../docs/mockups/README.md).
- The [catalogue](../docs/mockups/catalogue.md).

Replaced ways:

- A plain import of a registered part in mockup-only code → its wrapper,
  `part.Component`. Consumers: the screen components in
  `docs/mockups/src/screens/` and the parts in `docs/mockups/src/components/`
  that the app does not reach. Moved in Milestones 1 to 6, each for its
  own parts. The app and the
  parts that it reaches keep the plain part on purpose, because a wrapper
  throws outside Mokly. That is not a converter, and it stays.

## Facts that the design uses

Sources: the Mokly docs in `mokly-ai/mokly` under `docs/protocol/`, and the
counts and test under `.context/mokly-html/` of this workspace.

- A screen compares each registered instance by path, instance name, and
  props digest, not by its rendered content (`mokly-component-changes.md`).
- A CSS rule goes to a part only when it matches on the part's own pages.
  A change to a design token still gives every screen a row.
- Props are JSON data. An icon becomes a string key that the adapter
  resolves. A callback is not data. React content becomes a declared slot.
- A wrapper renders only inside a Mokly render. Outside one, it throws
  "Mokly markers require a sidecar render context".
- Repeated siblings need distinct `moklyInstance` names, in lowercase
  kebab-case. Duplicates in one scope fail the build.
- After the third merge of `main` on 2026-11-16, the app reaches 64 of the
  308 TSX files of `docs/mockups/src/components/` and
  `docs/mockups/src/screens/`. A merge can add files that the app shares.
  The rule that holds is that no file the app reaches imports an entry
  module.
- Some parts nest other parts. Mokly attributes a child's edit to the
  child when the child renders through its wrapper, and to the parent
  when the child is plain.
- The fifth merge of `main` (2026-11-20, `4190c1f46`) removed
  `OrgRepositoryList`, so its registration is gone, and 266 parts are
  registered. The app now reaches 86 of the 376 TSX files, among them
  `ConfirmDialog`, through `RepositoryChangeText`, so `ConfirmDialog` draws
  the plain `Sheet` again. Message table cells draw `AnswerText`, and file
  table cells, now `cells="file"`, draw `PreviewText`.
- On 2026-11-20 the strict build with the Changes comparison ran out of
  memory on the 7 GB cloud computer: the Mokly core grew to 5.2 GB. The
  same build with `--no-changes --sidecars 2` passes. CI runs on 16 GB
  runners. `.context/registered-mockup-parts/merge5-build-oom.mem` holds
  the memory log.
- The proof of Milestone 1, on 2026-11-16: with `WorkspaceMark`
  registered, a trial edit to the render of one of its states gave 1
  Changes row in place of 405, the one variant that shows that state, and
  a trial edit to the CSS of that state also gave 1 row in place of 405. The
  388 screens and variants went under its Affected screens.
  `.context/registered-mockup-parts/proof.md` holds the method and the
  counts.
- A custom property or a `@keyframes` rule in a part's own CSS Module
  still gives each screen that links the stylesheet a row. Mokly cannot
  trace those rules to elements.
- A CSS rule of a state that no own page of the part shows still gives the
  screens rows. The `.warning` tone of the mark gave 15 rows before and
  15 after.
- The first registration of a part lists each screen that draws it in
  Changes, with the reasons `structure` and `material`, also when its
  picture is the same. So this pull request lists almost every screen.
  The proof found that these screens differ only by Mokly's markers, the
  frame-probe data, and React `useId` values.
- Content that a screen supplies keeps the scope of its outermost slot,
  also inside the slots of other registered parts. Only the own render of
  a registered part starts a new scope. So an instance name must be unique
  across a whole frame area: the main area, the sidebar, the overlay, the
  phone column, or one marketing picture. A repeat across nested slots
  fails in the core with `conflicting fragment input <key>`, which names
  no entry. The follow-up item `mokly-repeated-instance-diagnostic.md`
  asks Mokly for a better message.
- Mokly compares a part inside a screen by its props. An input that
  reaches a part only through React context, such as the Mac app state or
  the touch sizes, is not compared.
- An entry module that imports another part's entry module, to fill a
  variant slot, adds that part's CSS to the bundle of every screen that
  imports it.

## Design

These are design calls of the agent, made on 2026-11-13:

- **The parts.** A part is an exported React component with a PascalCase
  name that draws UI. The plan registers each such export:
  - Every export of the files in `docs/mockups/src/components/`, except
    six that draw nothing of their own: the link primitives `ScreenLink`
    and `StillLinks`, the link helper `Linked` of
    `components/settings/ShortcutParts.tsx`, and the context providers
    `TouchScreen`, `TintedTheme`, and `MacApp`. The context provider
    `ChatWorkspaces` is registered in Milestone 6, as the design of inputs
    from React context says. Milestone 6 checks the whole list with the
    inventory script, after the last merge of `main`.
  - The 26 helper parts that live in `docs/mockups/src/screens/`, except
    `PictureCapture`, which only frames the marketing captures. That
    leaves 25 parts.
  - The screen components themselves, such as `WorkspaceScreen`, stay
    unregistered, because each `defineScreen` entry already draws them.
  - Reason: the user asked for every part.
  `.context/registered-mockup-parts/inventory.mjs` lists them, with the
  number of screens and the app reach of each.
- **The order.** One milestone for each group of folders, the widest
  folders first. Each milestone depends on the one before it, because the
  milestones edit the same screen files. Reason: each milestone stays
  reviewable, and no two milestones conflict.
- **More than one mockup milestone.** All mockup work comes first, in
  Milestones 1 to 6, and the documentation milestone comes directly
  after. Reason: the whole change is mockup work, and one milestone of 357
  parts is too large to delegate and check.
- **The place of a registration.** One entry module for each source file,
  at `docs/mockups/src/entries/components/<folder>/<file>.mockup.tsx`. It
  exports one definition for each part of that file. The path of a part
  is `components/<folder>/<part>`. Reason: the existing entries root and
  the knip entry glob already cover it, so the change adds no Mokly root.
- **Shared parts stay plain in shared code.** A file that the app reaches
  never renders a wrapper. Only mockup screens and mockup-only parts use
  wrappers. Reason: a wrapper throws outside Mokly.
- **The adapters.** Each adapter maps JSON props to the plain part. An
  icon prop becomes a key from a closed list in the schema, resolved
  beside the adapter. A callback prop stays out of the schema, and the
  adapter passes `noop`. `viewport` comes from the render context, not
  from a prop. React content becomes a declared slot.
- **Instance names.** A part in a list takes its `moklyInstance` from the
  stable id of its fixture, in kebab-case, with the list in front, such as
  `sidebar-apple-pay`. A marketing picture takes its picture key, such as
  `hero`.
- **Paths.** Each definition sets a kebab-case `slug`, such as
  `workspace-mark`, so that the path is
  `components/workspaces/workspace-mark`. The `components` folder comes
  last in the order of the catalogue.
- **The marketing frames move to Milestone 1** (2026-11-16). Several
  marketing pictures draw the same sidebar in one view, so the registered
  marks repeated their instance names and the strict build failed.
  Registering `ScreenFrame` and `ScreenCapture` gives each picture its own
  scope, with the screen as a slot. Their own pages show the frame without
  a screen, so that the frame does not claim the CSS of the screen.
- **The variants.** Each part gets one variant for each state that the
  screens show. Until decision 521 is answered, each part has at most five
  entries: its own page and four variants. A component variant cannot have
  child pages. Pick the states that cover the most CSS rules.
- **The viewport of a part** (2026-11-16). A part that draws a different
  layout by viewport takes an optional `viewport` data prop, or `phone`
  for the toasts, and falls back to the render context on its own pages.
  Reason: the Mac app views and the `phone` and `mac` marketing pictures
  draw a screen of the other viewport.
- **Inputs from React context** (2026-11-16). `CopyLinkButton`,
  `OwnerPicker`, and `GitHubLink` read the touch sizes, and `SearchLink`
  reads the Mac app. Milestone 6 registers
  `MacScreen` with the Mac app state as data and the banner as a slot. It
  also registers `ChatWorkspaces` with the workspaces of the screen as data
  and its content as a slot, because the chips of the chat and the dialogs
  read them from context. The
  parts with touch sizes get a variant with the touch sizes through a prop
  that only their own pages pass. Milestone 7 states the inputs that stay
  uncompared. Reason: the Mac app state is the largest input that Changes
  cannot see, and Milestone 6 registers `MacScreen` anyway.
- **Variant slots** (2026-11-16). A variant slot uses parts whose CSS its
  consumers load already, or a placeholder. Reason: another import adds
  CSS to screen bundles that the HTML comparison cannot see.
- **Shared helpers.** One list of icon keys in
  `docs/mockups/src/entries/components/common/icons.ts`. Menu entries are
  JSON. `defined()` drops undefined props before a wrapper. `instanceKey()`
  and `shortcutKey()` make names from fixture keys and shortcuts.
- **Deep plain data** (2026-11-16). `plainData()` in
  `docs/mockups/src/defined.ts` drops undefined values at any depth, for
  data from builders that the app shares, such as `barModel`. Reason: a
  wrapper fails on an undefined value.
- **Data in place of callbacks** (2026-11-16). `ArchivedGroup`,
  `PaletteStatusPart`, and `NewWorkspaceDialog` take data in place of a
  derived callback or an array of elements. `SuspendedList` draws only the
  main area, and the list screen draws the rail and the sidebar. Reason:
  the props of a part are JSON, and an own page must not draw a whole
  screen.
- **Data in place of callbacks in the chat** (2026-11-16). Chips take a
  screen `to` in place of the `opener` callback. The `@` list rows take an
  icon key. `StopLine` takes its source as data, with the session chip in
  a `chip` slot. `FileTree` names its icons by the path of each entry. The
  message-list schema goes three levels deep, because a schema cannot
  refer to itself. Reason: props are JSON.
- **Props for own pages only** (2026-11-16). `touch` on `ChipEndRemove`,
  `roomAbove` on the `@` lists and the composer, and `placeHeight` on
  `ImageView`, `FilePage`, and `CodeView`. No screen passes them. Reason: without them
  those own pages draw nothing.
- **Uses in chat text stay plain** (2026-11-16). In message text,
  `CodeText`, `WebLinkPart`, `SentFileChip`, `FileChip` with its
  `EntryIcon`, and `LinkChip` with `WorkspaceChip` and `SessionChip`. In a
  draft, `FileChip` and `LinkChip`. `MessageText` in the blocks of
  `AgentBlocks` and `MessageLine`, and in the cells of `MarkdownTable`.
  `CodeTokens` in the lines of `DiffView`. Reason: these lists have no
  stable key, and one text can repeat a path or an address, so a name from
  the content can repeat in one scope. An edit to one of these parts gives
  a row to its registered parent. The follow-up item
  `mokly-repeated-instance-diagnostic.md` covers the scope rule; a Mokly
  change that accepts one name for equal uses would cover these too.
- **JSON rows for shared lists** (2026-11-16). `DeletedOrgList` and
  `PendingInviteList` take JSON rows, and their adapters draw the tile, the
  actions, and the failure notice. `CommandShortcuts` takes the host as
  data, and its adapter derives the browser tab, because a tab holds a
  `Set`. The org settings state moved to `screens/orgSettingsState.ts`,
  and the row keys of the shortcut rows to
  `components/settings/shortcutRowKeys.tsx`. `screens/inviteRows.ts` returns
  row data. Reason: props are JSON, and the old place made an import cycle.
- **More uses that stay plain** (2026-11-16). `CodeBlock` in the blocks of
  `AgentBlocks`, and `MentionChip` and `FileLinkText` in message text, as
  for the other chat text. The two `DetailList` uses in the operator access
  sections, because their values hold parts. The Copy button of
  `CodeBlock` takes its name from the code text, so two equal code blocks
  in one answer on a phone would repeat a name; no fixture has that.
- **Uses that stay plain** (2026-11-16). `TextLink` in `WebLinkText` stays
  plain, because a link in chat text has no stable key, and one chat
  fixture shows the same address twice. `MarkGrid` has no wrapper use,
  because only app-shared files draw it. `InlineText` in the blocks of
  `MarkdownView` stays plain, because the blocks have no stable key.
  `RailLink` and `RailTile` inside `OrgItem` stay plain, because they share
  its file, and a wrapper there would import the file's own entry module.
- **The check for each milestone.** Each mockup milestone compares its
  built screen documents with a build of the merge base, without the
  Mokly markers, the frame-probe data, and `useId` values. A screen that
  differs in any other way is a real change.

## Open decisions

### 521. The own pages of a part with more than five states

- **Severity:** Medium. **Effort:** Small.
- **Source:** Implementation, from the proof of Milestone 1.
- **Problem:** Mokly gives a CSS rule to a part only when the rule
  matches on the part's own pages. The `mockups` skill allows at most
  five mockups on a page, and a component variant cannot have child
  pages. The mark has seven tones, so two of its tones have no page.
- **Options:**
  - **A.** Keep at most five entries. Edits to the other states give
    screen rows. Effort: Small.
  - **B.** Give each part one variant for each styled state, also above
    five. Effort: Small.
  - **C.** Split each part with many states into smaller parts. Effort:
    Large.
  - **D.** Change Mokly so that a part owns the CSS rules of its modules.
    Effort: Large.
- **Recommendation:** B. Each part then keeps the gain for every CSS rule.
- **Status:** Waits for the user. It blocks only the variants above five.

## Milestone 1: Mockups, the proof and the common parts

Tags: mockup

Depends on: none

Prove the gain with one part, then register the parts that almost every
screen uses: 37 parts, with the two marketing frames.

- [x] Prove the gain with one part before the rest.
  - [x] Register `WorkspaceMark` and render its wrapper from the
        mockup-only parts that use it: `WorkspaceRow` and `PaletteRows`.
        `WorkspaceChip` keeps the plain part, because the app reaches it.
  - [x] Make a trial edit to its render and to its CSS, and build. Do not
        commit the trial edit.
  - [x] Count the Changes rows before and after the registration. Save
        the counts under `.context/registered-mockup-parts/`.
  - [x] Stop and report to the user if the rows do not drop.
- [x] Register `ScreenFrame` and `ScreenCapture`, and render them from
      `Hero`, `FeatureSection`, and `PictureCapture`, named by the picture
      key.
- [x] Add the `components` folder of the catalogue, with its
      `_folder.json`, to the order in `docs/mockups/src/entries/_folder.json`.
- [x] Register the 23 parts of `components/common/`.
- [x] Register the 8 parts of `components/layout/` and the 3 parts of
      `components/brand/`.
- [x] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [x] Compare the built screen documents with a build of the merge base
      without markers, as the design says. Save the result under
      `.context/registered-mockup-parts/`.
- [x] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Mockups, workspaces and orgs

Tags: mockup

Depends on: 1

Register the parts of the workspace lists, the workspace page, the orgs,
the palette, and New workspace, and the parts that `main` added to
the folders of Milestone 1: 73 parts.

- [x] Register `TextLink` of `components/common/`, which `main` added after
      Milestone 1.
- [x] Move each plain use of a part of Milestone 1 that the merge of
      `main` added, such as `ActionButton` in
      `components/settings/EndpointDetails.tsx`, to the wrapper, unless the
      app reaches the file.
- [x] Register the other 12 parts of `components/workspaces/`.
- [x] Register the 30 parts of `components/workspace/`.
- [x] Register the 8 parts of `components/orgs/`, the 5 of
      `components/palette/`, and the 5 of `components/new-workspace/`.
- [x] Register the 12 helper parts of `screens/listParts.tsx`,
      `screens/listSheets.tsx`, `screens/newWorkspaceStart.tsx`, and
      `screens/workspaceParts.tsx`.
- [x] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [x] Compare the built screen documents with a build of the merge base
      without markers, as the design says. Save the result under
      `.context/registered-mockup-parts/`.
- [x] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 3: Mockups, chat, files, and tools

Tags: mockup

Depends on: 2

Register the parts of the chat, the files, and the tools, and
`NewSectionDialog`: 74 parts.

- [x] Register `NewSectionDialog` of `components/workspaces/`, which `main`
      added after Milestone 2. Move the plain uses of registered parts in
      `NewSectionDialog.tsx` to wrappers.
- [x] Register the 50 parts of `components/chat/`, with `NewTabAnchor`,
      which Milestone 2 split out of `WebLinkText`. Keep
      `docs/mockups/src/screens/WorkspaceScreen.tsx` under 300 lines; it
      has 298, so split it before it grows.
- [x] Register the 13 parts of `components/files/` and the 9 of
      `components/tools/`.
- [x] Register `FirstBuildNotice` of `screens/firstBuildNotice.tsx`.
- [x] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [x] Compare the built screen documents with a build of the merge base
      without markers, as the design says. Save the result under
      `.context/registered-mockup-parts/`.
- [x] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 4: Mockups, settings and accounts

Tags: mockup

Depends on: 3

Register the parts of the settings, the members, the feedback, sign-in,
and Get started, and the nine parts of the third merge: 82 parts.

- [x] Register the nine parts that the third merge of `main` added:
      `CodeBlock`, `MentionChip`, `FileLinkText`, and `ChipCopyText` of
      `components/chat/`, `StatsNumbers`, `StatsLoading`, and `StatsFailed`
      of `components/settings/StatsSections.tsx`, `SessionTabIcon` of
      `components/workspace/`, and the helper `StatsTab` of
      `screens/accountStats.tsx`. Move the plain `IconButton` in
      `CodeBlock.tsx`, `LogoTile` in `screens/PreviewOpeningScreen.tsx`, and
      `ActionButton` in `screens/accountStats.tsx` to wrappers.
- [x] Register the 58 parts of `components/settings/`, all but `Linked`.
- [x] Register the 5 parts of `components/members/` and the 4 of
      `components/feedback/`.
- [x] Register the 6 helper parts of `screens/orgSettingsTabs.tsx`,
      `screens/getStartedBuild.tsx`, `screens/getStartedSteps.tsx`, and
      `screens/signInFrame.tsx`.
- [x] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [x] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [x] Compare the built screen documents with a build of the merge base
      without markers, as the design says. Save the result under
      `.context/registered-mockup-parts/`.
- [x] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 5: Mockups, operator and automations

Tags: mockup

Depends on: 4

Register the parts of the operator section and the automations: 55 parts.

- [ ] Register the 37 parts that the fifth merge of `main` (2026-11-20,
      `4190c1f46`) added, and move the 43 plain uses in its new mockup-only
      files to wrappers. `.context/registered-mockup-parts/merge6-plain-uses.txt`
      lists them. `HistoryAnchor` and `ChatPictures` are contexts, so they
      stay out.
- [ ] Register the mockup parts that the Mac access branch
      (`calummoore/mac-permission-issue-o7fv`, 2026-11-21) added:
      `StartFailedNotice`, and `MacAccessPart` with its switch in
      `docs/mockups/src/components/capabilities/MacAccessPart.tsx`.
- [ ] Register the parts that the fourth merge of `main` (2026-11-20,
      `7fd59e6eb`) added: `CapabilitiesButton`, `CapabilitiesPanel`,
      `GrantList`, `SendButton`, `StopButton`, `ComposerMenu`,
      `LateAnswerLine`, `AllowButton`, `Answers`, `PhoneAnswers`, `LateEnd`,
      `SecretRequest`, `ClaimedCommand`, `SecretRun`, `ValueAnswer`,
      `PointMenu`, `RowMenuItem`, `RowMenuSheet`, `DeleteSecretDialog`,
      `ReplaceForm`, `AddSecretForm`, `AllAgentsSwitch`, `AllAgentsMark`,
      `RevealedValue`, `SecretRow`, `SecretsTab`, `OrgAgentsTab`,
      `OrgColorField`, `OrgColorValue`, `OrgLoginLines`, `OrgColorSection`,
      `SettingSwitch`, `PreviewActions`, `PreviewPage`, `HeaderState`,
      `RestartSheet`, `RestartDialog`, `UpdateCheckToast`, and `RowDrop`.
      `SidebarToggleProvider` and `CornerControlsProvider` are context
      providers, so they stay out. Move the plain uses of registered parts
      in the new mockup-only files, such as the `components/secrets/` and
      `components/chat/RequestActions.tsx` files, to wrappers.
- [ ] Register the 35 parts of `components/operator/`, with `LongRuns`, which
      `main` added. Move its plain uses of registered parts to wrappers.
- [ ] Register the 14 parts of `components/automations/`.
- [ ] Register the 6 helper parts of `screens/automationActions.tsx`,
      `screens/automationFrame.tsx`, `screens/automationNotShown.tsx`,
      `screens/automationParts.tsx`, and `screens/automationTabs.tsx`.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Compare the built screen documents with a build of the merge base
      without markers, as the design says. Save the result under
      `.context/registered-mockup-parts/`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 6: Mockups, marketing and the Mac app

Tags: mockup

Depends on: 5

Register the parts of the marketing site, the pricing page, and the
Mac app, and `ChatWorkspaces`: 35 parts.

- [ ] Register the other 23 parts of `components/marketing/` and the 3 of
      `components/pricing/`.
- [ ] Add a `_folder.json` to `docs/mockups/src/entries/components/marketing/`.
- [ ] Register the 8 parts of `components/mac/`. `MacScreen` takes the Mac
      app state as data and the banner as a slot, as the design says.
- [ ] Register `ChatWorkspaces` of `components/chat/chatWorkspaces.tsx`,
      with the workspaces as data and its content as a slot, and render it
      from `WorkspaceScreen` and the dialogs, as the design says.
- [ ] Give each registered part that reads the touch sizes or the Mac app
      a variant in that state, within the limit of five entries until
      decision 521 is answered: swap a variant where a part has four. Find
      the parts by their reads of `useTouch`, `useControlSizes`,
      `useTouchScreen`, and `useMacApp`, for example `ActionButton`,
      `IconButton`, `SearchField`, `ShortcutTip`, `AppFrame`, `OrgRail`,
      `ChatPane`, and `PendingCommand`. They also include `CopyLinkButton`, `OwnerPicker`, `GitHubLink`, `ChipIconCell`,
      `ChipTextField`, `MessageField`, `ModelPicker`, `Composer`,
      `FilePage`, `ServerList`, `PortMessage`, `PreviewTabs`,
      `TerminalView`, `TurnFileList`, `CodeBlock`, `OrgNameFields`,
      `OrgDetailsSection`, `EndpointFields`, `AgentConnectForm`,
      `DefaultsSection`, `DeleteOrgDialog`, `EnvVarsSection`,
      `ScriptSection`, `InviteCodeSection`, `SecretSwitch`, `LoginShare`,
      `MembersTab`, and `ScreenshotRow`. `ThisMacSection` and `SignInFrame`
      read the Mac app.
- [ ] Check with `.context/registered-mockup-parts/inventory.mjs` that
      every part of the design is registered.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Compare the built screen documents with a build of the merge base
      without markers, as the design says. Save the result under
      `.context/registered-mockup-parts/`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Run `npm run marketing:pictures`, and check that no picture
      changed.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 7: Documentation

Depends on: 6

State how the catalogue registers parts. The first pull request added
`docs/mockups/registered-parts.md` and its links on 2026-11-20. This
milestone brings it up to date with Milestones 5 and 6. No protocol doc changes, because
the product does not change.

- [ ] Update "How a screen is built" and "Folder layout" in
      `docs/mockups/README.md`: the registered parts, their place, the
      wrapper rule for files that the app reaches, Affected screens, the
      CSS rules that still give screen rows, the inputs from React context
      that Changes does not compare, and the scope of instance names.
- [ ] Add the `components` paths to `docs/mockups/catalogue.md`.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm run check`, the complete gate.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
