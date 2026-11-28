# Process diagnostics

Status: Active. On branch `calummoore/agent-stopped-l0us`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 27 November 2026, two Claude turns that waited for background work
ended as stopped at 17:21 and 17:33 UTC. About 17:20 UTC, 17 workspaces
lost their runner connection. The lifecycle alarm of each workspace object
ended the turns, because the provider read mapped to stopped or error. The
log did not say which provider state or which lifecycle step ended them.
The same runner start reconnected 10 and 25 minutes after the turn ends,
and the Worker closed each connection within about 2 seconds. Both
sandboxes later booted on new hosts with a fresh system disk, so the
runner journal was lost. Only `/home/user` survived. The evidence is in
`.context/stop-investigation/` and `.context/process-diagnostics/`. The
brainstorm is in `.context/logging-brainstorm/approaches.md`.

The change gives operators the cause of each turn end and each sandbox
stop after the fact, also when the sandbox is gone. The Worker logs the
provider facts and the cause of each sandbox stop. The runner keeps a
bounded record of process facts in the durable disk and sends it to the
Worker log. The chat does not change. The change does not alter when the
app ends a turn or stops a sandbox.

Contract owners:

- [Runner warnings](../docs/protocol/runner-warnings.md).
- [Agent runner](../docs/protocol/agent-runner.md).
- The [runner README](../crates/cnd-runner/README.md), the
  [SDK helper README](../runner/sdk-helper/README.md), and the
  [Worker README](../worker/README.md).

## Terms

- **Durable disk:** `/home/user` of a sandbox. It survives a stop and a host move. The rest of the file system does not.
- **Provider facts:** checked fields of the provider's own sandbox record, such as Boat's `stoppedAt`, `lastReboot`, `health`, and `stop`.
- **Process facts:** checked facts about the agent program, the SDK helper, the runner, and the machine. They hold only IDs, fixed kinds, states, integers, and times.
- **Diagnostic record:** the bounded file of process facts that the runner keeps in the durable disk.
- **Lifecycle step:** the hook of the workspace object that read the provider, such as `extendDeadline`, `reconcile`, or `checkRestore`.

## Decisions

Process diagnostics decisions 1 to 4 name the decisions of this change.
The user answered each on 27 November 2026, in the chat of the workspace
"agent stopped". The full items are in `.context/logging-brainstorm/`. The
options check of 28 November 2026 is in
`.context/process-diagnostics/options-check.md`. It changed no choice. It
corrected the reasons below and added options D and E of decision 4.

- **Process diagnostics decision 1: B.** The turn-end warning names the
  provider state and the lifecycle step that ended the turn. A warning
  names a known runner start that connects to a workspace that the Worker
  counts as stopped. Rejected: A, the turn-end fields only, because the
  reconnect loop shows that the provider report was wrong. C, change
  nothing and ask Boat each time, because Boat keeps only the latest stop
  and the latest reboot, not a history. Added by the check and left out:
  D, one provider read at the first stopped reconnect, because the stop
  warnings of Milestone 3 already log the provider facts of each read.
- **Process diagnostics decision 2: E.** The Worker logs the provider
  facts and the cause of each sandbox stop (option A). The runner keeps a
  diagnostic record in the durable disk (option C) and sends each entry
  to the Worker log. Rejected: A alone, because it tells nothing about the
  agent programs. B, a durable journal, because an operator read shows
  user text and needs a running sandbox. C alone, because a deleted
  sandbox takes the record with it. D, a D1 timeline for 90 days, because
  decision 4 keeps the Worker log. Boat's `degraded` and `recovered`
  webhooks stay out, because option A reads the same health fields
  through the existing provider route. This decision answers the open
  follow-up `plans/follow-ups/agent-end-cause-not-recorded.md` with its
  option B, without the tail of error output in the journal of its
  option A. Reason: error output can hold secrets. It changes the rule
  that the warnings change no runner message.
