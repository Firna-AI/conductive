# Skills copy warnings reach only the runner log

- **Severity:** Low. **Likelihood:** Common. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from branch `calummoore/oslo-3u7a`, a design call of the org skills repository plan.
- **Location:** `crates/cnd-runner/src/skills/service.rs`, `docs/protocol/org-skills.md`, `crates/cnd-cli/src/runner_update/releases.rs`.
- **Reason:** Cal chose option B on 2026-11-18 and approved its plan, `plans/org-skills-copy-status.md`, on 2026-11-20. It is built in its own pull request after PR #426 merges.

### 1. Skills copy warnings reach only the runner log

- **Severity:** Low. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `crates/cnd-runner/src/skills/service.rs`.
- **Terms:**
  - **Skills copy:** the copy of the org skills repository that the runner keeps in each cloud computer.
  - **Lookup:** the read of the saved repository on GitHub that lists its skills in the Skills section.
  - **Handler run:** one call of `run_once` in `crates/cnd-cli/src/runner_command.rs`, with its own engine, skills copy, and report state.
  - **Saved update state:** the `current` link and the pending journal under `/opt/conductive`.
- **Background:** The Skills section shows the skills that a GitHub lookup finds. The runner warns in its own log when a copy or a check fails, when it removes a link, or when two skills have the same name. No member reads that log.
- **Problem:** When a workspace's copy fails, for example on a network fault, the section still lists the skills, and the agents of that workspace do not have them.
- **Impact if no action:** A member can believe that agents have skills that they do not have.
- **Root question:** How does a member learn that a workspace's agents do not have the org skills?
- **Options:**
  - **A.** Keep the log only. Effort: Small.
  - **B.** Each runner reports the result of its last copy, and the section shows the newest result of the org. Effort: Large. Chosen by Cal on 2026-11-18.
  - **C.** As B, but the section lists each workspace without skills and its cause. Effort: Large.
  - **D.** Each workspace shows its own latest copy result in that workspace, from the same runner report. It needs no D1 table, no D1 write, and no change to the lookup. The Skills section still shows no copy state. The app must find the latest report at load, and that report can be far back in the history. B stores the same event, so D can follow B later. Effort: Large. Added by the options check.
  - **E.** As B, but the one result is the newest failure of a workspace that is not archived, when one exists. Otherwise it is the newest result. It needs one row for each workspace and a read of each workspace's state. A failure then shows until its workspace recovers or is archived. A success then suggests that no such workspace failed, so its words need care. Effort: Large. Added by the options check.
- **Left out:**
  - A check at Save, because it cannot see a fault of one workspace.
  - A pull from each running runner at each load. It needs a new command, and an older runner closes its connection at an unknown command. So it breaks the requirement that older runners keep working.
  - A notice to the agents. The member then learns only when an agent mentions it, so it fails the goal.
- **Wider fix:** C.
- **Previous examples:** Options D and F of decision 7 of the org skills repository plan, which the user did not choose on 2026-11-16. D was a report of each copy result with the newest result of the org. F listed each workspace without skills.
- **Related:** `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md` changes the same runner warning paths. Its fix does not depend on this status choice. A cleanup warning must not make a later status report mark a usable published copy as failed. A failed startup preparation publishes no copy, so the design below reports it as a failure. `plans/follow-ups/release-confirmation-cleanup-result.md` records that the result of `update started` cannot prove a confirmation. This work does not use that result. Its release gate reads the saved update state. That item stays open for its warning fix.
- **Recommendation:** B. It shows the common fault with one result for the org. The options check kept B. D serves the member in the affected workspace better and can follow B later. E keeps one result, but it suggests the health of the other workspaces.
- **Action:** fix after merge, apply B, as the approved plan `plans/org-skills-copy-status.md` says, because Cal chose to merge PR #426 first.

## Answer

- Cal chose option B on 2026-11-18, with the answer "404 = B".
- The detailed design below waits for Cal's approval. No code changes
  before that approval.
- An independent options check ran on 2026-11-18. It kept B and added
  options D and E. It required six corrections, which the design applies:
  - A failed startup preparation reports a failure.
  - A failed D1 write gets a retry.
  - A repository change deletes the old status.
  - Repository names compare without letter case.
  - The design names the limit of a failed GitHub sign-in refresh.
  - The transport is a design call, not a requirement.
- On 2026-11-18, the root also required an exact release confirmation
  before the first skills event. A focused check found a smaller exact
  gate: a stable read of the saved update state. The root chose it on
  2026-11-18. The release gate below gives its rules.
