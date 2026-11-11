# Org rail order

Status: Active. On branch `calummoore/riga-188n`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The org rail is the narrow column of org tiles at the far left of the app.
Today it shows the orgs of a person in the order the orgs were created
(`visibleOrgs` in `worker/members/org-data.ts`), and nobody can change that
order. The same list also gives the order of the org rows of the command
palette, the org sheet of a phone, and the org that `/` opens. Cal asked on
11 November 2026 that a person can reorder the orgs in the rail.

The chosen approach is decision 515 C. Each person keeps their own order of
their orgs, saved with their memberships, so it is the same on every device
and in the Mac app. The person changes it on the rail by drag or by a tile
menu with Move up and Move down. On a phone, a long press lifts an org in
the org sheet. This change does not add keys that move an org, an automatic
order, pins, or folders of orgs. The brainstorm notes are in
`.context/org-rail-order/brainstorm.md`.

Contract owners:

- [Orgs and members](../docs/protocol/orgs-and-members.md).
- [Command palette actions](../docs/protocol/command-palette-actions.md),
  which already lists the org rows in the order of the org rail.
- The [members backend README](../worker/members/README.md).
- The [migrations README](../migrations/README.md).

## Design

- Storage. A new nullable integer column on `org_members`, for example
  `rail_position`, holds the place of the org in the rail of that member.
  A save changes only the rows of the person who moves. The value goes
  with the membership when the person leaves or is removed. The migration
  fills the place of each existing row in the current order of its
  person, by org creation time, so the deploy changes no rail.
- Read order. `visibleOrgs` orders by the saved place, then puts the orgs
  without a place after the placed orgs, ordered by `joined_at`, then by
  org ID.
- Write. A route outside `/api/orgs/{orgId}`, for example
  `PUT /api/org-order` with `{ orgId, index }`. The index counts the
  other orgs that the person sees in the rail. The route needs only a
  sign-in and a membership of the person in that org. One D1 statement
  computes the new places of all the visible orgs of the person from the
  current rows, as the section move in
  `worker/app-api/feature-sections-data.ts` does. So two overlapping moves
  give the same order as the two moves one after the other. A move of an
  org that the person cannot see in the rail gets `404 org_not_found`.
  Decision 516 says whether the route also checks the state of the org.
- Client. A move shows at once. It is a change over the org list that the
  server confirmed, as the writes of the workspace list in
  `src/app/section-actions.ts` are. A failure takes back only that move,
  and it shows the error in the same way as a failed move of a workspace
  row. `AppModel.orgs` in `src/app/app-model.ts` is a plain store today,
  without the confirmed list and the pending changes of the workspace
  list, so Milestone 4 adds them.
- Drag. The rail uses the shared pointer drag in `src/app/pointer-drag.ts`,
  with the look of the tab drag and the row drag: a faint copy stays in
  place, a line that takes no space marks the drop place, and a lifted
  copy follows the pointer. Escape cancels the drag. A drag does not open
  the org. A click without a move still opens the org.
- Tile menu. A right click on a tile, or Shift and F10, or the Menu key on
  a focused tile, opens a menu with Move up and Move down. On the first
  tile, Move up is off. On the last tile, Move down is off. After a move
  from the menu, a screen reader hears the org name and its new place, and
  the focus goes back to the tile. Create org, Operator, and the account
  get no menu and do not move. Decision 517 says whether keys also move a
  focused tile.
- Phone. A long press in the org sheet lifts the org, and a move of the
  finger drops it at a new place.

### Design calls

Each call is the agent's call of 11 November 2026, under the decision test.

- A new org goes at the end of the rail. Reason: the app already adds a
  created or accepted org at the end (`putOrg` in `src/app/app-model.ts`),
  and a new tab also opens at the end of the tab row.
- An org without a saved place sorts by the time the person joined it, not
  by the time the org was created. Reason: an accepted org then stays at
  the end after a reload, where it showed before the reload. The
  migration fills the places of the existing rows, so this rule changes
  no rail at the deploy.