- **Process diagnostics decision 3: A.** The app keeps its turn end rules.
  When the provider reports stopped or error, the turns still end. The
  next case gets the evidence of decision 1 first. Rejected: B, a second
  read for `error`, C, a recovery on a reconnect of the same runner
  start, and D, added by the check, an end on `error` only while the
  runner connection is also down. Reason: the provider state of the
  incident is not known, and each of them guesses it.
- **Process diagnostics decision 4: A.** The Worker log keeps 7 days.
  Rejected: B, Logpush of all Worker records to R2, and C, a D1 timeline,
  for the reason of decision 2. The check found that the recorded reason
  against B was wrong: Logpush can copy only the log lines, as option E.
  It also added D, Cloudflare Analytics Engine, which keeps three months.
  The user is asked again on 28 November 2026 whether A stays. Until the
  answer, A stays and nothing in the plan depends on it.

## Design

Each item below is my call, made on 27 November 2026 and corrected on
28 November 2026 after the options check, unless it names a decision.

- **Turn-end fields (decision 1).** `reconcileReply` in
  `worker/lifecycle/workspace-actions.ts` returns the provider state and
  the hook name with its result. The workspace object saves them with the
  lifecycle state, inside the hook's own queue, not through a second
  `lifecycle.update`. The turn ends of
  `worker/chat/workspace-operations.ts` read them, and the turn-end
  warning of `worker/chat/turn-end-reports.ts` adds `providerState` and
  `lifecycleStep`. Each is one value of a fixed list, or null. The input
  path, which does not call `turns.clear()`, gets the same values.
- **Turn IDs.** The same milestone applies option D of
  `plans/follow-ups/warning-ids-drop-watch-turn-uuids.md`, so the warning
  keeps a turn ID in UUID form. Reason: the second incident turn logged
  `turnId: "unknown"`.
- **Stopped reconnect (decision 1).** The warning comes only for a hello
  that arrives while the stored state already counts as stopped or
  error, not for the close at the stop itself. The workspace object
  saves a durable key of the runner start and the stored stop, and warns
  once for each key. The warning holds the connection values, the stored
  state, and the stop time when one exists.
- **Provider facts (decision 2, part A).** `worker/sandbox/parsers.ts` also
  reads, when present: `stoppedAt`, `lastReboot.at`, `lastReboot.reason`,
  `health`, `degradedSince`, `stop.status` with `superseded`,
  `stop.endedAt`, `stop.forced`, and `archiveAfter`. A value outside its
  fixed list or format reads as `unknown`. Free text, such as
  `healthReason` and `error`, stays out. The host fact is a short digest
  of `ip`, because `url` and `subdomain` stay the same across host moves.
  E2B gives the facts that its API has.
- **Stop warnings (decision 2, part A).** A `sandbox_stopped` warning
  comes at each stop that the app requests or finds. The cause is one
  of: `idle_deadline`, `suspension`, `token_revoked`, `archive`,
  `disk_keepalive`, `start_failed`, `org_deleted`, `operator`,
  `provider_stopped`, `provider_error`. The stops of a deleted org run in
  `worker/members/`, so that code writes their warning. A
  `sandbox_host_changed` warning comes when the host digest differs from
  the saved value. Each holds the provider facts of the read.
- **The record (decision 2, part C).** The runner writes
  `~/.conductive/diagnostics/record.jsonl`, one JSON object for each fact,
  numbered from 1 for each stream ID. Each entry holds the process-start
  ID and the boot ID of the runner start that wrote it. The file keeps at
  most 1 MiB. It drops acknowledged entries first, and only acknowledged
  entries age out after 7 days. When unacknowledged entries fill it, the
  runner drops the oldest and counts them in a `facts_dropped` entry. The
  record and the heartbeat use plain writes, never the state write that
  frees the disk reserve of `crates/cnd-runner/src/disk.rs`. Agent code
  can change the file, so an entry is a claim, not a proof.
