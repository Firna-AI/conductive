# Clean image jobs and app updates

Status: Active. On branch `calummoore/build-image-install-order`, no pull
request yet. The pull request that completes the work deletes this plan,
as the `plans` skill says.

The moments in this plan are the terms of the
[architecture doc](../docs/architecture.md#terms): first build, later
build, refresh, deploy run, first workspace start, and later workspace
start.

What `main` already holds:

- PR #180 shipped the software image of first builds. Each deploy run asks
  the Worker to build one software image for its app software version. A
  first build pins the ready image of its version, starts from it, copies
  the repositories, and runs the install script. The rules are in "The
  software image" of [Org image](../docs/protocol/org-image.md). The code
  is in `worker/software-image/`.
- PR #188 shipped the builds for added repositories: an added repository
  starts a later build, and New workspace shows a waiting repository as
  off.

This plan adds the rest of the user's design. Each later build and each
refresh starts from the software image too, so every image job runs the
install script on a clean machine. An old workspace gets the current app
software at its workspace start, and it shows a notice when the org setup
changed. Each image job copies its repositories in parallel, within the
memory of the build sandbox. Our software gets one clear name in the build
log and the start steps.

Not covered: the copy of a repository that the org image lacks, at the
first workspace start. The user moved that question to workspace #578.

Contract owners:

- [Org image](../docs/protocol/org-image.md) and
  [Repository folders](../docs/protocol/repository-folders.md).
- [Workspace life](../docs/protocol/workspace-life.md) and
  [Agent runner](../docs/protocol/agent-runner.md).
- [GitHub tokens](../docs/protocol/github-tokens.md).
- The [lifecycle README](../worker/lifecycle/README.md), the
  [software image README](../worker/software-image/README.md), and the
  [sandbox software README](../image/README.md).

Replaced ways:

- A later build and a refresh start from the last org image → they start
  from the software image. Consumers: the build admission in
  `worker/lifecycle/build-admission-data.ts` and
  `worker/lifecycle/image-builds.ts`, `buildSandboxIntent` in
  `worker/lifecycle/resource-intents.ts`, the rule in "The software image"
  of `docs/protocol/org-image.md`, the risk text in
  `docs/protocol/github-tokens.md`, the terms "Build" and "Refresh" in
  `docs/architecture.md`, `worker/lifecycle/README.md`, and
  `image/install.md`. Moved in Milestones 4 and 5. The start from the last
  org image is deleted in Milestone 5.
- A refresh that runs no install script and hides from the Cloud computer
  tab → a refresh that runs the install script and shows on the tab.
  Consumers: the refresh path in `worker/lifecycle/image-build-steps.ts`,
  `latestBuild` in `src/app/org-model.ts`, and the refresh rules in
  `docs/protocol/org-image.md`. Moved in Milestones 5 and 9.
- The source loader that handles one repository at a time → a loader that
  runs the copies in parallel. Consumers:
  `worker/lifecycle/image-sources/materialize.ts`,
  `worker/lifecycle/image-sources/source-data.ts` and its table
  `image_source_jobs`, `worker/lifecycle/image-sources/cleanup.ts`, and
  `worker/lifecycle/repository-layout.md`. Moved in Milestone 6.

## Design

Each item marked "my call" is a design call of the planning agent, made on
10 November 2026, unless it names another date.

1. **Clean later builds.** A later build pins the ready software image of
   its app software version, as a first build does. It starts from that
   image, copies each repository fresh, skips the software step, and runs
   the install script (decisions 4 C and 9 B). Without a ready software
   image, it starts from the base image and runs the software step after
   the copy, as a first build does today.
2. **Clean refreshes.** Each refresh, after a push and daily, is a clean
   build in the same way (decisions 7 D and 12 G). It runs the install
   script and the repositories of the newest good build, so a saved change
   still waits for Build computer, and an added repository still starts
   its own build. The limit of one refresh after a push in 30 minutes
   stays. A failed refresh keeps the last good image, as a failed build
   does. The Cloud computer tab shows each refresh with its log.
3. **Empty install script.** A build or a refresh skips the install step
   when the install script is empty, and its build log shows no install
   step. The user's design of 10 November 2026: "user scripts (if they
   exist)".
4. **Records.** Each org image records its app software version: the
   version of its software image, or the version of the software step that
   it ran. Each workspace records its app software version and the org
   image that it started from. My call: the update of an old workspace
   and the notice of an old org setup compare these records, so neither
   reads files in the sandbox.
