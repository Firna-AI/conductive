# Remove a repository from its row menu

Status: Active. On branch `calummoore/remove-repo-from-menu-ouc2`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Repositories tab of the org settings lists the chosen repositories of
the org in the repository order. Each row of an admin has a row menu with
Make default, Move up, and Move down (repository-order decision 1 F). To
remove a repository, an admin must now select Edit, find the repository in
the list of every repository that the GitHub App reaches, select Remove,
and then select Done. The user asked on 24 November 2026 that an admin can
remove a repository from the row menu.

The change adds Remove to the row menu. A removal still starts no build
(decision 240), and the repository notice then names the removed
repository with Build computer, as after Done. The change does not touch
Edit, Done, or the Worker: the menu uses the same `DELETE` route of the
repository that Done uses. Decision 1 below asks how the admin confirms
the removal, because decision 296 says that the org gets only the changes
that the admin confirms with Done.

Design calls, mine, 24 November 2026:

- Remove is the last item of the menu, after a divider, with the danger
  tone. Reason: the section menu puts Delete section in the same place,
  and a removal is not a move.
- The item has the label "Remove" and the X icon, as the Remove button of
  Edit. Reason: one action has one name and one icon in the app.
- Remove is never off, also on the only row and on the first row. Reason:
  Edit allows these removals too. A removal of the first row makes the
  next row the default, as the order says.
- A failed removal keeps the row and shows the toast "The repository
  wasn't removed." with the error. Reason: a failed move shows a toast in
  the same way.

Design calls of the implementation, by the ui and docs implementor, 24
November 2026:

- A failed removal keeps the question open, with the toast, as the secret
  Delete dialog does. Reason: Remove can then try again at once, and
  Cancel still changes nothing.
- The words of the question: "Remove acme/web?", then "New workspace no
  longer offers it." On the first row it adds ", and acme/api becomes the
  default". On the only row it adds ", and no new workspace can start
  until you add a repository". Then "Its automation turns off, and only
  its owner can turn it on again." or "Its 2 automations turn off, and
  only their owners can turn them on again.", or no sentence for none.
  Its confirming button is "Remove", with the X icon and the danger tone,
  as the menu item. Reason: the words of the decision, in the form of the
  Remove member dialog, which drops the count for one.
- The question reads the automations of the org once at each opening,
  apart from the list that other screens share. It counts the active
  automations of the repository. Until that read answers, or when it
  fails, it says "Each of its automations turns off, and only its owner
  can turn it on again." with no number, and Remove stays on. Reason: the
  tab shows no automations, so a read for the whole tab would read them
  every 30 seconds for nothing. The rule without a number still names the
  loss, and a failed read blocks no removal. On 25 November 2026, review
  finding 1 A replaced the shared list, because its cached number could
  hide the sentence.
- The question keeps the place of the row from its opening. Reason: its
  words then do not change while it shows.
- After a removal, the focus goes to the row that takes the place of the
  removed row, else to the row before it, else to Edit. Reason: no list
  shows when no row is left, and Edit is the control that adds a
  repository again.
- A screen reader hears "acme/web is removed" in the status of the list.
  The words come after the question closes, because the page is inert
  while the question shows. They stay until a move or a drag gives words
  of its own. The status stays when no row is left.
- The decision has the name "row-remove decision 1 E" in the protocol
  docs. Reason: repository-order decision 2 names another record of the
  change that added the order.
- `docs/protocol/org-image.md` passed the 250 lines of the
  `documentation` skill. Its "Repository changes" part moved, with no
  change of words, to `docs/protocol/org-image-repositories.md`, where the
  change then edited "Added repositories".
- The mockup draws the question on the first row, which has two active
  automations, and on the last row, which has none. The words of the only
  row are in the description, because the page allows five screens.

Contract owners:

