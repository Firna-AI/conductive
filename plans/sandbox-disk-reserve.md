# Keep sandbox disks from filling up

Status: Active. On branch `calummoore/sandboxdiskfull-t6sh`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each workspace has a cloud computer, a Boat sandbox. Boat saves a snapshot
of its disk each minute. When the disk is full, each snapshot fails with
"no space left on device", and the sandbox cannot stop or restart. All work
since the last good snapshot then exists only on that disk. On 2026-11-17,
an agent's Rust builds in one sandbox grew by 9 GB in 4 minutes and filled
the disk to 95%. Boat emails the owner of the app's Boat account at 85% and
at 95%. At that rate the two emails come about 4 minutes apart. Today no
part of Conductive watches the disk.

This change adds two layers. The agent instructions tell each agent how to
keep disk use low and what it may delete. A disk watch in the runner keeps
a reserve file of 5 GiB. When the disk gets low, the watch deletes the
reserve file, so that snapshots can finish, and each running agent gets a
note after its next tool call. The change does not warn members in the app,
does not read snapshot status in the Worker, and deletes no user files.

Contract owners:

- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  with a new doc `docs/protocol/disk-space.md`.
- [Agent instructions](../docs/protocol/agent-instructions.md).
- The [cnd-runner README](../crates/cnd-runner/README.md).
- The [runner README](../runner/README.md) and the
  [image README](../image/README.md).

## Decisions

### 1. Keep sandbox disks from filling up

- **Decided:** 2026-11-18 by Cal: options A and B together.
- **Source:** Design.
- **Root question:** How do we keep every workspace's cloud computer from
  running out of disk, so that no work is lost?
- **Options:**
  - **A.** Disk rules in the agent instructions. Chosen.
  - **B.** A disk watch in the sandbox software, with a reserve file and a
    note to the running agent. Chosen.
  - **C.** Option B, plus a warning for members in the app. Not chosen.
    It needs a mockup and a new runner message.
  - **D.** The Worker reads Boat's snapshot status and warns members when
    snapshots keep failing. Not chosen now. It acts only after the disk is
    full. It is the best follow-up for causes that B misses.
  - **E.** Automatic deletion of build output below a floor. Not chosen. It
    deletes user files and can break a running build.
  - **F.** Boat's disk metrics into a new Worker route. Not chosen. It
    needs a public route, a metrics decoder, and a Boat setting.
- **Left out:** No change, because the email comes too late. A bigger
  machine, because a fast build fills it too and a full disk refuses the
  stop that a resize needs. A bigger root-only ext4 reserve, because Boat's
  snapshot service `ascii-agent.service` runs as `user`, so it cannot use
  that reserve. A Cargo default such as `CARGO_INCREMENTAL=0` for all
  builds, because it helps only Rust and changes users' builds. Removal of
  `sudo`, because package installs and Docker stop working.

### 2. The size of the reserve file

- **Decided:** 2026-11-18 by Cal: option B, 5 GB now, changed later when
  the real need is known.
- **Source:** Design.
- **Root question:** How do we learn how much free space a snapshot needs?
- **Options:**
  - **A.** Ask Boat. Not chosen.
  - **B.** Use 5 GB now and change it later. Chosen.
  - **C.** Fill the disk of a test sandbox and see when snapshots fail.
    Not chosen.

## Design

These are my design calls, dated 2026-11-18. An implementer can change a
call when the code shows a better way, and records the change here.

- **Where the watch lives:** in `cnd-runner`, on its own timer, like the
  port scans. Reason: the runner runs in every sandbox as `user`, and an
  update brings it to older sandboxes.
- **The reserve file:** `/var/cache/conductive/disk-reserve`, 5 GiB,
  allocated with `fallocate`, mode `0600`. The runner unit gets
  `CacheDirectory=conductive`, so systemd creates the folder for `user`
  at each start. Reason: Boat snapshots skip `/var/cache`, so the file
  does not make snapshots larger. After a resume the file is gone, and the
  watch makes it again.
- **Headroom:** the free space for `user` (`statvfs` `f_bavail`), minus
  5 GiB when the reserve file is missing. Reason: the watch and the note
  hooks then compute the same number without shared state.