5. **Update of an old workspace.** At a workspace start, when the
   workspace's app software version is older than the current one, the
   start runs the software step on the workspace's disk before the runner
   starts, and records the new version (decision 8 B). The start shows it
   as its own start step, with the name of decision 1. When the update
   fails, the start goes on with the old app software and warns, because
   the Worker still serves older runner protocol versions. My call of 9
   November 2026: this holds at the first workspace start too, because the
   reason of decision 8 is that every workspace gets the fixes.
6. **Old org setup.** When the org image of a workspace is older than the
   current org image, the workspace shows a notice. Its action runs the
   install script of the current org image in the workspace, when the user
   chooses (decision 11 C). My call: the action runs from the folder of the
   workspace's repository, with the env vars of the workspace, and shows
   its output.
7. **Parallel copies.** The source loader keeps one source record for each
   repository. Each copy gets its own token and one-use grant, and the
   Worker revokes each token as soon as its copy ends. My call: the
   finalize commands start only after GitHub confirms the revocation of
   every token, so that no checkout runs while any token lives. A failed
   copy fails the job, and the cleanup revokes each token that still
   lives. My call: a definite refusal of a source command start, such as
   HTTP 429, waits and retries within the provider retry window, because
   no command runs. A start with no confirmed reply still fails closed.
8. **Memory budget.** Decision 14 F, with the user's addition: the size
   that GitHub reports, and the memory that the build sandbox has free.
   My calls, to tune after the first measurement:
   - At the start of the copy phase, the loader reads `MemAvailable` from
     `/proc/meminfo` in the build sandbox. The budget is half of it.
   - The estimate of one Git command is twice the GitHub size of its
     repository, and at least 256 MiB. A copy and a finalize command of
     the same repository have the same estimate.
   - A Git command starts only while the estimates of the running commands
     and its own estimate stay within the budget. A repository whose
     estimate passes the budget runs alone. At most 8 Git commands run at
     once, so that the polls stay within the provider's request limit.
   - At the start of each image job, the Worker reads the size of each
     repository from GitHub with one installation token that can read only
     the metadata of those repositories. It revokes that token before the
     first copy starts. A repository with no size gets the least estimate.
9. **One name for our software.** Decision 1 E. One name in the Worker
   names our software in the build log and in the start step, such as
   "Installing the agent and terminal software" and "Updating the agent
   and terminal software". The mockup milestone sets the final words.
10. **Docs.** My call: the new requirements go into the sections of the
    protocol docs that already hold the rules of each moment. Each long
    doc gets only the lines that must change, because
    `plans/follow-ups/protocol-docs-split.md` owns the split of the long
    docs.

PR #180 made two design calls that differ from the earlier text of this
plan. Deploy requests and the 15-minute Cron Trigger move a software image
build on, with no coordinator object. The deploy route tells an older
Worker version apart by the token digest, not by the version tag. This plan
keeps both.

## Decisions

The options check of the `implementation-review` skill ran over decisions
4, 5, and 6 on 9 November 2026, over decisions 1, 12, and 13 on 10
November 2026, and over decision 14 on 10 November 2026. Its reports are
in `.context/software-image/`. Each decision below has the user's answer.

### 1. First and later builds: confusing software step label

- **Chosen:** E, by the user on 10 November 2026. The first recommendation
  was A.
- **Options:** **A.** Change the build log label. **B.** Add a sentence to
  the Install software description. **C.** Show each build step as a named
  row. **D.** Rename the section to "Install script". **E.** As A, and give
  the start step of an old workspace the same name.
- **Reason:** members see the start step at many workspace starts, so one
  name must cover both places.

### 2. A software image for first builds

- **Chosen:** B, by the user on 9 November 2026. Shipped in PR #180.
- **Options:** **A.** Skip the parts that the org image already holds.
  **B.** A software image for each app software version. **C.** Install
  the app software at each workspace start.
- **Reason:** B makes the first build of each org fast.

### 3. Build the software image in the deploy run

- **Chosen:** C, by the user on 9 November 2026. Shipped in PR #180.
- **Options:** **A.** The Worker's cron job builds it. **B.** The first org
  build after a release builds it. **C.** The deploy run asks the Worker
  and waits.
- **Reason:** the deploy run shows the result.

### 4. Later build: app software installs again

- **Chosen:** C, by the user on 10 November 2026, in the design message
  "Later build = saved snapshot (global base image) -> user repos -> user
  scripts".
- **Options:** **A.** A file check in the software step. **B.** Keep later
  builds. **C.** Start each later build from the software image. **D.**
  Skip the software step by a recorded version.
- **Reason:** no later build reinstalls the app software (design item 1).

