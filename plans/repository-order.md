# Repository order

Status: Active. On branch `calummoore/perth-pk73`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An org chooses the repositories that its cloud computer holds, on the
Repositories tab of the org settings. Every list of these repositories
sorts them by GitHub name. Two defaults take the first one: New workspace
picks the first chosen repository that is ready, and a new automation gets
the first chosen repository. So an org cannot choose its default
repository. On 18 November 2026 the user asked, with a screenshot of the
Repositories tab: "allow ordering, the first one becomes the default for
new sections, etc - and its the order in the dropdown when creating a new
workspace". The user's message chooses the approach: one stored order, the
first repository is the default, and the lists follow the order. A
brainstorm was not needed for that reason.

This change stores an order of the chosen repositories of each org. An
admin changes it on the Repositories tab. The New workspace repository
menu, the automation repository menu, the Repositories tab, and the
read-only tab of a member show the chosen repositories in that order. The
defaults of New workspace and of a new automation then take the first
repository of the order. The change does not touch the image: a reorder
starts no build, and the build keeps its own order of the repositories.

Guess: "new sections" in the user's message means new workspaces and new
automations. A section is not tied to a repository, as
[Sections](../docs/protocol/orgs-and-members.md#sections) says, so no
section has a default repository.

Contract owners:

- [Orgs and members](../docs/protocol/orgs-and-members.md).
- [New workspace notices](../docs/protocol/new-workspace-notices.md#waiting-repositories).
- [Automations](../docs/protocol/automations.md).
- [Repository, section, and model lists](../docs/protocol/create-call-lists.md#repositories),
  when decision 2 chooses B.
- The public guide [Cloud computer](../src/marketing/docs/cloud-computer.md#choose-repositories).
- The [migrations README](../migrations/README.md#keep-the-previous-worker-working).

## Terms

- **Chosen repository:** a repository that the org added on the
  Repositories tab. The `selected` column of the `repositories` table marks
  it.
- **Repository order:** the order of the chosen repositories of an org,
  which this change stores. Its first repository is the default.
- **Edit list:** the list that Edit opens on the Repositories tab. It holds
  every repository that the GitHub App reaches, with search, Add, and
  Remove.

## Decisions

A repository-order decision number names a decision of this change. The
options check of 18 November 2026 changed the root questions of both
decisions, added options E and F to decision 1 and option D to decision
2, and changed the recommendation of decision 1 from B to F. Its summary
is in `.context/repository-order/options-check-report.md`.

### 1. How an admin sets the order and the default

- **Answer:** F, on 18 November 2026.
- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/shell/settings/RepositoriesTab.tsx:56` and
  `src/shell/settings/RepositoryPicker.tsx:33`.
- **Background:**
  - The Repositories tab shows the chosen repositories as a list without
    actions. Edit replaces it with the Edit list.
  - Sections move by a drag of the header and by Move section up and Move
    section down in the section menu.
  - The orgs of the rail move by a drag, by Move up and Move down in a
    tile menu, and by Alt and Up or Down on a focused tile.
  - The rail rejected Move to top, because its menu would then differ from
    the tab menu.
  - `src/app/pointer-drag.ts` holds the shared drag. The rail hooks
    `useOrgDrag`, `useRailMoves`, and `useTileMenu` hold the rest.
- **Problem:** The tab has no control that changes the order. Nothing
  shows which repository is the default.
- **Impact if no action:** The user's request is not met.
- **Root question:** How does an admin set the order and the default
  repository of the org, and how does each person see which repository is
  the default?
- **Options:**
  - **A.** Each row of the chosen list gets Move up and Move down icon
    buttons for an admin. No drag. It is the smallest build, but it differs
    from the other moved lists of the app. Effort: Small.
  - **B.** Each row of the chosen list gets the moves of the rail for an
    admin: a drag, a row menu with Move to top, Move up, and Move down,
    and Alt and Up or Down on a focused row. A phone lifts a row with a
    long press. It reuses the drag and the rail hooks. Effort: Medium.
  - **C.** A drag of the row only, with Alt and Up or Down for the
    keyboard. No menu. A person who does not drag and does not know the
    keys has no way to move a row. Effort: Medium.
  - **E.** The moves of B show only in Edit. Edit lists the chosen
    repositories first, in the order, with the moves and Remove. The
    other repositories follow by GitHub name, with Add. A search turns the
    moves off. The plain list keeps no actions. Edit gets a second group
    and a search rule, and an admin needs one more press. Effort: Medium.
  - **F.** B with three changes. The first row shows a "Default" label,
    on the admin tab and on the read-only tab of a member. The row menu
    says "Make default" in place of "Move to top". The tab text says that
    New workspace and a new automation start in the first repository, or
    in the next ready one while it waits for a build. It costs one label,
    one sentence, and one mockup state more than B. Effort: Medium.
- **Left out:** A Default menu that chooses only the first repository: it
  fails the goal, because the user asked for an order that the New
  workspace menu follows. A number field for the place of each
  repository: B is better on every point. A separate Reorder mode with
  its own Done: E gives the same result inside the Edit state that
  already exists.
- **Wider fix:** None, because this is a new control and not a defect
  class. The design calls build it on the rail hooks, so that the app gets
  no fourth copy of the moves.
- **Previous examples:** Sections, in
  [Sections](../docs/protocol/orgs-and-members.md#sections). The org rail,
  in [Org rail order](../docs/protocol/org-rail-order.md) and the
  `app/orgs/reorder` mockup.
- **Recommendation:** F. It has all the moves of B, and it also shows the
  default, which is the rule that the user asked for. The plan
  recommended B before the options check.
- **Action:** ask the user, because the options trade effort against
  consistency, and the user reviews each new control and label.

### 2. The default and the order that an agent sees

- **Answer:** B, on 18 November 2026.
- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/create-call-lists.md:40` and
  `worker/tools/lists.ts:74`.
- **Background:** Agents list the repositories of the org with
  `list_repositories`, `conductive repositories list`, or
  `GET /v1/tools/repositories`. That list holds the repositories of the
  newest good org image. A protocol rule puts it in the order of the
  GitHub names. A create call must name its repository (decision 52).
- **Problem:** After this change, people see the repository order, but an
  agent sees the GitHub name order. An agent that takes the first
  repository of its list then takes another default than New workspace.
- **Impact if no action:** Two orders exist. An agent can create a
  workspace in another repository than a person expects.
- **Root question:** How does an agent get the same order and the same
  default repository as the people of the org?
- **Options:**
  - **A.** Keep the GitHub name order. No change. Effort: Small.
  - **B.** Use the repository order. A repository of the image that the
    org no longer chose goes at the end, by GitHub name. The protocol rule
    changes. No wire type changes, so every runner gets it at once.
    Effort: Small.
  - **C.** B, and each entry marks the default repository. It adds a
    field to the tool answer. An older runner drops a field that it does
    not know, and a sandbox can resume weeks later with an old runner.
    Effort: Small.
  - **D.** B, and the description of `list_repositories` and the CLI help
    say that the list starts with the default repository of the org. It
    is a runner change, so each sandbox gets the sentence at its runner
    update. Effort: Small.
- **Left out:** A create call that takes the default of the org when it
  names no repository: it breaks decision 52, which stays.
- **Wider fix:** B, with one shared order for the three repository lists
  of the Worker. Today they use three different name orders.
- **Previous examples:** The section list of the same doc gives the order
  of the sidebar, and marks the default section.
- **Recommendation:** B. One order everywhere is simple, it changes no
  wire type, and D can follow later if agents must prefer the default.
- **Action:** ask the user, because B changes a requirement of
  `create-call-lists.md`, and no user decision covers the agent tools.

## Design calls

Each call is mine, on 18 November 2026.

- One order for the whole org, which only an admin changes. Reason: the
  user asked on the Repositories tab of the org settings, and only an
  admin changes the repositories (decision 57). A member sees the order
  read-only. An order for each member was not chosen, because the
  request is about the default of the org.
- The order lives in a new nullable `position` column of `repositories`.
  Reason: the previous Worker adds repositories without a position, so the
  column must accept no value.
- The migration gives the chosen rows positions in the order of
  `lower(full_name)`, then `full_name`, then the ID, the order of the
  tool list. Reason: today the app uses three name orders, so no single
  order keeps every list as it is. This order matches the menu that most
  people see for names in one case.
- Every list sorts the chosen rows by `position`. A chosen row without a
  position goes after the rows with one, by the name order above. One
  Worker helper gives this order to every list. Reason: a repository that
  the previous Worker adds during a deploy then still shows.
- Each add or move gives every chosen row a position again, from 0, in
  the current order. So a row without a position gets one at the next
  write. A Remove clears the position. Reason: the positions then stay
  dense, and a removed repository keeps no old place.
- A newly chosen repository goes to the end of the order. A repository
  that the org removes and adds again also goes to the end. Reason:
  sections and orgs also add at the end, and an add then never changes the
  default.
- Create org saves the chosen repositories in the name order above.
- A move saves one repository to one place among the chosen ones, as a
  section move does. Reason: two moves at the same time then both apply,
  and a failure takes back only its own move. A save of the whole order
  was rejected, because an old list would undo a move by another admin.
- A move of a repository that is not chosen any more changes nothing and
  answers with the current list. Reason: graceful handling, and no new
  rejection.
- A move starts no build, adds no change to the repository notice, and
  does not change the image. The build keeps its order by ID. Reason: the
  order is a setting of the app lists, not of the cloud computer.
- The Edit list stays in GitHub name order. Reason: it is a search list of
  every repository that the GitHub App reaches, also the ones not chosen.
- New workspace keeps its rule: the form picks the first ready repository,
  now in the repository order. A kept draft and a pick of the person stay.
- A new automation gets the first chosen repository in the repository
  order. An existing automation keeps its repository.
- The move route is `PUT` on the path of the repository with
  `/position`, with the body `{ "index": n }`. The index counts the chosen
  repositories without the moved one, as a section move does. The answer
  is `{ "order": [...] }`, the IDs of the chosen repositories in the saved
  order, from stored data only. The client puts its list in that order.
  Reason: no call to GitHub can then fail a move that saved. Review
  finding 1 of 18 November 2026 changed this call. The first version
  answered with the whole list, which needs GitHub.
- Every list that moves by a drag, a menu, and keys uses one hook,
  `src/shell/ui/useListOrder.ts`, so a drop says the new place too. The
  rail turns that off, because its protocol says nothing after a drop.
  Review finding 2 of 18 November 2026 added this call.
- The migration has no permanent test, as the `testing` skill says. Its
  one-time proof is in `.context/repository-order/migration-proof.txt`.
- The Edit list sorts by name in the client, with
  `compareRepositoryNames`. The mockup of Edit sorts by name too.
- The tab text gives the rule of decision 1 F in two sentences: "New
  workspaces and automations start in the first one. While it waits for a
  build, new workspaces start in the next ready one." A new automation
  takes the first repository also while it waits, so the text names the
  wait for new workspaces only.
- The row menu opens from a visible More button on each row, named "More
  for" and the repository, as the section menu. A right click opens the
  menu of the browser. Reason: a settings list has no tile, and a visible
  button is easier to find.
- Alt and Up or Down move a row while the focus is in the row, such as on
  its More button. The row itself takes no focus. Reason: a second tab
  stop for each row adds nothing that the button does not give.
- The drag and key hooks of the rail move to `src/shell/ui/useListDrag.ts`
  and `src/shell/ui/useListMoves.ts`, for any item with an ID and a name.
  The rail and the org switcher use them as before.
- Each add and each Remove gives the chosen rows dense positions first.
  The order ignores a position on a row that is not chosen, because the
  previous Worker keeps it at a Remove. A move keeps the settings revision,
  because the image does not depend on the order.
- After a move, a screen reader hears the name and the new place, such
  as "acme/web moves to place 1 of 3", as on the rail.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Repositories tab of the org settings gets the reorder control of
decision 1, for a computer and a phone. The New workspace and the
automation repository menus show the repository order.

- [x] Update the repositories mockups of the org settings under
      `docs/mockups/src/entries/app/org-settings/` with the reorder
      control, its states, and the order after a move, as decision 1
      chooses.
- [x] Show a member's read-only view of the order and of the default.
- [x] Show the New workspace repository menu in an order that is not the
      GitHub name order, with the first ready repository picked.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add the repository order to
      [Orgs and members](../docs/protocol/orgs-and-members.md): one order
      per org, admins only, the first repository as the default, new
      repositories at the end, and the control of decision 1.
- [x] Say in
      [New workspace notices](../docs/protocol/new-workspace-notices.md#waiting-repositories)
      that the picker follows the repository order.
- [x] Say in [Automations](../docs/protocol/automations.md) that a new
      automation gets the first repository of the order.
- [x] Update [create-call-lists.md](../docs/protocol/create-call-lists.md#repositories)
      as decision 2 chooses.
- [x] Update the steps of the public guide
      [Cloud computer](../src/marketing/docs/cloud-computer.md#choose-repositories).
      Read each public guide in full for other sentences that restate the
      order.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.

## Milestone 3: Stored order and the move route

Depends on: 2

- [x] Add a migration that adds `repositories.position` and fills it for
      the chosen rows of each org, in the name order of the design calls.
- [x] Add one Worker helper for the repository order. Use it in
      `shellRepositories`, in the merged list of `shellRepositoryChoices`,
      and in the tool list of `worker/tools/lists.ts`, as decision 2
      chooses.
- [x] Give a newly chosen repository the last position, in
      `saveShellRepository` and in Create org. Clear the position at a
      Remove. Give each chosen row a dense position at each add and move.
- [x] Add the move route for admins: one repository to one place, as the
      section move does. A repository that is not chosen moves nothing.
- [x] Add the same route to the dev server in
      `src/app/dev/settings-routes.ts`.
- [x] Update the Worker README where it describes the org routes.
- [x] Add Worker tests: the migration order, an add at the end, a Remove,
      a move, two moves at the same time, a move of a removed repository,
      a member who may not move, a row without a position, the tool list
      order, and no build after a move.

## Milestone 4: The reorder control

Tags: ui

Depends on: 1, 3

- [x] Add the move action to `src/app/settings-actions.ts`, with an
      optimistic order that a failure takes back.
- [x] Make the rail move hooks take any item with an ID and a name, and
      use them for the chosen list of the Repositories tab, as decision 1
      chooses. Keep the rail tests green.
- [x] Add the screen-reader message after a move.
- [x] Show the default as decision 1 chooses, also on the read-only tab of
      a member.
- [x] Sort the Edit list by GitHub name in the client.
- [x] Check that each list of chosen repositories follows the order of
      the server list: New workspace, the automation editor, the workspace
      repository menu, the palette filter, the org home, and the read-only
      tab of a member.
- [x] Add component tests for the control and for the default of New
      workspace after a move.
- [x] Check the tab in a browser, on a computer and on a phone.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate named in `AGENTS.md`.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.