- **Levels:**
  - Check every 5 seconds. At 37 MB/s, the rate of the incident, 5 seconds
    is about 190 MB.
  - Low: headroom under 5 GiB. Each running agent gets a note.
  - Release: free space under 2 GiB. The watch deletes the reserve file
    and writes a warning to the journal.
  - Make the reserve file again: headroom 10 GiB or more, which means
    free space of 15 GiB or more. The gap stops the file from flapping.
- **The note:** after a tool call, when headroom is low, the agent gets
  context that it cannot miss. It names the free space, says that
  snapshots fail on a full disk, and lists safe steps: `cargo clean`,
  `npm cache clean --force`, `docker system prune`, and deletion of build
  output that the agent made. It says not to delete source files, files
  that the agent did not make, or the reserve file, and to ask a member
  when unsure. Each session gets one note when low starts, and one more
  when the watch releases the reserve. A new low period starts after
  headroom is 10 GiB or more again.
- **Note delivery:** a `PostToolUse` hook for both agents. Claude uses the
  in-process hook of the Agent SDK. Codex 0.167 has `PostToolUse` command
  hooks behind the `codex_hooks` feature. The helper turns them on with
  config overrides, as it already does in `codex-settings.ts`. One Rust
  command, `conductive disk note`, computes the note for both. Milestone 4
  checks the Codex path first.
- **Agent rules:** the instructions say that the disk is shared by all
  sessions and has limited space. They say to clean build output after
  large builds, to check free space with `df -h /` before a large build,
  and to keep the reserve file.

## Milestone 1: Documentation and protocol

Depends on: none

The docs state the requirements and the decisions for the work below.

- [ ] Add `docs/protocol/disk-space.md`: the reserve file, the levels, the
      note, the agent rules, and decisions 1 and 2 of this plan in force.
      Link it from `docs/protocol/workspaces-and-sandboxes.md`.
- [ ] Add the disk guidance to "What the instructions hold" in
      `docs/protocol/agent-instructions.md`.
- [ ] Add the watch to `docs/architecture/sandbox-software.md`.
- [ ] Read both legal pages, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`, in full. Update each sentence that
      restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact. Name no Boat in these texts.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Agent disk rules

Depends on: 1

- [ ] Add the disk rules to `crates/cnd-runner/src/engine/instructions.rs`.
- [ ] Update the instruction tests of the runner and of the SDK helper.
- [ ] Run `cargo test -p cnd-runner`.

## Milestone 3: Disk watch and reserve file

Depends on: 1

- [ ] Add `CacheDirectory=conductive` to the runner unit. Check that an
      update brings the unit change to an older sandbox.
- [ ] Add a disk-space module to `cnd-runner`, behind a trait for
      `statvfs`, `fallocate`, and deletion, so that tests use a fake disk.
- [ ] Run the watch on its own timer in the runtime. A failed check or a
      failed allocation logs a warning and never stops the runner.
- [ ] Test the levels: make, keep, release, no flapping, a missing folder,
      a failed allocation, and a reserve file of the wrong size.
- [ ] Update `crates/cnd-runner/README.md`.

## Milestone 4: Notes to agents

Depends on: 3

- [ ] Spike: check that Codex 0.167 runs a `PostToolUse` command hook that
      the helper sets with config overrides, and that its
      `additionalContext` reaches the model. Save the result under
      `.context/sandbox-disk-reserve/`. When it fails, stop and give the
      user a decision for Codex sessions.
- [ ] Add `conductive disk note` to `cnd-cli`. It reads the hook input,
      computes headroom, keeps the per-session note marks under
      `/var/cache/conductive/`, and prints the hook output.
- [ ] Add the Claude `PostToolUse` hook in
      `runner/sdk-helper/src/providers/claude.ts`.
- [ ] Add the Codex hook in `runner/sdk-helper/src/providers/codex-settings.ts`.
- [ ] Test both hooks and the command. Update `runner/README.md`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the Rust checks and the complete gate named in `CLAUDE.md`.
- [ ] Smoke test in a throwaway sandbox: fill the disk with `fallocate`,
      and check the release, the note to a Claude and a Codex session, a
      snapshot that succeeds, and the new reserve file after cleanup.
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

- [ ] Ask Boat how much free space a snapshot needs, and set the reserve
      size to match.
- [ ] Consider option D of decision 1: a Worker warning when snapshots keep
      failing.
