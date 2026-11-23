# Shared UI in the app

Status: Active. On branch `calummoore/components-location-misunderstood-d7lu`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The app, the Worker, and the Mac app import about 350 modules from
`docs/mockups/src/`: shared parts, CSS Modules, design tokens, the theme,
the global stylesheet, the fonts, text modules, and `brand.ts`. The
mockups also import about 56 app modules. So the imports point both ways,
and production code lives in a docs folder. The rule in `CLAUDE.md` tells
agents to add shared parts to the mockups, so the problem grows.

This change moves each mockup module that the app, the Worker, the Mac
app, or the marketing site uses at run time into the app, under
`src/ui/`. The mockups then import those modules from the app. Screens,
entries, fixtures, `ScreenLink`, the catalogue paths, the Mokly helpers,
and the parts that only the mockups use stay in `docs/mockups/`. The
change does not merge the still mockup parts with the interactive app
parts. It changes no rendered pixel, no protocol fact, and no legal text.

## Decisions

The brainstorm of 2026-11-23 gave these items. The user answered them on
2026-11-23. The notes of the brainstorm are in
`.context/components-location/`.

- **Decision 1, where shared UI code lives: A.** Move the modules that
  the app uses at run time into an app-owned `src/ui/` with the same
  folders as now. The other options were B, put each part into the
  folder of its feature, and C, keep one version of each part, which is
  a long staged project. The left-out approaches were: change nothing,
  move the whole catalogue into `src/`, a neutral `ui/` folder at the
  root, and an npm workspace package. Reason: A meets the goal with
  mostly pure renames and one simple rule, and C can still follow.
  The options check added **D**: move each pure part by kind, also the
  about 100 pure parts that nothing in the app uses, and start each new
  part in `src/ui/`. Effort: Medium. The user kept A on 2026-11-23,
  because A keeps `src/` to shipped code and the lint forces each later
  move.
- **Decision 2, one move or a staged move: C.** One scripted move in
  one pull request, started when the script is ready. Pull request #569
  does not hold it. #569 and each other open branch run the same script
  after they merge `main`, with the path map that the pull request
  gives. The user first chose A on 2026-11-23, the same move after #569
  merges. The options check then added C and D, and the user chose C on
  2026-11-23. The other options were B, one folder for each pull
  request, and D, a rebase merge that keeps the rename commit apart on
  `main`. Reason: #569 has conflicts and can stay open for long, and the
  path map makes its extra merge pass small.
- **Decision 3, a lint that keeps the imports one way: B.** An ESLint
  `no-restricted-imports` rule blocks imports of `docs/mockups/` from
  `src/`, `worker/`, and `desktop/`. Development code and tests stay
  exempt. The other option was A, no lint. Reason: it is small and it
  keeps the result of decision 1. The options check added two options,
  and the user kept B on 2026-11-23:
  - **C.** A gate step walks the run-time imports from each entry point
    and fails on `docs/mockups/`. It reuses the walker of Milestone 2.
    It also finds chains through exempt `dev/` and test files, dynamic
    `import()`, and CSS. The user deferred such a step on 2026-11-09.
    Effort: Medium.
  - **D.** B, plus a rule that production code imports no `dev/` or test
    module. About 78 helper files need one name pattern first. Effort:
    Medium.
  The check kept B. B does not find a chain through an exempt file, so
  `plans/follow-ups/fixture-import-check.md` stays open, narrowed to C.
  The check report is `.context/shared-ui-in-the-app/options-check.md`.

## Design calls

These are my calls, from 2026-11-23.

- The folder is `src/ui/`, not `src/components/`. The mockup docs use
  `src/components/` many times for the mockup folder.
- A module moves when the app, the Worker, the Mac app, or the marketing
  site imports it at run time, directly or through another moved module.
  Imports from `dev/` code and tests do not make a module move. The new
  rule for later work: a mockup part moves to `src/ui/` when the app
  starts to use it.
- The moved set is closed. A moved module imports nothing from
  `docs/mockups/`, also not a type. The domain types that moved modules
  read from fixtures, such as `BannerState`, move into `src/ui/` beside
  their users. A type that a moved module reads from a mockup-only part,
  such as `MenuPlacement`, moves into `src/ui/` as one type, and the
  mockup part imports it from there. No local copy can drift.
- The move script starts from the direct imports of shipped files, not
  from a walk of the entry points. So it needs no rule for the `import()`
  calls behind `import.meta.env.DEV`: their targets are `dev/` files,
  which do not count. My call on 2026-11-23, during Milestone 2. It
  replaces the call to skip those calls in a walk.
- The move script gets no unit test. The `testing` skill says that a
  migration never gets a test. Its proof is one run: the gate passes and
  the catalogue compare shows no change.
- Imports stay relative, as now. A path alias needs changes in Vite,
  Vitest, TypeScript, Mokly, Astro, and the Mac app build.
- `brand.ts` moves to `src/shared/brand.ts`. The product name still lives
  in one place, as decision 100 says. The Terms digest covers only the
  text, so the Terms get no new revision.
- `src/ui/` keeps the inner folders of `docs/mockups/src/`:
  `components/<folder>/`, `design/`, `screens/` for screen CSS and copy,
  `fonts/`, `theme.ts`, `render.css`, and `noop.ts` when the app uses it.
  The Mokly registrations under `docs/mockups/src/entries/components/`
  keep their paths, so the catalogue paths do not change.
