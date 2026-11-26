# Workspace disk hold

Status: Active. On branch `calummoore/failed-message-action-kssx`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A workspace's cloud computer can fill its disk past the size that the
provider can restore. Then every resume fails, and the member loses the
workspace. On Boat, the machine has one ext4 disk of 84.2 GB, but a resume
on the `default` size accepted at most 76 GB of Boat's measure. The Boat docs
promise 51 GB for "your own files", without the operating system and the
pre-installed tools ([Sandbox sizes](https://docs.boat.dev/machines)).
Nothing enforces that limit while the computer runs. Later on 2026-11-26,
Boat's resume refused `default` above 51.2 GiB of its measure: "This Sandbox
needs 58.2 GiB of disk but the largest 'default' machine holds 51.2 GiB".
Its measure did not drop when 52 to 57 GB of build output was deleted, in
three of four sandboxes. On 2026-11-26, Rust
build output brought the Bookfolio workspace "ITSA full approval" to 79.7 GB,
and its resumes failed with `resume_failed`. The same failure happened on
2026-11-20 with 80.4 GB (commit `a8c31a53c`).

The change holds a block of the disk with the ext4 kernel setting
`reserved_clusters`. No program can write into that block, not even root.
A root unit of the sandbox software sets the hold from boot and keeps it in
place. The work then stops with "No space left on device" at Boat's
documented 51 GB of own files, and the saved disk always fits a resume. The
change deletes no file and keeps the one machine size. It does not cover
E2B, whose limit is not documented yet. It does not recover the workspaces
that are already stuck. The brainstorm reports are in `.context/disk-limit/`,
and the options check is in `.context/workspace-disk-hold/options-check.md`.

Contract owners:

- [Stop and resume](../docs/protocol/stop-and-resume.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [The org image](../docs/protocol/org-image.md), for the free storage of a
  build.
- [Sandbox software](../docs/protocol/sandbox-software.md), for the root
  unit.
- The public guide [Cloud computer](../src/marketing/docs/cloud-computer.md).
- The [CLI README](../crates/cnd-cli/README.md), the
  [runner README](../crates/cnd-runner/README.md), and the
  [lifecycle README](../worker/lifecycle/README.md).

## Decisions

### 1. A full disk blocks the resume of a workspace

- **Severity:** High. **Likelihood:** Common. **Effort:** Large.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/sandbox/boat.ts:155`, and the start of the sandbox
  software in `image/`.
- **Background:** The Worker stops an idle computer and resumes it later.
  Boat refuses a resume above its limit with HTTP 409 `resume_failed`.
- **Problem:** Nothing keeps the disk under the limit while the work runs.
- **Impact if no action:** A repository with large builds locks members out
  of their workspaces until an operator recovers them by hand.
- **Root question:** How do we keep a workspace's cloud computer able to
  resume when the work inside it fills its disk?
- **Options:** Round 1 gave A to H. Cal rejected all of them on 2026-11-26:
  "none of those are good options, can we not hold a block of space".
  - **A.** Ask Boat to enforce the limit. **B.** A guide for
    `CARGO_INCREMENTAL=0`. **C.** An agent instruction to delete build
    output. **D.** Retry a failed resume on the `large` size. **E.** A
    `.boatignore` for build output. **F.** Delete build caches before a stop.
    **G.** A disk timer that deletes build caches. **H.** A disk warning with
    a free-space control in the app.
  - **I.** Kernel hold with `reserved_clusters`, set by the runner. Effort:
    Large.
  - **J.** I, plus a chat notice before the line. Effort: Large.
  - **K.** I, plus a start step near the line, such as "The disk is almost
    full. Free build output to keep working." Effort: Medium. Added by the
    options check.
  - **L.** I, with a root unit and a timer of the sandbox software as the
    owner of the hold, from boot. Effort: Large. Added by the options check.
  - **M.** I, with the Worker's start commands as the owner of the hold.
    Nothing sets it again while the sandbox runs. Effort: Large. Added by
    the options check.
- **Left out:** A reserve file, because it counts as used disk and a forced
  stop skips its delete. A larger ext4 root reserve, because Docker and
  `sudo` writes pass it. A user quota, because root and the Docker daemon
  ignore it. A fixed volume for build output, because other files still fill
  the disk. A runner line that stops agent commands without a kernel hold,
  because the kernel holds the line exactly and also stops Docker. It is the
  fallback if Milestone 1 shows that Boat counts the hold.
- **Decision:** **I**, from Cal on 2026-11-26: "1=I but use described boat
  limit". So the line is Boat's documented 51 GB of own files, not the
  observed 76 GB budget. The options check kept I. Its option L only moves
  the owner of the same hold, so design call 4 adopts it inside I.

### 6. Do image builds get the hold too?

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/lifecycle/image-storage.ts:24`.
- **Background:** An admin builds the org image, the starting disk of new
  workspaces. Each good build shows its free storage, such as "31.2 GB free
  of 50.1 GB". A build sandbox starts no runner.
- **Problem:** An image can use most of the room under the line. Each new
  workspace then starts close to the line or above it.
- **Impact if no action:** The build card shows free storage that new
  workspaces cannot use.
- **Root question:** How does each new workspace keep room for its work
  under the line, and how does the admin see that room? The options check
  wrote this root question.
- **Options:**
  - **A.** Workspaces only. The build card shows the free storage under the
    line. Effort: Small.
  - **B.** Builds hold the line too. A build above the line fails. Effort:
    Medium.
  - **C.** No hold in builds. Just before the save, a build above the line
    fails with a clear message, such as "The image uses 54 GB of the 51 GB
    limit of a cloud computer". Effort: Medium. Added by the options check.
- **Left out:** Change nothing, because the card must show the space that
  the user can write, as `docs/protocol/org-image.md` says.
- **Wider fix:** None.
- **Previous examples:** PR #692 added the free storage of a build.
- **Related:** Decision 1. A needs design call 6 for an image above the line.
- **Recommendation:** A. It adds no build error, and the card shows the room
  that the work really gets. If Cal wants a build error, C is better than B.
- **Decision:** **A**, from Cal on 2026-11-26: "6 = A". Builds get no hold,
  and the build card shows the free storage under the line.

## Design

My calls, all on 2026-11-26:

1. **The hold.** Write `/sys/fs/ext4/<device>/reserved_clusters` for the
   ext4 disk of `/`. Clamp the value to the free space. Reason: it holds
   against every program, root too, writes nothing to the device, and resets
   at each mount.
2. **The line.** The line is a whole-disk "Used" figure for root writes: the
   usage of the provider's base image plus 51 GB. `user` writes stop 3.47 GB
   earlier, at the ext4 root reserve. Milestone 1 measures the base usage.
   The line stays at least 4 GB under the budget. Otherwise it becomes the
   budget minus 4 GB. Reason: Boat counts own files without its base image,
   and the budget changes with the free machines.
3. **Who knows the line.** The Worker keeps the line of each provider
   account and sends it as the sandbox variable `CONDUCTIVE_DISK_LINE_BYTES`.
   A provider without a documented limit, such as E2B today, sends none.
   The Worker drops that name from the org env vars. Reason: the Worker
   chooses the provider, and older software ignores an unknown variable.
4. **The owner.** A root oneshot unit and a timer of the sandbox software,
   beside `conductive-update-check.timer`, run `conductive disk hold` from
   boot and every 5 minutes. The command reads the line from
   `/run/ascii-secrets/env.sh`, because `sudo` resets the environment.
   Reason: the hold then also covers the org's startup script, Docker, and a
   restarted runner. This is option L of decision 1.
5. **The restore.** Until the restore marker
   `/run/conductive-terminal/restore-ended` exists, the command sets a
   restore-safe hold. That hold lets every disk that Boat accepted come back.
   Then it applies the line. The Worker's start command sets the
   restore-safe hold first, because a resume onto the same machine keeps the
   old hold. Reason: the hold must never block a restore or a start.
6. **A disk above the line.** The first hold of a disk above the line uses
   its used size plus 2 GB as its line. The command saves that line on the
   disk, in `/var/lib/conductive/disk-line`. The saved line only moves down,
   to the normal line. Reason: workspaces that work today keep working, and
   a new machine does not grant 2 GB again.
7. **The runner's own saves.** The runner keeps a 256 MB file of its own. On
   "No space left on device" in a state save, it deletes the file, saves,
   and makes the file again when space returns. This is a best effort.
   Reason: the hold also stops root, and the chat must keep its events.
8. **Failures.** A failed hold never blocks a start. The command logs it,
   and the timer tries again. Reason: warn and continue.
9. **The agent line.** Only when a line is set, the agent instructions say
   that the cloud computer keeps its own files under 51 GB, that writes fail
   at that line, and that the agent frees build output, such as Rust
   `target/`, and never changes the hold. Reason: agents meet the line as a
   build error.

## Milestone 1: Documentation and protocol

Depends on: none

Confirm the facts on a throwaway Boat sandbox, then state the requirement in
the protocol docs and the public guide.

- [ ] On a throwaway Boat `default` sandbox, confirm each fact. Save the
      evidence in `.context/workspace-disk-hold/`.
  - [ ] The base usage of a new sandbox, and the line that follows.
  - [ ] A write to `reserved_clusters` stops `user` writes and root writes
        at once. Fill the disk to the root line too.
  - [ ] A resume on a new machine resets the setting. A resume onto the
        same machine keeps it.
  - [ ] A disk near the line still restores with the restore-safe hold.
  - [ ] At the line, snapshots, stops, and resumes still work.
  - [ ] Boat's "needs X GiB" figure, its 85 % email, and its low-space
        cleanup ignore the hold.
  - [ ] How Boat's "needs X GiB" figure relates to the used disk, and when
        it drops after a delete. The hold must keep that figure under the
        limit, not only the used disk.
  - [ ] An agent turn at the line: what the agent and the chat do.
- [ ] Update the design above for each fact that differs.
- [ ] `docs/protocol/stop-and-resume.md`: a section on the disk line, with
      decision 1.
- [ ] `docs/protocol/agent-instructions.md`: the disk line of the
      instructions.
- [ ] `docs/protocol/sandbox-software.md`: the root unit of the hold.
- [ ] `src/marketing/docs/cloud-computer.md`: the 51 GB limit of a cloud
      computer, without a provider name, in words that are true on both
      providers.
- [ ] Read both legal pages in full, and update each sentence that restates
      the disk facts.

## Milestone 2: The Worker sends the line

Depends on: 1

- [ ] Keep the line of each provider account in `worker/sandbox/accounts.ts`.
      Boat gets the line from Milestone 1. E2B gets none.
- [ ] Add `CONDUCTIVE_DISK_LINE_BYTES` in
      `worker/lifecycle/sandbox-environment.ts`, and drop that name from the
      org env vars.
- [ ] Set the restore-safe hold first in the start command of
      `worker/lifecycle/image-software.ts`.
- [ ] Tests in the Worker suite for both providers.
- [ ] Update the lifecycle README.

## Milestone 3: The root command

Depends on: 1

- [ ] Add `conductive disk hold` to `crates/cnd-cli/`. It reads the line,
      finds the ext4 device of `/`, computes the hold, clamps it, and writes
      it.
- [ ] Add the restore-safe hold and the saved line of design calls 5 and 6.
- [ ] Unit tests with a fake disk figure, a fake settings file, and a fake
      restore marker.
- [ ] Update the CLI README.

## Milestone 4: The root unit and the runner

Depends on: 3

- [ ] Add the oneshot unit and the timer in `image/`, and install them in
      `image/install-system.sh`.
- [ ] Add the runner's reserve file for state saves, as design call 7 says.
- [ ] Add the agent line in `crates/cnd-runner/src/engine/instructions.rs`,
      only when a line is set.
- [ ] Tests for the reserve file and the instructions.
- [ ] Update the runner README.

## Milestone 5: Image builds

Depends on: 2

- [ ] In `worker/lifecycle/image-storage.ts`, show the free storage under
      the line, as decision 6 says. Measure the disk of `/`, because a build
      does not wait for its restore. A build gets no hold.
- [ ] Update `docs/protocol/org-image.md` and the guide sentence on free
      storage.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm run check` and the Rust checks of `CLAUDE.md`.
- [ ] Build the release `conductive`, and run the hold on a throwaway Boat
      sandbox. Fill the disk to the line, then check a stop and a resume.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record follow-up
      items under `plans/follow-ups/` for the rest, re-review once, and
      report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy and a sandbox software release, start a workspace on
      Boat. Check that `reserved_clusters` holds the line.
- [ ] Find E2B's restore limit, then decide its line.