- Each place that picks "the first org that is not deleted" keeps that
  rule. That is now the top such org of the rail. The places are the
  address `/` and the org of Get started (`setupOrg` in
  `src/app/setup-steps.ts`), the palette fallback, and the kept org of a
  page without an org (`keptOrg` in `src/app/kept-org.ts`). Reason: all
  of them already read the same list, so the person's own order picks the
  org.
- The unmerged branch `calummoore/keyboard-shortcuts-settings` gives
  the keys Switch to org 1 to 9 to the places of the rail, counted from
  the top. Those keys follow the person's order, and this change needs no
  work for them. Reason: that plan ties each key to a place of the rail,
  not to an org. When both branches merge, the list of fixed keys of that
  branch must also name the keys that open the tile menu, and the keys of
  decision 517 when its answer is B.
- On a phone, a long press only lifts the org and opens no menu. Reason:
  the org sheet is already a sheet, and a long press on a workspace row
  also only lifts it.
- The "Organizations" row of the comparison page does not change. Reason:
  it lists no order feature, so this change ships, starts, and drops no
  listed feature.

## Decisions

### 515. Choose how people reorder their orgs

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/shell/layout/OrgRail.tsx`, `worker/members/org-data.ts`
- **Background:** The rail shows the orgs in creation order. The tab row
  already has an order for each member, with drag, a tab menu, and a long
  press on a phone. The server stores that order for each member.
- **Problem:** A person cannot change the order of the orgs in the rail.
- **Impact if no action:** A person with many orgs cannot put the orgs they
  use most at the top.
- **Root question:** How does a person put the orgs in the rail in the
  order they want, and keep that order?
- **Options:**
  - **A.** Drag a tile on the rail, or use a tile menu with Move up and
    Move down. The browser keeps the order. Each browser and the Mac app
    keep a different order, and the phone sheet keeps creation order.
    Effort: Medium.
  - **B.** An Orgs list in Account settings with Move up and Move down
    buttons. The server keeps the order. People may not find a control
    that is away from the rail. Effort: Medium.
  - **C.** Drag a tile on the rail, or use a tile menu with Move up and Move
    down. On a phone, a long press lifts an org in the org sheet. The
    server keeps the order on the membership. The tile menu replaces the
    browser's link menu on a tile. Effort: Large.
  - **D.** Drag on the rail, plus the settings list of B for keyboard and
    phone users. One task then lives in two places. Effort: Large.
- **Left out:** Change nothing, because no way to reorder exists. An
  automatic order, such as last opened first, because the person cannot
  choose. Pin to top, because it gives only two groups. Drag only, because
  keyboard and screen reader users cannot use it. Folders of orgs, because
  they answer another question, grouping, and still need C inside each
  folder.
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** The tab row order in
  [Agents and sessions](../docs/protocol/agents-and-sessions.md#the-tab-row).
  The drag of workspaces in [Sections](../docs/protocol/orgs-and-members.md#sections).
- **Recommendation:** C. It gives one order on every device, and it copies
  the tab row that people already use.
- **Action:** Ask the user, because the options trade effort against
  keeping the order on every device.
- **Outcome:** The user chose C on 11 November 2026.

### 516. Choose if a suspended or deleted org moves

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/operator-actions.md:160`
- **Terms:**
  - **Suspended org:** an org that an operator stopped. Its members still
    see and open it, but they can change nothing in it except a leave.
  - **Deleted org:** an org that an admin deleted. It stays faded in the
    rail of its admins for 7 days, until it is purged or restored.
- **Background:** The plan saves the rail order on the membership rows of
  the person. A move renumbers all the visible orgs of that person. Today
  the server refuses each write in a suspended org except a leave, also
  the saved view and the read marks of a member. A workspace of a
  suspended org moves no tab. A deleted org accepts only its detail read,
  a retry of the delete, and a restore.
- **Problem:** No rule says if a person can move the tile of a suspended or
  deleted org. The rule "no member can change anything in it" can read as
  a refusal of the move.
- **Impact if no action:** The implementation cannot choose what the route
  and the rail do for such a tile.
- **Root question:** How does the person's own rail order treat a
  suspended or deleted org? Changed by the options check of 11 November
  2026: the yes-or-no form hid where such a tile sits.
