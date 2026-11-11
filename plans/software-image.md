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
   can name it. My call, from the options check of decisions 28 and 29: a
   good refresh never hides a failed build that no newer build replaced.
   The card head, its log, Try again, and the mark of the Settings link keep
   that failed build, because the org image rule says that a failed build
   shows its log, Try again, and the mark.
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
   org image with the same script. A good run records the revision of the
   script that it ran, so the notice ends, and a newer script that arrives
   during the run keeps the notice. A failed run records nothing, so the
   notice stays with Try again. The action shows its output. Decision 15
   sets its start folder and its
   environment, decision 17 a missing repository, decision 23 its time
   limit, and decision 24 a question before it runs. My call: each member
   of the org may run it, because each member can already send messages in
   every workspace (decision 39 and "Orgs and members"), and an agent turn
   can run the same script.
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
     repository from GitHub with metadata-only installation tokens: one for
     each installation of the job's repositories, each named for at most 500
     of them, because GitHub limits a token to one installation and 500
     repositories. It revokes every metadata token before the first copy
     starts. A repository with no size gets the least estimate. My call of 11
     November 2026, from finding 2 of the Milestone 6 workspace.
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
November 2026, over decision 14 on 10 November 2026, and over decisions
15, 17, 22, 23, 24, 25, 28, 29, 30, 31, 32, and 33 on 11 November 2026. Its reports are
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
  - **C.** Run the script through the same command builder as a build. It
    gets only the folder variables, and it starts where a build starts it,
    not in the folder of the workspace's repository. The output still hides
    exact copies, because a script can read a secret from a file. Effort:
    Small.
- **Left out:** Giving builds the env vars too, because a saved snapshot
  must not hold them. Running the script in the member's terminal, because
  the app cannot tell a good run from a failed one there. Giving the script
  only the env vars that are not secret, because A is better on every
  point.
- **Wider fix:** C. One command builder keeps the run equal to a build, also
  when builds later get another variable or start folder.
- **Previous examples:** None found.
- **Recommendation:** C. The first recommendation was A. The run gets the
  variables and the start folder that a build tested. The env vars are not
  a secrecy line, because each member with a terminal already gets them.
  The risk that stays is a script that acts on a real service.
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
- **Root question:** What does an old workspace offer when its repository
  folders differ from those of the current org image? The options check
  replaced "What does an old workspace offer when the current setup needs a
  repository that its disk lacks?", because a renamed folder breaks the run
  too.
- **Options:**
  - **A.** Run the script, and let the output show the error at the missing
    folder. Effort: Small.
  - **B.** When a repository is missing, the notice says that a new
    workspace has the new setup, and it offers no run. This needs a new
    mockup state. Effort: Medium.
  - **C.** The action copies each missing repository first, then runs the
    script. It changes the rule that a workspace keeps the folders of its
    org image. Effort: Large.
  - **D.** When the workspace lacks a repository or a folder of the current
    org image, the notice names it. It says that the run can fail without
    it, and that a new workspace has the new setup. It still offers the run.
    Effort: Medium.
- **Left out:** Running only the lines for the workspace's repository,
  because the install script runs as one script. A folder check that the
  admin writes in the script, because every build has every folder, so a
  missing check never fails a build.
- **Wider fix:** D, or B when it compares the folder of each repository.
- **Previous examples:** Decision 10 D. Its copy part moved to workspace
  #578.
- **Related:** Design item 6: the notice compares the install scripts.
- **Recommendation:** D. The first recommendation was B. At the same cost,
  D names the cause, blocks no run that skips the missing folder, and lets
  the notice end.
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
- **Root question:** How does the history keep the builds and the failures
  easy to find while refreshes add a job up to every 30 minutes? The
  options check replaced "How does the history stay short enough to read?",
  because a short list of refreshes still buries the builds.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Show the newest 50 jobs with "Show older", as the Runs list of a
    routine does. This needs a mockup state and a paged API. Effort: Medium.
  - **C.** Group the good refreshes between two other jobs into one row,
    such as "12 refreshes". This needs a mockup state. Effort: Medium.
  - **D.** The history lists the builds, the failed refreshes, and the
    newest refresh, and the API returns only those jobs. An older good
    refresh no longer shows. Design item 2 and the Refreshes mockup change.
    Effort: Small.
