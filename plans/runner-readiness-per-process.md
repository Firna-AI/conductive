# Runner readiness for each runner process

Status: Active. On branch `calummoore/no-response-issue-v2-kz57`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Worker stores one ready flag for each runner event stream. A new
runner process loads the same saved stream, so its first hello counts as
ready with the flag of the earlier process. Restart, each resume, and an
idle update then end Starting, or send the waiting messages, to a process
that has not finished its first reports. A new process that stalls after
its hello shows Ready, and the message gets no reply. Pull request #622
fixed this for the automatic restart only, with the rule that a hello
after the restart command does not count saved readiness.

Cal's decision, 21 November 2026: option B of the follow-up item
`plans/follow-ups/runner-readiness-per-process.md`. Bind readiness to the
runner process across the handshake, the event log, and delivery. A
reconnect of the same process keeps its readiness. A new process waits for
its own `runner.ready`. Replay stays on the saved stream, and older
runners keep working. The other options were A (the automatic restart
only, already merged), C (the rule of A for Restart too), D (bind the
saved flag to the process-start ID in the Worker only), E (no saved
readiness at the hello), and F (accept the start of the waiting turn as
proof). Reason: B ends the false proof on each path, and it keeps the
readiness of a reconnect of the same process. This pull request deletes
that follow-up item.

The change does not cover the hold of runner commands after an automatic
restart command is submitted. The follow-up item
`plans/follow-ups/restart-hold-delivery-after-submission.md` keeps that
work, and its release rule builds on this change.

Contract owners:

- [The agent runner](../docs/protocol/agent-runner.md),
  [Runner warnings](../docs/protocol/runner-warnings.md),
  [Restart the software](../docs/protocol/restart-the-software.md), and
  [The sandbox software](../docs/protocol/sandbox-software.md).
- The [runner interface README](../crates/cnd-runner-interface/README.md),
  the [runner README](../crates/cnd-runner/README.md), the
  [chat README](../worker/chat/README.md), and the
  [lifecycle README](../worker/lifecycle/README.md).

## Design

### Facts that the design uses

- The runner makes one process-start ID at each runner start
  (`crates/cnd-cli/src/runner_start.rs`). It keeps the ID across
  reconnects and a repository move. A new ID comes with each start of the
  runner service, each resume, each Restart, and the in-place exec of an
  idle update.
- The hello carries the ID as the optional `processStartId`
  (`crates/cnd-runner-interface/src/runner_handshake.rs`). The Worker
  stores it on the connection after it normalizes it. A value that is not
  a UUID becomes `unknown`.
- The runner sends `runner.ready` on each connection, after its first
  file, port, and skill reports (`crates/cnd-runner/src/reports/handler.rs`).
  The event goes through the saved stream, so a new process can resend an
  earlier process's unconfirmed `runner.ready` after the welcome. The event
  carries no process ID today.
- Some live runners of protocol version 2 send no process-start ID: the
  old Node runner and Rust releases from before commit `6b82c5176`.

### Runner

- `runner.ready` gets an optional `processStartId`. The runner sets it to
  the ID of the process that emits the event. The saved event keeps the
  ID, so a resent event names the process that made it.
- `ts-rs` regenerates the TypeScript type. An older Worker drops the extra
  field, so the change needs no new protocol version.

### Worker

- The chat store keeps the process-start ID of the last process that sent
  a counted `runner.ready`, for each stream, under a new key. The existing
  ready flag of the stream stays, and the Worker still writes it, so the
  previous Worker keeps reading it.
- At a hello with a valid process-start ID, the connection is ready only
  when the stored ID equals the hello's ID. That is a reconnect of the same
  process. Otherwise it waits for a `runner.ready`.
- A `runner.ready` with a process-start ID counts only when the ID equals
  the ID of the connection that carries it. A resent event of an earlier
  process then does not count. The Worker still stores and confirms it.
- A `runner.ready` without an ID counts, as today.
- A hello without a valid ID, or with `unknown`, keeps today's rule: the
  saved ready flag of the stream counts.
- The fresh-ready rule of the automatic restart stays. It also makes a
  reconnect of the same process wait after the restart command.
