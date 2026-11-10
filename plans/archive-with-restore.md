# Archive at once, with Restore for 14 days

Status: Active. [PR #138](https://github.com/Firna-AI/remote-code/pull/138) is open. The pull request that completes the work deletes this plan, as the `plans` skill says.

Archive ends a workspace. Today it deletes the cloud computer of the
workspace and keeps the chat read-only in the Archived group. Before the
delete, a check runs `git status` inside the cloud computer and counts the
commits that are not pushed. Decision 16 of
[the earlier plan](boat-native-remote-workspaces.md) chose that design on
5 November 2026. The check needs a running cloud computer, and a cloud
computer stops after 30 idle minutes. So Archive of most older workspaces
failed. Commit `2148d5f` of PR #138 changed that failure from a server
error into "Open the workspace to check its saved work. Then try again."
On 10 November 2026, the user asked for no check and no need to open the
workspace, because an archived workspace should come back later.
Conductive had no way to bring one back.

This change makes Archive stop the cloud computer at once and keep it for
14 days. Archive runs no check and asks no question. For 14 days, Restore
puts the workspace back in its section, with its files and agent sessions.
Then the app deletes the cloud computer, and the chat stays read-only in
Archived, as today. The change does not cover a Restore after 14 days, a
page that lists every workspace, or a Restore from the branch on GitHub.

Contract owners:

- [Workspace life](../docs/protocol/workspace-life.md), sections
  "Stop and resume" and "Archive".
- [Orgs and members](../docs/protocol/orgs-and-members.md), the workspace
  list and the roles.
- [GitHub banner](../docs/protocol/github-banner.md), Archive after the
  merge.
- [Command palette](../docs/protocol/command-palette.md), the actions of a
  workspace.
- [Conductor comparison](../docs/protocol/conductor-comparison.md),
  the statuses of the rows `archive` and `workspaces-page-and-restore`.
- The [app API README](../worker/app-api/README.md), the
  [lifecycle README](../worker/lifecycle/README.md), and the
  [workspace object doc](../worker/lifecycle/workspace-object.md).
- The [mockup catalogue](../docs/mockups/catalogue.md) and
  [Orgs and logins](../docs/mockups/orgs-and-logins.md).

Replaced ways:

- The archive check → no check. The old way is the route
  `GET /api/orgs/:org/workspaces/:id/archive-check`, `readArchiveCheck` and
  `checkUnavailable` in `worker/app-api/archive.ts`, `checkWorkspaceArchive`
  in `worker/workspace.ts`, `ArchiveCheckResponse` and
  `workspacePaths.archiveCheck` in `src/shared/workspaces.ts`, the
  `discardUnpushedWork` field of the Archive request, and the refusals
  `workspace_has_unpushed_work` and `sandbox_unavailable` of Archive.
  Consumers:
  - Worker: `worker/lifecycle/archive-workspace.ts`.
  - App: `src/app/api/read-workspaces.ts`, `src/app/archive-model.ts`,
    `src/shell/workspace/ArchiveDialog.tsx`,
    `src/shell/list/useListArchive.tsx`,
    `src/shell/workspace/WorkspaceScreen.tsx`,
    `src/app/dev/workspace-routes.ts`, and
    `src/test-support/fake-workspace-routes.ts`.
  - Tests: `worker/features/archive-routes.test.ts`,
    `worker/features/preview-revocation.test.ts`,
    `worker/chat/integration/workspace-title-guards.test.ts`, and
    `src/app/workspace-model.test.ts`.
  - Mockups: `docs/mockups/src/components/workspace/ArchiveDialog.tsx` and
    its styles, `docs/mockups/src/screens/workspaceOverlays.tsx`,
    `docs/mockups/src/screens/workspaceState.ts`,
    `docs/mockups/src/fixtures/archive.ts`, and
    `docs/mockups/src/entries/app/archive/index.mockup.tsx`.
  - Docs: `src/shell/workspace/README.md`, and the follow-up items
    `plans/follow-ups/dialog-content-outside-window.md` and
    `plans/follow-ups/shell-dialog-busy-rule.md`.
  - The mockups move in Milestone 1. The Worker stops its use of the check
    in Milestone 3. The app moves in Milestone 4. Milestone 5 deletes the
    old way.
- The delete of the cloud computer at Archive → a stop at Archive and a
  delete 14 days later. Consumers: `archiveWorkspace` in
  `worker/lifecycle/archive-workspace.ts`, and `markWorkspaceArchived` in
  `worker/app-api/archive-data.ts`, which clears `sandbox_id`. Moved and
  deleted in Milestone 3.

## Decisions

### 1. Archive any workspace at once without losing work

- **Chosen by the user on 10 November 2026:** C, with a window of 14 days
  instead of 7: "1 = C - but we keep it for 14 days". Before that, the
  user asked whether the app pays for an archived workspace under D. Under
  D, each archived workspace costs about $0.003 a month, and up to about
  $0.17 a month past the starts that the Boat plan includes.
- **Options check on 10 November 2026:** after the user's choice, the
  check added E, F, and G and kept C. Its report is in
  `.context/archive-with-restore/options-check.md`.
- **Severity:** Medium. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design, from the user's message on 10 November 2026: "we
  should not require it to be active to archive - in fact I don't think we
  should do any checks on archive, because you can always unarchive
  later?"
- **Category:** Product bug.
- **Location:** `worker/lifecycle/archive-workspace.ts:32` and
  `docs/protocol/workspace-life.md:104`.
- **Terms:**
  - **Check:** the step before Archive that runs `git status` and counts
    unpushed commits inside the cloud computer. It needs a running cloud
    computer.
  - **Restore:** the new action that puts an archived workspace back in
    its section, with its files and agent sessions.
  - **Day-14 restart:** 13 days after each stop, the app starts a stopped
    cloud computer briefly and stops it again, so that Boat keeps its disk
    (decision 43).
- **Background:** Archive deletes the cloud computer and keeps the chat
  read-only in the Archived group. The user chose the check on 5 November
  2026, as option D of decision 16. Option C had no check, and it lost
  because it can delete unpushed work. A cloud computer stops after 30
  idle minutes. Commit `2148d5f` of PR #138 changed the failure of the
  check into "Open the workspace to check its saved work. Then try again."
- **Problem:** The check needs a running cloud computer. So Archive of a
  stopped workspace fails until the user opens it and waits for its start.
  Conductive has no Restore, so the check is the only guard against lost
  work.
- **Impact if no action:** Each Archive of an older workspace needs a
  start first. Ten old workspaces need ten starts and ten waits.
- **Root question:** How does a user archive any workspace at once, also a
  stopped one, without losing work by mistake?
- **Options:**
  - **A.** Archive deletes the cloud computer at once, in any state, with
    no check. The question says that unpushed work is lost for good. This
    takes decision 16 back to its option C. Effort: Medium.
  - **B.** Keep the check while the cloud computer runs. For a stopped or
    failed one, the question says that the app cannot check, and offers
    Archive anyway. Most older workspaces then get no check. Effort:
    Medium.
  - **C.** Archive stops the cloud computer at once and keeps it, with no
    check and no question. Restore brings back the files and the agent
    sessions for 7 days, as Restore of a deleted org does. Then the app
    deletes the cloud computer. Boat lists no fee for a stopped cloud
    computer, and it keeps the disk for at least 14 days. Effort: Large.
  - **D.** As C, but the app never deletes the cloud computer. The day-14
    restart keeps its disk, with no secrets. Each archived workspace then
    uses about two starts a month, for good. Past the included starts,
    each start costs $0.03 to $0.07. Effort: Large.
  - **E.** Added by the options check: as C, and the owner and the admins
    get Delete now until the delete. Delete now asks one question, deletes
    the cloud computer at once, and ends Restore. It gives back the delete
    at once, for example for a leaked secret. It adds a destructive action,
    a route, a mockup, and protocol lines. Effort: Medium.
  - **F.** Added by the options check: as C, but at the end of the 14 days
    the app checks the work in the background, during a restart with no
    secrets. It deletes the cloud computer only when the check finds no
    uncommitted or unpushed work. Otherwise it keeps the cloud computer
    with the day-14 restart, as D does, and the row says why. It adds one
    start for each archived workspace, and D's cost for each workspace
    with unpushed work. The check does not see agent sessions or ignored
    files. Effort: Large.
  - **G.** Added by the options check: as C, but before the delete the app
    starts the cloud computer in the background, commits all changes to a
    backup branch, and pushes it. The code then lasts past the 14 days for
    one start. The push shows as the owner's push, and it can start the
    CI of the repository. It can put uncommitted files with secret values
    on GitHub. Effort: Large.
- **Left out:**
  - A saved snapshot at Archive, with Restore from it. For 14 days, C
    keeps the same files at no cost. Past the included count, a saved
    snapshot costs $0.056 a day, and it uses the count that the org images
    need. Decision 43 also chose restarts over a saved snapshot. The first
    reason, that a saved snapshot can hold the env values of the org, as
    [What a sandbox holds](../docs/protocol/isolation.md#what-a-sandbox-holds)
    forbids, applies to the disk that C keeps too. Scripts and agents can
    write such values into the home folder, which Boat saves.
  - Restore from the branch on GitHub only. It protects no work that is
    not pushed, and it can follow C later.
  - A start of the stopped cloud computer to run the check. Archive waits
    for a start of up to 20 minutes, and a failed start still blocks.
  - A check of the last report of the runner. It is still a check, and it
    can miss a change just before the stop.
  - A check of the stopped disk through the routes of Boat that read the
    files of a snapshot. It is still a check at Archive, and it must read
    each tracked file to find uncommitted changes.
  - A copy of the disk in the app's own storage. "Stop and resume" rejects
    it, because the app would then hold a copy of each user's code.
  - Keep the cloud computer until the cleanup of Boat deletes it. It breaks
    the user's choice of 14 days, and the app cannot show a date.
  - PR #138 as it is. Archive still needs an open workspace.
  - The push to a backup branch at Archive was left out first, because it
    needs a start. The options check brought it back as G, with the start
    before the delete.
- **Wider fix:** None. This item is a product choice, not a class of
  defect.
- **Previous examples:** Option D of decision 30: Delete org stops each
  cloud computer at once and allows Restore for 7 days. Decision 43 chose
  the day-14 restart over a saved snapshot. The comparison page lists
  "Workspaces page and restore" of Conductor Cloud as under consideration.
- **Recommendation:** C. It removes the check and the start, undoes a
  mistake for 14 days, and costs at most one start for each archived
  workspace. D is the choice when a Restore after 14 days matters more
  than a cost that grows with each archived workspace. F is the choice
  when no unpushed work may go before a check, and E when a delete at once
  matters. The first text of this line said 7 days and "costs nothing in
  Boat". The options check corrected it.
- **Action:** ask the user, because C changes the check of decision 16
  and adds Restore, which no requirement covers. The user answered on
  10 November 2026.

### 2. Decide who may Restore an archived workspace

Added on 10 November 2026 from the options check.

- **Chosen by the user on 10 November 2026:** B: "2 = B". Every member of
  the org may Restore.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design, from the options check of this plan.
- **Category:** Docs or spec.
- **Location:** "Design calls" of this plan, and the Archive permission
  check `archiveWorkspaceAccess` in `worker/app-api/archive-data.ts:8`.
- **Background:** Decision 42 lets only the workspace owner and the org
  admins Archive. Its reason was that Archive deleted another member's
  unpushed work. Every member of the org can open and resume any
  workspace. Restore puts an archived workspace back in its section,
  stopped, and it deletes nothing.
- **Problem:** No requirement says who may Restore. The first design
  calls of this plan gave Restore the rule of Archive. That rule refuses
  the other members with 403.
- **Impact if no action:** Milestones 1, 3, and 4 cannot draw or build
  Restore for a member who is not the owner or an admin.
- **Root question:** Who may bring back an archived workspace that
  another person owns?
- **Options:**
  - **A.** Only the workspace owner and the org admins, as for Archive.
    Other members see no Restore and get 403. A member who needs the
    workspace asks the owner or an admin. Effort: Small.
  - **B.** Every member of the org, as for a resume. A member can bring
    back a workspace that its owner archived on purpose. The owner can
    archive it again. A member who restores by mistake cannot archive
    again, because Archive stays with the owner and the admins. Effort:
    Small.
  - **C.** Added by the options check: as B, and the app records the member
    of each Archive and each Restore. The archived bar names who archived,
    and the restored workspace names who restored it, as decision 72 names
    who stopped the agent. It needs two columns with a migration, a mockup
    variant, and a protocol line. Effort: Medium.
  - **D.** Added by the options check: a member who is not the owner or an
    admin may restore only a workspace that an admin archived. It needs
    the record of C, so that members can predict the rule. Effort: Medium.
- **Left out:**
  - Only the member who archived. A already holds every person who
    archives, and this rule stops the owner after an admin archived.
  - Added by the options check: only the owner, or only the admins. One of
    the two people who may archive then cannot undo it from the toast.
  - Added by the options check: the member who restores becomes the owner.
    It breaks the rule that only an admin gives a workspace a new owner.
- **Wider fix:** None. This item is a permission rule, not a class of
  defect.
- **Previous examples:** Decision 42 chose the owner and the admins for
  Archive. Decision 30 lets only an admin restore a deleted org.
- **Recommendation:** A. Restore undoes Archive, so the same people decide
  both, and the owner keeps control of their own workspace, as decision 42
  wants. The options check on 10 November 2026 recommended B: Restore
  deletes nothing, and it gives a member only the access that a resume gave
  before the Archive. It named C for an owner who must see who brought back
  their workspace. Its report is in
  `.context/archive-with-restore/options-check-decision-2.md`.
- **Action:** ask the user, because A adds a refusal at a new route, and
  no requirement says who may Restore. The user answered on 10 November
  2026.

## Design calls

Agent calls on 10 November 2026:

- The 14 days count from the Archive. Boat counts its own 14 days from the
  last stop of the cloud computer. So a workspace that stopped before the
  Archive keeps its day-14 restart while it is archived, and Boat keeps
  its disk until the delete. A workspace that Archive stops gets no
  restart, because Boat keeps its disk for at least 14 days after that
  stop. Reason: decision 43 already restarts each stopped cloud computer
  before Boat can delete its disk. Cost: at most one start and about two
  minutes of machine time for each archived workspace.
- Restore sets the day-14 restart again, 13 days after the last confirmed
  stop, or at once when that time has passed. Reason: a restored workspace
  that stays closed must keep its disk, as each stopped workspace does.
  The options check found this gap on 10 November 2026.
- The restart of an archived cloud computer gets no secrets and runs no
  startup script. It only resumes and stops. Reason: Archive revokes the
  workspace token, and an archived workspace has no tools.
- The Privacy page states the 14 days in its section on how long the app
  keeps data. Reason: an archived cloud computer keeps the code and each
  value that a script or an agent wrote to its disk for 14 days. The
  options check found this gap on 10 November 2026.
- Restore puts the workspace back in its section and at its place, in the
  stopped state. Opening it resumes the cloud computer, as for each
  stopped workspace. Reason: a resume already gives a fresh workspace
  token and fresh env values, so Restore needs no start of its own. A
  section delete moves archived workspaces to the default section, so the
  section of an archived workspace always exists.
- Restore sets the stopped state, also after an Archive in the error
  state. Reason: a resume shows the error state with Try again when the
  start fails.
- After Archive, a toast names the workspace and offers Restore. The
  archived bar of the workspace and its row in the Archived group offer
  Restore until the delete. The command palette offers Restore workspace
  among the actions of an archived workspace. Reason: Archive asks no
  question, so the undo must be close at hand. The shared toast has an
  action button.
- Each workspace reply gives `restoreUntil`: the time of the delete while
  the app keeps the cloud computer, or null. The Worker derives it from
  `archived_at` and the kept cloud computer, and stores no new column.
  Reason: one fact keeps one source.
- A workspace without a cloud computer gets no Restore. This holds for
  each workspace archived before this change. Reason: nothing is left to
  bring back.
- The plan and its implementation go on the branch of PR #138. Reason:
  the branch holds the first fix for the same report. The pull request
  gets a new title and description when the work completes.

Agent calls from the mockups of Milestone 1, on 10 November 2026:

- Restore from the open workspace shows the stopped state with Resume.
  Restore starts nothing by itself. Reason: Resume avoids a start that the
  user did not ask for, as "Stop and resume" says. The mockup
  `app/archive/restored` shows it.
- The bar of an archived workspace names the day of the Archive. While the
  app keeps the cloud computer, the bar gives the last day of Restore,
  with Restore. After the delete, the bar keeps the words of today and
  gives no day of the delete. Reason: `restoreUntil` is null after the
  delete, and a workspace archived before this change lost its cloud
  computer at the Archive.
- In a suspended org, the bar of an archived workspace offers no Restore
  and promises only the chat history, as a refused start does. Reason: a
  suspended org refuses each change, and no notice of a suspended org
  promises its files.
- Over an archived workspace, the palette offers only Session history and
  Restore workspace as the actions of the workspace. Reason: the palette
  offers only what the page offers, and an archived workspace has no new
  session, no lists, and no tools.
- The toast after Archive says "<name> is archived." in the success tone,
  with Restore, as the toast after Delete section names its section.
  Restore is the action button of the shared toast. Reason: one form for
  the toasts that confirm a change of the list.
- The mockup type `docs/mockups/src/components/workspace/sandboxNoticeState.ts`,
  which the app imports, gives an archived workspace an optional
  `restore`: `available` or `refused`. Without it, the bar is the bar of a
  deleted cloud computer, so the app shows the bar of today until
  Milestone 4 passes the field. Reason: one type stays the contract of the
  bar for the mockups and the app.

Agent calls from the documentation of Milestone 2, on 10 November 2026:

- The protocol docs cite the decisions of this plan as "decision 1 of PR
  #138" and "decision 2 of PR #138". Reason: "decision 1" and "decision 2"
  already name records of the earlier plan, such as "Boat runs every
  sandbox (decision 2)".
- Milestone 2 changes only the README lines that restate what Archive
  does. The entries of the code and the lists of routes change with their
  code in Milestones 3 and 4. Reason: a README must not describe code that
  does not exist yet.
- `docs/protocol/workspace-life.md` keeps its headings "Stop and resume"
  and "Archive", and Restore gets its own section. Reason: five other docs
  link to those headings.
- The comparison row `workspaces-page-and-restore` gets Works differently.
  Reason: Restore works through the Archived group of the list, and no
  separate page of every workspace ships.
- The protocol rejects a saved snapshot at Archive for its cost, not for
  the secret values that it can hold. Reason: the disk that Archive keeps
  can hold the same values, as decision 1 says under "Left out".
- `worker/lifecycle/README.md` moves the entries of the image code to
  `worker/lifecycle/image-builds.md`, and the entries of the input activity
  to `worker/lifecycle/routes.md`. Reason: the README passed 300 lines, and
  Milestone 3 adds the entries of Archive.
- The two sections of `docs/protocol/command-palette.md` that only link to
  its states page become one. Reason: the doc passed its target of about
  250 lines, and no doc links to the removed heading.
- Restore ends 14 days after the Archive, also while a failed delete of the
  cloud computer retries. The bar says that the cloud computer is deleted
  only after the delete, and before that gives the day when Restore ended.
  Reason: each promise of the bar stays true. Milestone 2a draws that bar.

Agent calls from Milestone 3, on 10 November 2026:

- `archivedAt` uses the physical request clock. `updatedAt` increases on each
  Archive and Restore, also when that clock does not move. Reason: the
  Restore window and physical stop date stay exact, and clients can order
  successive actions.
- Each new Archive reserves a native revision and an alarm before its D1
  write. Its durable owner and unfinished-creation command identity use
  that revision. Reason: two Archive cycles can share a physical timestamp,
  and a crash between D1 and native initialization must preserve ownership.
- Archive keeps uncertain allocation requests and unfinished creation
  phases. Recovery ends the pending start without failed-create deletion.
  Reason: Restore must retain the files and finish preparation on the next
  open.
- D1 retains the earlier archive disk-restart deadline as a Cron repair
  signal. Reason: repair must bridge an older stopped disk before the
  provider can remove it, even when the archive delete is later.

- Workspace metadata writes keep the existing `updatedAt` as a minimum.
  They need no extra increment. Reason: a same-clock Rename or Reassign
  must not erase the logical time of an earlier Archive or Restore.
- Deleted-org maintenance includes retained archived disks until their
  archive window ends. It keeps physical stop dates and uses no secrets.
  Reason: Org Restore must keep the files that a workspace can still Restore.

Agent calls from Milestone 4, on 10 November 2026:

- After an Archive or a Restore moves a row, the focus stays where the
  action left it. When the row leaves the list, the focus falls to the
  page, as after the old question. Reason: no requirement names a focus
  target.
- After a failed first read that an Archive or a Restore of the visit
  made old, the visit follows the event stream from the last number that
  it applied, with no new read. Reason: the replay ends with the newest
  record, and the floor of the newest Archive or Restore keeps each older
  record out.

Agent call from the finding check, on 10 November 2026:

- Review finding 1 applies option C. Keep an unresolved create request
  through Archive expiry. Save its recovered computer ID in D1 before
  clearing the request. Reason: the existing Archive owner then survives
  both lost replies and interrupted D1 writes without a second alarm
  handoff. The shared ledger alternative is separate follow-up work.

## Milestone 1: Mockups (completed)

Tags: mockup

Depends on: none

Draw Archive with no question, the toast with Restore, Restore on the
archived bar and in the Archived group, the palette action, and an archived
workspace after the delete. Remove the drawings of the Archive question.

- [x] Rework the entry `docs/mockups/src/entries/app/archive/index.mockup.tsx`.
      Its canonical screen is an archived workspace whose bar gives the
      last day of Restore, with Restore. Its variants:
  - [x] The workspace just after Archive from the pull request bar, with
        the toast and its Restore.
  - [x] The Archived group open, with Restore on the hover of a row.
  - [x] An archived workspace after the delete, with no Restore.
  - [x] The workspace after Restore, where each Restore leads: back in its
        section, stopped, with Resume. The mockups showed that Restore
        needed a screen to lead to.
- [x] Show Restore to every member of an org that is not suspended, as
      decision 2 chose. Check that the archived workspace of the entry
      `orgs/suspended/workspace` shows no Restore.
- [x] Draw Restore workspace among the actions of an archived workspace in
      the command palette entries.
- [x] Remove the Archive question: the overlays `archive-unpushed` and
      `archive-pushed` in `docs/mockups/src/screens/workspaceOverlays.tsx` and
      `docs/mockups/src/screens/workspaceState.ts`,
      the component `docs/mockups/src/components/workspace/ArchiveDialog.tsx`,
      and the fixtures of the check in `docs/mockups/src/fixtures/archive.ts`.
      Keep `ArchiveDialog.module.css` until Milestone 4, because the app
      dialog imports it.
- [x] Write the words of the bar, the row, and the toast under the copy
      rules of the `product-ui` skill. Name no provider.
- [x] Update `docs/mockups/catalogue.md`, `docs/mockups/orgs-and-logins.md`,
      and the rationale of each changed entry with decision 1 of this
      plan.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages at desktop
      and phone sizes, in light and dark.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/archive-with-restore/m1-evidence.md`.

## Milestone 2: Documentation and protocol (completed)

Depends on: 1

State Archive with no check, Restore, and the delete after 14 days as
requirements, before the code changes.

- [x] Rewrite "Archive" in `docs/protocol/workspace-life.md`:
      the stop at Archive, no check and no question, Restore for 14 days,
      the delete after 14 days, the reason, and the rejected options. Keep
      the rule that an archived workspace has no file lists and no tools.
- [x] In "Stop and resume" of the same doc, state the restart of an
      archived cloud computer: only when Boat's 14 days end before the
      delete, with no secrets and no startup script.
- [x] Update `docs/protocol/orgs-and-members.md`: every member may
      Restore, as decision 2 chose, and a row of the Archived group offers
      Restore until the delete. Update the reason of decision 42 at line
      154, because Archive now deletes the cloud computer only after 14
      days.
- [x] Update `docs/protocol/github-banner.md` and
      `docs/protocol/command-palette.md`: Archive asks no question. The
      palette offers Restore workspace to every member, while Archive
      workspace stays with the owner and the admins.
- [x] Update the rows `archive` and `workspaces-page-and-restore` in
      `src/marketing/from-conductor/areas/workspaces-and-branches.ts`,
      under the claim rules of
      [Statuses](https://github.com/Firna-AI/remote-code/blob/df93a19147b1b63b877575ef9e344201c5856a4a/docs/protocol/conductor-cloud-comparison.md#statuses).
      Main already shows `workspaces-page-and-restore` as Planned, with
      Restore within 14 days. Give it the status that holds when this
      pull request merges, and drop the check from the note of `archive`.
- [x] Read the Terms page `src/marketing/terms.ts` and the Privacy page
      `src/marketing/privacy.ts` in full, with `src/marketing/privacy-uses.ts`
      and `src/marketing/legal-text.ts`. Update each sentence that
      restates Archive, the delete of a cloud computer, or how long the app
      keeps the files of a workspace. Add the 14 days of an archived cloud
      computer to the section "How long Conductive keeps data" of the
      Privacy page.
- [x] Update `worker/app-api/README.md`, `worker/lifecycle/README.md`,
      `worker/lifecycle/workspace-object.md`, `src/shell/workspace/README.md`,
      and `docs/architecture.md` where they restate Archive.
- [x] Check each relative link of each changed Markdown file.

Evidence: `.context/archive-with-restore/m2-evidence.md`.

## Milestone 2a: Restore window ended mockup (completed)

Tags: mockup

Depends on: 1, 2

The app preparation found one gap: the Restore deadline can pass while a
failed delete retries. The computer still exists, so the bar must not say
it is deleted. This implements the chosen 14-day window without adding a
new action or extending retention.

- [x] Add the ended Restore state to the shared sandbox notice and a child
      entry below `app/archive`, because its parent already has five views.
- [x] Show the date when Restore ended, keep the chat read-only, and offer
      no Restore. Keep the deleted state for a confirmed deletion.
- [x] Check desktop and phone layouts in light and dark. Save captures
      under `.context/archive-with-restore/` and run mockup checks.
- [x] Record this routine design call and the evidence. Keep Milestone 1
      completed.

Evidence: `.context/archive-with-restore/m2a-m2b/evidence.md` and
`.context/archive-with-restore/m2b-docs-evidence.md`.

## Milestone 2b: Integrate the workspace row menu (completed)

Depends on: 2a

Main added workspace row menus while this plan was in progress. Preserve
Rename, Move, Reassign, their permissions, focus, and unrelated tests. Only
the Archive question changes under the user's approved decision.

- [x] Integrate main and resolve each conflict while preserving the row
      menu and the completed Archive/Restore mockups and protocol.
- [x] Update `docs/protocol/workspace-menu.md` and the new menu mockup flow
      so Archive runs at once. Keep the menu's existing set of actions.
      Restore stays on the row shortcut, bar, toast, and palette.
- [x] Update implementation briefs for main's new `useRowMenus`,
      `WorkspaceActions`, workspace detail, and moved README owners.
- [x] Run focused mockup, type, and link checks on the integrated tree.

Evidence: `.context/archive-with-restore/m2a-m2b/evidence.md` and
`.context/archive-with-restore/m2b-docs-evidence.md`.

## Milestone 3: Worker: Archive keeps the cloud computer, and Restore (completed)

Depends on: 2, 2a, 2b

Archive stops and keeps the cloud computer with no check. The workspace
object deletes it 14 days later. A new route restores the workspace. The
check route stays until Milestone 5, because the app still calls it.

- [x] Archive runs no check. `archiveWorkspace` no longer calls
      `readArchiveCheck`, and it ignores `discardUnpushedWork`.
- [x] Archive stops a running or starting cloud computer and keeps it. It
      ends a start that runs. It keeps `sandbox_id`, revokes the workspace
      token and the previews, and stops the chat, as today.
- [x] The workspace object deletes the cloud computer 14 days after the
      Archive. Its alarm deletes the cloud computer with the existing
      cleanup retry, clears `sandbox_id`, and publishes `workspace.updated`.
      The 15-minute Cron Trigger repairs an overdue delete, as
      `repairLifecycleAlarms` repairs an overdue disk restart.
- [x] An archived workspace keeps its day-14 restart only when the delete
      comes later than 14 days after its last confirmed stop. That restart
      resumes with no secrets, runs no startup script, and stops.
- [x] Add `POST /api/orgs/:org/workspaces/:id/restore` and
      `workspacePaths.restore`. It allows every member of an active org,
      as decision 2 chose. It refuses a workspace without a kept
      cloud computer with 409 and a message that says why. It clears
      `archived_at`, sets the stopped state, publishes `workspace.updated`,
      and returns the workspace. A repeat returns the restored workspace.
- [x] Restore sets the day-14 restart again, 13 days after the last
      confirmed stop, or at once when that time has passed.
- [x] Keep workspace metadata timestamps at their existing minimum, so
      Rename and Reassign preserve Archive and Restore ordering.
- [x] Keep retained archived disks through deleted-org maintenance, with
      their physical stop dates and the earlier archive expiry.
- [x] Detach the matching archived disk when its provider confirms it is
      missing. Keep unknown-account and transient failures pending.
- [x] Add `restoreUntil` to `Workspace` in `src/shared/workspaces.ts` and
      to each workspace reply.
- [x] Confirm that Delete org deletes a kept archived cloud computer, and
      that the operator counts still count archived workspaces.
- [x] Add tests at the lowest level that fails without the change, as the
      `testing` skill says. Show that each one fails without the change.
  - [x] Archive of a stopped workspace runs no command and deletes
        nothing. It keeps `sandbox_id` and revokes the token.
  - [x] Archive of a running workspace stops its cloud computer.
  - [x] Restore within 14 days gives a stopped workspace. A resume then
        gives the cloud computer a fresh token.
  - [x] The alarm deletes the cloud computer after 14 days, and a Restore
        after the delete gets 409.
  - [x] A member who is not the owner or an admin can Restore.
  - [x] A restored workspace that stays closed gets its day-14 restart.
  - [x] The restart of an archived cloud computer gets no secrets. A
        workspace that Archive stopped gets no restart.
  - [x] The Cron Trigger repairs an overdue delete.
  - [x] Delete org deletes a kept archived cloud computer.
- [x] Run the targeted Worker tests and `npm run typecheck`.

Evidence: `.context/archive-with-restore/m3-evidence.md`.

## Milestone 3a: Align the new public guides (completed)

Depends on: 3

Main added public Markdown guides during this work. Their Archive facts
must match the approved feature when the pull request merges.

- [x] Read every guide in `src/marketing/docs/` in full, under the new
      repository rule and the public-guide writing rules.
- [x] Update every sentence that restates Archive, its check or question,
      retention, Restore, or workspace permissions. Preserve unrelated
      instructions and stable guide addresses and anchors.
- [x] Check changed guide links and record the guide coverage under
      `.context/archive-with-restore/`. Add no prose tests.

Evidence: `.context/archive-with-restore/m3a-guides-evidence.md`.

## Milestone 4: App: Archive at once, and Restore (completed)

Tags: ui

Depends on: 1, 2a, 2b, 3

The app archives with one request and offers Restore, as the mockups of
Milestone 1 show.

- [x] Archive sends one request, with no check and no question, from the
      pull request bar, the row of the list, and the palette. A busy state
      shows while it runs. A failure shows a toast that names it.
- [x] After Archive, show the toast with Restore.
- [x] Show Restore on the archived bar, in the row of the Archived group,
      and in the palette, to every member of an org that is not
      suspended, until `restoreUntil`. Without `restoreUntil`, show the
      bar of today.
- [x] Delete `src/shell/workspace/ArchiveDialog.tsx`, the check steps of
      `ArchiveModel`, `readArchiveCheck` in `src/app/api/read-workspaces.ts`,
      and `docs/mockups/src/components/workspace/ArchiveDialog.module.css`.
- [x] Update the dev routes in `src/app/dev/workspace-routes.ts` and the
      fake routes in `src/test-support/fake-workspace-routes.ts`.
- [x] Add tests: the workspace model archives with one request and
      restores. The bar and the row show Restore to a member who is not
      the owner or an admin, and only before `restoreUntil`.
- [x] Smoke-test with `npm run dev`: archive a stopped workspace, restore
      it from the toast, archive it again, and restore it from the Archived
      group. Save the screenshots under `.context/archive-with-restore/`.

Evidence: `.context/archive-with-restore/m4-evidence.md`.

## Milestone 4a: Integrate the computer ledger from main (completed)

Depends on: 3, 4

Main now records every cloud computer in one ledger. Keep that record
through Archive, retention restarts, Restore, expiry, and deleted-org
cleanup. Preserve the approved Archive and Restore behaviour.

- [x] Merge the new main work and resolve each conflict. Keep the ledger's
      provider-account identity, allocation records, stop ownership, and
      cleanup recovery alongside Archive's durable ownership and deadlines.
- [x] Keep the ledger current through Archive stops, retained-disk bridge
      restarts, confirmed missing computers, Restore, and final deletion.
- [x] Preserve all incoming ledger tests and the existing Archive and
      Restore assertions. Add focused regression coverage where their
      interaction needs it, with failing proof and repeat evidence.
- [x] Align affected code docs and retain the incoming marketing and
      start-card changes. Audit the merge and run focused checks.

Evidence: `.context/archive-with-restore/m4a-evidence.md`,
`.context/archive-with-restore/m4a-docs-evidence.md`, and
`.context/archive-with-restore/ledger-merge-audit-final.log`.

## Milestone 5: Worker: delete the archive check (completed)

Depends on: 4a

- [x] Delete the old way of the archive check, as "Replaced ways" lists
      it: the route, `readArchiveCheck`, `checkUnavailable`,
      `checkWorkspaceArchive`, `ArchiveCheckResponse`,
      `workspacePaths.archiveCheck`, and `discardUnpushedWork`.
- [x] Remove each test that covers only the check, under the removal rule
      of the `testing` skill. This includes the regression test of commit
      `2148d5f`.
- [x] Update or close the follow-up items `dialog-content-outside-window.md`
      and `shell-dialog-busy-rule.md` where they name only the Archive
      question.
- [x] Remove the Archive example from `dialog-under-busy-menu.md`, while
      preserving its unrelated dialog problem.
- [x] Merge the useful stopped-row smoke facts into
      `archive-restore-deployed-smoke-test.md`, and delete the obsolete
      `workspace-row-archive-stopped-smoke-test.md` item.
- [x] Update the old Archive check claim in `src/marketing/features.ts`
      and the removed-dialog example in `src/shell/operator/useQuestion.ts`.
- [x] Search the repository for each removed name, and confirm that no
      consumer is left.

Evidence: `.context/archive-with-restore/m5-evidence.md`.

## Milestone 5a: Preserve Restore through file-tab integration (completed)

Tags: ui

Depends on: 4, 5

Main added deliberate file-tab Resume during final verification. Preserve
that action and the approved stopped return from Restore.

- [x] Resolve the workspace screen integration with the palette actions and
      the incoming file-tab Resume hook on desktop and phone.
- [x] Verify that automatic restored-view recovery starts nothing and that
      a later deliberate file or diff visit still resumes. Add a meaningful
      regression only if a real interaction needs it.
- [x] Run the focused Archive/file-tab checks and UI type and early checks.
      Record the source trace, results, and any regression proof.

Evidence: .context/archive-with-restore/file-tab-integration-read.md.

## Milestone 6: Verification, commit, review, and pull request

Depends on: 1, 2, 2a, 2b, 3, 3a, 4, 4a, 5, 5a

- [x] Integrate the latest main preview relay and audit preservation before
      the final gate. Keep Archive preview revocation and unavailable tools.
- [x] Run `npm --prefix desktop ci` and `npm ci --prefix runner`. Then run
      the targeted tests and the complete gate, `npm run check`.
- [x] Integrate main's model gateway, model choices, terminal copy, and file
      mentions. Preserve Archive contracts, resolve docs path by path, and
      audit all incoming functionality before final verification.
- [x] Fix confirmed review finding 1 with option C. Prove lost-reply expiry
      and recovered-ID persistence through interruption. Keep Restore ended
      after 14 days while cleanup retries.
- [x] Integrate main 08cbe3cd and preserve shared software image, commit
      author environment, Issues tracking, comparison rows and docs. Audit
      the merge, install current dependencies, and verify the combined tree.
- [x] Fix confirmed finding 3 with option B. Keep expired-archive deletion,
      disk retention, later deletes and pending Org Restore progressing
      independently under the existing lease. Prove the failure first and
      repeat each new asynchronous regression ten times.
- [x] Record checked follow-ups for the broader cleanup ownership, the
      rare uncertain-computer notice, and independent pre-purge steps.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Give PR #138 a new title and description. The description gives the
      decision and the design calls of this plan with their dates, a
      permalink to this plan, and the follow-up items that the change
      adds.

Evidence: `.context/archive-with-restore/final-check.log`,
`.context/archive-with-restore/final-links.log`, and
`.context/archive-with-restore/final-guide-links.log`.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, archive a stopped workspace, restore it, and
      resume it. Check that the archived bar of another archived workspace
      gives the last day of Restore.
