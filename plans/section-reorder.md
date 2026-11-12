# Reorder sections

Status: Active. On branch `calummoore/oslo-tq4m`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The workspace list shows the sections of an org in a fixed order: General
first, then each new section at the end. A member cannot change that
order. On 12 November 2026 the user asked to reorder the sections by drag
and by the menu of a section. That message chose the approach, so this
change had no brainstorm.

The Worker already stores one order for the whole org.
`PATCH /api/orgs/:orgId/sections/:sectionId` with `position` moves a
section, and the other sections close up around it. The web app never
calls it. This change adds the drag and the two menu items in the web
app, and it uses that call. It does not change the Worker, the workspace
tools, or the order of the Archived group, which stays at the end.

Contract owners:

- [Orgs and members](../docs/protocol/orgs-and-members.md#sections).
- The [mockup catalogue](../docs/mockups/catalogue.md).
- The public guide
  [Workspaces](../src/marketing/docs/workspaces.md#organize-work-with-sections).

## Design

Each item is my design call of 12 November 2026, unless it says otherwise.

- **One order for the org.** The order is the `position` of the section,
  which every member shares, as the name of a section is shared. Reason:
  the Worker and its tests already work this way, and a section is a
  grouping that the people of the org define. A collapse stays per
  member, as it is now.
- **Who reorders.** Every member of an org that is not suspended, as for
  New section and Rename section. A read-only list, as in a suspended org,
  has no drag and no menu. Reason: the Worker already allows each active
  member to change a section.
- **General moves too.** General is the default section, but its place in
  the list has no meaning. Reason: no requirement puts it first, and the
  Worker moves it like any other section.
- **Menu items.** The menu of a section gets **Move section up** and
  **Move section down**, after Rename section and before New section.
  Move section up does not show on the first section, and Move section
  down does not show on the last. With one section, neither shows.
  Reason: the names follow Rename section and Delete section. Hidden
  items follow Move to section, which shows only when the org has more
  than one section.
- **Keys.** No new key. The menu is the path for the keyboard and for a
  screen reader. Reason: the menu already opens from the keyboard, and a
  new fixed key needs a change to the keys docs that the user did not ask
  for.
- **Drag start.** A drag starts on the header of a section, with the same
  pointer drag as a workspace row: a mouse or a pen after a move of 4 px,
  and a finger after a long press. A click with no drag still collapses
  or opens the section. The menu button keeps its own press.
- **Drag look.** The header lifts under the pointer, with its name and
  its count, also while the section is open. The section stays in its
  place, faint, so the list does not jump. A line in the middle of the
  gap between two sections shows where it lands, and it takes no room. A
  status line tells a screen reader the section and its new place. The
  mockup draws the lifted header after the name of the section below the
  line, so that the picture shows both names; in the app it follows the
  pointer.
- **Drop place.** The section lands before the first other section whose
  middle is below the pointer. The Archived group is no target. A drop at
  its own place moves nothing. Escape ends the drag with no move.
- **The write.** The new order shows at once. When the write fails, the
  order goes back, and a toast says "The section didn't move." Other
  members see the new order at their next read of the list, as they see
  a rename now.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Sections page of the catalogue changes. Its menu gets the two new
items, and it gets a new variant for the drag of a section, on the phone
and on the desktop.

- [x] Add Move section up and Move section down to `sectionMenu` in
      `docs/mockups/src/components/workspaces/menus.ts`, and update the
      description of the Sections entry. `sectionMenu` takes the place of
      the section, so it hides the item that does not apply.
- [x] Add a "Drag a section" variant to
      `docs/mockups/src/entries/app/sections/index.mockup.tsx`: the
      lifted header, the faint section, and the drop line. `ListDrag` is
      now a drag of a workspace or of a section.
- [x] Update `docs/mockups/catalogue.md` when it lists the variants.
- [x] Run `npm run mockups:check`. Smoke-test the Sections page.
- [x] Update the design of this plan for each problem that the mockups
      show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update [Sections](../docs/protocol/orgs-and-members.md#sections):
      the menu items in their order, the drag of a section, and the
      shared order.
- [ ] Update the section part of the public guide
      `src/marketing/docs/workspaces.md`. Read each other guide and both
      legal pages in full for sentences that restate the section menu.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The order in the app

Tags: ui

Depends on: 2

- [ ] Add `sectionMoved(sectionId, index)` to `src/app/list-changes.ts`,
      and `moveSection(org, sectionId, index)` to
      `src/app/section-actions.ts`, which sends `position`. Its answer
      confirms the place of the section only.
- [ ] Add `move` to `SectionActions` in `useListActions.ts`, with the
      toast of a failure.
- [ ] Add the two menu items to `SectionHeader.tsx`.
- [ ] Add the section drag on `usePointerDrag`: its layout reads the
      boxes of the sections, as `DropLayout` does for rows. Draw the
      lifted header, the faint section, and the line in `SectionList`.
      Split `SectionList.tsx` before it passes 300 lines.
- [ ] Tests, as the `testing` skill says: the list change puts the
      section at its index; the menu items show and move the section; a
      drag of a header moves it and a click still collapses it; a failed
      write puts the order back.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
- [ ] Try the drag and the menu in a browser, on the desktop width and on
      the phone width.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the design calls of
      this plan with their dates, a permalink to this plan, and the
      follow-up items that the change adds.
