# Copy status of org skills

Status: Active. No branch yet. Cal chose 404 B on 2026-11-18, and approved this plan on 2026-11-20. It starts in its own branch and pull request after [PR #426](https://github.com/Firna-AI/conductive/pull/426) merges. The last implementation commit deletes this plan.

Conductive gives the agents of every workspace the skills of one public
GitHub repository that an org admin names. The agent runner in each cloud
computer copies that repository at its start, then checks it every five
minutes. The Skills section of the Cloud computer tab lists the skills
that a GitHub lookup finds. It shows nothing about the copies. A failed
copy writes a warning only to the runner log.

On 2026-11-18, Cal chose option B of item 404. Each runner reports the
result of its last copy, and the Skills section shows the newest result
of the org. This plan gives the design of B. The section shows one newest
report, with its workspace and its time. It never claims that every
workspace has the skills, and it shows no list of workspaces. The plan
also adds a release gate, a narrow read of the saved update state. So no
skills event can break the fallback start of an older released runner.

Repository trust, 403 C, is approved and is being implemented separately.
Its [historical plan](https://github.com/Firna-AI/conductive/blob/44ffd171f7ac5f83e168fdb3769c5ffd4d2d2a82/plans/org-skills-repository-trust.md)
gives its background. The startup cleanup fix, item 407, stays a separate
[follow-up](follow-ups/skills-startup-cleanup-hides-restored-copy.md).

Start this plan after the trust implementation is complete. Both changes
touch the Skills section, the org skills protocol, and the guide. They
also touch the settings table, the generated runner types, the runner
skills code, and the D1 migrations.

Contract owners:

- [Org skills](../docs/protocol/org-skills.md),
  [The copy](../docs/protocol/org-skills-copy.md#the-copy), and
  [No state of the copy](../docs/protocol/org-skills-copy.md#no-state-of-the-copy).
- [Lost workspace updates](../docs/protocol/lost-workspace-updates.md) and
  [Agent runner](../docs/protocol/agent-runner.md).
- The [Cloud computer guide](../src/marketing/docs/cloud-computer.md#share-agent-skills-across-the-org)
  and the Privacy page in `src/marketing/privacy.ts`.
- The [runner README](../runner/README.md#org-skills), the
  [cnd-runner README](../crates/cnd-runner/README.md), the
  [cnd-cli README](../crates/cnd-cli/README.md), the
  [interface README](../crates/cnd-runner-interface/README.md), and the
  [migrations README](../migrations/README.md).

## Decision 404: Skills copy warnings reach only the runner log

Answered on 2026-11-18: Cal chose **B** with "404 = B". On 2026-11-20,
Cal approved the detailed design below with "404 = B". It is built in its
own branch and pull request after PR #426 merges, not on the branch of
PR #426. Reason: PR #426 is complete and green, and a separate pull
request keeps the large status work reviewable.

- **Severity:** Low. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `crates/cnd-runner/src/skills/service.rs` and
  `docs/protocol/org-skills.md`.
- **Terms:**
  - **Skills copy:** the copy of the org skills repository that the runner keeps in each cloud computer.
  - **Lookup:** the read of the saved repository on GitHub that lists its skills in the Skills section.
- **Background:** The Skills section shows the skills that the lookup finds. The runner warns in its own log when a copy or a check fails, when it removes a link, or when two skills have the same name. No member reads that log.
- **Problem:** When a workspace's copy fails, for example on a network fault, the section still lists the skills, and the agents of that workspace do not have them.
- **Impact if no action:** A member can believe that agents have skills that they do not have.
- **Root question:** How does a member learn that a workspace's agents do not have the org skills?
- **Options:**
  - **A.** Keep the log only. Effort: Small.
  - **B.** Each runner reports the result of its last copy, and the section shows the newest result of the org. Effort: Large. Chosen.
  - **C.** As B, but the section lists each workspace without skills and its cause. Effort: Large.
  - **D.** Each workspace shows its own latest copy result in that workspace, from the same runner report. It needs no D1 table, no D1 write, and no change to the lookup. The Skills section still shows no copy state. The app must find the latest report at load, and that report can be far back in the history. B stores the same event, so D can follow B later. Effort: Large. Added by the options check.
  - **E.** As B, but the one result is the newest failure of a workspace that is not archived, when one exists. Otherwise it is the newest result. It needs one row for each workspace and a read of each workspace's state. A failure then shows until its workspace recovers or is archived. A success then suggests that no such workspace failed, so its words need care. Effort: Large. Added by the options check.
- **Left out:**
  - A check at Save, because it cannot see a fault of one workspace.
  - A pull from each running runner at each load. It needs a new command, and an older runner closes its connection at an unknown command. So it breaks the requirement that older runners keep working.
  - A notice to the agents. The member then learns only when an agent mentions it, so it fails the goal.
- **Wider fix:** C.
- **Previous examples:** Options D and F of decision 7 of the org skills repository plan, which the user did not choose.
- **Related:** Item 407, in `plans/follow-ups/skills-startup-cleanup-hides-restored-copy.md`, changes the same runner warning paths. Its fix does not depend on this design. A cleanup warning never marks a published copy failed here.
- **Recommendation:** B. It shows the common fault with one result for the org. The options check kept B. D serves the member in the affected workspace better and can follow B later. E keeps one result, but it suggests the health of the other workspaces.
- **Action:** fix now, apply B after Cal approves this detailed plan.

Shared assumptions and their sources:

- The status shows only in the Skills section of the org. Source: the
  Problem text of this item. It is not a requirement. D drops it.
- The runner of each workspace makes the copy. Source: skills decision
  1 B in the org skills protocol. It holds.
- The lookup on GitHub stays as it is. Source: skills decision 7 H. It holds.
- Reports use the existing authenticated runner connection. Source: a
  design call of this plan, not a requirement. Its reasons hold.
- One result stands for the org. Source: Cal's answer. It holds for B.
  C and E drop it in different ways.
- Older runners send no report until a software update reaches them.
  Source: the code and [Updates](../docs/protocol/sandbox-software.md#updates).

The independent options check ran on 2026-11-18. It kept B and added D
and E. It required six corrections, which this design applies:

- A failed startup preparation reports a failure.
- A failed D1 write gets a retry.
- A repository change deletes the old status.
- Repository names compare without letter case.
- The design names the limit of a failed GitHub sign-in refresh.
- The transport is a design call, not a requirement.

On 2026-11-18, the root also required an exact release confirmation
before the first skills event. A focused check of that prerequisite found
a smaller exact gate: a stable read of the saved update state. The root
chose it on 2026-11-18. Milestone 3 plans the reader. The section "The
release gate" gives its rules.

## Design for approval

### Terms

- **Handler run:** one call of `run_once` in
  `crates/cnd-cli/src/runner_command.rs`, with its own engine, skills
  copy, and report state.
  - A program start begins a handler run. A swap to a newer release begins
    one too, with a new process-start ID.
  - After an idle install that keeps the running release, the same
    program begins another handler run. It keeps its process-start ID.
  - The process-start ID of the
    [runner warnings](../docs/protocol/runner-warnings.md#process-starts)
    names the whole program run. So one ID can cover several handler runs.
  - A reconnect inside a handler run begins no new handler run.
- **Saved update state:** the `current` link and the pending journal under
  `/opt/conductive`. A pending journal marks a release whose start is not
  confirmed yet.

### The report

- The runner sends each result as a numbered `skills.updated` event on its
  existing runner connection. It adds no route, no token call, and no
  runner protocol version, as port reports do.
- The event holds the repository that the runner copies, as `owner/name`.
- It holds one result:
  - `copied` holds the commit of the complete copy that the agents now get.
  - `empty` means that the repository has no commits. The agents get no copy.
  - `failed` holds the commit of the copy that the agents keep, or null
    when they have none.
- It holds the time of the attempt that first gave this result in its
  handler run, in Unix milliseconds.
- It holds no workspace ID, org ID, cause, error text, Git output, or token.
- A runner without a valid repository sends no report.
- Rust owns the type in `cnd-runner-interface`. A tagged result keeps a
  commit only where that result allows one.

### When the runner reports

- The schedule records the result of each update attempt, with the commit
  of the published copy.
- A failed startup preparation publishes no copy. The runner records it
  as `failed` with no commit. The next tick retries the preparation under
  the existing rules.
- A cleanup or loading warning changes no result while a copy stays
  published. Examples are a failed sweep, a removed link, and a duplicate
  name.
- So the design works before and after the fix of item 407. Before that
  fix, a cleanup failure inside the preparation publishes no copy, and the
  report says so.
- The report state starts empty at each handler run: no latest result, no
  last sent report, and a closed gate. A reconnect keeps that state.
- The runner sends the first result of each handler run. Then it sends a
  report only when the result or the commit changes. A repeated result
  sends nothing.
- The runner adds no report to its outbox while its release gate is
  closed. The section "The release gate" below gives that rule.
- A copy that runs sends nothing. The section never shows a copy in progress.
- A failed save of a report logs a warning. The next check sends the
  current result again.
- Limit: the time is the first attempt with a result in its handler run.
  A workspace that keeps its result sends no newer time. So the shown time
  can be old while the checks go on.

### The release gate

- Background: a new release stays pending, with a pending journal, until
  its runner confirms it. The runner runs `update started` once, at the
  first welcome of the handler run.
- At the next start, an apply rolls a pending release back to the previous
  release. The previous release then loads the saved outbox. It cannot
  read an event type that it does not know, so its start fails.
- So no skills event may enter the outbox while the running release is
  pending.
- The gate opens only after one stable read of the saved update state:
  1. Read the `current` link.
  2. Check that no pending journal exists.
  3. Read the `current` link again.
- Both reads must name the version of the running release. A missing
  `current` link, any journal, another version, a development build, or
  a read error keeps the gate closed.
- Why the second read: the existing state read takes `current` first and
  the journal later. A rollback can finish between them. That read then
  shows a rolled-back release as confirmed.
- The updater marks a rolled-back release as rejected before any link
  moves. It never applies a rejected release again. So after a rollback,
  the second read names another release, and the gate stays closed.
- An activation or rollback keeps a pending journal before it moves the
  current link. The writer removes that journal only after the links reach
  their final values. An unconfirmed release cannot then pass both reads.
- After one confirmed read, no fallback can reach an older release. An
  apply moves only to a higher version. A later fallback returns to the
  running release.
- The read takes no lock. So it never makes a root apply or confirmation
  skip.
- The read uses the saved update state, as the fallback does. The design
  claims no more durability than that state gives.
- When the gate reads:
  - The reporter reads the gate at each existing check of the skills
    schedule while the gate is closed. The first check of each handler run
    reads it too.
  - The reporter never runs `update started`. The confirmation keeps its
    first-welcome rule and its existing warning.
  - A confirmation whose later cleanup of old releases failed leaves no
    journal. So a later read can open the gate.
  - A pending journal keeps the gate closed. A skipped first-welcome
    confirmation leaves it closed while that journal stays.
  - Once open, the gate stays open for the rest of the handler run.
- When the gate opens, the reporter sends its latest result once, with its
  original attempt time. A reconnect never sends a result again. So the
  Worker never gets a later receive time for that result.
- The reporter gets the narrow reader directly. It never uses the
  `IdleUpdates` wrapper. That wrapper reads as not confirmed after its one
  swap attempt in the program run.
- The existing state read, `ReleaseReadiness::status`, and the idle
  updates keep their behaviour.
- The `update started` command, its callers, its output, its exit status,
  and its warning do not change.
- `plans/follow-ups/release-confirmation-cleanup-result.md` records that
  the command result cannot prove a confirmation. The gate does not use
  that result. That follow-up stays open for its warning fix.
- Limits:
  - A cloud computer sends no report while its release is pending.
  - A development build never sends a report.
  - A new release sends its first report at the first schedule check after
    its confirmation, up to five minutes after the first welcome.

### How the Worker keeps the reports

- The workspace checks each report:
  - The repository name is valid.
  - The result is known.
  - A `copied` result has a commit of 40 or 64 lowercase hex characters.
  - A `failed` result has such a commit or null. An `empty` result has none.
  - The time is a safe non-negative integer.
- An invalid report gets the existing refusal marker of a workspace-level
  event. A refused report gets no repair request.
- In the receipt transaction, the workspace stores a valid report as a
  workspace-level event, as it stores `ports.updated`. It also keeps the
  report as its latest report, with its receive time and a pending mark.
- The workspace view shows nothing for the event. The report is not
  activity. It changes no turn, unread mark, or stop time.
- After the receipt commits, the workspace writes its latest report into
  the D1 row of that workspace. A written report loses its pending mark.
- At each authenticated runner hello, the workspace writes a pending
  latest report again, with its original receive time. The retry emits no
  event and is not activity.
- So a failed write waits until the next runner connection of that
  workspace. A stopped workspace keeps it until its next start.
- A failed write logs a fixed Worker warning with the workspace ID. It
  never fails the receipt, the confirmation, the hello, or the connection.
- The write takes the workspace from the authenticated runner connection.
  It takes the org from the D1 record of that workspace.
- The write happens only while the saved repository of the org has the
  same identity as the report repository. Two valid `owner/name` values
  have the same identity when they match without letter case.
- A report that this rule skips loses its pending mark.
- For one workspace, a report replaces the stored row only when its check
  time is not older.
- The Worker stores the smaller of the check time and the original receive
  time. It also stores the receive time.
- The row holds the org, the repository, the workspace ID, the result, the
  commit, the check time, and the receive time.
- A change of the saved repository to another identity deletes every row
  of the org. A removal of the repository does the same. A change of
  letter case alone keeps the rows.
- A D1 trigger runs that delete in the same statement as the settings
  change. So it covers every settings writer, also the previous Worker
  during a deploy. The settings writer code does not change.
- The org and workspace references of the table cascade. The org purge of
  the previous Worker deletes workspaces and orgs, and it does not know
  the table. D1 enforces foreign keys, so that purge fails without the
  cascades.
- The delete of one workspace record removes only the row of that
  workspace.

### What the Skills section shows

- The skills lookup reply gains one optional field, such as `newestCopy`:
  the newest report for the saved repository, or null.
- The read chooses one row of the org: the newest check time, then the
  newest receive time. It includes archived workspaces.
- The reply holds no other row. So no list of workspaces reaches the app.
- The read matches the saved repository without letter case. A row of
  another repository never shows.
- The field gives the workspace ID, its current name, whether it is
  archived, a state, and the check time. It gives no commit.
- The field gives one of four states:
  - `copied`: the agents of that workspace got the newest copy.
  - `kept`: a check failed, and the agents keep an earlier copy.
  - `failed`: a copy or a preparation failed, and the agents have no copy.
  - `empty`: the repository has no commits.
- Every lookup reply carries the field, also a reply whose GitHub lookup
  failed.
- The section shows the status under the list or the notice of a saved,
  valid repository.
- The words name one workspace and one time. The workspace shows as the
  workspace list shows it, or as Untitled. Its name links to it.
- The words describe only the newest report. They never say that every
  workspace has the skills, or that no other workspace failed.
- Without a report for the saved repository, the section says that no
  workspace has reported a copy of it yet. The words suggest no failure.
- Admins, members, and the members of a suspended org see the same
  status. It has no button.
- The status reads at each load of the section and at each Save.
- A reply without the field, from an older Worker, shows no status.
- Product text holds no commit, Git output, provider name, or error text.
- Limits:
  - The status does not change while the section shows. A newer report
    shows at the next load of the section or the next Save.
  - The lookup passes on a failed refresh of the viewer's GitHub sign-in.
    Any failed refresh, also a network fault or a GitHub outage, then
    shows the sign-in error in place of the list and the status.
  - Copies can fail in that same GitHub outage.
  - A report of a workspace that was archived later stays the newest
    until another workspace reports.

### Compatibility

- Older runners send no report. Software updates bring the reporting
  runner to each running and each later started cloud computer.
- An older Worker refuses the event with a marker of the type `unknown`.
  It sends no repair request and confirms the event. The runner continues.
- An older app skips the new event and the new reply field.
- The migration adds a table, an index, and a trigger. The previous
  Worker does not read the table. Its settings writes and its org purge
  still work, because of the trigger and the cascades.
- The release gate keeps the fallback path of older released runners. No
  skills event enters the outbox of a release that is not confirmed.
- The `update started` command and its callers do not change. So the
  scripts of older org images keep working.
- The design works before and after the fix of item 407.

### Risks

- One result stands for the org. A newer report from another workspace
  hides an older failure. Option C would list each workspace.
- Any process with the workspace token can send a report for its own
  workspace and the current repository. The status shows what a runner
  says. It proves no copy.
- A cloud computer whose clock runs behind can lose the newest place.
- A report that the Worker refuses stays missing until the next change
  or handler run.
- A failed D1 write stays missing until the next runner connection of its
  workspace.

Design calls, made by the working agent on 2026-11-18 and revised after
the options check and the confirmation check:

- Send each result as a numbered runner event on the existing connection.
  Reason: it adds no route or token call. An older Worker refuses it with
  a marker and confirms it. No requirement asks for this transport.
- Send the first result of each handler run, then each change only.
  Reason: a report at each check would let routine results replace a new
  failure within minutes. The shown time can then be old, as Limits says.
- Reset the report state at each handler run, and keep it across
  reconnects. Reason: a new handler run makes new copy attempts, and a
  reconnect makes none.
- Keep the gate open for the rest of a handler run after one confirmed
  read. Reason: no later fallback can then reach an older release.
- Report each update attempt and each failed startup preparation. Leave
  out a warning while a copy stays published. Reason: a failed preparation
  leaves the agents without a copy. A warning must not mark a usable copy failed.
- Give no failure cause. Reason: the runner cannot tell a private or
  missing repository from a network fault without Git text. The lookup
  already names those cases.
- Take the workspace from the connection and the org from its record.
  Reason: a report cannot then name another workspace or org.
- Compare repository identities without letter case. Reason: GitHub
  repository names are case-insensitive. The approved trust design
  compares them in the same way.
- Delete the rows of an org through a trigger when its repository
  identity changes. Reason: the delete is then atomic with every settings
  write. A change back to an earlier repository then shows no old status.
- Keep the latest report with a pending mark in the workspace. Retry it at
  each authenticated hello with its original receive time. Reason: the
  runner reports only changes, so a lost failure report would never show.
- Store the smaller of the check time and the receive time. Keep a row
  only for a check time that is not older. Reason: a fast clock cannot hold
  the newest place, and a late resend cannot replace a newer row.
- Cascade both table references. Reason: the org purge of the previous
  Worker must keep working.
- Return the status in the skills lookup reply. Reason: the list, its
  notices, and the status then belong to one saved repository. They share
  load, Save, and Try again. Cost: a failed sign-in refresh hides the status.
- Show the same status to every viewer, with no button. Reason: the
  existing rule shows the list and each notice to every viewer.
- Keep the commit out of product text. Reason: product text holds no code
  identifiers, and the section shows no commit to compare it with.
- Read the status at each load and Save only. Reason: it follows the
  lookup timing, and a live update adds a second read path for rare changes.
- Give a refused report no repair request. Reason: only an invalid report
  is refused, and the next change or handler run reports again.
- Store the report as a workspace-level event that the workspace view
  ignores. Reason: port reports set this pattern. The stored-event callback
  then writes D1 after commit, and D can later read the same event.

Design calls, made by the root agent on 2026-11-18:

- Add no skills event before an exact release confirmation, and plan that
  confirmation within this change. Reason: the approved goal keeps the
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
  only its own report. B still shows one result, and the app gets no list.
- Include archived workspaces in that choice. Reason: B shows the newest
  report of the org, and it claims nothing about running workspaces.

## Replaced ways

None. The change adds a runner event, a D1 table with an index and a
trigger, an optional reply field, and a narrow confirmation reader. They
replace no data format, route, or mechanism. The existing state read,
`ReleaseReadiness::status`, `IdleUpdates`, and `update started` keep their
behaviour. The protocol section "No state of the copy" changes in
Milestone 2.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Show the newest copy status in the Skills section.

- [ ] Check `@firna/ui` and the shared parts, such as `StatusText`,
      `Notice`, and the shared time format, before choosing a component.
- [ ] Add the status to the Skills section, its shared words, and the
      fixtures. Cover no report yet, copied, kept, failed, and empty.
- [ ] Show the status beside the private, not-found, and failed-lookup
      notices. Decide whether a status can repeat a notice.
- [ ] Include member, suspended-org, removed-repository, archived-workspace,
      Untitled-workspace, and narrow-screen views.
- [ ] Name one workspace and one time in each state. Use no words that
      cover every workspace.
- [ ] Keep each page within five screens with child pages. Update the
      catalogue text.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update this design and its TODOs for each problem that the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the approved behaviour before implementation starts.

- [ ] Replace "No state of the copy" in `docs/protocol/org-skills-copy.md`
      with the status rules. Keep the pointer in `docs/protocol/org-skills.md`.
- [ ] Cover the report, its timing, failed preparations, and the warnings
      that change no report.
- [ ] Cover the repository identity and the delete at a repository change.
      Cover the order and the newest choice with archived workspaces.
- [ ] Cover the write retry at the next connection, each viewer, and older
      runners.
- [ ] State that a runner sends a skills report only while the saved update
      state shows its own release as confirmed. State that a development
      build sends none.
- [ ] Record 404 B there with the rejected A, C, D, and E and their
      reasons. State the risks and the limits. Update the warning
      sentences of "The copy" to match.
- [ ] State in Lost workspace updates that a skills report belongs to no
      session and gets no repair request. Link the report from Agent runner.
- [ ] Read both legal pages in full. On the Privacy page, say that the app
      keeps the latest copy report of each workspace and shows the newest.
      Update each other sentence that restates a changed fact.
- [ ] Read every public guide in full. Explain the newest copy status and
      its limits in the Cloud computer guide. Update each restated fact.
- [ ] Check each changed relative link and anchor.

## Milestone 3: Release confirmation reader

Depends on: 2

Add the narrow read that the release gate needs, and inject it.

- [ ] Add a read-only confirmation port in `crates/cnd-runner/src/update.rs`,
      beside `ReleaseReadiness`. It answers only whether the gate may open.
- [ ] Implement it beside `RunnerReleases` in
      `crates/cnd-cli/src/runner_update/releases.rs`, with the stable read
      of the design.
- [ ] Give the reader a narrow store boundary that `DiskStore` implements.
      Keep `read_state`, `ReleaseReadiness::status`, and `IdleUpdates`
      unchanged.
- [ ] Return closed for a development build, a missing `current` link, any
      journal, another version, and a read error.
- [ ] Construct the reader in `run_once`, in
      `crates/cnd-cli/src/runner_command.rs`. Pass it through
      `EngineDependencies`, not through the `IdleUpdates` wrapper.
- [ ] Update the engine test builders for the new dependency.
- [ ] Test the reader with the real store, as
      `crates/cnd-cli/tests/runner_readiness_tests.rs` does. Cover
      confirmed, pending, no `current` link, another version, a development
      build, and a read error.
- [ ] Cover a rollback that finishes during the read, through the store
      boundary of the reader. Show that a single read of the state fails
      that case. Save that run under `.context/org-skills-copy-status/`.
- [ ] Add no test of the literal order of the reads.
- [ ] Update the cnd-cli and cnd-runner READMEs.

## Milestone 4: Report contract and Worker storage

Depends on: 2

Accept skills reports and keep the latest report of each workspace.

- [ ] Add the `skills.updated` event and its tagged result to
      `cnd-runner-interface`, in the `RunnerEvent` union. Register them in
      the export example. Add wire snapshots.
- [ ] Regenerate and commit `src/shared/generated/` with the existing
      generator.
- [ ] Add the new type to each reader that lists runner event types, such
      as the refusal marker reader in `src/chat/api/read-chat.ts`.
- [ ] Add a D1 migration with a table of one row for each workspace. Add
      an index for the newest row of an org. Make the org and workspace
      references cascade.
- [ ] In the same migration, add the trigger that deletes the rows of an
      org when its saved repository changes identity. A change of letter
      case alone keeps them.
- [ ] Add the migrations README entry. Say that the org purge of the
      previous Worker needs the cascades.
- [ ] Parse and check the report in the workspace runner input. Add its
      type to the event identity and to the workspace-level refusal types.
      Leave it out of the repair kinds.
- [ ] In the receipt transaction, store a valid report as a workspace-level
      event. Keep it as the latest report with its receive time and a
      pending mark.
- [ ] Keep the report out of activity, unread state, the workspace summary,
      and the workspace view.
- [ ] Write the latest report to D1 from the stored-event callback. Keep
      the queries in their own data module. Clear the pending mark after a
      write or a skip.
- [ ] At each authenticated runner hello, write a pending latest report
      again with its original receive time. Emit no event.
- [ ] Catch each failed write, keep the pending mark, and log a fixed
      warning.
- [ ] Extend the existing runner event, refusal, and purge tests. Cover the
      org purge and a workspace delete with rows present.
- [ ] Add projection tests for the repository identity, the order, the
      time clamp, a failed write with its hello retry, and the trigger.
- [ ] Update the Key Code of the chat, app API, and interface READMEs.

## Milestone 5: Status in the skills lookup

Depends on: 4

Return the newest report of the org with each skills lookup.

- [ ] Add the optional status field and its type to
      `SkillsRepositoryLookupResponse` in `src/shared/org-settings.ts`.
      Say that older replies omit it.
- [ ] In the lookup route, read the saved repository and the newest
      matching row of the org in one query. Include archived workspaces.
- [ ] Return the field in each lookup reply. Return null for no
      repository, an invalid name, or no matching report.
- [ ] Keep the existing member access check.
- [ ] Extend the development API skills routes with each status state.
- [ ] Extend `worker/app-api/skills-lookup.test.ts` and
      `skills-lookup-access.test.ts`.

## Milestone 6: Runner reports

Depends on: 3, 4

Send the result of each copy from the runner.

- [ ] Add a skills reporter under `crates/cnd-runner/src/skills/`. It
      keeps the latest result, the last sent report, and the gate state of
      one handler run. It sends through the event emitter of the engine.
- [ ] Record each update result in the schedule, with the published commit
      and a time from the injected clock.
- [ ] Record a failed startup preparation as `failed` with no commit.
      Leave out a warning while a copy stays published.
- [ ] Pass the confirmation reader of Milestone 3 to the skills copy in
      `AgentEngine::new`.
- [ ] Read the gate at each check of the schedule while it is closed.
      Never run `update started` from the reporter. Keep the gate open for
      the rest of the handler run.
- [ ] Keep `AgentEngine::connected`, its first-welcome confirmation, and
      its warning unchanged.
- [ ] Update the test injection and each match over runner events.
- [ ] Extend `crates/cnd-runner/src/skills/_tests_/service_tests.rs` and
      `crates/cnd-runner/tests/skills/copy_tests.rs` for the report rules.
      Keep every existing assertion.
- [ ] Cover the gate: no event while closed, one held send when a later
      check opens it, and a failed read.
- [ ] Cover no second send after a reconnect, and a new first result in a
      new handler run.
- [ ] Keep `confirms_the_release_after_the_first_welcome_only` in
      `crates/cnd-runner/tests/engine/lifecycle_tests.rs` unchanged.
- [ ] Update the runner and cnd-runner READMEs. Add the development rule to
      the cnd-cli README, beside "Development builds disable idle swaps."

## Milestone 7: Skills section status

Tags: ui

Depends on: 1, 5

Show the approved status with the real reply field.

- [ ] Read the optional field in `readSkillsLookup`. Keep older replies
      without a status.
- [ ] Show the status in the admin Skills section and in the member and
      suspended views, as the mockups show.
- [ ] Link the workspace, show Untitled for a missing name, and use the
      shared time format.
- [ ] Extend the existing admin, member, and suspended Skills section tests.
- [ ] Smoke-test each state, the member and suspended views, a narrow
      screen, keyboard use, and the workspace link in the development app.

## Milestone 8: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7

Verify the whole path and finish the existing pull request.

- [ ] Run the early static checks and the targeted Worker, app,
      interface, cnd-cli, and runner tests. Run each new asynchronous test
      ten times.
- [ ] Run the complete npm gate, the Rust checks, and the Rust release
      build from `AGENTS.md`. Check that the generated types match Rust.
- [ ] Commit with Conventional Commits and push. Watch CI to its end.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings.
      Apply the fix rule and the existing two-round limit. Record later
      work as follow-up items.
- [ ] Delete `plans/follow-ups/skills-copy-status-in-app.md` after the
      behaviour and its docs are in place.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the plan".
- [ ] Update PR #426 with decision 404 B, the dated design calls, a plan
      permalink, the follow-up items, and the check results.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, start a workspace of an org with a skills
      repository. Check that the Skills section shows its report.

## Planning evidence

The planning notes, the options check report, and the confirmation check
reports live under `.context/org-skills-copy-status/`. No product
behaviour changes when this plan is committed.