- **Left out:** A switch between builds and all jobs, because the groups of
  C give the hidden rows one press away.
- **Wider fix:** B. It keeps the list bounded for any number of jobs.
- **Previous examples:** The Runs list of a routine, which holds the newest
  50 runs.
- **Recommendation:** D. The first recommendation was B. D shows each
  build and each failure at the smallest cost, and B can follow if failed
  refreshes pile up.
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
- **Root question:** How does each run of the install script come to a
  clear end, and what may end it early? The options check replaced "How
  long can a run of the install script go on?", because the idle stop is a
  second symptom of the same problem.
- **Options:**
  - **A.** No limit, and a run does not count as activity. Effort: Small.
  - **B.** A 60-minute limit, as for a build, and a run keeps the sandbox
    from its idle stop. Effort: Medium.
  - **C.** A Stop action on the notice while the run goes on. The run has no
    limit, and it does not keep the sandbox up, so the idle stop still ends
    a run that nobody watches. Effort: Medium.
  - **D.** As B, with the Stop action of C. Effort: Medium.
- **Left out:** A 20-minute limit, as for a start, because the script is
  the same one that a build runs with 60 minutes. A run in the terminal,
  because the app cannot tell a good run from a failed one there. A run
  that keeps the sandbox up with no limit, because a script that never
  ends would keep it up forever.
- **Wider fix:** None.
- **Previous examples:** Decision 128 set the limits for builds and starts.
- **Recommendation:** D. The first recommendation was B. Each run then ends
  by itself, by Stop, or at the limit, and the idle stop cannot cut it. B
  and D change the idle stop rule of `docs/protocol/workspace-life.md`.
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
- **Root question:** How does a member start a run only on purpose, and
  know what it will change? The options check replaced "How does a member
  confirm a run that cannot be undone?", because a view of the change and
  an undo also meet the goal.
- **Options:**
  - **A.** No dialog. The notice says what the run does. Effort: Small.
  - **B.** A `ConfirmDialog` that says the script runs in this workspace and
    can change its files. This adds a mockup state. Effort: Small.
  - **C.** As B, and the dialog shows the lines of the install script that
    changed since the setup of this workspace. Effort: Medium.
  - **D.** Before the run, the app saves a Git checkpoint of each repository
    folder, and the notice offers Undo for the files after the run. It
    cannot undo installed packages. Effort: Large.
- **Left out:** A saved snapshot before each run, because the disk of a
  workspace holds agent sessions with secret values, and no saved snapshot
  may hold them.
- **Wider fix:** None.
- **Previous examples:** The question before closing a running session, in
  `docs/mockups/src/screens/workspaceOverlays.tsx`.
- **Recommendation:** B. It guards against a press by mistake at small
  cost, and C can add the changed lines later.
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
- **Root question:** How does an admin see that a job still works during a
  step that writes no output? The options check replaced "How does the log
  show the work after the last step?", because the start of the build
  sandbox and the provider retries are silent too.
- **Options:**
  - **A.** Change nothing. The head still says "Building" with its time.
    Effort: Small.
  - **B.** Add a line such as "Saving the cloud computer" before the save
    in every build and refresh. Effort: Small.
  - **C.** Each phase of a job writes its label when it starts, from one
    table keyed by the phase, such as "Starting the cloud computer" and
    "Saving the cloud computer". Effort: Small.
  - **D.** The head of the card names the current phase after "Building".
    Effort: Medium.
- **Left out:** A line only for an empty script, because every job saves
  its image. A moving mark in the log, because a running log already ends
  with a cursor.
- **Wider fix:** C. It covers each phase, also a phase that a later change
  adds.
- **Previous examples:** None found.
- **Recommendation:** C. The first recommendation was B. At about the same
  cost, C also names the start of the build sandbox and each later silent
  step.
- **Action:** ask the user, because B adds a build log line that no
  requirement names.

