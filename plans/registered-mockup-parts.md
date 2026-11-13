# Registered mockup parts

Status: Active. On branch `calummoore/riga-skgh`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Mokly builds the mockup catalogue in `docs/mockups/`. Its Changes view
compares the catalogue of a branch with `origin/main`. Today the catalogue
registers no component with Mokly: each entry is a `defineScreen` that
renders plain React parts. An edit to a shared part therefore gives one
Changes row for each screen and variant that looks different, and no row
names the part. Commit `cc3ea647` changed `WorkspaceMark`, which 196 screen
modules import. This change registers the widest shared parts with Mokly's
`defineComponent`. An edit to a registered part then gives one row for the
part, and the screens that use it go under its Affected screens. The
change adds no HTML entry, changes no screen picture, and changes no app
code.

On 2026-11-13 the user chose decision 519 A in a brainstorm: register the
shared React parts with `defineComponent`, in batches, the widest first.
The alternatives were:

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
  that the app does not reach. Moved in Milestone 1. The app and the
  parts that it reaches keep the plain part on purpose, because a wrapper
  throws outside Mokly. That is not a converter, and it stays.

## Facts that the design uses

Sources: the Mokly docs in `mokly-ai/mokly` under `docs/protocol/`, and the
counts and test under `.context/mokly-html/` of this workspace.

- A screen compares each registered instance by path, instance name, and
  props digest, not by its rendered content (`mokly-component-changes.md`).
- A CSS rule goes to a part only when it matches on the part's own pages.
  A change to a design token still gives every screen a row.
- Props are JSON data. Icons and callbacks become string keys that the
  adapter resolves. React content becomes a declared slot.
- A wrapper renders only inside a Mokly render. Outside one, it throws
  "Mokly markers require a sidecar render context".
- Repeated siblings need distinct `moklyInstance` names, in lowercase
  kebab-case. Duplicates in one scope fail the build.
- The app reaches 59 of the 292 TSX files of `docs/mockups/src/components/`
  and `docs/mockups/src/screens/`. Of the first batch below, the app
  shares `Notice`, `StatusText`, and `WorkspaceMark`.

## Design

These are design calls of the agent, made on 2026-11-13:

- **The first batch.** Ten parts: `AppFrame`, `OrgRail`, `Sidebar`,
  `SectionList`, `Page`, `Sheet`, `LinkTabs`, `Notice`, `StatusText`, and
  `WorkspaceMark`. Each one reaches between 196 and 242 of the 250 screen
  modules through their imports. Reason: the widest parts give the
  largest cut in rows.
  Later batches become follow-up items, after Milestone 1 measures the
  gain.
- **The place of a registration.** One entry module for each part, at
  `docs/mockups/src/entries/components/<folder>/<part>.mockup.tsx`, so
  that its path is `components/<folder>/<part>`. Reason: the existing
  entries root and the knip entry glob already cover it, so the change
  adds no Mokly root.
- **Shared parts stay plain in shared code.** A part that the app reaches
  never renders a wrapper inside it. Only mockup screens and mockup-only
  parts use wrappers. Reason: a wrapper throws outside Mokly.
- **The adapters.** Each adapter maps JSON props to the plain part. An
  icon prop becomes a key from a closed list in the schema, resolved
  beside the adapter. `viewport` comes from the render context, not from a
  prop.
- **Instance names.** A part in a list takes its `moklyInstance` from the
  stable id of its fixture, in kebab-case.
- **The variants.** Each part gets one variant for each state that the
  screens show, and at most five on one page. More states go to nested
  child pages, as the `mockups` skill says.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Register the ten parts. The mockup screens and the mockup-only parts render
the wrappers. No screen picture changes.

- [ ] Prove the gain with one part before the batch.
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
- [ ] Register `Notice`, `StatusText`, `Sheet`, `LinkTabs`, and `Page`.
      Give each one its JSON schema, its adapter, and its variants.
- [ ] Register `AppFrame`, `OrgRail`, `Sidebar`, and `SectionList`.
- [ ] Move each mockup-only consumer of the ten parts to the wrapper.
      Keep the plain part in each file that the app reaches. Check this
      with the import closure script of `.context/mokly-html/closure2.mjs`.
- [ ] Run `npm run mockups:check`, `npm run lint`, `npm run format:check`,
      and `npm run exports:check`.
- [ ] Smoke-test the component pages and five screens that use them, at
      both sizes, in light and dark.
- [ ] Run `npm run marketing:pictures`, and check that no picture
      changed.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation

Depends on: 1

State how the catalogue registers parts. No protocol doc changes, because
the product does not change.

- [ ] Update "How a screen is built" and "Folder layout" in
      `docs/mockups/README.md`: the registered parts, their place, the
      wrapper rule for parts that the app shares, and Affected screens.
- [ ] Add the `components` paths to `docs/mockups/catalogue.md`.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Verification, commit, review, and pull request

Depends on: 1, 2

- [ ] Run `npm run check`, the complete gate.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Add a follow-up item for the next batch of parts, with the counts
      from Milestone 1.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
