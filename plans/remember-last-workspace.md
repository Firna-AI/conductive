# Remember the last workspace of each org

Status: Active. On branch `calummoore/quito-pobp`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

When the person opens an org, the desktop app shows the workspace list
and an empty "Choose a workspace" panel. So each switch between orgs
loses the open workspace. This change remembers the last workspace that
the person opened in each org. A switch to the org opens that workspace
again, with its session or tab. The address `/`, where the app and the
Mac app start, opens the workspace that the person opened last.

The change does not cover a memory on the server, so a device does not
get the last workspace of another device. It does not remember other
pages of an org, such as Settings or Routines.

## Decisions

### 1. How long to remember the last workspace

- **Decided:** 13 November 2026, by Cal: **B**.
- **Options:**
  - **A.** Memory of the tab, as `AppModel.lastOrg` does. A reload
    forgets it.
  - **B.** Browser storage, per person. It stays after a reload and a
    restart of the Mac app. The app start also opens the last workspace
    again.
  - **C.** Server storage, per person. Each device gets it. It needs a
    new API and a database change (Large effort).
- **Reason:** to "remember" means that the place stays after a reload
  and a restart. The panel widths already use the same browser storage.
- **Left out:** remember the last page of the org, such as Settings,
  because the request names the last workspace.
- **Options check:** skipped, because the user had already answered the
  decision when it went into this plan.

## Design calls

Each call is my call, made on 13 November 2026.

- The memory keeps the full workspace address: the workspace, the
  session, and the view. Reason: the switch returns the person to where
  they were.
- The org tile in the rail, Switch to org 1 to 9, and the Switch to rows
  of the command palette open the remembered workspace. Without one,
  they open the org as before.
- The org switcher of a phone still opens the list of the org. Reason: a
  phone has no sidebar, so the list is the way to move around.
- The key of Workspace list and the Workspaces back links still open the
  list page of the org. Reason: `keyboard-shortcuts.md` requires it, and
  those links name the list.
- The tile of the org of the page also opens the remembered workspace.
  From a workspace page that is the same page. From Settings it returns
  to the workspace.
- The app remembers a workspace when its page shows the workspace. It
  forgets the workspace when the page shows that the workspace is not
  available. Reason: a lost workspace then does not open again and
  again.
- The app reads each stored address with `parseRoute`. It keeps only a
  workspace address of the same org. A bad or old value is ignored.
  Reason: the app warns and continues on bad input.
- At `/`, the app opens the last workspace only when its org is in the
  list and not deleted, and Get started does not show. Otherwise `/`
  opens the first org, as before.
- The storage key holds the person's id, so another person in the same
  browser gets no address of the first person.
- The Privacy page lists what the browser keeps: the panel sizes. So it
  now also lists the last workspaces, in `privacy.ts` and
  `privacy-uses.ts`. The first plan said that the legal pages needed no
  change. A full read of the legal pages found the list.
- A switch to an org can now open a stopped workspace, and that open
  starts its computer, as an open from the list does. The guide says so.
  Reason: decision 1 B chose to open the last workspace.
- The change has no mockup work. No screen changes. Only the page that a
  click opens changes, and the catalogue does not draw that.

Contract owners:

- [Org rail order](../docs/protocol/org-rail-order.md).
- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md).
- The [app README](../src/app/README.md) and its key code notes.

## Milestone 1: Documentation and protocol

Depends on: none

State the new requirements before the code changes.

- [x] Update `docs/protocol/org-rail-order.md`: a tile, Switch to org 1
      to 9, and the Switch to rows open the last workspace of the org;
      the org switcher of a phone opens the list; `/` opens the last
      workspace when its org is open. Record decision 1 by its date.
- [x] Check `docs/protocol/keyboard-shortcuts.md` and
      `docs/protocol/command-palette-actions.md`. Update each sentence
      that says where Switch to org opens.
- [x] Read each public guide in `src/marketing/docs/` in full. Update
      the sentence in `orgs-and-members.md` on where Conductive opens,
      and each other sentence that restates the fact.
- [x] Read the Terms and Privacy pages in full. Update each sentence
      that lists what the browser keeps.

## Milestone 2: The memory of the last workspaces

Depends on: 1

A model in `src/app/` that keeps the last workspace of each org in the
browser storage of `AppServices`.

- [x] Add `src/app/last-workspaces.ts`: a store of the last workspace
      address of each org, and the org opened last, for the signed-in
      person. It reads and writes `localStorage` through
      `KeyValueStorage`. It ignores bad values and a refused storage.
- [x] Give it `remember`, `forget`, `address(orgId)`, and `latest()`.
- [x] Add it to `AppModel`.
- [x] Add `src/app/last-workspaces.test.ts`: a remember and a read, a
      reload from storage, a forget, another person, bad values, and a
      refused storage.

## Milestone 3: Open the remembered workspace

Tags: ui

Depends on: 2

- [x] Remember the workspace when `WorkspaceScreen` shows it. Forget it
      when the screen shows `Unavailable`.
- [x] Use the remembered address in the org tile and in Switch to org 1
      to 9 (`src/shell/layout/OrgRail.tsx`).
- [x] Use it in the Switch to rows of the palette
      (`src/app/palette/palette-rows.ts`).
- [x] Use it at `/` (`src/shell/Shell.tsx`).
- [x] Add tests for the rail link, the palette row, and `/`.
- [x] Update `src/app/README.md` and the key code notes.
- [x] Check the change in a browser: switch between two orgs, reload, and
      open `/`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

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
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