### 28. Refresh: the logs of clean refreshes pile up

Open. From the options check of 11 November 2026. Its own options check
ran on 11 November 2026.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review.
- **Category:** Performance.
- **Location:** "Build jobs" in `worker/lifecycle/image-builds.md`, and
  `worker/lifecycle/build-log-retention.ts`.
- **Background:** Moments: the refresh after a push and the daily refresh.
  Each job keeps its log in D1, up to 4 MiB, with no age limit. A clean
  refresh runs the install script, so each refresh now keeps a full install
  log. An org with many pushes can run up to 49 refreshes a day. All orgs
  share one D1 database.
- **Problem:** The stored logs grow without limit, mostly from good
  refreshes that nobody opens.
- **Impact if no action:** One busy org can add up to about 200 MiB of logs
  a day to the shared database.
- **Root question:** Which job logs does the app keep, so that each log
  that a screen shows stays and one org cannot fill the shared database?
  The options check replaced "How long does the app keep the log of each
  job?", because a count, a kind, or another store can also give a limit.
- **Options:**
  - **A.** Keep every log, as today. Effort: Small.
  - **B.** Keep the logs of builds and of failed refreshes, and the log of
    the newest good refresh. Delete the logs of older good refreshes, and
    keep their job records. Effort: Small.
  - **C.** Keep each log for 30 days, then delete it, and keep the job
    record. Effort: Small.
  - **D.** Move the logs out of D1 into file storage. It sets no limit by
    itself. Effort: Medium.
  - **E.** Keep the logs of the newest 10 jobs of each org and the log of
    its newest build. At each new job, delete each other log of the org,
    and keep the job records. Each org then holds at most 11 logs. Support
    gets no older log. Effort: Small.
- **Left out:** A smaller log budget for refreshes, or compressed logs,
  because each slows the growth but sets no limit. Fewer refreshes after a
  push, because it sets no limit and breaks the limit of one push refresh
  in 30 minutes.
- **Wider fix:** E. A count for each org keeps its limit when the refresh
  rate, the log size, or the kinds of job change.
- **Previous examples:** The budget of 4 MiB for one log in
  `worker/lifecycle/build-log-retention.ts`.
- **Related:** Decision 22: its option D shows the same jobs whose logs B
  keeps.
- **Recommendation:** E. The first recommendation was B. No history row
  opens a log, and B keeps the log of every failed refresh, which a broken
  script can make 49 times a day. E sets a limit for each org at the same
  cost, and D1 has one size limit that all orgs share.
- **Action:** ask the user, because a deletion of stored logs is a new rule
  that no requirement covers.

### 29. Old org setup: an agent turn during the run

Open. From the options check of 11 November 2026. Its own options check
ran on 11 November 2026.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** the design call of Milestone 1 that keeps the composer
  usable during the run, in
  `docs/mockups/src/entries/app/workspace-updates/install-script/`.
- **Background:** Moment: a workspace that runs. The mockup keeps the
  composer usable while the install script runs. An agent turn or the
  terminal can then change the same files, such as `node_modules`, at the
  same time.
- **Problem:** Two writers can break installed packages or build output.
- **Impact if no action:** A run or a turn can fail in a way that is hard
  to explain.
- **Root question:** How do the install script run and the other work in
  the workspace share the same files without failures that nobody can
  explain? The options check replaced "May an agent turn change the
  workspace while the install script runs?", because terminal commands and
  running servers use the same files too.
- **Options:**
  - **A.** Yes, as the mockup shows. The member decides. Effort: Small.
  - **B.** The composer holds new messages until the run ends, and the
    notice says why. Effort: Medium.
  - **C.** The run starts only when no agent turn runs, and the notice warns
    that a turn during the run can change the same files. Effort: Medium.
  - **D.** As A, and the notice, or the dialog of decision 24, says that
    agent turns, terminal commands, and running servers can change the same
    files while the script runs. No gate. Effort: Small.
  - **E.** B and C together, for every session and every member. The
    workspace keeps each new message until the run ends, and every tab
    shows why. This needs the shared run of decision 31 A. Effort: Large.
  - **F.** Run the script at a workspace start, before the runner and the
    terminal start, at the next start or through a restart that the member
    confirms. Nothing else runs at the same time, but a restart ends each
    turn, terminal command, and server. Effort: Large.
  - **G.** The runner holds each command and each file edit of an agent
    while the run goes on. Codex needs a new approval path for it. Effort:
    Large.