- Shared assumptions of the options, with their sources:
  - The status shows only in the Skills section. Source: the Problem
    text. It is not a requirement. D drops it.
  - The runner of each workspace makes the copy. Source: the copy rules
    of `docs/protocol/org-skills.md`. It holds.
  - The lookup on GitHub stays as it is. Source: the list rules of
    `docs/protocol/org-skills.md`. It holds.
  - Reports use the existing runner connection. Source: a design call,
    not a requirement. Its reasons hold.
  - One result stands for the org. Source: Cal's answer. C and E drop it
    in different ways.
  - Older runners send no report until a software update reaches them.
    Source: the code and the Updates section of
    `docs/protocol/sandbox-software.md`.

## Detailed design of B, awaiting approval

Start the work after the repository trust setting of the Skills section
is implemented. Both changes touch the Skills section, the org skills
protocol, the settings table, the runner skills code, and the D1
migrations.

### The runner report

- Each runner sends a numbered `skills.updated` event on its existing
  runner connection. It needs no new route, token call, or runner
  protocol version, as port reports do.
- The event holds the repository that the runner copies and one result.
  It also holds the time of the attempt that first gave that result in its
  handler run.
- The results:
  - `copied` holds the commit of the complete copy that the agents now get.
  - `empty` means that the repository has no commits.
  - `failed` holds the commit of the copy that the agents keep, or null.
- The event holds no workspace ID, org ID, cause, error text, Git output,
  or token. A runner without a valid repository sends no report.
- A failed startup preparation publishes no copy. The runner reports it
  as `failed` with no commit.
- A cleanup or loading warning changes no result while a copy stays
  published. Examples are a failed sweep, a removed link, and a duplicate
  name.
- A program start, a swap to a newer release, and an idle install that
  keeps the running release each begin a new handler run. A reconnect
  does not.
- The program keeps one process-start ID across the handler runs of an
  idle install that keeps its release. So one runner start of
  `docs/protocol/runner-warnings.md` can hold several handler runs.
- The report state starts empty at each handler run: no latest result, no
  last sent report, and a closed gate. A reconnect keeps that state.
- The runner sends the first result of each handler run. Then it sends a
  report only when the result or the commit changes.
- A reconnect never sends a report again.

### The release gate

- A new release stays pending, with a pending journal, until its runner
  confirms it. The runner runs `update started` once, at the first welcome
  of the handler run.
- At the next start, an apply rolls a pending release back to the previous
  release. The previous release then loads the saved outbox. It cannot
  read an event type that it does not know, so its start fails.
- So the gate opens only after one stable read of the saved update state.
  The read takes `current`, checks that no pending journal exists, and
  takes `current` again.
- Both reads must name the version of the running release. A missing
  `current` link, any journal, another version, a development build, or a
  read error keeps the gate closed.
- The existing state read takes `current` first and the journal later. A
  rollback can finish between them, and that read then shows the
  rolled-back release as confirmed.
- The updater marks a rolled-back release as rejected before any link
  moves, and it never applies that release again. So the second read
  names another release, and the gate stays closed.
- An activation or rollback keeps a pending journal before it moves the
  current link. The writer removes that journal only after the links reach
  their final values. An unconfirmed release cannot then pass both reads.
- After one confirmed read, no fallback can reach an older release. So the
  gate stays open for the rest of the handler run.
- The read takes no lock. It claims no more durability than the saved
  update state gives.
- The reporter reads the gate at each existing check of the skills
  schedule while it is closed. The first check of each handler run reads
  it too. The reporter never runs `update started`.
- A confirmation whose later cleanup of old releases failed leaves no
  journal, so a later read can open the gate. A skipped first-welcome
  confirmation leaves the gate closed while that journal stays.
- When the gate opens, the runner sends its latest result once, with its
  original attempt time.
- The reporter uses the narrow reader directly, not the `IdleUpdates`
  wrapper. That wrapper reads as not confirmed after its one swap attempt.
- The existing state read, `ReleaseReadiness::status`, the idle updates,
  `update started`, its callers, and its warning do not change.
- Limits: a pending release sends no report, and a development build never
  sends one. A new release reports first at the first schedule check after
  its confirmation, up to five minutes later.

### The Worker storage

- The workspace checks the report. An invalid report gets the existing
  refusal marker and no repair request.
- It stores a valid report as a workspace-level event that the workspace
  view ignores. The report is not activity.
- It also keeps the report as its latest report, with its receive time
  and a pending mark. After commit, it writes the D1 row of that workspace.
