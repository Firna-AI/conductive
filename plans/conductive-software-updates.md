# Conductive software updates

Status: Active. On branch `calummoore/porto-otn7`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

We deploy often. Each deploy can change the Conductive software, but on
`main` only a full build of the org image installs it. A refresh keeps the
old Conductive software. A workspace keeps the Conductive software of its
org image for its whole life, also after a stop and a resume. So each fix
reaches only workspaces that start from an image that a full build made
after the deploy.

This change gives each existing cloud computer the current Conductive
software at its next start. It also makes each refresh a clean build, so
each org image gets the current Conductive software too. It does not
change the version pin. It does not run the org's install script in an
existing workspace, and it does not take in the other work of the plan
branch `calummoore/build-image-install-order`.

## Terms

- **Conductive software:** the programs that we install in every cloud
  computer: the agent runner with the Claude and Codex SDKs, its private
  Node, the preview relay, the terminal service, the workspace tools, the
  git credential helper, the `gh` wrapper, and their systemd units.
- **Org software:** everything that the org's install script installs.
  Only a build or a refresh of the org image runs that script.
- **Conductive software version:** the hash of our install steps that
  `softwareVersion` in `worker/software-image/version.ts` computes. The
  org's install script has no effect on it.
- **Software image:** the saved snapshot with the Conductive software of
  one version, which each deploy run builds, as
  [Org image](../docs/protocol/org-image.md#the-software-image) says.
- **Newest good build:** the newest build of the org that succeeded.

## User decisions

The user chose these on 12 November 2026, in a brainstorm in this
workspace. The brainstorm notes are in `.context/sandbox-software-updates/`.

1. **How existing cloud computers get the Conductive software:** A. At
   each start, the Worker compares the stored Conductive software version
   of the workspace with the current one. When it is older, the Worker
   installs the current Conductive software before the runner starts.
   - Alternatives: B, a store of versions with a launcher that switches a
     link. C, as A plus a live update between turns.
   - Reason: PR #222 on the plan branch already built and tested A. The
     30-minute idle stop keeps the delay short for running cloud
     computers.
2. **How the org image gets the Conductive software:** C. Each refresh is
   a clean build from the software image.
   - Alternatives: A, change nothing, so each first start updates. B, a
     refresh installs the Conductive software on top of the last org image
     when its version is old.
   - Reason: the user chose the clean path. It is the same choice as
     decisions 7 D and 12 G of the plan branch, where the user said that
     speed is not a big factor for a refresh.
3. **The plan branch:** A. Leave it untouched. This branch starts from
   `main` and copies in only the parts that it needs. The plan branch
   rebases later.
   - Alternatives: B, cut the plan branch down. C, as A, then close the
     plan branch.
   - Reason: a clean start that loses no work.
4. **A failed update:** A. The start goes on with the old Conductive
   software. The start log and the Worker log show the failure. The next
   start tries again. There is no new screen.
   - Alternatives: B, as A plus a warning bar. C, the start fails.
   - Reason: a small change that never blocks a member.

The user also put the version pin outside this change on 12 November
2026. `plans/follow-ups/runner-update-at-start.md` and decision 30 of the
plan branch keep that question.

## Design

Each item is my call of 12 November 2026, unless it names a source.

1. **Stored versions.** Each org image stores its Conductive software
   version. Each workspace stores the Conductive software version that its
   disk holds. A missing value counts as older than the current version.
   Only the Worker writes these values. It writes a workspace's value after
   the install command exits with code 0. Reason: the value only decides
   whether to install again. It never decides what a runner may get, so
   sandbox code gains nothing when it fakes an exit code.
2. **When the update runs.** At the first start, at each resume, and at
   the restart near day 14 of a workspace that is not archived. It runs
   after the provider start and before the startup command. At a first
   start and a resume, that command then restarts the runner. The
   restart near day 14 starts no runner, as `workspaceStartupCommand` in
   `worker/lifecycle/image-software.ts` says. The update counts inside the
   20-minute limit of the start. Reason: PR #222 did the same, and no
   process of the user runs at that time.
3. **How the update installs.** The update runs `installImageSoftware`
   for the current runner archive, as a build does. The install keeps a
   copy of the old Conductive software, and it puts the copy back when a
   step fails. The org software and the user's files stay as they are.
4. **A failed update.** User decision 4. No stored warning mark. Reason:
   the next start compares the versions again, so it needs no mark.
5. **The target version.** The target is the version that the running
   Worker computes from its own settings. So a rollback of the Worker
   installs the older version at the next start. Reason: a newer runner
   cannot talk to an older Worker.
6. **Saved runner state.** The new runner must read the state file and the
   session folders of the runner that it replaces. A test checks one step
   up and one step down.
7. **The start step.** The update shows as its own start step,
   "Updating the agent and terminal software". Source: decision 1 E of the
   plan branch, by the user on 10 November 2026. Decision 33 of the plan
   branch keeps the wider naming question open. This change does not
   reopen it.
8. **Clean later builds.** Each later build starts from the ready software
   image of its version, copies each repository fresh, and runs the
   install script. This branch takes the commits of open PR #194 for this.
   When PR #194 merges first, those commits drop out at the rebase.
9. **Clean refreshes.** User decision 2. Each refresh, after a push and
   daily, starts from the ready software image of the current version, or
   from the base image with the Conductive software step when none is
   ready. It copies each repository of the newest good build fresh, at its
   newest commit, and it runs the install script of the newest good build.
   - The newest good build is a job of kind `build`. The current org image
     can come from a refresh, so the refresh never takes the script of a
     refresh. `worker/lifecycle/build-changes-data.ts` reads the script in
     the same way. Source: the options check of 12 November 2026.
   - So a saved change of the install script or of the repositories still
     waits for Build computer, and the install script notice stays.
   - The limit of one refresh after a push in 30 minutes stays.
   - A failed refresh keeps the last good image.
   - A refresh records the current runner protocol version, as a build
     does, because it installs the current runner.
   - Source: design item 2 of the plan branch.
10. **Reuse.** The update code comes from PR #222 on the plan branch, and
    the stored versions from its Milestone 3. This branch leaves out the
    warning mark, the warning bar, the install script revision of each
    workspace, and the old org setup.

## Decisions

The options check of 12 November 2026 added options to decisions 1 and 2.
It also found the problems of decisions 3 and 4. A second options check
then added options to decisions 3 and 4. The reports are in
`.context/conductive-software-updates/`.

### 1. Admins cannot see a failed refresh

Open.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** UX wording.
- **Location:** `latestBuild` in `src/app/org-model.ts`, the Settings link
  mark in `src/shell/list/Sidebar.tsx`, the build card in
  `src/shell/settings/BuildCard.tsx`, its mockup in
  `docs/mockups/src/components/settings/ComputerTab.tsx`, and "The org
  image" in `docs/protocol/org-image.md`.
- **Background:** Today a refresh only fetches commits, and the Cloud
  computer tab does not show it. With design item 9, each refresh runs the
  install script of the newest good build. A new commit can break that
  script, for example with a new dependency that fails to install. The
  mark on the Settings link shows only a failed build today.
- **Problem:** A refresh can now fail for a reason that an admin can fix,
  but nothing shows the failure.
- **Impact if no action:** The org image keeps the old commits and the old
  Conductive software with no sign. New workspaces still work, because each
  start fetches and updates, but each first start is slower. The next
  build also fails with the same error, for example the build that an
  added repository starts.
- **Root question:** How does an admin learn that the org image stopped
  updating, and why?
- **Options:**
  - **A.** Keep refreshes off the tab. The Worker log keeps each failure.
    Effort: Small.
  - **B.** Show every refresh on the tab with its log and its result, as a
    build. The plan branch already drew these rows. B also takes in the
    open decisions 22, 28, and 32 of the plan branch: the length of the
    history, the logs, and the name of a refresh. Effort: Large.
  - **C.** Show a refresh only while it is the newest job and it failed. The
    build card then shows the end of its log and Try again. A good refresh
    stays hidden. This needs one mockup state and a small UI change.
    Effort: Medium.
  - **D.** As C, with one new selector for the build card and the Settings
    link mark. It returns the newest failed build, or else the newest
    failed refresh with no later good job, also while a retry runs. The
    mark then shows for a failed refresh, and its hidden text names a
    refresh. `latestBuild` stays as it is, so the repository notice and
    New workspace still read only builds. Effort: Medium.
  - **E.** A notice of its own above the build card, while the newest
    refresh failed and no good job came after it. It gives the age of the
    org image, the error, and the end of the log. An admin also gets Build
    computer. The Settings link mark shows. Cost: a third notice on the tab
    and a separate log view. Effort: Medium.
  - **F.** At the first failed refresh after a good job, the Worker emails
    each admin who is not suspended, once. The email gives the error and a
    link to the tab. Cost: new mail text and a full read of both legal
    pages. Without B, D, or E, the link opens a tab that shows no failure.
    Effort: Medium.
- **Left out:**
  - An email at each failed refresh, because a broken script would send
    one email for each push. F sends one email for each break instead.
  - A commit status on GitHub, because the daily refresh has no pushed
    commit, and it needs a new GitHub App permission.
  - A line in the start log of a new workspace, because the member who
    starts it cannot change the install script.
- **Wider fix:** D. One selector chooses the failed job to show, and both
  the card and the mark use it.
- **Previous examples:** Design item 2 and decision 22 of the plan branch.
- **Recommendation:** D. The first recommendation was C. D costs the same,
  and it also turns on the mark, the only sign that an admin sees without
  opening the tab.
- **Action:** ask the user, because each option changes what the Cloud
  computer tab shows, and B to E add new screen states.

### 2. A broken install script fails every refresh

Open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** The refresh after a push and the daily refresh in
  `worker/lifecycle/image-timers.ts:67-85` and `:150-170`.
- **Background:** After a failed build, the app starts no build by itself,
  because a broken install script fails again. This is decision 12 in
  `docs/protocol/org-image.md`. A refresh today runs no script, so that
  rule does not cover it. A retry of a refresh runs the same script, so
  only a later commit, a cause that goes away, or a build ends a failure.
- **Problem:** With design item 9, a broken install script fails each
  refresh. A busy org can start up to 49 failed refreshes each day: one
  after a push in each 30 minutes, and the daily refresh. A script that
  hangs runs to the 60-minute limit of each job.
- **Impact if no action:** One org can keep a build computer busy for most
  of the day, on the shared Boat account, with no gain.
- **Root question:** How does the app limit the starts that a lasting
  refresh failure costs each org, and still take in a fix soon after it
  lands? The options check replaced "When does the app try a refresh
  again after a refresh failed?", because the options trade cost against
  the time to recover.
- **Options:**
  - **A.** Change nothing. Each push and the daily timer still start a
    refresh. Effort: Small.
  - **B.** After a failed refresh, only the daily refresh runs, until a
    refresh or a build succeeds. Effort: Small.
  - **C.** After a failed refresh, no refresh runs until an admin starts a
    build or Try again, as after a failed build. Effort: Small.
  - **D.** After each failed refresh in a row, the next automatic refresh
    waits twice as long: 1, 2, 4, 8, and 16 hours, then at most 24 hours.
    A push during the wait marks one waiting refresh. A good job ends the
    wait. About 5 failed tries on the first day, then 1 each day.
    Effort: Small.
  - **E.** A push starts at most one refresh in a longer time, such as 4
    hours, whatever the result. It also limits the cost of good refreshes.
    Risk: the org image can be 4 hours behind the default branch.
    Effort: Small.
- **Left out:**
  - A fetch-only refresh after a failed clean refresh, because it breaks
    user decision 2.
  - A shorter time limit for a refresh, because B and D already limit the
    number of tries.
- **Wider fix:** B. It bounds the cost of each failure, whatever its cause,
  and it still recovers by itself when a later commit fixes the cause.
- **Previous examples:** The rule after a failed build, decision 12 in
  `docs/protocol/org-image.md`.
- **Recommendation:** B. A failure that a later commit fixes then heals by
  itself, at one start each day at most. If decision 1 stays A, choose D,
  because no admin sees the failure. C fits only when decision 1 shows the
  failure.
- **Action:** ask the user, because B to E add a new rule for automatic
  refreshes.

### 3. Build computer does nothing while a refresh runs

Open.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `startImageBuild` in `worker/lifecycle/image-builds.ts:96-107`,
  `src/shell/settings/ComputerTab.tsx`, `src/shell/settings/BuildCard.tsx`,
  and `src/shell/settings/RepositoryChangeNotice.tsx`.
- **Background:** One job runs at a time in each org. While a job runs,
  Build computer and Try again return the running job and start nothing.
  The Cloud computer tab and the Repositories tab both offer these
  buttons. A refresh does not show on the tab, so an admin who presses
  Build computer during a refresh sees no change.
- **Problem:** Today a refresh only fetches. With design item 9, a refresh
  takes as long as a build, so the press does nothing for many minutes.
- **Impact if no action:** An admin presses Build computer, nothing
  happens, and the saved change still waits.
- **Root question:** What happens when an admin asks for a build while a
  refresh runs?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** The press stores one waiting build. The build starts when the
    refresh ends, whatever its result, for the admin who pressed. It runs
    before a waiting refresh after a push. The card shows that the build
    waits. The closest model is the waiting refresh after a push,
    `pending_push_refresh_at` in `org_images`. Effort: Medium.
  - **C.** The press stops the refresh and starts the build at once. The
    refresh work is lost. A stop needs its own state, or decisions 1 and 2
    count it as a failure. Effort: Medium.
  - **D.** The card shows a running refresh and its time. Build computer
    and Try again wait until it ends, as they do during a build. A press
    from an old tab gets a refusal with the reason. Cost: the admin must
    press again later. Effort: Medium.
  - **E.** The build starts at once, beside the refresh. A job replaces the
    image only when the current image comes from a job that began earlier.
    Cost: changes to the rule of one job at a time, and two computers run
    at once. Effort: Large.
- **Left out:** A switch of the running refresh into the build, because
  only a press before its install step gains.
- **Wider fix:** B, with one rule for the next job of an org: a waiting
  build runs first, and its success ends a waiting refresh after a push.
- **Previous examples:** The added build after a job, in "Added
  repositories" of `docs/protocol/org-image.md`.
- **Recommendation:** B. The admin's request then always runs, and no work
  is lost. E does the same at a larger cost.
- **Action:** ask the user, because B to E add new behaviour at the
  boundary between a build and a refresh, and each adds a screen state.

### 4. Image job data piles up

Open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review.
- **Category:** Performance.
- **Location:** `worker/lifecycle/build-log-retention.ts`,
  `readBuildHistory` in `worker/lifecycle/build-data.ts`, and
  `worker/members/purge-data.ts`.
- **Background:** Each image job keeps a row, a job record with a copy of
  the install script, and its log, up to 4 MiB, in D1. Only the purge of
  an org deletes them. Builds are rare, so this was no problem. The app
  shows only the log of the newest build, while it runs or after it
  failed.
- **Problem:** With design item 9, each refresh stores a full job and its
  log. One org can add up to 49 jobs each day.
- **Impact if no action:** The shared D1 database can grow by up to about
  200 MiB each day for one busy org. At that rate, one org fills the size
  limit of a D1 database in some weeks. I did not confirm that limit.
- **Root question:** Which image job data does the app keep, so that each
  log that a screen shows stays and one org cannot fill the shared
  database? The options check replaced "How long does the app keep the log
  of an image job?", because no option uses an age rule, and the job rows
  grow too.
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Keep the logs of the newest 20 jobs of each org, and delete each
    older log. The job rows stay. Effort: Small.
  - **C.** Keep each build log. Keep the log of a refresh only while it is
    the newest refresh or it failed. A broken script still adds up to 49
    failed logs each day. Effort: Small.
  - **D.** As B. Also delete each refresh row outside the newest 20 jobs,
    with its job record and its log. Keep each refresh that an org image
    names, and each job whose cleanup is not done. Build rows stay, so the
    history does not change. Effort: Small.
  - **E.** Move each finished log to R2, with a rule that deletes it after
    30 days. D1 keeps only the log of a running job. Cost: the log route
    reads two stores, and the deployment needs the bucket rule.
    Effort: Large.
- **Left out:** An age limit alone, and compression alone, because neither
  sets a bound on one busy org.
- **Wider fix:** D. It bounds the logs and the rows of each org for any
  kind of job.
- **Previous examples:** Decision 28 of the plan branch, which is open.
- **Recommendation:** D. The first recommendation was B. D costs the same,
  and it also bounds the refresh rows and the history list.
- **Action:** ask the user, because each option except A adds a rule that
  deletes stored data.

## Contract owners

- [Org image](../docs/protocol/org-image.md).
- [Agent runner](../docs/protocol/agent-runner.md).
- [Workspace life](../docs/protocol/workspace-life.md).
- [GitHub tokens](../docs/protocol/github-tokens.md), for the clone token
  risk of a refresh from an old image.
- The [lifecycle README](../worker/lifecycle/README.md), the
  [software image README](../worker/software-image/README.md), the
  [sandbox software README](../image/README.md), and
  [Runner archive and software image](../docs/deployment/runner-archive.md).

## Replaced ways

- A refresh starts from the last org image and only fetches → a refresh
  starts from the software image, copies fresh, and runs the install
  script. Consumers: `insertBuild` in
  `worker/lifecycle/build-admission-data.ts`, the refresh path in
  `worker/lifecycle/image-build-steps.ts:101-109`,
  `worker/lifecycle/image-builds.ts`, `buildSandboxIntent` in
  `worker/lifecycle/resource-intents.ts`, the refresh rules in
  `docs/protocol/org-image.md` and `docs/protocol/agent-runner.md`, the
  terms "Build" and "Refresh" in `docs/architecture.md`, and
  `image/install.md`. Moved in Milestones 3 and 6. The start from the last
  org image is deleted in Milestone 6.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

- [ ] Add the start step "Updating the agent and terminal software" to the
      start steps of a workspace.
- [ ] After the user answers decisions 1 and 3: add the states of the
      chosen options to the Cloud computer tab and the Settings link. Skip
      this TODO when both answers are option A.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] `docs/protocol/org-image.md`: clean later builds, clean refreshes,
      and the answers to decisions 1 to 4.