- **Left out:** A stop of the terminal during the run, because it breaks
  the terminal rules of `docs/protocol/workspace-tools.md` (decisions 118,
  147, and 149). A message from the app that tells each agent to wait,
  because the app cannot make an agent wait. A move of the work to a new
  workspace, because it breaks decision 11 C.
- **Wider fix:** F. Nothing else runs before the runner and the terminal
  start, so it removes every overlap. Its cost does not fit a Low item.
- **Previous examples:** None found.
- **Recommendation:** D. The first recommendation was C. One sentence
  explains the risk when the member chooses the run, at a small cost and
  with no gate. C stops only the runs that start during a turn.
- **Action:** ask the user, because B and C change how the composer and the
  run work together, and no requirement covers it.

### 30. Old workspace: the update leaves the version pin unchanged

Open. From finding 1 of Milestone 2. Its options check ran on 11 November
2026.

- **Severity:** High. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Security.
- **Location:** the pin rules in `docs/protocol/agent-runner.md`, and "A
  sandbox with a version pin of 1" in `docs/protocol/isolation.md`.
- **Terms:**
  - **Version pin:** the lowest runner protocol version that a workspace
    accepts. A runner of version 1 gets the agent login itself.
- **Background:** Moment: the workspace start of an old workspace. The docs
  already accept this risk: a workspace with pin 1 accepts a runner that
  claims version 1, and that runner gets the agent login. Decision 8 B
  installs the newest runner at the next start. The rule "A stop and a
  resume keep the pin" stays, so the pin stays at 1.
- **Problem:** After a good update, any process with the workspace token
  can still claim version 1 and get the agent login.
- **Impact if no action:** Old workspaces keep the agent-login risk. Only a
  new workspace removes it.
- **Root question:** How does an existing workspace stop getting real agent
  logins, and what does it lose when its update fails or sandbox code
  blocks the update? The options check replaced "How does an old workspace
  get the protection of the gateway?", because the options differ mainly
  in that case.
- **Options:**
  - **A.** Keep the pin. The docs stay as written. Effort: Small.
  - **B.** After a good update, raise the pin to the new runner's version
    before the runner connects. A failed update keeps the pin. A connection
    that the workspace accepted at pin 1 keeps the login path. This changes
    `agent-runner.md`, `isolation.md`, `docs/architecture/data-and-trust.md`,
    `docs/architecture/components.md`, `model-gateway.md`, `routines.md`,
    `tokens-and-secrets.md`, two guides, `terms-org.ts`, and both legal
    pages. Effort: Medium.
  - **C.** Refuse runner version 1 in every workspace, and remove the login
    path for version 1, so that a restored connection gets no login. A
    workspace whose update fails, or that runs since before the release,
    gets no agent turns until a later start succeeds. The update-failed
    mockup must say so. Effort: Medium.
  - **D.** At each start that updates an old workspace, the Worker raises the
    pin before the provider call, to the version that the update installs,
    from its own record. Before the workspace sends a login to a runner of
    version 1, it reads the pin again and closes a connection below it. A
    failed update then stops agent turns until a later start succeeds.
    Effort: Medium.
  - **E.** As B, and the workspace reads the pin again before it sends each
    login to a runner of version 1. The docs say that sandbox code can block
    the update and so keep the pin at 1. Effort: Medium.
- **Left out:** A new cloud computer at each start, because it loses the
  files. Turn tokens for a runner of version 1, because that runner sends
  its credential to the provider, which refuses a turn token.
- **Wider fix:** D. The pin then follows each update from the Worker's own
  record.
- **Previous examples:** Gateway decisions 2 and 5.
  `plans/follow-ups/runner-update-at-start.md` on `main` asks the same
  question. The answer updates or deletes it.