### 5. Deploy run: when the software image build fails

- **Chosen:** F, by the user on 10 November 2026, in the workspace of PR
  #180: the deploy run fails unless its software image is ready when the
  wait ends. Shipped in PR #180.

### 6. Deploy run: how the Worker trusts its request

- **Chosen:** D, a token for each deploy run, by the user on 10 November
  2026. Shipped in PR #180.

### 7. Refresh: org images keep old app software

- **Chosen:** D, each refresh is a clean build, by the user on 10 November
  2026, through decision 12 G. The user first chose E, a clean daily
  refresh with the refresh after a push as today.
- **Options:** **A.** Each refresh runs the software step when the image
  is old. **B.** Update scripts for each release. **C.** A later build for
  each old org after a release. **D.** Each refresh is a clean build.
  **E.** A clean daily refresh, and the refresh after a push as today.
- **Reason:** see decision 12.

### 8. Workspace start: old workspaces keep old app software

- **Chosen:** B, with two guards, by the user on 10 November 2026.
- **Options:** **A.** No update. **B.** Update at the workspace start when
  the version is old. **C.** Update only when the Worker no longer serves
  the runner's protocol version. **D.** Download in the background, and
  switch at the next workspace start.
- **Reason:** every workspace gets the fixes, for one slower start after
  each release (design item 5).

### 9. Later build: the install script runs again on top

- **Chosen:** B, by the user on 10 November 2026, in the same design
  message as decision 4.
- **Options:** **A.** Keep later builds on the last org image, and say that
  the script must be safe to run more than once. **B.** Start each later
  build from the software image. **C.** As A, with a variable for the kind
  of build. **D.** As A, with a "Clean build" choice.
- **Reason:** a script that always runs on a clean machine gives the same
  image each time.

### 10. First workspace start: a repository that the image lacks

- **Chosen:** D, by the user on 10 November 2026: copy the repository at
  the first workspace start, and start a build when an admin adds a
  repository. The build part shipped in PR #188 (decision 240). The user
  moved the copy part to workspace #578 through decision 13.

### 11. Workspace start: old workspaces miss new org setup

- **Chosen:** C, a notice with an action that runs the install script, by
  the user on 10 November 2026.
- **Options:** **A.** No update. **B.** Run the install script again at the
  workspace start. **C.** A notice with an action.
- **Reason:** the user keeps control of their files (design item 6).

### 12. Refresh: when the install script runs

- **Chosen:** G, every refresh is clean, by the user on 10 November 2026:
  "speed is not a massive factor for a refresh, so we can do a clean if its
  better / more reliable". The recommendations were C, then D, then G.
- **Options:** **A.** A clean daily refresh only. **B.** Clean when any
  input changed. **C.** Clean when the script or the repositories changed.
  **D.** No clean refresh, and an update on top. **E.** Clean when the app
  software changed. **F.** As E, with a fallback. **G.** Every refresh is
  clean.
- **Reason:** every image job follows one path, nothing old stays in an
  image, and no image job starts from an old org image, so the clone token
  risk goes away. The user's earlier rule to run the install script only
  when it changed no longer applies.

### 13. First workspace start: a waiting repository

- **Chosen:** moved to workspace #578, "Workspace Chat Immediate Access",
  by the user on 10 November 2026.

### 14. Parallel copies: how many at once

- **Chosen:** F, a limit by size, by the user on 10 November 2026, with an
  addition: "do it based on the size and the ram available". The first
  recommendations were B, then D.
- **Options:** **A.** All at once. **B.** At most 4 copies. **C.** At most
  8 copies. **D.** At most 4 Git commands. **E.** One sandbox command for
  all copies. **F.** A limit by the size that GitHub reports.
- **Reason:** a large repository copies alone, and many small ones copy
  together (design item 8).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show the clean image jobs, the refreshes on the Cloud computer
tab, and the updates of an old workspace.

- [ ] Give our software one name in the build log fixtures of
      `docs/mockups/src/fixtures/terminal.ts`, as decision 1 E says, and
      show a build with an empty install script with no install step.
- [ ] Show refreshes on the Cloud computer tab, with their log, a failed
      refresh, and Try again.
- [ ] Draw the start steps of an old workspace: the update of our software
      with the name of decision 1, and the warning when the update fails.
- [ ] Draw the notice of an old org setup in a workspace, its action, and
      the output of the install script.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements of each moment that this plan changes.

- [ ] In "The software image" of `docs/protocol/org-image.md`, state that a
      later build and a refresh start from the software image too. State
      the clean refresh of decision 12 G, the skip of an empty install
      script, and that the tab shows refreshes.