- A committed script makes the move, `tools/ui-move/`. It builds the path
  map from the run-time import graph, moves the files with `git mv`, and
  rewrites each relative import and each relative Markdown link. Open
  branches run it after they merge `main`. A follow-up item deletes the
  script when no open branch needs it.
- Proof of no visual change: build the catalogue before and after the
  move, strip the `mokly_<hash>_` prefix of each CSS Module class, and
  compare the documents. Mokly hashes the repository path of a CSS
  Module into its class names, so Changes lists each view that draws a
  moved module one time. Branches compare with their merge base, so they
  see no lasting noise.
- `plans/follow-ups/desktop-ci-skips-mockup-styles.md` is deleted, not
  narrowed. After the move, every style of the app lives under `src/**`,
  which the path filter of the Mac CI job covers. A change under
  `docs/mockups/` changes only the catalogue. My call on 2026-11-23,
  during Milestone 4.
- `ChecksBranches` moves out of the mockup part
  `docs/mockups/src/components/workspace/BarActions.tsx` into its own
  file. The longer import paths made that file pass 300 lines. It is a
  plain helper, so no registration changes. My call on 2026-11-23.

Contract owners:

- The [mockups README](../docs/mockups/README.md) and
  [Registered parts](../docs/mockups/registered-parts.md).
- The [web app README](../src/app/README.md), the
  [chat README](../src/chat/README.md), and a new `src/ui/README.md`.
- The repository rules in [CLAUDE.md](../CLAUDE.md) and
  [Key code](../docs/key-code.md).

Replaced ways:

- Shared UI under `docs/mockups/src/` → shared UI under `src/ui/`.
  Consumers: every import in `src/`, `worker/`, `desktop/`, the marketing
  site, `tools/marketing-pictures/`, the Astro config, and
  `docs/mockups/src/`, and each Markdown link and path mention. Moved and
  the old paths deleted in Milestone 3.
- The README rule that the app reuses pure mockup parts → the lint of
  decision 3. Moved in Milestone 4.

## Milestone 1: Documentation

Depends on: none

State the new rule: the app owns the shared UI, and the mockups import
it. The path mentions of each doc change in Milestone 3, with the move.

- [x] Change the "Product" section of `CLAUDE.md`: shared parts that the
      app uses live in `src/ui/`. Mockup-only parts stay in
      `docs/mockups/src/components/`. Change the `brand.ts` sentence of
      "Repository rules".
- [x] Write `src/ui/README.md`: what lives there, the folders, the rule
      for a new shared part, and that `src/ui/` imports nothing from
      `docs/mockups/`.
- [x] Update the folder layout and "How a screen is built" in
      `docs/mockups/README.md`, the shared-part rules in
      `docs/mockups/registered-parts.md`, `docs/key-code.md`, the reuse
      rules in `src/app/README.md` and `src/chat/README.md`.

## Milestone 2: The move script

Depends on: none

- [x] Write `tools/ui-move/`. It lists each module under
      `docs/mockups/src/` that a shipped file of `src/`, `worker/`, or
      `desktop/` imports, and each module that those import in turn. It
      writes the path map as JSON.
- [x] Add the rewrite step. For each source file, it reads each relative
      import, `import()`, CSS `@import` and `url()`, and relative
      Markdown link. When the target moved, or the file itself moved, it
      writes the new relative path. It keeps the extension style of each
      specifier. A second run changes nothing.
- [x] Document the script and the steps for an open branch in
      `tools/ui-move/README.md`.

## Milestone 3: The move

Depends on: 1, 2. It does not wait for pull request #569 (decision 2).

- [x] Merge `origin/main`. Run the script. Commit the pure renames apart
      from the edits. A squash merge joins the two commits, so keep the
      edits of each moved file small enough that Git still finds the
      rename.
- [x] Move the fixture domain types that moved modules read into
      `src/ui/`. Replace the type imports of mockup-only parts with local
      types. Check that no file under `src/ui/` imports `docs/mockups/`.
- [x] Update the paths in `astro.config.*`, `tools/marketing-pictures/`,
      the Knip config, `.github/workflows/desktop-ci.yml`, and each other
      config that names a moved path.
- [x] Update each relative link and each path mention in the Markdown
      files. Check each changed relative link.
- [ ] Run `npm run typecheck`, `npm run mockups:check`, `npm run lint`,
      and `npm run format:check`. Fix each error.
- [ ] Compare the catalogue built before and after the move, without the
      `mokly_<hash>_` prefixes. Save the result under
      `.context/shared-ui-in-the-app/`.
- [ ] Smoke-test the app and the catalogue in a browser. Save a
      screenshot of each.

## Milestone 4: The import lint

Depends on: 3

- [x] Add the `no-restricted-imports` rule of decision 3 to
      `eslint.config.js`. Exempt `**/dev/**`, `**/*.test.ts(x)`, and
      `**/test-support/**`.
- [x] Move each production import that the rule finds, such as
      `marketingPictureList.ts`, into the app.
- [x] Replace the README rule with a sentence that names the lint.
- [x] Narrow `plans/follow-ups/fixture-import-check.md` to the chains
      that the lint does not find, with option C of decision 3. Delete
      `plans/follow-ups/desktop-ci-skips-mockup-styles.md`, which the
      move fixes.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Add a follow-up item that deletes `tools/ui-move/` when no open
      branch needs it.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, the path map, the steps for open branches, and the follow-up
      items that the change adds.