- [Repository order](../docs/protocol/repository-order.md).
- [Repository changes of the org image](../docs/protocol/org-image-repositories.md#added-repositories).

## Decisions

### 1. How the admin confirms a removal from the menu

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/shell/settings/RepositoryOrder.tsx`,
  `docs/protocol/org-image-repositories.md` under "Added repositories".
- **Terms:**
  - **Repository notice:** the notice above the list of the Repositories
    tab. It names the repositories that the cloud computer does not hold
    yet, or still holds, with Build computer.
  - **Automation:** a saved prompt that starts a workspace in one
    repository of the org, on a schedule or a trigger. Each automation
    has one owner.
- **Background:** A removal has these effects, in the Worker:
  - Each automation of the repository turns off. Adding the repository
    again does not turn it on. Only its owner can, as
    `docs/protocol/automations.md` says.
  - The repository leaves the order. When it was the first row, the next
    row becomes the default of the org for every member.
  - The cloud computer keeps the repository until the next build.
  - Adding the repository again in Edit puts it at the end of the order,
    and Done starts a build.
  Decision 296 says that Add and Remove change only the open edit, and
  Done saves it. A move of the row menu saves at once.
- **Problem:** A Remove item next to Move down lets a slip remove a
  repository. The admin alone cannot undo all of its effects. Every menu
  Remove also changes the text of decision 296, which says that an admin
  removes repositories between Edit and Done.
- **Impact if no action:** The change cannot start, because the menu
  needs one of these ways.
- **Root question:** How does the row menu keep a slip from removing a
  repository, when adding it again restores neither its place nor its
  automations?
- **Options:**
  - **A.** Remove saves at once, as a move does, with a success toast.
    The repository notice then names the removed repository. A slip
    costs the automations of the repository, its place, and a build to
    undo. Effort: Small.
  - **B.** Remove opens a confirmation dialog that names the repository.
    Its Remove button saves. Cancel changes nothing. One more step for
    each removal. Effort: Small.
  - **C.** Remove saves at once, and a toast offers Undo, as Archive
    offers Restore. Undo adds the repository again with no build, and
    moves it back to its place, with the routes that exist. The
    automations stay off, because only each owner can turn them on. A
    full Undo needs an exception to that owner rule. Effort: Medium.
  - **D.** Remove opens Edit with the repository marked as removed. Done
    then saves it. Decision 296 stays as it is. One menu item then opens
    a whole mode. The marked removal shows only as an Add button on its
    row, in a list in name order. Effort: Small.
  - **E.** Option B, and the dialog also names what adding the repository
    again does not restore. Example: "Remove acme/web?" with "New
    workspace no longer offers it. Its 2 automations turn off, and only
    their owners can turn them on again." On the first row it adds which
    repository becomes the default. The org model already reads the
    automations. Effort: Small.
  - **F.** Remove hides the row at once, and a toast offers Undo. The
    removal goes to the Worker only when the toast ends, so Undo loses
    nothing. A tab that closes during the toast can drop the removal. A
    move during the toast must send the removal first. A timed Undo is
    hard for a slow screen-reader user. Effort: Medium.
  - **G.** Ask with the dialog of E only when the removal loses
    something: an active automation uses the repository, or the row is
    the first row. Every other removal saves at once with a success
    toast. The admin cannot predict when the app asks. Effort: Small.
- **Assumptions:**
  - A removal starts no build (decision 240). Source:
    `docs/protocol/org-image-repositories.md` under "Removed
    repositories". Its reason holds, because a removal blocks no new
    workspace. Kept.
  - A menu removal has every effect of a removal at Done. Source: the
    Worker code in `worker/app-api/feature-repositories-data.ts`. Its
    reason holds, because no run of such an automation can succeed. Kept.
  - The removal reaches the Worker when the admin's choice is final.
    Source: the code of Done. It is not a requirement. Option F drops it.
  - Every row gets the same flow. Source: my design call that Remove is
    never off. It is not a requirement. Option G drops it.
- **Left out:**
  - A menu removal that also starts a build. It breaks decisions 240 and
    241, which stay.
  - A Remove item that is off for a repository with automations. G is
    better on every point, and an off item adds a new gate.
  - A confirmation inside the menu, such as a submenu. It is a form of B
    with no room for the words of E.
  - A lasting Add back in a Removed group of the list. It moves the Undo
    of C into the list, with the same owner-rule limit.
- **Wider fix:** E. It stops a slip before the Worker writes anything, so
  it stays right when a removal gets another effect. B and F do so too.
- **Previous examples:**
  - Ask first and name the loss: secret Delete in
    `src/shell/settings/SecretsTab.tsx`, and Remove member in
    `src/members/RemoveMemberDialog.tsx`.
  - Act at once with a toast: Delete section in
    `src/shell/list/useListActions.ts`.
  - Act at once with Undo: Archive in
    `src/shell/workspace/useArchiveActions.ts`.
- **Recommendation:** E. The admin alone cannot get the automations back,
  so the app asks first and names that loss. The first recommendation was
  B. The options check changed it to E, because B does not name the
  automations.
- **Action:** ask the user, because the options trade one more step
  against a loss that the admin alone cannot undo, and the request does
  not say how to confirm.
- **Decision:** The user chose E on 24 November 2026.

The options check of 24 November 2026 added E, F, and G, corrected C,
and found the automations. Its report is in
`.context/repository-row-remove/options-check.md`.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockup of the row menu reads its items from
`src/ui/components/settings/repositoryOrder.ts`, so the Remove item shows
there once the shared list has it.

- [x] Add Remove to `repositoryMenuItems` and `repositoryMenuOf`.
- [x] Update the description and the rationale of the "Row menu" variant
      in `docs/mockups/src/entries/app/org-settings/repositories/order/`.
- [x] Add a variant with the dialog of decision 1 E: on a row with
      automations, and on the first row, which names the new default.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. The smoke test of the menu and of both questions,
      on desktop and on a phone, in light and dark, found no problem.

Evidence: `.context/repository-row-remove/*.png` holds the screenshots of
the changed pages.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] Add Remove to the row menu in `docs/protocol/repository-order.md`,
      with the outcome of decision 1.
- [x] Update decision 296 in `docs/protocol/org-image.md` under "Added
      repositories" for the menu removal.
- [x] Move the "Repository changes" part of `docs/protocol/org-image.md`,
      with no change of words, to `docs/protocol/org-image-repositories.md`,
      because the doc passed 250 lines. Point each link to the new page,
      and list it in `docs/architecture/protocol-docs.md`.
- [x] Read the Terms, the Privacy page, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that says how an
      admin removes a repository.

## Milestone 3: Remove in the app

Tags: ui

Depends on: 2

- [x] Handle the `remove` item in `src/shell/settings/RepositoryOrder.tsx`
      with `setRepositorySelected`, and the way of decision 1.
- [x] Render a dialog of decision 1 outside the `<li>` of the row. Reason:
      React events of a portal bubble through the React tree, so Alt and
      an arrow in the dialog would move the row.
- [x] Show that the removal runs until the Worker answers. The Worker can
      read GitHub first, so the answer can take a moment.
- [x] After a removal, move the focus to the next row, or to the list
      when no row is left. Tell a screen reader that the repository is
      removed.
- [x] Add a mounted test in `src/shell/settings/repository-order.test.tsx`:
      Remove sends the `DELETE` of the repository, the row leaves the
      list, and a failure keeps the row with a toast.
      The tests live in `src/shell/settings/repository-remove.test.tsx`,
      beside it, so that each file stays short.
- [x] Update the expected menu items of the existing test.

Evidence: `.context/repository-row-remove/` holds the logs of the checks,
the test runs, and the test times.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
- [x] Check the menu in a browser and save a screenshot under
      `.context/repository-row-remove/`. The mockup catalogue draws the
      shared menu and dialog parts.
- [x] Commit with Conventional Commits and push the branch.
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