- **Recommendation:** C. The first recommendation was B. Decision 8 B now
  gives each old workspace a newer runner at its next start, so C stops
  agent turns only where an update fails. C ends the real-login path
  without depending on anything that sandbox code controls. E is the safe
  form of B, if agent turns must stay after a failed update.
- **Action:** ask the user, because B changes the pin rule of gateway
  decisions 2 and 5 and the risk text of the legal pages.

### 31. Old org setup: two runs of the install script at once

Open. From finding 2 of Milestone 2. Its options check ran on 11 November
2026.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Implementation.
- **Category:** Docs or spec.
- **Location:** "Old workspaces" in `docs/protocol/workspace-life.md`.
- **Background:** Moment: a workspace that runs. The notice shows in each
  open tab, and every member can use each workspace.
- **Problem:** No requirement says whether a second run can start during a
  run, or what the other tabs show.
- **Impact if no action:** Two runs at once can break the setup, such as
  two package installs into one folder.
- **Root question:** Does a run of the install script belong to the
  workspace, so that one runs at a time and each open tab shows it, or to
  the tab that starts it? The options check replaced "How do the open tabs
  of a workspace share one run?", because a reload of the starting tab has
  the same cause.
- **Options:**
  - **A.** One run at a time. Every open tab shows the run, its output, and
    its result, as the start steps do. Effort: Medium.
  - **B.** One run at a time. A second press gets a refusal, and only the
    starting tab shows the output. Effort: Small.
  - **C.** No rule. Effort: Small.
  - **D.** The action restarts the sandbox, and that start runs the install
    script as its own step. The restart ends running programs, terminal
    sessions, and any agent turn. Effort: Large.
- **Left out:** A queue, because A is better on every point: a queued run
  repeats the same script.
- **Wider fix:** A.
- **Previous examples:** One job at a time in each org. The start steps
  reach every tab.
- **Related:** Decision 15 decides what the kept output can hold.
- **Recommendation:** A. A second press joins the same run, so no tab needs
  a refusal, and the Durable Object keeps the state of the run.
- **Action:** ask the user, because A adds behaviour at a boundary that no
  requirement covers.

### 32. Refresh: no name for a refresh from the route

Open. From finding 3 of Milestone 2. Its options check ran on 11 November
2026.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Mockup.
- **Location:** `jobLabels` in `docs/mockups/src/components/settings/buildCopy.ts`.
- **Background:** Moment: a refresh. The plan records "a request to the
  refresh route" as a cause. Only an admin may call that route, and no
  screen calls it. The mockups name only Build, Refresh after a push, and
  Daily refresh.
- **Problem:** The mockups give no name for a refresh from the route.
- **Impact if no action:** Milestone 9 must guess the name.
- **Root question:** What does the history show for a refresh that only a
  direct call to the API can start? The options check replaced "How does
  the history name a refresh that an admin asked for?", because whether
  the route stays is part of the question.
- **Options:**
  - **A.** "Refresh", with a mockup variant. Effort: Small.
  - **B.** "Refresh on request", with a mockup variant. Effort: Small.
  - **C.** Delete the route. This removes an API route on `main`. Effort:
    Small.
- **Left out:** Showing it as a build, because it does not run the saved
  script.
- **Wider fix:** None, because this is one label.
- **Previous examples:** None found.
- **Recommendation:** C. The first recommendation was B. No screen,
  script, workflow, or Mac app calls the route, in
  `worker/lifecycle/browser.ts`. C removes an unused admin write route and
  a fourth job kind at the same cost. If the route stays, B.
- **Action:** ask the user, because B adds a name that no requirement or
  mockup covers, and C deletes a route on `main`.

### 33. Two names for the app's own software

Open. From finding 4 of Milestone 2. Its options check ran on 11 November
2026.

- **Severity:** Low. **Effort:** Small.
- **Source:** Implementation.
- **Category:** UX wording.
- **Location:** the public guides, `src/marketing/privacy-uses.ts`, and the
  comparison row `managed-git-identity`.
