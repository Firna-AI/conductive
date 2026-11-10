# Later builds from the software image

Status: Active. On branch `conductor/later-builds-from-software-image`, no
pull request yet. The pull request that completes the work deletes this
plan, as the `plans` skill says.

Each org has one org image, the saved snapshot that every new cloud
computer of the org starts from. A build makes a new org image, and a
refresh fetches new commits into it. The software image is one saved
snapshot of the base image and the app's own software for each app software
version. It holds no org data. Since PR #180, squash `4249b33d`, a first
build pins the ready software image of its version and starts from it.

A later build is a build of an org that already has an org image. It still
starts from the last org image and moves the repository folders of that
image. It installs the app's own software again, and its install script
runs on top of the output of each earlier script. So each later build waits
for the software step, and old files stay in each new org image.

This change makes each build start as a first build does. Each build pins
the ready software image of its app software version, starts from it, and
copies every repository into a new folder. Without one, it starts from the
base image, as design item 2 says. A refresh keeps its steps.

The user asked for this change on 10 November 2026, and for its
implementation through a pull request. The change takes decisions 4 and 9
of `plans/software-image.md` on branch `calummoore/build-image-install-order`,
the larger plan of workspace #413, with their numbers. It also takes the
later-build half of design item 9 of that plan. This plan adds no decision.

Not covered. The larger plan keeps these parts:

- Refreshes and the daily refresh: decision 7 E and open decision 12.
- Old workspaces and the notice of an old setup: decisions 8 B and 11 C.
- The copy of a missing repository at a first workspace start: 10 D.
- The skip of an empty install script, and the records of design item 10.
- The label of the software step: open decision 1.
- How soon a member can use an added repository: open decision 13. With
  decision 9, that build copies every repository and runs the whole install
  script. This plan does not decide 13.

The software image build, the deploy, and the workspace starts keep their
behaviour.

Parallel work: branch `calummoore/new-repo-build-recreation` changes
`docs/protocol/org-image.md`, `worker/lifecycle/image-builds.md`,
`build-admission-data.ts`, `build-data.ts`, `creation-claims.ts`, and
`published-image-data.ts`. Another workspace plans changes in
`worker/lifecycle/image-sources/`. This change edits no other branch and no
file in `worker/lifecycle/image-sources/`. The parallel branch also touches
`docs/architecture.md`, the lifecycle README, the terminal fixture, and the
public cloud computer guide.

Contract owners:

- [Org image](../docs/protocol/org-image.md),
  [Repository folders](../docs/protocol/repository-folders.md), and
  [GitHub tokens](../docs/protocol/github-tokens.md).