- **The fact list.**
  - `agent_started` and `agent_exited`, with the agent, the session ID in
    the app's form, the exit code, the signal, and who ended it:
    `runner`, `helper`, or `unknown`.
  - `helper_exited`, with the exit code and the signal.
  - `background_wait_started`, `background_wait_ended`, and
    `background_wake_delivered`. They hold no counts, because the helper
    sends only two booleans today.
  - `runner_started`, with the boot ID, and `runner_stopping`, with the
    signal.
  - `previous_boot`, written at each start: the boot ID, the last
    heartbeat time, and `stoppingSeen`. A Boat stop sends no signal, so
    `stoppingSeen: false` alone does not mean a crash. The
    `sandbox_stopped` warning tells the two apart.
  - `connection_closed`, with the WebSocket close code, at most once for
    each runner start in each minute.
  - `memory_pressure`, as the integer of 100 times `some avg60` of
    `/proc/pressure/memory`, when it crosses 1000 up or down.
  - `oom_kill`, with the new `oom_kill` count of the runner unit's
    `memory.events`.
  - `disk_near_line`, when the free space above the disk line crosses
    1 GB down or up, with the free bytes. Reason: a disk above the line
    starts with about 2 GB free, as `docs/protocol/disk-line.md` says.
- **Heartbeat.** The runner writes its last heartbeat time each 60
  seconds to `~/.conductive/diagnostics/heartbeat`, not to the record.
  Only `previous_boot` sends it.
- **Exit facts.** The SDK helper keeps the exit code and the signal of the
  agent program in `runner/sdk-helper/src/providers/lifetime.ts`, which
  the Claude and the Codex start paths both use. It sends them to the
  runner in a new `process.exited` output. The runner keeps the exit
  status of the helper. Neither keeps the error output. The helper and
  the runner ship in one release, so the new output needs no flag.
- **The send (decision 2).** The design copies the services messages of
  `docs/protocol/service-reports.md`. The hello and the welcome each gain
  an optional `diagnostics: true` flag, saved with the runner connection
  state. When both carry it, the runner sends an unnumbered
  `diagnostic.facts` message with up to 50 entries. The Worker parses it
  before the general parser and never closes the connection for a bad
  message. It answers `diagnostic.ack` with the stream ID and the highest
  entry number that it handled, also for entries that fail the checks.
  The runner sends the next batch after each ack, and sends
  unacknowledged entries again after a reconnect. A repeat can log one
  entry twice, with the same number.
