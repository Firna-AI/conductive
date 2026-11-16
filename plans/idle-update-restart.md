# Install sandbox updates when the workspace is idle

Status: Active. On branch `calummoore/workspaces-auto-update-issue-ha9k`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today a sandbox downloads a newer release of the sandbox software in the
background. It installs the release only at the next start of the agent
runner, which is the next start of the sandbox. So a workspace that stays
on keeps its old release. A workspace that starts after a deploy usually
runs the old release for that whole run, because its runner starts before
the download completes. A fix reaches a workspace one or two stops and
starts late. Cal saw this on 2026-11-16 ("why don't the workspaces have the
latest conductive code").

The change makes the runner install a complete newer download as soon as
the workspace is idle, with no running turn in any session and no waiting
command. The sandbox also checks for a release every 10 minutes, not every
hour. The runner swaps to the new release in place (decision 1 F), so no
process stops. No guard checks a new release that cannot connect
(decision 3 A).

Contract owners:

- [Sandbox software](../docs/protocol/sandbox-software.md#updates).
- [The agent runner](../docs/protocol/agent-runner.md#the-agent-runner).
- The [runner service README](../runner/service/README.md) and the
  [image README](../image/README.md).

## Decisions

### 1. How a running workspace installs a new release

Decided by Cal on 2026-11-16: **F**. Cal first chose B. The options check
of the same day added F and G and recommended F, and Cal then chose F.

- Root question (from the options check): how does a workspace that stays
  on get each new release within minutes, without ending a turn or a
  user's process?
- Background: the runner runs every agent process, and every process that
  an agent starts, in one systemd service, `conductive-runner.service`,
  with `KillMode=control-group`. A stop of the service kills them all.
  The sandbox user has passwordless `sudo`, and the runner already uses
  `sudo -n` to confirm its release.
- Options:
  - A. Restart the runner service at idle, and accept that agent
    background processes stop. Effort: medium.
  - B. Restart the runner service at idle only when no agent background
    process runs. Otherwise wait, as today. Build daemons, such as Gradle
    and Bazel servers, also count, so some workspaces wait for hours.
    Effort: medium.
  - C. Move the agents' tool processes into their own service, so that
    they survive a runner restart. Then always restart at idle. Effort:
    high. Split into workspace
    [agent processes survive runner restart](https://app.conductive.build/orgs/X6K5FFR3yoqyD5D1WfZdCk4GCk8QNz65J_GzQ5WkiOM/workspaces/JurM808USY6E4_PnmU-F0PzdnFR4SUvL95lbIXGgXqo),
    branch `calummoore/agent-processes-survive-runner-restart-mkxg`.
  - D. Keep the current behaviour.
  - E. Show "Update ready, restart to apply" in the app, and let the user
    restart.
  - F. Swap the release in place. At idle, the runner closes its link and
    shuts down as at a restart. Then it runs `update apply` through
    `sudo -n` and execs the new release. The process ID stays, so systemd
    stops nothing, and every agent process keeps running. No process probe
    is needed. A failed start exits, and the restart that exists today
    rolls back. Cost: a changed runner unit applies only at the next start.
    Effort: medium.
  - G. Set `KillMode=process` on the runner unit, restart at idle, and end
    the leftover agent helpers at the next start. Cost: systemd advises
    against it, and a crash also leaves processes. Effort: medium.
- Left out: a restart at any time, because it ends each running turn. A
  start that waits for a quick check, because a start must never wait for
  a download. A restart by the root check service, because it cannot see
  the turns. A handoff of running turns to the new release, because the
  old agent helper and the new runner then mix two releases.
- Recommendation: **F**, in place of the first recommendation B. It
  updates every idle workspace within minutes, also one with a dev server
  or a build daemon, and it stops no process. It also meets the update
  goal of C.

### 2. How often a running sandbox checks for a release

Decided by Cal on 2026-11-16: **B**, every 10 minutes.

- Options: A. Keep the hourly check. B. Check every 10 minutes. C. The
  deploy asks the Worker to tell each connected runner to check (added by
  the options check; large effort, and an unknown command closes an older
  runner's connection). D. The runner checks about 3 minutes after each
  reconnect, because a deploy restarts each Durable Object (added by the
  options check; medium effort, needs a live proof).
- Reason: the check reads one small static file, so the extra checks cost
  almost nothing. The options check also recommends B.

### 3. A new release that cannot connect

Decided by Cal on 2026-11-16: **A**, no guard. The options check of the
same day raised this decision.

- Problem: a release that starts but never connects to the Worker now
  reaches every idle running workspace within about 12 minutes. Today it
  spreads only at each start. The runner retries its connection forever,
  so the existing rollback runs only at a later start. Those workspaces
  then have no working agents.
- Options:
  - A. No guard. Rely on CI and the deploy's software image build.
    Effort: none.
  - B. The new release guards itself: when it has no welcome from the
    Worker 5 minutes after an idle update, it exits, and the restart rolls
    back. Cost: a broken release can also break its own guard. Effort:
    small.
  - C. The old release guards the new one: before the swap, the runner
    schedules a one-time check after 5 minutes, with the program of the
    old release. When the new release is still not confirmed, the check
    restarts the runner service, and the existing rollback returns to the
    old release. Effort: medium.
- Shared cost: the rollback rejects the new release for good. So a Worker
  outage of more than 5 minutes during an update can reject a good
  release. The next deploy replaces it. The update runs only while the old
  runner is connected, so the Worker was reachable just before.
- Recommendation: C, because the release that is known to work decides.
  Cal chose A.

## Design

Each item is my design call, dated 2026-11-16, for option F of
decision 1.

1. **The runner owns the swap.** Only the runner knows when no turn runs,
   and it reads the commands. It decides in its connection loop, where no
   command is read at the same time. It closes its link, ends its work as
   at a shutdown, and saves its state. Then it runs
   `sudo -n <its executable> update apply`. When `current` then names a
   newer release, it execs `/opt/conductive/current/system/runner-start.sh`.
   Otherwise it warns and connects again on its release. Reason:
   `update apply` changes nothing when another process holds its lock, and
   a blind restart then repeats at each check.
2. **Idle.** Every session has no active turn, also no turn that waits
   for background work, no queued work in its mailbox, and no accepted
   turn without an end. No report request runs. A new
   `CommandHandler::busy` reports this. The report handler asks its next
   handler too. The workspace must stay idle for 2 minutes. Reason: the
   next message is most likely just after a turn ends.
3. **A newer release.** The composition root in `cnd-cli` gives the
   runner a port. It says whether the release store holds a complete, not
   rejected version higher than the running one, and whether the running
   release is confirmed. It reuses `DiskStore`. Reason: a rejected release
   must cause no loop, and `update apply` rolls back a release that is not
   confirmed.
4. **When the runner checks.** Every 60 seconds while it is connected.
   Both reads are local and cheap.
5. **Commands at the moment of the swap.** The Durable Object records
   command delivery per connection (`worker/chat/delivery-state.ts`), so it
   sends each command that the runner did not read to the next connection.
   A test proves this, or the milestone adds the missing behaviour.
6. **Only the runner changes release.** The preview relay and the terminal
   keep their release until the next start of the sandbox. The relay reads
   no file from its release folder. Each new terminal attach runs the
   bridge from `/opt/conductive/current` under the old `ttyd` command line.
   So the bridge keeps its command-line arguments compatible across
   releases.
7. **The app shows nothing new.** The runner is away for a few seconds,
   as at a short network drop.
8. **The timer** (decision 2) sets `OnUnitActiveSec=10min`.
   `install-system.sh` already runs `systemctl daemon-reload`. When the
   reload does not apply the new interval to the running timer, the
   script also restarts the timer.

9. **A failed install changes nothing and does not repeat** (found in
   the orchestrator check, 2026-11-16). When `update apply` fails and the
   store still names the running release with no pending marker, the
   runner warns and connects again. It makes no other idle install in
   that process. Reason: an exit would restart the service and stop each
   agent process, and the same failure would repeat every 2 minutes.

No wire type, stored data, or Worker API changes. An older runner never
swaps, so a rollback to it needs nothing new.

## Milestone 1: Documentation and protocol

Depends on: none

Update the requirements and the decisions in force for decisions 1, 2,
and 3.

- [x] Update [Updates](../docs/protocol/sandbox-software.md#updates): the
      check every 10 minutes, the swap at idle with its conditions, no
      guard for a release that cannot connect, and the rejected options.
      Replace "The program never restarts the software to apply an
      update" with the rule of option F.
- [x] Update [The agent runner](../docs/protocol/agent-runner.md#the-agent-runner):
      a sandbox updates its runner at a later start or when it is idle.
- [x] Update `docs/architecture/sandbox-software.md`, the
      [runner service README](../runner/service/README.md), the
      [image README](../image/README.md), and `image/install.md`.
- [x] Read both legal pages and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates
      the update rules. Evidence:
      `.context/idle-update-restart/legal-and-guides-read.md`.
- [x] Check each relative link of each changed Markdown file.

## Milestone 2: Check every 10 minutes

Depends on: 1

- [x] Set `OnUnitActiveSec=10min` in `image/conductive-update-check.timer`.
- [x] Check whether `daemon-reload` applies the new interval to a running
      timer. When it does not, restart the timer in `install-system.sh`.
      It does, so the script needs no change. Evidence:
      `.context/idle-update-restart/timer-reload-probe.txt`.
- [x] Update each test that reads the timer. No test reads it.

## Milestone 3: Install a new release at idle

Depends on: 1

- [x] Add `CommandHandler::busy`, with the idle rules of design item 2,
      in `AgentEngine` and `ReportCommandHandler`. Test each rule.
- [x] Add the release port of design item 3 in `cnd-cli`, and compose it
      into the runner. Test it with a rejected, an incomplete, and an
      unconfirmed version.
- [x] In `RunnerCore`, check every 60 seconds. When idle for 2 minutes,
      with a newer release and a confirmed running release, close the
      link, shut down, and return a swap result. Test: a swap when idle;
      no swap while busy, before 2 minutes, or without a newer release.
- [x] In `runner_command`, run `update apply` through `sudo -n`, check
      `current`, and exec the new `runner-start.sh`. When `current` did not
      change, connect again. Test the decision with fakes.
- [x] Prove design item 5 with a Worker test: a command sent to a
      connection that closes unread reaches the next connection once.
- [x] Check that the terminal bridge keeps its command-line arguments, as
      design item 6 says.
- [x] Run the Rust checks of `AGENTS.md`.

Implementation and check evidence: `.context/idle-update-restart/rust-report.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 2, 3

- [x] Run the targeted tests, the complete gate, and the Rust checks and
      release build named in `AGENTS.md`. Evidence:
      `.context/idle-update-restart/gate/`.
- [x] Commit with Conventional Commits and push the branch.
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

- [ ] After the deploy of this change and one later deploy, check that an
      idle running workspace installs the later release within about
      13 minutes, and that an agent dev server in it keeps running.