- **Background:** Decision 1 E names the software "the agent and terminal
  software" in the build log and the start step. The guides, the Privacy
  page, and one comparison row say "cloud computer software".
- **Problem:** Readers meet one name in the guides and another in the app.
- **Impact if no action:** A member may not link the start step to the
  guide text.
- **Root question:** Which one name do the app and the public texts use for
  the app's own software, so that a reader links it to the start step and
  tells it apart from an older cloud computer? The options check replaced
  "Which name do the public texts use?", because the app itself still says
  "cloud computer software" in errors.
- **Options:**
  - **A.** Keep "cloud computer software". Effort: Small.
  - **B.** Use "the agent and terminal software" everywhere, also on the
    Privacy page, in the three `runner_software_unavailable` errors of
    `worker/lifecycle/image-software.ts`, and in the relay refusal. Effort:
    Small.
  - **C.** One new name in the app and in the public texts, built from the
    product name, such as "the Conductive software". It reopens the words
    of Milestone 1. Effort: Small.
  - **D.** As B, and one exported constant next to the product name holds
    the name for the Worker, the app, the mockups, the Privacy page, and the
    comparison row. Effort: Small.
- **Left out:** None.
- **Wider fix:** D. One constant keeps each TypeScript text on the same name
  after a later rename.
- **Previous examples:** None found.
- **Recommendation:** B. A guide uses the words of the product, and B tells
  the software that a start updates apart from an older cloud computer.
  Apply it with decision 30, because both change the same sentences.
- **Action:** ask the user, because both texts are correct, and B changes
  a legal page.

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
- [ ] Apply the answers to decisions 17, 22, 24, 29, 31, and 32 to the
      mockups, when they add a mockup state.
- [ ] Keep a failed build on the card head and the Settings mark after a
      good refresh, as design item 2 says.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements of each moment that this plan changes.

- [x] In `docs/protocol/org-image.md`, state that a refresh starts from the
      software image too, the clean refresh of decision 12 G, the skip of an
      empty install script, and that the tab shows refreshes. PR #194
      already states the later build.
- [x] In `docs/protocol/repository-folders.md`, state that a refresh keeps
      the folders and the variables of the newest good build.
- [x] In `docs/protocol/workspace-life.md` and
      `docs/protocol/agent-runner.md`, state the update of an old workspace
      at its workspace start, and the notice of an old org setup.
- [x] In `docs/protocol/github-tokens.md`, state that the copies of an
      image job run in parallel, each with its own token, and that no
      checkout starts before GitHub confirms the revocation of every token.
      Remove the risk of a refresh that starts from the last org image,
      because no image job does so after this plan.
- [x] In `docs/architecture.md`, change the term "Refresh", and add an old
      workspace. PR #194 already changed the term "Build".
- [x] Change the sentence of `docs/protocol/org-image.md` that says that the
      install script runs only in a build.
- [x] Update the reason of "The repository notice" in
      `docs/protocol/org-image.md`, which says that the card shows no
      refresh.
- [x] Read each public guide in `src/marketing/docs/` in full, and update
      each sentence that restates the old refresh, such as the refresh and
      history sentences of `cloud-computer.md`.
- [x] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [x] Check the rows of `src/marketing/from-conductor/` for a feature that
      this plan ships, as `AGENTS.md` says.
- [x] Check each relative link of each changed Markdown file.
- [x] Fix the sentences of `docs/protocol/port-previews.md`,
      `docs/protocol/isolation.md`, `docs/architecture/components.md`,
      `docs/protocol/message-attachments.md`, and
      `docs/protocol/terminal-previews-and-desktop.md` that contradict
      decision 8 B, and add "Old workspaces" to the doc lists of
      `docs/protocol/workspaces-and-sandboxes.md` and
      `docs/architecture/protocol-docs.md`.
- [ ] Apply the answers to decisions 15, 17, 22, 23, 24, 25, 28, 29, 30,
      31, 32, and 33 to the protocol docs.

## Milestone 3: Records

Depends on: 2

- [x] Add a D1 migration for the records of design item 4: the app
      software version and the install script revision of each org image,
      the cause of each refresh, and the app software version, the org
      image, the install script revision, and the failed update mark of
      each workspace.