- [ ] `docs/protocol/agent-runner.md`: the update at each start, and a
      refresh that records the current runner protocol version. The pin
      rules stay.
- [ ] `docs/protocol/workspace-life.md`: the update at the first start,
      at each resume, and at the restart near day 14, and a failed update.
- [ ] `docs/protocol/github-tokens.md` and `docs/architecture.md`: no image
      job starts from an old org image.
- [ ] Read both legal pages and each public guide in full. Update each
      sentence that restates a changed fact, such as "a new image build
      gives the protection".
- [ ] Update or delete each follow-up item whose facts change:
      `full-image-build-for-agent-tools.md`, `org-image-clean-builds.md`,
      `runner-update-at-start.md`, `context-folder-live-new-runner.md`,
      and `context-attachments-live-older-runner.md`.

## Milestone 3: Clean later builds

Depends on: 2

- [ ] Take the commits of PR #194: a later build pins the ready software
      image of its version, starts from it, and copies each repository
      fresh.
- [ ] Run its tests, and update `image/install.md`,
      `worker/lifecycle/README.md`, and `worker/lifecycle/image-builds.md`.

## Milestone 4: Stored versions

Depends on: 2

- [ ] Add a D1 migration for the Conductive software version of each org
      image and of each workspace.
- [ ] Write the version at each build, each refresh, and each first start.
- [ ] Tests: a build from a software image and a build with the Conductive
      software step store the right version. A first start stores the
      version of its org image.

