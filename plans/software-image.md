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
- Open PR #194, from workspace #555 on branch
  `conductor/later-builds-from-software-image`, starts each later build
  from the software image too (decisions 4 C and 9 B). This branch merged
  it at `74ecc48`.

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

- A refresh starts from the last org image → it starts from the software
  image. PR #194 already moved the later build. Consumers: the build admission in
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
   does. The Cloud computer tab shows each refresh with its log. My call,
   from finding 19 of Milestone 1: each refresh records what started it,
   a push, the daily refresh, or a request to the refresh route, so the tab
   can name it.
3. **Empty install script.** A build or a refresh skips the install step
   when the install script is empty, and its build log shows no install
   step. The user's design of 10 November 2026: "user scripts (if they
   exist)".
4. **Records.** Each org image records its app software version: the
   version of its software image, or the version of the software step that
   it ran. Each workspace records its app software version and the org
   image that it started from. My call: the update of an old workspace
   and the notice of an old org setup compare these records, so neither
   reads files in the sandbox. My calls, from findings 18 and 20 of
   Milestone 1: each workspace also records the revision of the install
   script that its disk holds, and a mark of a failed update that lasts
   until its next workspace start.
5. **Update of an old workspace.** At a workspace start, when the
   workspace's app software version is older than the current one, the
   start runs the software step on the workspace's disk before the runner
   starts, and records the new version (decision 8 B). The start shows it
   as its own start step, with the name of decision 1. When the update
   fails, the start goes on with the old app software and warns, because
   the Worker still serves older runner protocol versions. My call, from
   finding 20 of Milestone 1: the warning is the stored mark of design item
   4, so each tab shows a warning bar until the next workspace start. My call of 9
   November 2026: this holds at the first workspace start too, because the
   reason of decision 8 is that every workspace gets the fixes.
6. **Old org setup.** When the install script of the current org image
   differs from the install script that the workspace's disk holds, the
   workspace shows a notice. Its action runs the install script of the
   current org image in the workspace, when the user chooses (decision 11
   C). My calls, from findings 16 and 18 of Milestone 1: the notice compares
   the install scripts, not the org images, because each refresh makes a new
   org image with the same script. A good run records the current script for
   the workspace, so the notice ends. A failed run records nothing, so the
   notice stays with Try again. The action runs from the folder of the
   workspace's repository and shows its output. Decision 15 sets its
   environment, decision 17 a missing repository, decision 23 its time
   limit, and decision 24 a question before it runs.
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
    protocol docs that already hold the rules of each moment. My call, from
    finding 27 of Milestone 1: the docs cite the decisions of this plan as
    "image job decision N", and each doc that cites one defines that short
    name. Each long
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

### 15. Old org setup: the environment of the install script run

Open. From finding 1 of Milestone 1.

- **Severity:** High. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** design item 6 of this plan, and "Startup script and env
  vars" in `docs/protocol/workspaces-and-sandboxes.md`.
- **Terms:**
  - **Install script run:** the action of the notice of an old org setup,
    which runs the install script of the current org image in a workspace.
- **Background:** Moment: a workspace that already runs. An earlier call of
  the planning agent ran the install script there with the env vars of the
  workspace. The protocol says that builds and refreshes get none of the
  env vars, so admins write and test the script without them.
- **Problem:** In a workspace, the same script sees the secret values, such
  as `DATABASE_URL`. The script can then act differently, for example run
  migrations on a real database. The app hides only exact copies of secret
  values in the output.
- **Impact if no action:** One press by a member can change a real service,
  or show a changed copy of a secret.
- **Root question:** In which environment does the install script run in
  an old workspace?
- **Options:**
  - **A.** Run it with no org env vars, as a build does. Effort: Small.
  - **B.** Keep the env vars and hide exact copies in the output. The notice
    says that the script gets them. The risk stays. Effort: Small.
- **Left out:** Giving builds the env vars too, because a saved snapshot
  must not hold them. Running the script in the member's terminal, because
  that gives it the env vars too, so it is the same as B.
- **Wider fix:** A. One rule then covers every run of the install script.
- **Previous examples:** None found.
- **Recommendation:** A. The script runs in the environment that its author
  tested, and no secret reaches its output.
- **Action:** ask the user, because the run adds behaviour at a security
  boundary that no requirement covers.

### 17. Old org setup: a repository that the workspace lacks

Open. From finding 3 of Milestone 1.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** design item 6 of this plan.
- **Background:** Moment: a workspace that already runs. An admin can add a
  repository after a workspace started. The new install script can then use
  its folder, such as `cd ~/code/admin-dashboard`. The disk of the old
  workspace has no such folder. Workspace #578 owns the copy of a missing
  repository at a first workspace start.
- **Problem:** The plan does not say what the notice does when the
  repositories changed. A run then fails at the missing folder.
- **Impact if no action:** The member sees a failed run, and the error does
  not say why.
- **Root question:** What does an old workspace offer when the current
  setup needs a repository that its disk lacks?
