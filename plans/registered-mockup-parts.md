# Registered mockup parts

Status: Active. On branch `calummoore/riga-skgh`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Mokly builds the mockup catalogue in `docs/mockups/`. Its Changes view
compares the catalogue of a branch with `origin/main`. Today the catalogue
registers no component with Mokly: each entry is a `defineScreen` that
renders plain React parts. An edit to a shared part therefore gives one
Changes row for each screen and variant that looks different, and no row
names the part. Commit `cc3ea647` changed `WorkspaceMark`, which 196 screen
modules import. This change registers every part of the catalogue with
Mokly's `defineComponent`: 342 parts. An edit to a registered part then gives one row for the
part, and the screens that use it go under its Affected screens. The
change adds no HTML entry, changes no screen picture, and changes no app
code.

On 2026-11-13 the user chose decision 519 A in a brainstorm: register the
shared React parts with `defineComponent`, in batches, the widest first.
On the same day the user asked that this plan include every part, not
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
- The app reaches 59 of the 292 TSX files of `docs/mockups/src/components/`
  and `docs/mockups/src/screens/`. Those files hold 71 of the parts below.
- Some parts nest other parts. Mokly attributes a child's edit to the
  child when the child renders through its wrapper, and to the parent
  when the child is plain.

## Design

These are design calls of the agent, made on 2026-11-13:

- **The parts.** A part is an exported React component with a PascalCase
  name that draws UI. The plan registers each such export:
  - All 323 exports of the 234 files in `docs/mockups/src/components/`,
    except six that draw nothing of their own: the link primitives
    `ScreenLink` and `StillLinks`, and the context providers
    `TouchScreen`, `TintedTheme`, `MacApp`, and `ChatWorkspaces`. That
    leaves 317 parts.
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
  after. Reason: the whole change is mockup work, and one milestone of 342
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
  stable id of its fixture, in kebab-case.
- **The variants.** Each part gets one variant for each state that the
  screens show, and at most five on one page. More states go to nested
  child pages, as the `mockups` skill says.

## Milestone 1: Mockups, the proof and the common parts

Tags: mockup

Depends on: none

Prove the gain with one part, then register the parts that almost every
screen uses: 35 parts.

- [ ] Prove the gain with one part before the rest.
  - [ ] Register `WorkspaceMark` and render its wrapper from the
        mockup-only parts that use it: `WorkspaceRow` and `PaletteRows`.
        `WorkspaceChip` keeps the plain part, because the app reaches it.
  - [ ] Make a trial edit to its render and to its CSS, and build. Do not
        commit the trial edit.
  - [ ] Count the Changes rows before and after the registration. Save
        the counts under `.context/registered-mockup-parts/`.
  - [ ] Stop and report to the user if the rows do not drop.
- [ ] Add the `components` folder of the catalogue, with its
      `_folder.json`, to the order in `docs/mockups/src/entries/_folder.json`.
- [ ] Register the 23 parts of `components/common/`.
- [ ] Register the 8 parts of `components/layout/` and the 3 parts of
      `components/brand/`.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Mockups, workspaces and orgs

Tags: mockup

Depends on: 1

Register the parts of the workspace lists, the workspace page, the orgs,
the palette, and New workspace: 72 parts.

- [ ] Register the other 12 parts of `components/workspaces/`.
- [ ] Register the 30 parts of `components/workspace/`.
- [ ] Register the 8 parts of `components/orgs/`, the 5 of
      `components/palette/`, and the 5 of `components/new-workspace/`.
- [ ] Register the 12 helper parts of `screens/listParts.tsx`,
      `screens/listSheets.tsx`, `screens/newWorkspaceStart.tsx`, and
      `screens/workspaceParts.tsx`.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 3: Mockups, chat, files, and tools

Tags: mockup

Depends on: 2

Register the parts of the chat, the files, and the tools: 70 parts.

- [ ] Register the 47 parts of `components/chat/`.
- [ ] Register the 13 parts of `components/files/` and the 9 of
      `components/tools/`.
- [ ] Register `FirstBuildNotice` of `screens/firstBuildNotice.tsx`.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 4: Mockups, settings and accounts

Tags: mockup

Depends on: 3

Register the parts of the settings, the members, the feedback, sign-in,
and Get started: 71 parts.

- [ ] Register the 56 parts of `components/settings/`.
- [ ] Register the 5 parts of `components/members/` and the 4 of
      `components/feedback/`.
- [ ] Register the 6 helper parts of `screens/orgSettingsTabs.tsx`,
      `screens/getStartedBuild.tsx`, `screens/getStartedSteps.tsx`, and
      `screens/signInFrame.tsx`.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 5: Mockups, operator and routines

Tags: mockup

Depends on: 4

Register the parts of the operator section and the routines: 54 parts.

- [ ] Register the 34 parts of `components/operator/`.
- [ ] Register the 14 parts of `components/routines/`.
- [ ] Register the 6 helper parts of `screens/routineActions.tsx`,
      `screens/routineFrame.tsx`, `screens/routineNotShown.tsx`,
      `screens/routineParts.tsx`, and `screens/routineTabs.tsx`.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 6: Mockups, marketing and the Mac app

Tags: mockup

Depends on: 5

Register the parts of the marketing site, the comparison page, and the
Mac app: 40 parts.

- [ ] Register the 25 parts of `components/marketing/` and the 7 of
      `components/parity/`.
- [ ] Register the 8 parts of `components/mac/`.
- [ ] Check with `.context/registered-mockup-parts/inventory.mjs` that
      every part of the design is registered.
- [ ] Move each mockup-only consumer of these parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the new component pages and five screens that use them,
      at both sizes, in light and dark.
- [ ] Run `npm run marketing:pictures`, and check that no picture
      changed.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 7: Documentation

Depends on: 6

State how the catalogue registers parts. No protocol doc changes, because
the product does not change.

- [ ] Update "How a screen is built" and "Folder layout" in
      `docs/mockups/README.md`: the registered parts, their place, the
      wrapper rule for files that the app reaches, and Affected screens.
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
