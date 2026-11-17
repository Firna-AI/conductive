# Org colours

Status: Active. On branch `calummoore/glow-color-customization-aneo`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Every open org looks the same in the org rail today: blue initials and a
blue outline on a grey pill. The pill differs from the rail by 1.22:1 in
the dark scheme and 1.04:1 in the light scheme, so only the blue initials
show which org is open. Cal asked on 2026-11-17 for a colour that an org
setting chooses from presets, so that a person notices which org is open.

The change adds one colour to each org. An admin picks it from a row of
preset swatches on the General tab of the org settings. The tile of the
open org shows the colour in its initials and its outline. The change does
not tint the rest of the app, and it does not colour the tiles of the
other orgs.

Contract owners:

- [Orgs and members](../docs/protocol/orgs-and-members.md).
- The [migrations README](../migrations/README.md).
- The [app API README](../worker/app-api/README.md) and the
  [shared README](../src/shared/README.md), where they list org fields.

## Decisions

Cal answered these on 2026-11-17, after a brainstorm. The brainstorm notes
are in `.context/org-colour/brainstorm.md`.

1. **Who sets the colour: A, one colour for each org, set by an admin.**
   Rejected: B, each person picks a colour for each org in the tile menu,
   because teammates would see different colours and phones have no tile
   menu. Rejected: C, the org colour becomes the accent of the whole app,
   because red, amber, and green would read as danger, warning, and
   success, and every screen would need a check. Reason: it matches the
   request and the rule for initials, and every member sees the same
   colour.
2. **Which tiles show the colour: A, only the tile of the open org.**
   Rejected: B, every tile, because then only the faint pill marks the open
   org. Reason: it matches "when selected" and keeps a clear mark on the
   open org.
3. **Colour of existing orgs: A, today's blue until an admin picks one.**
   Rejected: B, a colour from the org ID, because every user would see a
   change that they did not ask for. Reason: the safer default in
   production. An empty column means blue, so the migration fills no data.

Left out in the brainstorm: a colour from the org ID with no setting, an
org logo or emoji, a stronger mark that is the same for every org, a free
colour picker, a colour from the rail position, and no change.

## Design

- Storage: a nullable `orgs.color` text column holds a preset key. Null
  means the default, Blue.
- Presets, my call on 2026-11-17: eight keys in hue order, `blue`, `teal`,
  `green`, `yellow`, `orange`, `red`, `pink`, and `purple`. `blue` is the
  default and uses the theme accent. Each preset has an ink and an outline
  value for each scheme. Each ink keeps a contrast of 4.5:1 or more on the
  tile fill and on the selected pill, in both schemes. Reason: the `Avatar`
  of `@firna/ui` asks for 4.5:1, and one value cannot reach it in both
  schemes.
- The keys and their reader live in `src/shared/org-colors.ts`, because the
  Worker and the app both read them. The values and the labels live in
  `docs/mockups/src/design/orgColors.ts`, beside the palette.
- API, my call on 2026-11-17: `PATCH /api/orgs/:id` takes an optional
  `color`. `name` becomes optional when `color` is present. A request
  without `color` keeps the saved colour, as initials do. An unknown key is
  refused with `invalid_input`. Reason: the colour saves on its own, and an
  older client sends no colour.
- Org replies give `color` only when it is set, as they give `initials`. A
  client that gets a key that it does not know shows Blue.
- UI, my call on 2026-11-17: a swatch saves when the admin selects it, in
  its own request, with no Save button. Reason: a shared Save button with
  the name makes the stale-draft bug of
  `plans/follow-ups/org-name-editor-stale-draft.md` worse. A member and a
  suspended org see the colour name without swatches.
- The colour follows the `current` flag of `OrgTile`: the rail, the phone
  org switcher, the list header, and the lifted tile of a drag. The command
  palette, the operator section, and deleted orgs stay grey, as today.
- Create org does not change. A new org starts with Blue.
- Implementation route, my call on 2026-11-17: this session builds each
  milestone itself instead of delegating it, because the change is small
  and the milestones touch the same few files.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The General tab gets a Colour row of swatches, and the rail shows the
colour of the open org.

- [x] Add the preset values and labels in `docs/mockups/src/design/orgColors.ts`.
- [x] Give the mockup `OrgTile` and `InitialsTile` an optional colour for
      the current tile. Give the fixture orgs a colour, so that the rail of
      `app/shell` and `app/orgs` shows different colours when each org opens.
- [x] Add the Colour swatches to General in `app/org-settings`, and the
      read-only colour to its `member` variant.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The mockups showed no problem. The fixture orgs keep
      no colour, so that a new org starts with Blue, and the view
      `app/org-settings/colour` shows Acme in Green.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] State the org colour in `docs/protocol/orgs-and-members.md`: the
      presets, Blue for an org with no colour, only an admin changes it,
      and only the tile of the open org shows it.
- [x] Update the public guide `src/marketing/docs/orgs-and-members.md`.
- [x] Read both legal pages, and update each sentence that restates a
      changed fact. No sentence restates the org colour, initials, or the
      General tab, so the legal pages do not change.

## Milestone 3: Storage and API

Depends on: 2

- [x] Add `src/shared/org-colors.ts` with the keys, the type, and the
      reader, and add the optional `color` to `OrgSummary` and to the
      PATCH request.
- [x] Add the migration for `orgs.color`, and list it in the migrations
      README.
- [x] Read and write `color` in `worker/members/org-data.ts`,
      `worker/members/route.ts`, and `worker/data/orgs.ts`.
- [x] Support `color` in the dev API in `src/app/dev/org-routes.ts`.
- [x] Add Worker tests: an admin sets a colour, a member is refused, an
      unknown key is refused, and a rename keeps the colour.

## Milestone 4: Rail and settings

Tags: ui

Depends on: 3

- [x] Show the colour of the open org in the app `OrgTile`.
- [x] Add the Colour swatches to the General tab, with a save on select,
      and the read-only colour for a member.
- [x] Add a `setOrgColor` action to the app model.
- [x] Add tests for the tile colour and the swatch save.
- [x] Check the rail and General in a browser, in both schemes. The
      screenshots are in `.context/org-colour/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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