- **Options:**
  - **A.** Every tile moves. The protocol says that the rail order belongs
    to the person and is not a change in the org, beside the leave
    exception. Other members see no change. Effort: Small.
  - **B.** A suspended or deleted tile cannot be lifted, and it opens no
    tile menu, as a file tab of a read-only workspace opens none
    (decision 214). The route refuses a move of such an org. Other tiles
    still move before or after it, so the person can still reach every
    order. The renumber of a move still writes the place of that
    membership row. A tile that looks like the others then refuses a move
    with no visible reason. Effort: Medium.
  - **C.** Every tile moves, and the order lives on the account of the
    person as one list of org IDs, not on the membership rows. No row of
    the suspended or deleted org changes. The list needs a clean-up of the
    IDs of orgs that the person left. Effort: Medium.
  - **D.** A suspended or deleted org shows at the end of the rail and does
    not move. A move renumbers only the other orgs, so its row never
    changes. The tile moves without an action of the person, and the org
    keys 1 to 9 of the shortcuts branch shift. Added by the options check
    of 11 November 2026. Effort: Medium.
- **Left out:** Hide a suspended or deleted org from the rail, because its
  members and admins must still open it to see the notice and to restore.
- **Wider fix:** None. This is a rule of a new feature.
- **Previous examples:** The tab order of a workspace of a suspended org,
  which does not move, in
  [Agents and sessions](../docs/protocol/agents-and-sessions.md#the-tab-row).
- **Related:** Decision 517. Under B or D, the keys of 517 B must skip a
  tile that does not move.
- **Recommendation:** A. The rail order is the person's own order across
  orgs, and a move of a tile changes nothing that the org or its members
  see. The doc sentence of A names the class, an order that spans orgs, so
  it also says why the tab order and the read marks of a suspended org
  stay frozen.
- **Action:** Ask the user, because the recommended option changes the
  rule that no member can change anything in a suspended org.
- **Outcome:** Open.

### 517. Choose if keys move a focused tile

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/shell/list/SectionList.tsx:89-107`
- **Background:** Decision 515 C gives keyboard users the tile menu with
  Move up and Move down. In the workspace list beside the rail, Alt and Up
  or Down already move a focused row one place, and a screen reader hears
  the new place. Keys that move a tab were rejected, because Alt with Left
  or Right also goes Back and Forward in browsers.
- **Problem:** The rail and the workspace list are both vertical lists, but
  only the list would move an item with keys. Keys that move a tab were
  rejected first because the user chose the menu, which weighs toward A.
- **Impact if no action:** A keyboard user must open the tile menu for
  each step of a move.
- **Root question:** How does a keyboard user put an org at the place they
  want in few steps? Changed by the options check of 11 November 2026: the
  menu already gives keys, so only the number of steps is open.
- **Options:**
  - **A.** Only the tile menu moves a tile. Effort: Small.
  - **B.** The tile menu, and also Alt and Up or Down with no other
    modifier on a focused tile, as on a workspace row. A screen reader
    hears the new place. Effort: Small.
  - **C.** B, plus Move to top and Move to bottom in the tile menu. A move
    to the top then takes one action, but the menu differs from the tab
    menu. Added by the options check of 11 November 2026. Effort: Small.
  - **D.** A drag by keys: Space lifts the tile, Up and Down move the drop
    line, Space drops it, and Escape cancels. It saves once for each move.
    No other list of the app works this way, and a screen reader in browse
    mode takes the plain arrow keys. Added by the options check of 11
    November 2026. Effort: Medium.
- **Left out:** Alt with Left or Right, because the rail is vertical and
  these keys go Back and Forward in browsers. A palette action that moves
  an org, because it must first name the org, so it is slower than the
  menu.
- **Wider fix:** None. This is a rule of a new feature.
- **Previous examples:** The keys of a workspace row move in
  `src/shell/list/SectionList.tsx`.
- **Related:** Decision 516. Under 516 B or D, the keys of B skip a tile
  that does not move.
- **Recommendation:** B. The same keys then move an item in both vertical
  lists, at a small cost.
- **Action:** Ask the user, because the recommended option adds keys that
  decision 515 C did not name.
- **Outcome:** Open.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the reorder on the rail and in the phone org sheet. Decisions 516 and
517 block only the TODOs that name them.

- [ ] Add a mockup page under `docs/mockups/src/entries/app/orgs/` for the
      reorder. Draw these states on desktop and on a phone:
  - [ ] A drag of a tile on the rail: the lifted tile, the faint copy, and
        the drop line.
  - [ ] The rail after the move.
  - [ ] The tile menu with Move up and Move down, with Move up off on the
        first tile.
  - [ ] A long press that lifts an org in the phone org sheet.
  - [ ] The tile menu of a suspended or deleted org, as decision 516
        says.
- [ ] Give each state a description and a rationale that cite decision 515
      C and the design calls of this plan.
- [ ] Run `npm run mockups:check`. Smoke-test the new pages with
      `npm run mockups:serve`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements of the rail order in the protocol docs and the
public guide.

- [ ] Add an "Org rail order" section to
      `docs/protocol/orgs-and-members.md`: an order for each person, saved
      on the server, drag, the tile menu, the phone long press, a new org
      at the end, and the rule of decision 516 for a suspended or deleted
      org. Cite decisions 515, 516, and 517. When decision 516 is A, also
      add the exception to `docs/protocol/operator-actions.md`.
- [ ] Check that `docs/protocol/command-palette.md` and
      `docs/protocol/command-palette-actions.md` still state the right
      order. Change them only when they are wrong.
- [ ] Update the public guide `src/marketing/docs/orgs-and-members.md` with
      how to reorder the orgs. Follow
      [Website docs](../docs/protocol/website-docs.md).
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Read each other public guide in `src/marketing/docs/` in full.
      Update each sentence that restates a changed fact.

## Milestone 3: Backend

Depends on: 2

Save and read the order of each person.

- [ ] Add a migration under `migrations/` with the nullable place column on
      `org_members`. Fill the place of each existing row in the current
      order of its person. Follow `migrations/README.md`.
- [ ] Order `visibleOrgs` by the saved place, then by `joined_at`, then by
      org ID.
- [ ] Add the shared path and the request type to `src/shared/api.ts` and
      `src/shared/orgs.ts`.
- [ ] Add the move route to `membersRoute` in `worker/members/route.ts`,
      with its data function in `worker/members/org-data.ts`.
- [ ] Tests:
  - [ ] A move changes the order of the person and of nobody else.
  - [ ] A move of an org that the person cannot see gets
        `404 org_not_found`. This includes an org of another person and a
        deleted org of a person who is not its admin.
  - [ ] A suspended org and a deleted org follow decision 516.
  - [ ] Two overlapping moves give the order of the two moves one after
        the other.
  - [ ] A new membership goes at the end, after the placed orgs.
- [ ] Update `worker/members/README.md` and `src/shared/README.md`.

## Milestone 4: Rail and org sheet

Tags: ui

Depends on: 1, 3

Let the person reorder the orgs on the rail and in the phone org sheet.

- [ ] Give `AppModel.orgs` in `src/app/app-model.ts` a confirmed list and
      pending changes, as the workspace list has. Add the move: it shows
      at once, and a failure takes back only that move.
- [ ] Add the drag to `src/shell/layout/OrgRail.tsx` with the shared
      pointer drag. Keep the file under 300 lines. Split the drag and the
      menu into their own files.
- [ ] Add the tile menu with Move up and Move down, the screen reader
      message, and the focus return.
- [ ] Add the keys of decision 517, when its answer is B.
- [ ] Follow decision 516 for the tile of a suspended or deleted org.
- [ ] Add the long press drag to the org sheet in
      `src/shell/list/HomeList.tsx`.
- [ ] Tests:
  - [ ] A drag and a menu move call the move with the right index.
  - [ ] Escape cancels a drag. A click without a move opens the org.
  - [ ] Move up is off on the first tile, and Move down is off on the
        last tile.
  - [ ] A failed move takes back only that move.
- [ ] Check the rail in a browser with `npm run dev`: drag, menu, Escape,
      reload, and the phone layout.
- [ ] Update the README of each changed area.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
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