- **Worker checks.** The Worker checks each kind, ID, integer, and time,
  as [What a warning holds](../docs/protocol/runner-warnings.md#what-a-warning-holds)
  says. It accepts at most 120 entries for each workspace in each minute
  and 2 KiB for each entry. It drops the rest, acknowledges them, and
  writes one `diagnostics_dropped` warning for each minute with the count.
  Each accepted entry becomes one `runner_fact` warning with its own
  process-start ID and boot ID, and the values of the current connection.
- **Code layout.** `worker/lifecycle/durable.ts`,
  `worker/chat/runner-channel.ts`, `worker/chat/runner-connections.ts`,
  and `worker/sandbox/backend.ts` are near the 300-line limit. New code
  goes in new modules.
- **Compatibility.** An older runner sends no flag and no message. A
  rolled-back Worker sends no welcome flag, so the runner keeps its
  entries. The record needs no migration. The D1 schema does not change.
- **Legal pages.** The diagnostic record holds no user content. The
  operational logs section of `src/marketing/privacy-operations.ts`
  describes these warnings and changes. A change to the Privacy text also
  sets the effective date in `src/marketing/privacy.ts`.

## Milestone 1: Documentation and protocol

Depends on: none

State the requirements and decisions 1 to 3 in the protocol docs.

- [ ] Update `docs/protocol/runner-warnings.md`: the turn-end fields, the
      stopped reconnect warning, the sandbox stop and host warnings, the
      diagnostic record, the `diagnostic.facts` send, the checks and
      limits, and the new field types of "What a warning holds". Replace
      the sentence that the warnings change no runner message. Reword the
      rule that a runner start never sends the ID of an earlier start,
      because a stored fact carries the ID of its writer.
- [ ] Correct the rule of `docs/protocol/runner-warnings.md` that each
      resume makes a new process-start ID. Boat keeps a stopped machine
      with its processes for about 10 minutes, so a quick resume keeps the
      same runner start. Confirm Boat's text first, and give its source.
- [ ] Update `docs/protocol/agent-runner.md`, "Runner warnings", with the
      diagnostic record and the hello flag.
- [ ] Read `src/marketing/privacy.ts`, `src/marketing/privacy-operations.ts`,
      and `src/marketing/terms.ts` in full. Update each sentence that a
      changed fact affects, and the effective date of each changed page.
- [ ] Read each guide in `src/marketing/docs/` in full for the same facts.
- [ ] Update `plans/follow-ups/request-records-in-logs.md` with the
      Logpush fact of decision 4.

## Milestone 2: Turn-end fields and the stopped reconnect warning

Depends on: 1

Ship decision 1 in the Worker.

- [ ] Return the provider state and the hook name from `reconcileReply`,
      save them with the lifecycle state, and add them to the turn-end
      warning, also on the input path.
- [ ] Apply option D of `plans/follow-ups/warning-ids-drop-watch-turn-uuids.md`,
      then delete that item.
- [ ] Write `runner_connected_while_stopped` for a hello to a stored stop,
      once for each durable key.
- [ ] Add tests beside `worker/chat/turn-end-reports.ts`, the lifecycle
      hooks, and the runner connection tests.
- [ ] Update the [Worker README](../worker/README.md).

## Milestone 3: Provider facts and stop warnings

Depends on: 1, 2

Ship part A of decision 2 in the Worker.

- [ ] Read the provider facts in `worker/sandbox/parsers.ts` and the E2B
      parsers, with tests for each fixed list and each bad value.
- [ ] Save the last host digest in the lifecycle state, and write
      `sandbox_host_changed`.
- [ ] Write `sandbox_stopped` with its cause at each stop path, also in
      `worker/members/`, with a test for each cause.
- [ ] Add the provider facts to the turn-end warning of Milestone 2.
- [ ] Update the Worker README and `worker/sandbox/e2b/README.md`.

## Milestone 4: Process facts and the diagnostic record

Depends on: 1

Keep the record in the runner. Nothing leaves the sandbox yet.

- [ ] Add the `process.exited` output of the SDK helper, with the exit
      code and the signal, in
      `crates/cnd-runner-interface/src/sdk_helper.rs`. Send it from
      `runner/sdk-helper/src/providers/lifetime.ts`.
- [ ] Keep the exit status of the helper in
      `crates/cnd-runner/src/helper/process.rs`.
- [ ] Add a diagnostics module in `crates/cnd-runner` that writes the
      record and the heartbeat, with its size, age, and drop rules.
- [ ] Write each fact of the fact list from its source, with tests.
- [ ] Regenerate the shared types and commit them.
- [ ] Update the runner README and the SDK helper README.

## Milestone 5: Send the record to the Worker log

Depends on: 2, 4

Ship the send of decision 2.

- [ ] Add the `diagnostics` hello and welcome flags, and the
      `diagnostic.facts` and `diagnostic.ack` messages, in
      `crates/cnd-runner-interface`. Regenerate the shared types.
- [ ] Send and resend the entries from the runner, with tests.
- [ ] Save the flag with the runner connection state. Check, limit, log,
      and acknowledge the entries in the Worker, with tests for each
      limit and each bad value.
- [ ] Test an older runner, a rolled-back Worker, and a reconnect loop.
- [ ] Delete `plans/follow-ups/agent-end-cause-not-recorded.md`, because
      decision 2 answers it. Update each follow-up item that names it.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci`, `npm ci --prefix runner`, and
      `npm run check`.
- [ ] Run the Rust checks and the Rust release build of `CLAUDE.md`.
- [ ] Run a local runner against `npm run dev`. Kill the agent program
      with SIGKILL during a turn. Confirm the `runner_fact` warning with
      signal 9 in the local Worker log.
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

- [ ] After the deploy and a runner update, stop a test sandbox through
      the provider and resume it. Confirm `sandbox_stopped`,
      `previous_boot`, and the runner facts in Workers Logs.
- [ ] When Cloudflare offers a longer Workers Logs retention, ask the user
      whether decision 4 moves to it.