- [x] Write the records at each build, refresh, workspace start, and
      update of an old workspace. A workspace with no recorded version
      counts as older than the current version.
- [x] Tests: a build from a software image and a build with the software
      step each record the right version. A first workspace start records
      the version and the org image of its image.
      Evidence: `.context/software-image/records/report.md`.

## Milestone 4: Clean later builds

Depends on: 3

- [x] Pin the ready software image for a later build, as for a first
      build, and copy each repository fresh. Branch:
      `conductor/later-builds-from-software-image`, PR #194.
- [x] Skip the install step when the install script is empty.
- [x] Tests: a later build with a ready software image starts from it and
      runs no software command. A later build without one runs the
      software step after the copy. Branch:
      `conductor/later-builds-from-software-image`, PR #194.
- [x] Test: a build with an empty script runs no install command.
- [x] Update `image/install.md`, `worker/lifecycle/README.md`, and
      `worker/lifecycle/image-builds.md` for the later build. Branch:
      `conductor/later-builds-from-software-image`, PR #194.
- [x] Update the same docs for the skip of an empty install script.

## Milestone 5: Clean refreshes

Depends on: 4

- [x] Run each refresh as a clean build with the install script and the
      repositories of the newest good build.
- [x] Delete the start from the last org image for image jobs.
- [x] Return refreshes to the Cloud computer tab with their log and their
      result.
- [x] Tests: a refresh after a push and a daily refresh start from the
      software image and run the install script of the newest good build.
      A saved script change does not reach a refresh. A failed refresh
      keeps the last good image.
      Evidence: `.context/software-image/clean-refresh/report.md`.

## Milestone 6: Parallel copies

Depends on: 2

Implementor calls of 11 November 2026: keep the shared phase and memory
budget in `image_source_runs`. Keep the metadata token in source row 0,
with the original source-token context and no grant, so older cleanup
readers can revoke it. Continue confirmed legacy commands before moving
their job to the parallel records. Read metadata in installation-scoped
batches of at most 500 job repositories, with saved read progress.

- [x] Keep one source record for each repository in `image_source_jobs`,
      with a migration. Branch: `conductor/software-image-m6-parallel-copies`.
- [x] Read the sizes and `MemAvailable`, and start the Git commands within
      the budget of design item 8. Branch: `conductor/software-image-m6-parallel-copies`.
- [x] Revoke each token when its copy ends. Start the finalize commands
      only after every revocation is confirmed. Branch: `conductor/software-image-m6-parallel-copies`.
- [x] Revoke each live token when a copy fails, also in
      `cleanupBuildImageSources`. Retry a definite refusal of a source
      command start within the provider retry window. Branch: `conductor/software-image-m6-parallel-copies`.
- [x] Write one line to the build log for each repository when its copy
      ends. Branch: `conductor/software-image-m6-parallel-copies`.
- [x] Tests: two small copies run at the same time. A repository whose
      estimate passes the budget runs alone. No finalize command starts
      before every revocation. A failed copy revokes the other token. A
      refused start retries. The metadata token is revoked before the
      first copy. Branch: `conductor/software-image-m6-parallel-copies`.
- [x] Update `worker/lifecycle/repository-layout.md`. Branch: `conductor/software-image-m6-parallel-copies`.

## Milestone 7: Update an old workspace

Depends on: 3

- [ ] At a workspace start, when the workspace's app software version is
      older than the current one, run the software step before the runner
      starts, and record the new version. Show it as its own start step.
- [ ] Change the 409 `preview_relay_unavailable` text in
      `worker/previews/relay.ts` and `worker/previews/README.md`, which says
      "Start a new workspace after an admin runs Build computer", to the
      update at the next workspace start.
- [ ] When the update fails, go on with the old app software, and warn.
      The update runs inside the 20-minute limit of the start, so a hung
      update fails the start.
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
- [ ] Show the start step and the warning of Milestone 7. Load the warning
      mark in the workspace list query and in the device fallback of
      `worker/devices/state.ts`, which do not load it yet.
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