- Start, resume, Restart, and the automatic restart then end Starting at
  the new process's own `runner.ready`. An idle update holds delivery
  until the new release's first reports end.

### Design calls

These are agent design calls of 21 November 2026. Cal can change each one.

- The process-start ID goes into the `runner.ready` event, not a new
  field of the hello. Reason: only the event tells a resent ready from a
  fresh one. A hello field with the next event number was the other way,
  and it needs more Worker state.
- A hello without a valid ID keeps today's rule. Reason: the older
  runners then behave exactly as they do now, and the idle update brings
  each of them to a release with the ID within minutes. Waiting for their
  own ready on each connection would fix them too, but it changes
  behaviour for runners that this change cannot test.
- The 3-minute limit of Restart and the automatic restart, and the
  20-minute start limit, stay. Reason: the first scan of the largest
  folder seen so far took 25 to 30 seconds, and the hash reuse of pull
  request #622 keeps later scans short.
- The new key keeps only the last counted process for each stream.
  Reason: the Worker needs no history of older processes.

## Milestone 1: Documentation and protocol

Depends on: none

- [ ] Update `docs/protocol/agent-runner.md`: a connection is ready when
      its own process sent `runner.ready`. A reconnect of the same process
      stays ready. `runner.ready` carries the process-start ID. A runner
      without the ID keeps the saved stream rule.
- [ ] Update `docs/protocol/runner-warnings.md`: the process-start ID now
      also binds readiness to a process. Replace the reason that the ID
      serves only the warnings. Keep the rules that the Worker never
      refuses a hello for its ID and that the ID proves no start.
- [ ] Update `docs/protocol/restart-the-software.md`: Starting lasts until
      the new runner process sends its own `runner.ready`.
- [ ] Update `docs/protocol/sandbox-software.md`, "Installs at idle":
      delivery waits for the new release's first reports.
- [ ] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each
      public guide in `src/marketing/docs/` in full. Update each sentence
      that restates a changed fact.

## Milestone 2: Runner ready event with the process ID

Depends on: none

- [ ] Add the optional `process_start_id` to `RunnerReady` in
      `crates/cnd-runner-interface/src/runner.rs`, and set it where the
      runner emits the event.
- [ ] Regenerate `src/shared/generated/` with
      `cargo run -p cnd-runner-interface --example export_bindings`.
- [ ] Add tests: the event carries the ID of its process, and a resent
      event from the saved outbox keeps the ID of the earlier process.
- [ ] Update `crates/cnd-runner-interface/README.md` and
      `crates/cnd-runner/README.md`.

## Milestone 3: Worker readiness for each process

Depends on: 1, 2

- [ ] Store the process-start ID of the last counted `runner.ready` for
      each stream under a new chat key. Keep writing the existing ready
      flag.
- [ ] Apply the hello rule and the event rule of the design in
      `worker/chat/runner-handshake.ts`, `worker/chat/runner-channel.ts`,
      and `worker/chat/runner-receipt.ts`. Treat `unknown` as no ID.
- [ ] Add tests:
  - [ ] A reconnect of the same process is ready at its hello.
  - [ ] A new process on the saved stream waits for its own ready,
        through a manual Restart and through a resume.
  - [ ] A resent `runner.ready` of an earlier process does not count, and
        the Worker still confirms it.
  - [ ] A runner without the ID keeps the saved stream rule.
  - [ ] The previous Worker's record shape still reads, and the existing
        ready flag stays written.
- [ ] Update `worker/chat/README.md`, `worker/chat/key-code.md`, and
      `worker/lifecycle/README.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the Rust checks and the release build named in `AGENTS.md`.
- [ ] Run the targeted Worker tests one file at a time, then rely on CI
      for the complete gate, because the local suite times out in this
      sandbox (`plans/follow-ups/worker-suite-timeouts.md`).
- [ ] Delete `plans/follow-ups/runner-readiness-per-process.md`, and
      update the items that name it.
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

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, restart the runner service of a test workspace,
      and check that the header shows Starting until the first reports of
      the new process end, and that a message then gets its reply.