- **Options:**
  - **A.** Run the script, and let the output show the error at the missing
    folder. Effort: Small.
  - **B.** When a repository is missing, the notice says that a new
    workspace has the new setup, and it offers no run. This needs a new
    mockup state. Effort: Medium.
  - **C.** The action copies each missing repository first, then runs the
    script. It needs a token path, as workspace #578 does. Effort: Large.
- **Left out:** Running only the lines for the workspace's repository,
  because the install script runs as one script.
- **Wider fix:** C. It gives an old workspace each repository of the
  current setup. It overlaps workspace #578.
- **Previous examples:** Decision 10 D. Its copy part moved to workspace
  #578.
- **Related:** Design item 6: the notice compares the install scripts.
- **Recommendation:** B. It tells the member the real cause at small cost,
  and C can follow after workspace #578.
- **Action:** ask the user, because the options trade cost against a clear
  result, and B adds a state that no requirement covers.

### 22. Refresh: the history of jobs has no limit

Open. From finding 8 of Milestone 1.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** `docs/mockups/src/components/settings/BuildHistory.tsx` and
  `worker/lifecycle/build-data.ts`.
- **Background:** Moments: the refresh after a push and the daily refresh.
  The API returns every job of the org, and the history lists them all.
  Before this plan, the history held only builds, which are rare.
- **Problem:** A refresh after a push can run every 30 minutes, and one
  refresh runs each day. An active org can add hundreds of rows each month.
- **Impact if no action:** The history becomes a long list, and the builds
  get lost in it.
- **Root question:** How does the history stay short enough to read?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Show the newest 50 jobs with "Show older", as the Runs list of a
    routine does. This needs a mockup state and a paged API. Effort: Medium.
  - **C.** Group the good refreshes between two other jobs into one row,
    such as "12 refreshes". This needs a mockup state. Effort: Medium.
- **Left out:** Hiding good refreshes, because design item 2 says that the
  tab shows each refresh.
- **Wider fix:** B. It keeps the list bounded for any number of jobs.
- **Previous examples:** The Runs list of a routine, which holds the newest
  50 runs.
- **Recommendation:** B. It reuses a known pattern, and it also bounds the
  API reply.
- **Action:** ask the user, because B and C trade a familiar pattern
  against a shorter list, and each adds a mockup state.

### 23. Old org setup: a run of the install script has no limit

Open. From finding 9 of Milestone 1.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** design item 6 and Milestone 8 of this plan.
- **Background:** Moment: a workspace that already runs. A build has a
  60-minute limit, and a start has a 20-minute limit. A sandbox stops after
  30 minutes without member activity and without an agent turn.
- **Problem:** The plan gives a run of the install script no time limit. A
  run does not count as member activity, so the idle stop can end it.
- **Impact if no action:** A script that never ends runs until the idle
  stop, which cuts it off at a random point.
- **Root question:** How long can a run of the install script go on?
- **Options:**
  - **A.** No limit, and a run does not count as activity. Effort: Small.
  - **B.** A 60-minute limit, as for a build, and a run keeps the sandbox
    from its idle stop. Effort: Medium.
- **Left out:** A 20-minute limit, as for a start, because the script is
  the same one that a build runs with 60 minutes.
- **Wider fix:** None.
- **Previous examples:** Decision 128 set the limits for builds and starts.
- **Recommendation:** B. The run then ends the same way as a build, and the
  idle stop cannot cut it.
- **Action:** ask the user, because B adds a new limit, and the user
  chooses each new limit.

### 24. Old org setup: no question before the run

Open. From finding 10 of Milestone 1.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** the `ConfirmDialog` bullet in `docs/mockups/design.md`, and
  `docs/mockups/src/components/workspace/InstallScriptNotice.tsx`.
- **Background:** Moment: a workspace that already runs. `design.md` says
  that `ConfirmDialog` asks before an action that a user cannot simply
  undo. The mockup runs the script with one press.
- **Problem:** A run can change files and install packages, and nothing
  undoes it.
- **Impact if no action:** A member can start a run by mistake and lose the
  current state of the files.
- **Root question:** How does a member confirm a run that cannot be undone?
- **Options:**
  - **A.** No dialog. The notice says what the run does. Effort: Small.
  - **B.** A `ConfirmDialog` that says the script runs in this workspace and
    can change its files. This adds a mockup state. Effort: Small.
- **Left out:** A snapshot before each run, because a saved disk costs
  storage and time.
- **Wider fix:** None.
- **Previous examples:** The question before closing a running session, in
  `docs/mockups/src/screens/workspaceOverlays.tsx`.
- **Recommendation:** B. It follows the rule in `design.md`, and it keeps
  the choice with the member, which is the reason for decision 11 C.
- **Action:** ask the user, because B adds a step that decision 11 C does
  not name.

### 25. Build log: an empty-script log stops at the copies

