# Show the free storage after a build

Status: Active. On branch `calummoore/check-remaining-storage-9qb7`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

After a build of the org image, no screen tells an admin how much disk is
left for each new workspace. The install script and the repositories can
fill the disk, and the admin then learns it only when a build or a
workspace fails. Cal asked on 25 November 2026: "build computer should
show you how much storage is left on the device after your build the
cloud image".

This plan names its decisions "storage decision N".

## Storage decision 1: where the free storage shows

Cal chose B on 26 November 2026, with the words "1 = B".

- **A.** A log line with the free space, and a control that opens the log
  of a good build. No migration, but the number shows only in the log.
- **B (chosen).** The build measures the free space just before it saves
  the image. The Worker stores the free bytes and the total bytes with the
  build. The build card shows them beside the result and in each history
  row.
- **C.** B with a list of the size of each repository folder. It adds time
  to each build and a new list, and it answers a question that the user
  did not ask.

Left out in the brainstorm: change nothing, a log line only, a line in the
org's own install script, a live number in each workspace, a check on
request from the tab, a provider metrics route, a build failure at low
space, a fixed size in the base image list, and a larger disk. The
reasons are in the pull request description.

## Design calls

These are my calls, made on 26 November 2026 under the decision test.

1. Measure in the save step that builds and refreshes share. Show the
   number only for builds, because the card lists no refresh
   ([org image](../docs/protocol/org-image.md#the-repository-notice)).
2. Members see the number on their read-only card too. The number holds no
   secret, and only the actions are limited to admins (decision 57).
3. No low-space warning. The task asks only to show the number.
4. Measure the file system of the home folder, `/home/user`, which holds
   the repositories under `~/code`.
5. Show the space that a normal user can write: the "Avail" column of
   `df`. The agents and terminals run as `user`, not as root.
6. Show decimal GB with one decimal place, free and total, such as
   "31.2 GB free of 50.1 GB". The text says nothing of the provider.
7. A failed build shows no number. A failed build does not replace the
   image.
8. When the measurement fails, the Worker records a warning, the build
   continues, and the build stores no number. Reason: graceful handling.
9. The Worker returns the number only for a build that ran in the current
   provider account of the org. Reason: after an operator moves the org,
   older builds measured another disk.
10. A build without a number, such as a build from before this change,
    shows no storage text.
11. The number shows for the newest good build on the card head and in
    each good history row. The rows show how disk use grows, because each
    build starts from the previous image.

Contract owners:

- [Org image](../docs/protocol/org-image.md).
- The [Worker lifecycle docs](../worker/lifecycle/image-builds.md).
- The [members README](../src/members/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The admin build card and the member build card show the free storage of
a good build.

- [x] Add the free storage to the build result of a good build in
      `docs/mockups/src/components/settings/BuildHistory.tsx` and the card
      head in `BuildSection.tsx`, with fixture values.
- [x] Show the same text on the member card mockups.
- [x] Run `npm run mockups:check`. Smoke-test the changed entries.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. On a phone, the free storage of a history row wraps
      under its time, so each row got a small padding.

## Milestone 2: Documentation and protocol

Depends on: 1

- [x] State the requirement in `docs/protocol/org-image.md`: the build
      list gives each good build its free storage, with storage decision 1
      and the design calls that are requirements.
- [x] Update the guide `src/marketing/docs/cloud-computer.md`.
- [x] Read the Terms and Privacy pages in full. Change a sentence only when
      it restates the changed fact.

## Milestone 3: Measure and store the free storage

Depends on: 2

- [x] Add a migration with two nullable `image_builds` columns for the
      total bytes and the free bytes. Reserve its range in
      `migrations/README.md`, and describe it there.
- [x] Measure with `df` in the save step, before the snapshot, only while
      the build has no snapshot name. Store both numbers. On a failure,
      record a warning and continue.
- [x] Return `storageTotalBytes` and `storageFreeBytes` from the build
      list and the build snapshot queries, only for a good build of the
      current provider account. Add them to `ImageBuild` and its reader as
      nullable fields that an older Worker can leave out.
- [x] Add Worker tests: a stored number, a failed measurement, and a
      build of another provider account. The refresh test checks that a
      refresh runs the measurement too.
- [x] Update `worker/lifecycle/image-builds.md`.

## Milestone 4: Show the free storage

Tags: ui

Depends on: 1, 3

- [x] Show the free storage on the admin card in
      `src/shell/settings/BuildParts.tsx` and `BuildCard.tsx`.
- [x] Show it on the member card in `src/members/BuildCard.tsx`.
- [x] Add values to the dev fakes, and add tests for the text.
- [x] Check both cards in a browser and save a screenshot under
      `.context/build-free-storage/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run the targeted tests and the complete gate named in `CLAUDE.md`.
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

- [ ] After the deploy, build an org image on each provider and check the
      number against `df -h ~` in a new workspace.