- At each authenticated runner hello, it writes a pending latest report
  again, with its original receive time. The retry emits no event.
- So a failed write can wait until the next runner connection. A stopped
  workspace keeps it until its next start.
- The write takes the workspace from the runner connection and the org
  from the workspace record.
- The write happens only while the saved repository has the same
  identity. Two valid `owner/name` values match when they are equal
  without letter case.
- For one workspace, a newer or equal check time replaces the row. The
  stored check time is at most the original receive time.
- A D1 trigger deletes every row of the org when its saved repository
  changes to another identity or is removed. A change of letter case
  alone keeps the rows. The trigger also covers the previous Worker.
- The org and workspace references of the table cascade. The org purge
  of the previous Worker needs this, because D1 enforces foreign keys.

### The Skills section

- The skills lookup reply gains one optional field: the newest report for
  the saved repository, or null.
- The read chooses one row of the org: the newest check time, then the
  newest receive time. It includes archived workspaces.
- The reply holds no other row, so no list of workspaces reaches the app.
- The field gives the workspace, its name, whether it is archived, a
  state, and the time. It gives no commit.
- The states are `copied`, `kept` for a failed check with a kept copy,
  `failed` with no copy, and `empty` for no commits.
- The words name one workspace and one time. They never claim that every
  workspace has the skills.
- Without a report, the words say that no workspace has reported a copy
  yet. They suggest no failure.
- Admins, members, and the members of a suspended org see the same
  status. It has no button.
- Limits:
  - The status reads at each load of the section and at each Save. It
    does not change while the section shows.
  - The shown time can be old, because a kept result sends no newer time.
  - A failed refresh of the viewer's GitHub sign-in shows the sign-in
    error in place of the list and the status. This holds also in a
    network fault or a GitHub outage.
  - A newer report from any workspace hides an older failure.
  - A report of a workspace that was archived later stays the newest
    until another workspace reports.

### Compatibility and risks

- An older Worker refuses the event with a marker of the type `unknown`,
  and it confirms the event. An older app skips the event and the field.
- The release gate keeps the fallback path of older released runners.
- Any process with the workspace token can send a report for its own
  workspace and the current repository. The status shows what a runner
  says.
- A cloud computer whose clock runs behind can lose the newest place.
- A report that the Worker refuses stays missing until the next change or
  handler run.

## Design calls

Made by the working agent on 2026-11-18:

- Use the existing runner connection. Reason: it adds no route or token
  call, and an older Worker refuses an unknown event safely.
- Report the first result of each handler run, then each change only.
  Reason: a report at each check would let routine results replace a new
  failure within minutes.
- Reset the report state at each handler run, and keep it across
  reconnects. Reason: a new handler run makes new copy attempts, and a
  reconnect makes none.
- Keep the gate open after one confirmed read. Reason: no later fallback
  can then reach an older release.
- Report failed preparations, but no warning while a copy stays
  published. Reason: the report must say what the agents have.
- Give no failure cause. Reason: the runner cannot tell a private or
  missing repository from a network fault without Git text.
- Compare repository identities without letter case. Reason: GitHub
  repository names are case-insensitive, and the repository trust design
  compares them in the same way.
- Delete old rows through a trigger. Reason: the delete is then atomic
  with every settings write.
- Retry a pending D1 write at each authenticated hello with the original
  receive time. Reason: the runner reports only changes, so a lost failure
  report would never show.
- Return the status in the lookup reply. Reason: the list and the status
  then belong to one saved repository. Cost: a failed sign-in refresh
  hides the status too.
- Read the status only at each load and Save. Reason: it follows the
  lookup timing.
- Keep the commit out of product text. Reason: product text holds no code
  identifiers.

Made by the root agent on 2026-11-18:

- Add no skills event before an exact release confirmation, and do that
  confirmation within this work. Reason: the approved goal keeps the
  fallback path of older released runners.
- Prove the confirmation with the stable read of the saved update state.
  Reason: it is exact against a rollback between the reads, takes no lock,
  and changes no command. A typed result of `update started` and a read
  under a read-only lock were left out.
- Read the gate at the existing checks of the skills schedule while it is
  closed, and never run `update started` again. Reason: the confirmation
  keeps its first-welcome rule, its warning, and the idle behaviour.
- Keep the latest report of each workspace, and choose one newest row at
  the org read. Reason: the delete of one workspace record then removes
  only its own report. B still shows one result.
- Include archived workspaces in that choice. Reason: B shows the newest
  report of the org, and it claims nothing about running workspaces.