Open. From finding 11 of Milestone 1.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** UX wording.
- **Location:** `firstBuildLog` in `docs/mockups/src/fixtures/terminal.ts`,
  and `worker/lifecycle/build-execution.ts`.
- **Background:** Moments: each build and each refresh. When the install
  script is empty, the job skips the install step. The Worker writes no
  line when it saves the image.
- **Problem:** The log of such a job ends with the copies. The save can
  take minutes with no new line.
- **Impact if no action:** An admin can think that the job hangs.
- **Root question:** How does the log show the work after the last step?
- **Options:**
  - **A.** Change nothing. The head still says "Building" with its time.
    Effort: Small.
  - **B.** Add a line such as "Saving the cloud computer" before the save
    in every build and refresh. Effort: Small.
- **Left out:** A line only for an empty script, because every job saves
  its image.
- **Wider fix:** B. It covers the save of every job.
- **Previous examples:** None found.
- **Recommendation:** B. One line says what the job does while it saves.
- **Action:** ask the user, because B adds a build log line that no
  requirement names.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show the clean image jobs, the refreshes on the Cloud computer
tab, and the updates of an old workspace.

- [x] Give our software one name in the build log fixtures of
      `docs/mockups/src/fixtures/terminal.ts`, as decision 1 E says, and
      show a build with an empty install script with no install step. The
      name is "the agent and terminal software".
- [x] Show refreshes on the Cloud computer tab, with their log, a failed
      refresh, and Try again.
- [x] Draw the start steps of an old workspace: the update of our software
      with the name of decision 1, and the warning when the update fails.
- [x] Draw the notice of an old org setup in a workspace, its action, and
      the output of the install script.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages. Evidence:
      `.context/software-image/mockups/`.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show. Findings 16, 18, 19, 20, 21, 26, and 27 changed the
      design. Decisions 15, 17, 22, 23, 24, and 25 wait for the user.
- [ ] Apply the answers to decisions 17, 22, and 24 to the mockups, when
      they add a mockup state.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements of each moment that this plan changes.

- [ ] In `docs/protocol/org-image.md`, state that a refresh starts from the
      software image too, the clean refresh of decision 12 G, the skip of an
      empty install script, and that the tab shows refreshes. PR #194
      already states the later build.
- [ ] In `docs/protocol/repository-folders.md`, state that a refresh keeps
      the folders and the variables of the newest good build.
- [ ] In `docs/protocol/workspace-life.md` and
      `docs/protocol/agent-runner.md`, state the update of an old workspace
      at its workspace start, and the notice of an old org setup.
- [ ] In `docs/protocol/github-tokens.md`, state that the copies of an
      image job run in parallel, each with its own token, and that no
      checkout starts before GitHub confirms the revocation of every token.
      Remove the risk of a refresh that starts from the last org image,
      because no image job does so after this plan.
- [ ] In `docs/architecture.md`, change the term "Refresh", and add an old
      workspace. PR #194 already changed the term "Build".
- [ ] Update the reason of "The repository notice" in
      `docs/protocol/org-image.md`, which says that the card shows no
      refresh.
- [ ] Read each public guide in `src/marketing/docs/` in full, and update
      each sentence that restates the old refresh, such as the refresh and
      history sentences of `cloud-computer.md`.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Check the rows of `src/marketing/from-conductor/` for a feature that
      this plan ships, as `AGENTS.md` says.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Records

Depends on: 2

- [ ] Add a D1 migration for the records of design item 4: the app
      software version and the install script revision of each org image,
      the cause of each refresh, and the app software version, the org
      image, the install script revision, and the failed update mark of
      each workspace.
- [ ] Write the records at each build, refresh, workspace start, and
      update of an old workspace.
- [ ] Tests: a build from a software image and a build with the software
      step each record the right version. A first workspace start records
      the version and the org image of its image.

## Milestone 4: Clean later builds

Depends on: 3

- [x] Pin the ready software image for a later build, as for a first
      build, and copy each repository fresh. Branch:
      `conductor/later-builds-from-software-image`, PR #194.
- [ ] Skip the install step when the install script is empty.
- [x] Tests: a later build with a ready software image starts from it and
      runs no software command. A later build without one runs the
      software step after the copy. Branch:
      `conductor/later-builds-from-software-image`, PR #194.
- [ ] Test: a build with an empty script runs no install command.
- [x] Update `image/install.md`, `worker/lifecycle/README.md`, and
      `worker/lifecycle/image-builds.md` for the later build. Branch:
      `conductor/later-builds-from-software-image`, PR #194.
- [ ] Update the same docs for the skip of an empty install script.

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
- [ ] Change "The install script runs only when you build the computer." in
      `src/shell/settings/ComputerTab.tsx` and "only at a build" in
      `src/members/MemberComputerView.tsx`, with their tests, to the words
      of the mockup.
- [ ] Capture the org pictures of the marketing site again with
      `npm run marketing:pictures`, because the Cloud computer tab of the
      mockups now shows refreshes.

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