- [ ] In `docs/protocol/repository-folders.md`, state that a refresh keeps
      the folders and the variables of the newest good build.
- [ ] In `docs/protocol/workspace-life.md` and
      `docs/protocol/agent-runner.md`, state the update of an old workspace
      at its workspace start, and the notice of an old org setup.
- [ ] In `docs/protocol/github-tokens.md`, state that the copies of an
      image job run in parallel, each with its own token, and that no
      checkout starts before GitHub confirms the revocation of every token.
      Remove the risk of a build sandbox that starts from the last org
      image, because no image job does so.
- [ ] In `docs/architecture.md`, change the terms "Build" and "Refresh",
      and add an old workspace.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Check the rows of `src/marketing/from-conductor/` for a feature that
      this plan ships, as `AGENTS.md` says.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Records

Depends on: 2

- [ ] Add a D1 migration for the records of design item 4: the app
      software version of each org image, and the app software version
      and the org image of each workspace.
- [ ] Write the records at each build, refresh, workspace start, and
      update of an old workspace.
- [ ] Tests: a build from a software image and a build with the software
      step each record the right version. A first workspace start records
      the version and the org image of its image.

## Milestone 4: Clean later builds

Depends on: 3

- [ ] Pin the ready software image for a later build, as for a first
      build, and copy each repository fresh.
- [ ] Skip the install step when the install script is empty.
- [ ] Tests: a later build with a ready software image starts from it and
      runs no software command. A later build without one runs the
      software step after the copy. A build with an empty script runs no
      install command.
- [ ] Update `image/install.md`, `worker/lifecycle/README.md`, and
      `worker/lifecycle/image-builds.md`.

## Milestone 5: Clean refreshes

Depends on: 4

- [ ] Run each refresh as a clean build with the install script and the
      repositories of the newest good build.
- [ ] Delete the start from the last org image for image jobs.
- [ ] Return refreshes to the Cloud computer tab with their log and their
      result.
- [ ] Tests: a refresh after a push and a daily refresh start from the
      software image and run the install script of the newest good build.
      A saved script change does not reach a refresh. A failed refresh
      keeps the last good image.

## Milestone 6: Parallel copies

Depends on: 2

- [ ] Keep one source record for each repository in `image_source_jobs`,
      with a migration.
- [ ] Read the sizes and `MemAvailable`, and start the Git commands within
      the budget of design item 8.
- [ ] Revoke each token when its copy ends. Start the finalize commands
      only after every revocation is confirmed.
- [ ] Revoke each live token when a copy fails, also in
      `cleanupBuildImageSources`. Retry a definite refusal of a source
      command start within the provider retry window.
- [ ] Write one line to the build log for each repository when its copy
      ends.
- [ ] Tests: two small copies run at the same time. A repository whose
      estimate passes the budget runs alone. No finalize command starts
      before every revocation. A failed copy revokes the other token. A
      refused start retries. The metadata token is revoked before the
      first copy.
- [ ] Update `worker/lifecycle/repository-layout.md`.

## Milestone 7: Update an old workspace

Depends on: 3

- [ ] At a workspace start, when the workspace's app software version is
      older than the current one, run the software step before the runner
      starts, and record the new version. Show it as its own start step.
- [ ] When the update fails, go on with the old app software, and warn.
- [ ] Tests: an old workspace gets the current version and starts its
      runner. A current workspace runs no software step. A failed update
      still starts the runner.

## Milestone 8: Old org setup, backend

Depends on: 3

- [ ] Report to the workspace when its org image is older than the current
      org image.
- [ ] Add the action of design item 6, which runs the install script in
      the workspace and streams its output.
- [ ] Tests: a workspace of an older org image gets the notice, and one of
      the current org image does not. The action runs the current install
      script in the folder of the workspace's repository.

## Milestone 9: Screens

Tags: ui

Depends on: 1, 5, 7, 8

- [ ] Show refreshes on the Cloud computer tab, as the mockup of Milestone
      1 draws them.
- [ ] Show the start step and the warning of Milestone 7.
- [ ] Show the notice of an old org setup and its action.

## Milestone 10: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8, 9

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
      Run each new asynchronous test 10 times, as the `testing` skill
      says.
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

- [ ] Watch the first clean refresh after a push, and read its log on the
      Cloud computer tab.
- [ ] Measure the memory of the parallel copies in a real build, and tune
      the numbers of design item 8.
- [ ] Resume a workspace that was created before a release. Check that its
      start updates our software and that an agent answers.
