# Restore of a deleted org in the Account page

Status: Active. On branch `calummoore/porto-a8k1`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Delete org stops the cloud computers of an org and hides it from its
members. For 7 days an admin can restore it. Until now, the deleted org
stayed as a faded tile in the org rail of each admin, and its page offered
Restore. That rule came from option D of decision 30, so that the admin
finds Restore where the org was. On 12 November 2026 the user said that the
faded tiles are annoying after a delete, with a screenshot of a rail with
three faded orgs. The user asked to move Restore to the Account page.

This change takes a deleted org out of each list of orgs that the user
moves between: the rail, the org sheet of a phone, the keys Switch to org
1 to 9, and the opening of the app. A new section, Deleted orgs, on the
General tab of the Account page lists each deleted org that the user can
see, with its delete day and Restore. The change does not touch the
Worker: the org list, the restore route, and the 7 days stay as they are.
It does not change the operator section, which shows deleted orgs to the
operator.

## Decisions

- 12 November 2026, the user: a deleted org leaves the rail, and Restore
  moves to the Account page. This replaces the rail part of option D of
  decision 30. The rest of decision 30 stays: Delete org stops every
  sandbox, hides the org at once, and deletes everything after 7 days
  unless an admin restores it.

## Design calls

Each call below is my call, made on 12 November 2026. The user said
"somewhere" for the place, so the place is a design call.

- **Place:** Deleted orgs is the last section of Account › General. It
  shows only while the user has a deleted org. Reason: General holds what
  spans all orgs, and a section that shows only when it has content adds
  nothing for most users. A new Account tab was left out, because a tab
  that is empty on most days is noise in the tab row.
- **Row:** each row shows the org tile, the name, "Deleted on <day>.
  Everything is deleted on <day>.", and the button "Restore <name>". An
  error shows under its row, as the deleted org page shows it now.
- **After Restore:** the org goes back to the rail at its old place, and
  the row leaves the section. The page stays on Account. Reason: the user
  can restore more than one org, and the tile in the rail is the way back.
- **Suspended org:** the row of a deleted org that the operator suspended
  shows no Restore and says that the org is suspended, as the deleted org
  page does now.
- **After Delete org:** the app opens the next org that is not deleted,
  else Get started. The confirm dialog of Delete org says that an admin
  restores the org from Account settings until the delete day. Reason:
  the user deletes an org to move on, and the dialog says where Restore
  lives.
- **The address of a deleted org:** the address `/orgs/<org id>` of a deleted org keeps its
  page with Restore. The page is now reachable only from an old link, a
  bookmark, or Back. Reason: it is functionality on `origin/main`, it
  costs nothing to keep, and a link to it should not be a dead end.
- **Opening of the app:** the app and Get started treat a user with only
  deleted orgs as a user with no org. So `/` opens Get started, and its
  Create org step is not complete. Reason: the rail then shows no org,
  and Get started is the page for a user without one.
- **Command palette:** the Account group of the palette Settings tab gets
  no row for Deleted orgs. Reason: the section shows only sometimes, and
  the palette already treats a deleted org as absent.

Contract owners:

- [Orgs and members](../docs/protocol/orgs-and-members.md#delete-org).
- [Keyboard shortcuts](../docs/protocol/keyboard-shortcuts.md), for Switch
  to org 1 to 9.
- [Command palette](../docs/protocol/command-palette.md) and
  [Command palette actions](../docs/protocol/command-palette-actions.md#settings).
- The [members README](../src/members/README.md), the
  [web app guide](../src/app/README.md), and the
  [screens page](../src/app/screens.md).
- The public guide [Orgs and members](../src/marketing/docs/orgs-and-members.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The rail, the phone org sheet, the Account page, and the Delete org dialog
change. The deleted org page stays.

- [ ] Add the Account page state with the Deleted orgs section: one org
      with Restore, and one suspended org without Restore. Draw desktop
      and phone.
- [ ] Add the state of a failed Restore, with the error under its row.
- [ ] Take the faded tile out of the rail and the phone org sheet in each
      mockup that shows a deleted org.
- [ ] Update the `app/orgs/deleted` and `app/orgs/suspended/deleted`
      mockups: the page is reachable only by its address. Update their
      descriptions and rationales with the decision of this plan.
- [ ] Update the text of the Delete org dialog mockup.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update [Delete org](../docs/protocol/orgs-and-members.md#delete-org):
      a deleted org leaves the rail, and Account › General lists it with
      Restore for its admins.
- [ ] Update Switch to org 1 to 9 and the palette docs where they count a
      deleted org.
- [ ] Update the public guide: "Open the faded org" becomes the Deleted
      orgs section of Account settings.
- [ ] Read the Terms and the Privacy page in full. Update each sentence
      that restates the faded org or the place of Restore.
- [ ] Read each public guide in full for the same facts.
- [ ] Update the READMEs that the contract owners list.

## Milestone 3: Rail and app opening

Tags: ui

Depends on: 2

- [ ] Leave deleted orgs out of `OrgRail`, the phone org sheet in
      `HomeList.tsx`, and the keys of Switch to org 1 to 9.
- [ ] Make `setupOrg` give no deleted org. Check `OpenApp` and the Get
      started steps.
- [ ] After Delete org, open the next org that is not deleted, else Get
      started. Update the dialog text.
- [ ] Update the tests of each changed part.

## Milestone 4: Deleted orgs section

Tags: ui

Depends on: 3

- [ ] Add the Deleted orgs section to Account › General. Reuse the
      restore call and the error notice of `DeletedOrgPage`.
- [ ] Put the restored org back into the org list, as the deleted org
      page does now.
- [ ] Add DOM tests: the section hides without a deleted org, Restore
      works, a failed Restore shows its error, and a suspended org shows
      no Restore.
- [ ] Check the section in a browser, desktop and phone.

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