- The terms of the [architecture doc](../docs/architecture.md#terms).
- The [lifecycle README](../worker/lifecycle/README.md), with
  [Image builds](../worker/lifecycle/image-builds.md) and
  [Repository layout](../worker/lifecycle/repository-layout.md).
- The [sandbox software README](../image/README.md) and the
  [software image README](../worker/software-image/README.md).

Replaced ways:

- A build starts from the last org image → each build starts from its
  pinned software image, or from the base image without one. Moved in
  Milestones 2 and 3. Deleted in Milestone 3. Consumers: `buildSandboxIntent`
  in `worker/lifecycle/resource-intents.ts`, the version check of
  `startImageBuild` in `worker/lifecycle/image-builds.ts`, and the tests,
  docs, and follow-up items that Milestones 2 and 3 name.
- A build records the folder map of the last org image as its previous map
  → a build records an empty previous map. Moved in Milestones 2 and 3.
  Consumers: `startImageBuild`, `docs/protocol/repository-folders.md`, and
  `worker/lifecycle/repository-layout.md`.

## Design

Each item marked "my call" is a design call of the planning agent, made on
10 November 2026. "From #413" repeats design item 9 of the larger plan.
"From #513" repeats a call of `plans/first-build-software-image.md`, the
plan of PR #180.

1. **Pin.** Each build computes its app software version at admission. The
   job insert pins the ready software image of that version in the same D1
   statement, as a first build does today. A refresh pins none. From #513:
   the pin holds until the job reaches `done`, so the software image
   cleanup keeps the image.
2. **Start of a build.** From #413: each build starts from the ready
   software image of its app software version. It copies each chosen
   repository fresh, runs the install script, and saves the org image.
   Without such a software image, it starts from the base image and runs
   the software step after the copy. A missing software image slows a build
   and never fails it. Decisions 4 and 9 chose this start.
3. **Refresh and recovery.** A refresh starts from the last org image of
   its provider account, as today. My call: the start image follows only
   the job kind and the image names that admission recorded. So each replay
   of a lost sandbox create sends the same request. The change keeps the
   allocation recovery, the cleanup, and the publication of a build as they
   are. A failed build keeps the last good image.
4. **The replaced org image.** My call: a build still records the org image
   that it replaces, in `image_build_jobs.previous_image_name`. The cleanup
   after a good build deletes that snapshot, as today. A build that
   replaces no org image is a first good build. The added-build rules also
   read the column. Only the start stops reading it, because cleanup and
   automatic build scheduling keep their behaviour.
5. **New folders.** My call: a build records an empty previous folder map,
   so the source loader moves no folder. Each repository goes into a folder
   that does not exist yet. A refresh records the map of its image as both
   maps, as today. The source loader and the column
   `image_build_jobs.previous_repository_locations_json` stay as they are.
   Reason: a clean machine holds no folder of an earlier image.
6. **Docs.** My call, from #513: the protocol docs give decisions 4 and 9
   with their choices and rejected options, but without their numbers.
   Older decisions already use those numbers. My call: keep docs edits
   focused on changed build facts. A split of existing long docs exceeds
   this task's small scope.

## Decisions

The records below copy decisions 4 and 9 of the larger plan, with their
numbers, option letters, and reasons. Do not reopen them. The options check
confirmed both on 10 November 2026. Evidence: `.context/later-build-software-image/reports/plan-options-check.md`.

### 4. Later build: app software installs again

- **Chosen:** C, by the user on 10 November 2026, in the design message
  "Later build = saved snapshot (global base image) -> user repos -> user
  scripts". The recommendations were A, then D, then C.
- **Options:** **A.** A file check in the software step. **B.** Keep later
  builds as they are. **C.** Start each later build from the software
  image. **D.** The Worker records the app software version of each org
  image, and a later build skips the software step when it is current.
- **Reason:** with C, no later build reinstalls the app software, and the
  install script always runs on a clean machine (decision 9).

### 9. Later build: the install script runs again on top

- **Chosen:** B, by the user on 10 November 2026, in the same design
  message as decision 4. The recommendation was B.
- **Options:** **A.** Keep later builds on the last org image, and say that
  the script must be safe to run more than once. **B.** Start each later
  build from the software image. **C.** As A, with a variable for the kind
  of build. **D.** As A, with a "Clean build" choice.
- **Reason:** a script that always runs on a clean machine gives the same
  image each time, and nothing old stays.

## Milestone 1: Mockups, completed

Tags: mockup

Depends on: none

On the Cloud computer tab, `buildLog` in `docs/mockups/src/fixtures/terminal.ts`
already shows a later build with no software step.

- [x] Check `buildLog`, `failedBuildLog`, `timedOutBuildLog`, and their
      comments. Change a fixture only when it is wrong for a later build
      from the software image. Run `npm run mockups:check`, and smoke-test
      each changed page. Branch: `conductor/later-builds-from-software-image`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. None found. Evidence: `.context/later-build-software-image/mockups.log`. Branch: `conductor/later-builds-from-software-image`.

## Milestone 2: Documentation and protocol, completed

Depends on: 1

The docs change each sentence that states a build step, and that this
change makes false. The docs of the software image build and of the deploy
keep their words. When another file must change, stop and report it to the
orchestrator.

- [x] Merge `origin/main` with the `git-merge` skill. Branch: `conductor/later-builds-from-software-image`.
- [x] Update the protocol docs and the terms. In `docs/protocol/org-image.md`,
      state the start of each build, its fallback to the base image, and the
      start of a refresh. Give decisions 4 and 9 as design item 6 says. In
      `docs/protocol/repository-folders.md`, state that a build copies each
      repository into a new folder, and that no file of an earlier image
      stays. In `docs/protocol/github-tokens.md`, limit the clone token risk
      to a refresh. In `docs/architecture.md`, change the start of a build in
      the terms "Build" and "Software image". Branch: `conductor/later-builds-from-software-image`.
- [x] Update the area docs: `image/install.md`, `image/README.md`,
      `image/runtime.md`, `worker/software-image/README.md`,
      `worker/lifecycle/README.md`, `worker/lifecycle/image-builds.md`, and
      `worker/lifecycle/repository-layout.md`. In each, change each sentence
      about the start of a build, its software step, its clone token risk, or
      its folders. This covers "So a later build reuses the release from the
      last org image." in `image/runtime.md`. Branch: `conductor/later-builds-from-software-image`.
- [x] Read the Terms page in `src/marketing/terms.ts`, the Privacy page in
      `src/marketing/privacy.ts`, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact. Change the status of a row in
      `src/marketing/from-conductor/` only when this change ships, starts, or
      drops its feature. Branch: `conductor/later-builds-from-software-image`.
- [x] Update the five follow-up items below, which restate the old start.
      Do not change the other branch. Branch: `conductor/later-builds-from-software-image`.
  - `plans/follow-ups/software-image-plan-rebase.md`: this change does the
    later-build half of Milestone 7 of the larger plan, with decisions 4 C
    and 9 B. The rebase drops that half.
  - `plans/follow-ups/org-image-clean-builds.md`: the build half of option
    E is done. The item stays open for refreshes.
  - `plans/follow-ups/image-download-retries.md`: a later build runs the
    software step only without a ready software image of its version.
  - `plans/follow-ups/full-image-build-for-agent-tools.md`: each build
    after a deploy gets the tools from the software image, or installs them.
  - `plans/follow-ups/software-image-cleanup-keeps-running-version.md`: a
    missing software image now slows every build, also a later build.
- [x] Check each relative link of the changed docs. Branch: `conductor/later-builds-from-software-image`.

## Milestone 3: Builds from the software image, completed

Depends on: 2

The code changes only the build admission and the build start in
`worker/lifecycle/`, and their tests. The pin statement of `insertBuild`
and the step order of `advanceBuildStep` need no change. When another file
must change, stop and report it to the orchestrator.

- [x] Merge `origin/main` with the `git-merge` skill. Branch: `conductor/later-builds-from-software-image`.
- [x] Apply design items 1 to 5. In `startImageBuild` in
      `worker/lifecycle/image-builds.ts`, compute the app software version
      for every build, and record an empty previous folder map for a build.
      In `buildSandboxIntent` in `worker/lifecycle/resource-intents.ts`,
      start a build from its pin or the base image, and a refresh as today.
      Delete the build start from `previousImageName`. Branch: `conductor/later-builds-from-software-image`.
- [x] Update the tests. Write each new or changed case first, and see it
      fail on an assertion. Keep each assertion that this change does not
      make false. Branch: `conductor/later-builds-from-software-image`.
  - Ready image: replace the `build` case of
    `keeps a later %s on its org image` in
    `worker/lifecycle/software-image-start.test.ts`. A later build with a
    ready software image of its version pins it and starts from it. It runs
    only the install script, and logs no software step.
  - Fallback: add later-build cases to
    `keeps the full first-build install with a %s software image`. A later
    build with no ready software image, or with one of another version,
    starts from the base image and runs the software step.
  - Clean folders: in
    `keeps the captured image folder map at resume and retention after a later build adds name collisions`
    in `worker/lifecycle/repository-capture.test.ts`, check that the later
    build gives the source loader an empty previous map.
  - Kept: the first-build cases keep their assertions. The `refresh` case
    still starts from the last org image, with no pin.
  - Allocation recovery: in
    `recovers scheduling and allocation replies while streaming a successful image build`
    in `worker/lifecycle/image-builds.test.ts`, expect the base image in
    place of `last-good-image`. Keep the check that a replay sends the same
    request.
  - The tests of the added build and the cleanup stay. Add a case there
    only when the code changes that behaviour.
- [x] For the pull request description, name each changed test and its
      changed behaviour. Give each removed test its reason, its covering
      test, and its proof file under `.context/later-build-software-image/`,
      as the removal rule of the `testing` skill says. Branch: `conductor/later-builds-from-software-image`.
- [x] Check the docs of Milestone 2 against the final code. Fix each
      sentence that the code makes wrong. Branch: `conductor/later-builds-from-software-image`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [x] Merge `origin/main` with the `git-merge` skill. Branch: `conductor/later-builds-from-software-image`.
- [x] Run `npm run test --` with the affected test files in
      `worker/lifecycle/`: `software-image-start.test.ts`,
      `image-builds.test.ts`, `repository-capture.test.ts`,
      `repository-layout.test.ts`, `first-image-build.test.ts`,
      `resource-intents.test.ts`, and `image-allocation-cleanup.test.ts`.
      Run each new asynchronous test 10 times. Run `npm run format:check`,
      `npm run lint`, and `npm run file-length:check`. Run
      `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      complete gate, `npm run check`. Save the evidence and the gate log
      under `.context/later-build-software-image/`: `gate.log` and `reports/code.md`.
      Branch: `conductor/later-builds-from-software-image`.
- [x] Commit with Conventional Commits, and push. Branch: `conductor/later-builds-from-software-image`.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push, with its finding
      checks. Report the findings, then apply the fix rule: fix the
      `fix now` findings, record follow-up items under `plans/follow-ups/`
      for the rest, re-review once, and report. No in-scope findings at `4a56af87`. Evidence: `.context/reviews/conductor/later-builds-from-software-image/round-1-review.md`. Branch: `conductor/later-builds-from-software-image`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan". First turn the post-merge task into a new follow-up item of its
      own, with the times of 10 November 2026. Branch: `conductor/later-builds-from-software-image`.
- [ ] Open the pull request. Its description gives decisions 4 and 9 and
      the design calls with their dates, and a permalink to this plan before
      its deletion. It gives each changed or removed test with its proof and
      run time. It gives the times of 10 November 2026, and each added or
      updated follow-up item. Branch: `conductor/later-builds-from-software-image`.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy, start a later build of a test org whose software
      image of the deployed version is ready. Watch its log on the Cloud
      computer tab, and check that it shows no software step. Compare the
      time of each step with the times measured for Firna on 10 November
      2026, before this change. The software step took 18 to 29 s, and the
      repository copy took 34 to 124 s, which grows with the number of
      repositories. The sandbox start, the install script, and the save
      took about 20 s together. These times are observations, not a promise. Branch: `conductor/later-builds-from-software-image`.