## Milestone 5: Update at each start

Depends on: 4

- [ ] At each start, when the workspace's version is older than the
      current one, run the Conductive software step before the runner
      starts, as its own start step. Store the new version after a good
      install. Copy the code from PR #222, without the warning mark.
- [ ] Run the same update at the restart near day 14 of a workspace that
      is not archived.
- [ ] A failed update: the start goes on, and the start log and the Worker
      log show the failure.
- [ ] Change the 409 `preview_relay_unavailable` text in
      `worker/previews/relay.ts` and `worker/previews/README.md` to the
      update at the next start.
- [ ] Tests: an old workspace gets the current version, and its runner
      starts. A current workspace runs no update. A failed update still
      starts the runner and stores no version. The new runner reads the
      state of the old runner.

## Milestone 6: Clean refreshes

Depends on: 3, 4

- [ ] Run each refresh as a clean build with the install script and the
      repositories of the newest good build. Record the current runner
      protocol version.
- [ ] Apply the answers to decisions 2, 3, and 4 in the Worker.
- [ ] With decision 4 D, also bound the job rows that `readBuildHistory`
      in `worker/lifecycle/build-data.ts` sends to each member.
- [ ] Delete the start from the last org image for image jobs.
- [ ] Tests: a refresh after a push and a daily refresh start from the
      software image and run the install script of the newest good build.
      A saved change of the script does not reach a refresh, also for a
      refresh after a refresh with a saved change between them. A failed
      refresh keeps the last good image.

## Milestone 7: Refreshes on the Cloud computer tab

Tags: ui

Depends on: 1, 6

- [ ] Apply the answers to decisions 1 and 3 in the app, as the mockups of
      Milestone 1 show. Skip this milestone when both answers are option A.

## Milestone 8: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and `npm run check`.
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

- [ ] After a deploy that changes the Conductive software, resume an
      existing workspace. Check that it runs the new runner. Measure the
      time of the update step.
- [ ] Check that the next refresh of a real org starts from the software
      image and runs its install script.
