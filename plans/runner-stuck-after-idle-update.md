# Runner stuck after an idle update

Status: Active. On branch `calummoore/no-response-issue-l1pn`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 20 November 2026 a member message in workspace W-153 got no reply. The
runner of W-153 closed its connection at 18:00:32 UTC for an idle update,
as [Installs at idle](../docs/protocol/sandbox-software.md#installs-at-idle)
says. It never connected again. The message arrived at 18:01:37 and waited
in the Workspace object with no end. The investigation found three causes:

- The repository watcher queues one full file scan after each burst of
  file changes, with no limit (`crates/cnd-runner/src/watcher/service.rs`).
  The skills reporter merges such requests, but the file reporter does not.
- Each file scan hashes every file of the repository folder, also the
  ignored files of `.context/` (`crates/cnd-runner/src/repository/snapshot.rs`).
  The `.context/` of W-153 held 6.3 GB in 87,856 files, so one scan took
  about 25 to 30 seconds at 2.4 cores. A backlog of scans formed.
- At a shutdown, `ReportCommandHandler::shutdown` waits for the watcher
  task, and the watcher task waits for each queued scan. The idle update
  started, because queued watcher scans do not make the runner busy. The
  shutdown then waited behind the backlog, so the runner never reached
  `update apply` and never connected again. The Worker has no step for a
  runner that stays away from a running sandbox. It only reads the Boat
  state every 5 seconds.

Cal's decision, 20 November 2026: option C of three. Fix the runner so
that queued scans stay bounded and stop at a shutdown, stop hashing
unchanged files again, and let the Worker restart a runner that stays away
while a message waits. The other options were A, the runner queue and
shutdown fix only, and B, A with the hash reuse. Reason: A and B fix this
cause, and the Worker restart also covers other ways that a runner can go
missing.

The change does not cover these. Each has its own follow-up item:

- The watcher stops for good after one error, so the file lists stop
  updating live
  ([repository-watcher-stops-after-one-error.md](follow-ups/repository-watcher-stops-after-one-error.md)).
- A runner that goes away while a turn runs. The Worker restarts it only
  when a message waits for delivery.

Contract owners:

- [The sandbox software](../docs/protocol/sandbox-software.md) and
  [Restart the software](../docs/protocol/restart-the-software.md).
- The [runner README](../crates/cnd-runner/README.md) and the
  [lifecycle README](../worker/lifecycle/README.md).

## Design

### Runner: bounded scans that stop at a shutdown

- A file refresh from the watcher, with no command ID and not full, joins
  the waiting scan when one waits. So at most one such scan runs and one
  waits. The skills reporter already works this way with its `queued`
  flag.
- A refresh with a command ID keeps its own place in the queue, because
  its reply names its command.
- `FileReports` gets a `close`. It marks the reporter stopped and cancels
  the running snapshot through its `Cancellation`. A scan that waits ends
  without a scan and without a report.
- `ReportCommandHandler::shutdown` closes the file reporter together with
  the turns, the ports, the watches, and the skills.
- The watcher task stops its queued scans at a stop instead of waiting for
  each of them.
- The next runner start scans once at its connection, as today. So no
  report goes missing.

### Runner: reuse the hash of an unchanged file

- The repository keeps the last hash of each scanned file in memory, with
  its device, inode, size, modification time, and change time in
  nanoseconds.
- A scan reuses the hash when all five values are the same, and the change
  time is at least 2 seconds before the start of the scan that stored it.
  Otherwise it reads the file again. Reason: a file system with coarse
  times can show the same times after a fast rewrite. Git uses the same
  rule for racy entries.
- Each scan drops the entries of files that it no longer finds.

### Worker: automatic restart of a runner that stays away

- The lifecycle state records the time when the runner disconnected. A
  ready runner clears it.
- The alarm restarts the runner when all of these hold:
  - A message waits for delivery to the runner in some session.
  - The last Boat read shows the sandbox running.
  - The runner has been away for at least 3 minutes, and the oldest
    waiting message has waited for at least 1 minute.
  - No Restart, start, Continue, or repository change runs, and the
    workspace state allows a Restart.
  - The org and the workspace owner are not suspended.
- The automatic restart does what Restart does: Starting in the header,
  the update check, the restart commands, the 3-minute limit, and the
  error state "The software didn't restart. Try again." when the runner is
  still not ready.
- It runs at most once for each away period. After a failed automatic
  restart, the member uses Try again.
- The Boat commands run outside the chat queue and outside the serial
  lifecycle step, through `QueueTurn.outside`. The alarm uses the provider
  of the org, as the Boat state read does.
- The restart applies the existing start step of the runner service,
  which rolls back an unconfirmed release. The rejection of a rollback in
  [Installs at idle](../docs/protocol/sandbox-software.md#installs-at-idle)
  has the reason that an outage of the Worker can keep a good fix away.
  That reason does not apply here, because the Worker itself starts the
  restart.

### Design calls

These are agent design calls of 20 November 2026. Cal can change each one.

- The 3-minute away time and the 1-minute wait. Reason: an idle install
  takes seconds, and the runner retries its connection every second. So 3
  minutes passes only for a runner that is stuck.
- Only a waiting message starts an automatic restart, not a running turn.
  Reason: a runner that lost its connection can still run that turn, and
  a restart would stop it. Cal's decision names a waiting message.
- One automatic restart for each away period. Reason: a broken release
  must not restart in a loop. The existing error state then tells the
  member.
- The same commands as Restart, with the update check first. Reason: a
  newer release can hold the fix of a broken one.
- The hash reuse rule and its 2-second racy window, as the design says.
- A waiting message starts the automatic restart also when another turn
  runs, and that turn then ends. Reason: after 3 minutes away the runner
  is almost certainly stuck, and a turn that only looks like it runs must
  not hold the restart back.
- The automatic restart shows no toast for a failed download, and it goes
  on with the installed release. Reason: no member pressed Restart.
- After a failed automatic restart, the error state offers Try again, as
  after a failed Restart. Reason: Restart is not in the menu of that
  state, and adding it would be a new requirement.
- The hash cache stays in memory only. Reason: a new runner process scans
  once at its start, and a cache file would need its own cleanup.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the automatic restart. The runner changes keep
the behaviour, so they change no protocol doc.

- [x] Update `docs/protocol/sandbox-software.md`, "Installs at idle":
      replace the rule that no check guards a release that never
      connects. Name the automatic restart of the Worker, its risk, and
      Cal's decision of 20 November 2026.
- [x] Add a section on the automatic restart to
      `docs/protocol/restart-the-software.md`: when it runs, what the
      member sees, and its limit of one restart for each away period.
- [x] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      public guide in `src/marketing/docs/` in full. Update each sentence
      that restates a changed fact.

## Milestone 2: Runner scan queue and shutdown

Depends on: none

- [x] Merge waiting watcher file refreshes into one waiting scan in
      `crates/cnd-runner/src/reports/files.rs`.
- [x] Add `FileReports::close`, and cancel the running snapshot and each
      waiting scan.
- [x] Close the file reporter in `ReportCommandHandler::shutdown`.
- [x] Stop the queued scans of the watcher task at a stop in
      `crates/cnd-runner/src/watcher/service.rs`.
- [x] Add a regression test: a slow repository, a burst of watcher
      events, then a shutdown. The shutdown ends without waiting for the
      queued scans. At most two file scans run for the burst.
- [x] Update `crates/cnd-runner/README.md`.

## Milestone 3: Runner hash reuse

Depends on: 2

- [x] Keep the hash cache in `crates/cnd-runner/src/repository/`, and use
      it in `snapshot.rs`.
- [x] Add tests: an unchanged file is not read again, a changed file is
      read again, a file inside the racy window is read again, and a
      removed file leaves the cache.
- [x] Update `crates/cnd-runner/README.md`.

## Milestone 4: Worker automatic restart

Depends on: 1

- [x] Record the disconnect time in the lifecycle state, and clear it at
      ready. Keep the stored state readable by the previous Worker.
- [x] Add the restart condition to the alarm step, and run the restart
      commands outside the chat queue and the serial lifecycle step.
- [x] Share the restart commands and the state change with
      `worker/lifecycle/software-restart.ts`.
- [x] Update `worker/lifecycle/README.md` and
      `worker/lifecycle/workspace-object.md` for the away time and the
      alarm step.
- [x] Add two or three sentences on the automatic restart to the
      "Restart the software" part of the workspaces guide in
      `src/marketing/docs/`.
- [x] Add tests with the existing restart and lifecycle fixtures: a
      waiting message and a runner away for 3 minutes gives one restart.
      No restart for a running turn, a short absence, a stopped sandbox,
      a suspended owner, or a running Continue. A second away period after
      a failed restart gives no restart.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run `cargo fmt --all -- --check`,
      `cargo clippy --workspace --all-targets -- -D warnings`, and
      `cargo test --workspace`.
- [x] Run the targeted Worker tests, then the complete gate
      `npm run check`.
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

## Post-merge follow-up (non-blocking)

- [x] After the deploy, fill the `.context/` folder of a test workspace
      with many files, and let it become idle with a newer release ready.
      Check that the runner installs the release and connects again within
      a few minutes.
- [x] Stop the runner of a test workspace on purpose, send a message, and
      check that the Worker restarts the runner and the message gets its
      reply.

The two post-merge tasks are now the follow-up items
`plans/follow-ups/idle-update-large-context-smoke-test.md` and
`plans/follow-ups/automatic-restart-smoke-test.md`.
