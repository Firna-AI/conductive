# Software image, clean builds, and app updates

Status: Active. On branch `calummoore/build-image-install-order`, no pull
request yet. The pull request that completes the work deletes this plan,
as the `plans` skill says.

Each build of an org image installs the app's own software in its software
step: the agent runner, the private Node, the terminal service, the agent
tools, the git credential helper, and the GitHub CLI. The runner archive
alone is about 320 MiB. The first build of an org starts from the
provider's base image, so it always pays the full install. A later build
starts from the last org image and installs the app software again on top
of the output of every earlier install script. A refresh and a workspace
start install nothing, so a release never reaches an existing org image or
workspace by itself.

This change adds a software image: one saved snapshot for each app
software version, which holds only the app software. The deploy run builds
it. The first build and each later build start from it, copy the
repositories, and run the install script when it is not empty. A daily
refresh brings each org image to the current app software. A later
workspace start of an old workspace installs the current app software. An
old workspace also shows a notice when the org setup changed, with an
action that runs the install script. The moments that this plan names are
the terms of the [architecture doc](../docs/architecture.md#terms).

Not covered: the start of a later build when an admin adds a repository.
`plans/added-repository-builds.md` on branch
`calummoore/new-repo-build-recreation` owns it.

Contract owners:

- [Org image](../docs/protocol/org-image.md), with a new page
  `docs/protocol/software-image.md`.
- [Workspace life](../docs/protocol/workspace-life.md) and
  [Agent runner](../docs/protocol/agent-runner.md).
- [Access and security](../docs/protocol/access-and-security.md),
  [Isolation](../docs/protocol/isolation.md), and
  [GitHub tokens](../docs/protocol/github-tokens.md).
- [Automatic deploys](../docs/automatic-deploys.md).
- The [lifecycle README](../worker/lifecycle/README.md) and the
  [sandbox software README](../image/README.md).

Replaced ways:

- A later build starts from the last org image → a later build starts from
  the software image. Consumers: `buildSandboxIntent` in
  `worker/lifecycle/resource-intents.ts`, the build admission in
  `worker/lifecycle/image-builds.ts`, `docs/protocol/org-image.md`, the
  risk text in `docs/protocol/github-tokens.md`, the term "Build" in
  `docs/architecture.md`, `worker/lifecycle/README.md`, and
  `image/install.md`. Moved in Milestones 2 and 7. The old start image of
  a build is deleted in Milestone 7.
- The software step in every build → the software step only in a build
  without a software image of its version, and in the update of an old
  workspace. Consumers: `advanceBuildCommand` in
  `worker/lifecycle/build-execution.ts`, `image/README.md`, and
  `image/install.md`. Moved in Milestones 7 and 9.

## Design

Each item marked "my call" is a design call of the planning agent, made on
9 or 10 November 2026.

1. **Name.** My call: the new snapshot is the "software image". The user
   calls it the "global base image", but "base image" already names the
   provider's image in `src/shared/base-image.ts` and in the protocol docs.
2. **App software version.** The Worker computes it as the SHA-256 digest
   of the exact commands of the software step: the agent tools install and
   the image software install. My call: hash the commands, not a version
   number that a person keeps, so that no change of the app software misses
   a new software image. My call: a newer ttyd, tmux, or GitHub CLI package
   makes no new version, because each new version installs the newest
   packages.
3. **Software image build.** One coordinator object, named
   `software-image` on the workspace object class like the
   `org-image:<orgId>` coordinators, runs one build at a time. Its phases
   are allocate, software, snapshot, publish, and cleanup. It reuses the
   provider retry policy, the resource intents, and the command journal of
   org builds. My call: its sandbox starts from the provider's base image
   with no env var, no token, and no repository, because all orgs share
   the software image, so it must hold no secret and no org data.
4. **Time limit.** My call: a software image build has the time limit of an
   org image build, 60 minutes, unless decision 5 sets a shorter one. The
   deploy step waits at most 15 minutes, because the deploy job has a time
   limit of 30 minutes. A build that still runs when the wait ends goes on
   in the Worker.
5. **Output.** My call: D1 keeps the state of each version and the last
   64 KiB of its output, so the deploy step can print the end of a failed
   build.
6. **Cleanup.** My call: after a software image becomes ready, the cleanup
   deletes each other software image that no running image job names. A
   rollback with `wrangler rollback` then finds no software image of its
   version, and builds fall back to the full install until the next deploy
   run.
7. **Deploy route.** `POST /v1/deploy/software-image` on
   `api.conductive.build` starts the build of the Worker's current
   version, when no software image of that version is ready or building.
   `GET` on the same path returns the state, and on a failure, the error
   and the end of the output. Each request names the version tag of the
   deploy run, the short commit hash that `wrangler deploy --tag` sets. My
   call: the Worker answers 409 while another version of the Worker serves
   the request. The Worker reads its own tag from the `version_metadata`
   binding. The gate checks a token for each deploy run, as decision 6
   says: the step "Deploy Worker" makes a random token, masks it, and sets
   its SHA-256 digest with `--var`, and the Worker accepts the token only
   for its own version tag and for 30 minutes after that version was made.
8. **Deploy step.** After "Check health", a new step of the job `deploy`
   calls `POST`, then calls `GET` every 10 seconds until the state is
   ready or failed, for at most 15 minutes. The run summary names the
   result. A failure or a timeout follows decision 5. My call: the step
   does not fail the job `deploy`. It sets an output, and a later job with
   no environment fails the run when decision 5 says so. So GitHub never
   records a live deploy as a failed deployment of `production`, and the
   token never leaves the job `deploy`. My call: the wait holds the
   concurrency group `deploy-production`, so a later merge can wait up to
   15 minutes more. Only a deploy run that changes the app software version
   waits for a build.
9. **First build and later build.** Each one starts from the ready software
   image of its app software version, copies each chosen repository fresh,
   runs the install script, and saves the org image (decisions 2, 4, and
   9). Without such a software image, it starts from the provider's base
   image and runs the software step after the copy of the repositories, as
   today. My call: a missing
   software image slows a build and never fails it. The user's design: a
   build skips the install script when the script is empty, and its build
   log then shows no install step.
10. **Records.** The org image records the app software version of its
    software image and the revision of its install script. Each workspace
    records the app software version and the org image that it has. The
    build of each org image already records its repositories and their
    folders, and each workspace already records its folders.
11. **Refresh.** A refresh after a push starts from the last org image and
    copies the new commits, as today. The daily refresh follows decision 7
    E and the open decision 12.
12. **Workspace start of an old workspace.** When the workspace's app
    software version is older than the current one, the start resumes the
    sandbox, runs the software step, records the new version, and then
    starts the runner (decision 8 B). The start shows this as its own start
    step. My call, from the two guards of decision 8: when the update fails,
    the start goes on with the old app software and warns, because the
    Worker still serves older runner protocol versions. My call: the
    first workspace start runs the same update when the org image holds an
    older app software version, because the reason of decision 8 is that
    every workspace gets the fixes.
13. **Old org setup.** When the org image of a workspace is older than the
    current org image, the workspace shows a notice. Its action runs the
    install script in the workspace when the user chooses (decision 11 C).
    My call: the action runs the install script of the current org image,
    from the folder of the workspace's repository, with the env vars of
    the workspace, and shows its output.
14. **Docs.** My call: the requirements of the software image go to a new
    protocol page, `docs/protocol/software-image.md`. Each long protocol
    doc gets only a link and the lines that must change, because
    `plans/follow-ups/protocol-docs-split.md` owns the split of the long
    docs.

## Decisions

The options check of the `implementation-review` skill ran over decisions
4, 5, and 6 on 9 November 2026, and over decisions 1, 12, and 13 on 10
November 2026. Its reports are in `.context/software-image/`.

### 1. First and later builds: confusing software step label

Open.

- **Severity:** Low. **Effort:** Small.
- **Source:** Review.
- **Category:** UX wording.
- **Location:** `worker/lifecycle/build-execution.ts:136`
- **Terms:**
  - **Build log:** the live output of a first build or a later build, on
    the Cloud computer tab of the org settings.
- **Background:** Moments: a build without a software image, and the later
  workspace start of an old workspace. The software step writes
  "Installing the cloud computer software." to the build log. The section
  of the org's own script has the title "Install software". With this
  plan, most builds show no software step, but each later workspace start
  after a new app software version shows the update as a start step. On 9
  November 2026, six merges changed the runner, the agent tools, or the
  image software. The first-build mockup in
  `docs/mockups/src/fixtures/terminal.ts` shows the label after the copy.
- **Problem:** The label of the software step uses almost the same words as
  the section title. An admin or a member thinks that it is the org's own
  script.
- **Impact if no action:** People can think that a build or a start runs
  hidden content.
- **Root question:** How do admins and members tell the app's own software
  step from the org's install script, in the build log and in the start
  steps? The options check replaced "How does the build log show which
  work is the app's own work and which is the admin's script?", because
  the start steps of decision 8 show the same step.
- **Options:**
  - **A.** Change the build log label, for example to "Installing the agent
    and terminal software." Update the first-build mockup to match. Effort:
    Small.
  - **B.** Add one sentence to the "Install software" description: "Each
    cloud computer includes the app's agent and terminal software before
    this script runs." This changes the mockup and the app. Effort: Small.
  - **C.** Show each step as a named row on the build card, with the
    install script in its own row. This needs a new mockup and UI work.
    Effort: Medium.
  - **D.** Rename the section "Install software" to "Install script", which
    matches the protocol term and the next section, "Startup script". This
    touches the mockup, the admin view, the member view, five test files,
    and the row "Install software script" in
    `src/marketing/from-conductor/areas/cloud.ts`. Effort: Small.
  - **E.** As A, and give the start step of an old workspace the same name,
    such as "Updating the agent and terminal software". Both labels read
    one name in the Worker, and `docs/protocol/software-image.md` states
    it. Effort: Small.
- **Left out:** Change nothing, because a fallback build keeps the unclear
  label, and the start step of decision 8 needs words anyway.
- **Wider fix:** E. One name in one place keeps each label of the app's
  software apart from the install script.
- **Previous examples:** None found.
- **Related:** Decision 8: its start step needs the name. Decision 2: a
  build from the software image shows no software step.
- **Recommendation:** E. The first recommendation was A. Members see the
  start step at many later workspace starts, so one name must fix both
  places.
- **Action:** ask the user, because no copy rule chooses between the
  correct texts for the new name.

### 2. A software image for first builds

- **Chosen:** B, by the user on 9 November 2026. The recommendation was A.
- **Options:** **A.** Skip the parts that the org image already holds, in
  each build. **B.** A software image for each app software version. First
  builds start from it. **C.** Install the app software at each workspace
  start, not in the org image.
- **Left out:** Change nothing, because each build keeps the repeated
  install.
- **Reason:** B makes the first build of each org fast.

### 3. Build the software image in the deploy run

- **Chosen:** C, by the user on 9 November 2026. The recommendation was A.
- **Options:** **A.** The Worker's cron job builds the software image when
  the app software version changes. **B.** The first org build after a
  release builds it first. **C.** A last step of the deploy run asks the
  Worker to build it and waits for the result.
- **Left out:** The deploy run builds the snapshot with the Boat key,
  because C gives the same result without the key in GitHub. A manual
  command after each deploy, because it is a manual step.
- **Reason:** the deploy run shows the result.

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

### 5. Deploy run: when the software image build fails

Open.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/deploy.yml`, the new last step.
- **Background:** Moment: the deploy run, after the new Worker is live. Its
  last step asks for the software image and waits. Without a software
  image, a build does the full install.
- **Problem:** No rule says whether a failed build, or a wait that ends
  first, fails the deploy run.
- **Impact if no action:** A quiet failure keeps builds slow, and nobody
  sees why.
- **Root question:** How does the person who merged learn that a deploy run
  made no software image?
- **Options:**
  - **A.** Fail the deploy run. GitHub alerts the person who started it.
    The live Worker stays. Effort: Small.
  - **B.** Pass the run with a warning in its summary. Effort: Small.
  - **C.** Fail the run when the build fails. Pass with a warning when only
    the wait ends first. Effort: Small.
  - **D.** As A, and give the build a time limit below the wait, such as
    12 minutes. A slow but healthy build then fails. Effort: Small.
  - **E.** As A, but after a failed build, the step asks once for a new
    one within the same wait. A real failure costs a second sandbox.
    Effort: Small.
- **Left out:** A Worker cron that starts a build when its version has
  none, because it reopens decision 3. A Worker warning only, because
  nobody reads the Worker logs without an alert.
- **Wider fix:** None. The alert for each failed run is option C of
  `plans/follow-ups/deploy-alerts-for-started-runs.md`.
- **Previous examples:** A failed health check already fails the deploy
  run.
- **Related:** `plans/follow-ups/deploy-alerts-for-started-runs.md`: a run
  that the workflow starts by itself alerts nobody.
- **Recommendation:** A. The deploy run builds the software image so that
  the run shows the result, and a warning hides it.
- **Action:** ask the user, because a failed build becomes a new failure of
  the deploy run, and the repository rules leave each new failure to the
  user.

### 6. Deploy run: how the Worker trusts its request

- **Chosen:** D, a token for each deploy run, by the user on 10 November
  2026. The first recommendation was B.
- **Options:** **A.** A shared secret in GitHub and the Worker. **B.** A
  GitHub OIDC token. **C.** No credential, with a rate limit. **D.** A
  token for each deploy run, with only its digest on the Worker. **E.** No
  route: a request row in D1 and a cron that runs each minute.
- **Left out:** A Cloudflare Access service token, a Worker that starts the
  build by itself, and a request signed with a stored private key.
- **Reason:** D stores no secret, needs no setup, and its check is one
  digest comparison.

### 7. Refresh: org images keep old app software

- **Chosen:** E, by the user on 10 November 2026. The first recommendation
  was A. The user added: "we should only install user scripts if they
  have changed". Decision 12 settles how that rule meets E.
- **Options:** **A.** Each refresh runs the software step when the image is
  old. **B.** Update scripts for each release. **C.** A later build for each
  old org after a release. **D.** Each refresh is a clean build. **E.** A
  refresh after a push copies the new commits, as today, and the daily
  refresh is a clean build.
- **Reason:** pushes stay fast, and each org image gets the current app
  software within a day.

### 8. Later workspace start: old workspaces keep old app software

- **Chosen:** B, with the two guards of the recommendation, by the user on
  10 November 2026. The first recommendation was C.
- **Options:** **A.** No update; the Worker serves each old protocol
  version. **B.** Update at the later workspace start when the version is
  old. **C.** Update only when the Worker no longer serves the runner's
  protocol version. **D.** Download in the background, and switch at the
  next workspace start.
- **Reason:** every workspace gets the fixes, for one slower start after
  each release.

### 9. Later build: the install script runs again on top

- **Chosen:** B, by the user on 10 November 2026, in the same design
  message as decision 4. The recommendation was B.
- **Options:** **A.** Keep later builds on the last org image, and say that
  the script must be safe to run more than once. **B.** Start each later
  build from the software image. **C.** As A, with a variable for the kind
  of build. **D.** As A, with a "Clean build" choice.
- **Reason:** a script that always runs on a clean machine gives the same
  image each time, and nothing old stays.

### 10. First workspace start: a repository that the image lacks

- **Chosen:** D, by the user on 10 November 2026: copy the repository at
  the first workspace start (B), and start a later build when an admin
  adds a repository (C). The user named workspace #490 for C, which is
  `plans/added-repository-builds.md` on branch
  `calummoore/new-repo-build-recreation`. Decision 13 holds a conflict
  between B and that plan.
- **Options:** **A.** Keep today's rule. **B.** Copy the missing repository
  at the first workspace start. **C.** Start a later build when the
  repositories change. **D.** B and C.
- **Reason:** a member never waits for a manual build.

### 11. Later workspace start: old workspaces miss new org setup

- **Chosen:** C, by the user on 10 November 2026. The recommendation was C.
- **Options:** **A.** No update. **B.** Run the install script again at the
  later workspace start. **C.** A notice with an action that runs the
  install script when the user chooses.
- **Left out:** Replace the workspace's disk with the new org image,
  because it loses the user's files.
- **Reason:** the user keeps control of their files.

### 12. Daily refresh: when the install script runs

Open.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/image-build-steps.ts:97`, the refresh
  path, and the job admission in `worker/lifecycle/image-builds.ts:119`.
- **Terms:**
  - **Clean refresh:** a daily refresh that starts from the software image,
    copies each repository fresh, and runs the install script, as
    decision 7 E says.
  - **Update on top:** the software step on top of the last org image,
    which keeps the org setup. Decision 8 B uses it in old workspaces.
- **Background:** Moment: the daily refresh. A clean refresh must run the
  install script, because the software image holds no org setup. The user
  asked to run the install script only when it changed. Today each change
  of the install script or the repositories waits for Build computer
  (`docs/protocol/org-image.md`), and the added repository plan keeps
  that rule. The Cloud computer tab hides each refresh, because a refresh
  only fetches commits (`src/app/org-model.ts:263`).
- **Problem:** "Only when it changed" conflicts with a clean daily refresh,
  which always needs the script.
- **Impact if no action:** The implementation must guess: the script reruns
  unchanged each day, or the daily refresh loses the org setup.
- **Root question:** How does a daily refresh give an org image the current
  app software: by a clean rebuild that runs the install script again, or
  by an update on top of the org setup? The options check replaced "When
  may a daily refresh run the install script without an admin?", because
  that question hid the update on top.
- **Options:**
  - **A.** Every daily refresh is clean and runs the install script. The
    script reruns each day, also when nothing changed. The tab must then
    show a refresh that runs the script. Effort: Medium.
  - **B.** The daily refresh is clean only when the install script, the
    repositories, or the app software version changed since the org image
    was made. Otherwise it copies only the new commits. A saved change then
    goes live without Build computer. Effort: Medium.
  - **C.** The daily refresh is clean only when the install script or the
    repositories changed. When only the app software version changed, it
    runs the update on top. A saved change then goes live without Build
    computer, and a change of only the repositories reruns the unchanged
    script. Effort: Medium.
  - **D.** No clean daily refresh. The daily refresh runs the update on top
    when the app software version is old. The install script runs only in
    a first build and a later build, and each saved change still waits for
    Build computer. A script that changes the system, such as its apt
    sources, can break the update on top. Effort: Medium.
  - **E.** The daily refresh is clean only when the app software version
    changed. It runs the install script and the repositories of the newest
    good build, so a saved change still waits for Build computer. An
    unchanged script reruns about once a day during active development.
    Effort: Medium.
  - **F.** As E, and after a failed clean refresh, the app starts one
    refresh on the path of D at once. Effort: Large.
- **Left out:** Keep the output of the install script as its own layer,
  because the provider has no layers, and such a layer would put each
  org's files in the app's storage. Update the app software only at the
  first workspace start, because it fails the reason of decision 7 E. Run
  the install script again on top of the last org image, because it
  breaks decision 9 B. Release less often, because it delays each fix.
- **Wider fix:** A. It rebuilds from every input each day, so a new input
  needs no change. A breaks the user's rule, so it is not the
  recommendation.
- **Previous examples:** Decision 7 of this plan.
- **Related:** Decision 7: D replaces the clean daily refresh of E with the
  update on top, so the user must confirm it. Decision 8: D reuses its
  update on top. Decision 9: later builds stay clean in each option.
- **Recommendation:** D. The first recommendation was C. D keeps the
  user's rule and both reasons of decision 7 E: fast pushes, and the
  current app software within a day. It needs no change of the tab, and
  it keeps the rule that a saved change waits for Build computer.
- **Action:** ask the user, because the user's rule and decision 7 E
  conflict, and only the user can say which wins.

### 13. First workspace start: the added repository plan disagrees

Open. When the answer is B, C, D, E, or F, this plan or the added
repository plan gets a milestone for it.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** decision 240 of `plans/added-repository-builds.md` on
  branch `calummoore/new-repo-build-recreation`, decision 10 of this plan,
  and the create check in `worker/lifecycle/creation-claims.ts:65`.
- **Terms:**
  - **Waiting repository:** a repository that an admin chose, but that the
    org image does not hold yet.
- **Background:** Moment: the first workspace start. On 10 November 2026,
  the user chose decision 240 B and C in that plan. New workspace then
  shows a waiting repository as off, with a note, and the add of a
  repository starts a later build by itself. Later on 10 November, the
  user chose decision 10 D here, which also copies a waiting repository
  at the first workspace start.
- **Problem:** The two plans disagree about a waiting repository: off in
  New workspace there, usable at once here.
- **Impact if no action:** The second branch to merge breaks the rule of
  the first, or both rules ship and contradict each other.
- **Root question:** How soon, and with what setup, can a member start a
  workspace in a repository that an admin just added? The options check
  replaced a yes or no question about the build, because it hid the ways
  to shorten the wait.
- **Options:**
  - **A.** Keep decision 240: a waiting repository is off until the later
    build that its add starts ends. Drop 10 B from this plan. With
    decision 9, that build copies every repository and runs the whole
    install script, so the wait can be long. Effort: Small.
  - **B.** The added repository plan merges first. This plan then turns the
    off state into a choice that works: the first workspace start copies
    the repository. The copy has no org setup, and only the notice of
    decision 11 offers the install script. Effort: Large.
  - **C.** As B, but move the copy into the added repository plan before it
    merges. Effort: Large.
  - **D.** A refresh copies the added repository into the org image before
    the build of decision 240 C. New workspace offers it when that refresh
    ends, and the clean build then replaces the image. For the time of one
    build, the image holds a copy that the install script did not prepare.
    Effort: Medium.
  - **E.** Accept a create in a waiting repository, and hold it until a
    build that holds the repository succeeds. Effort: Large.
  - **F.** A waiting repository stays off while a build that will hold it
    runs. Otherwise, such as after a failed build, New workspace offers it
    and the first workspace start copies it. Effort: Large.
- **Left out:** Ship both rules unchanged, because they contradict. One org
  image for each repository, because it breaks decision 13 of
  `docs/protocol/org-image.md`.
- **Wider fix:** None. Decision 240 B already reads the menu and the create
  check from the same image data.
- **Previous examples:** Option F of decision 240, the same copy at the
  start, which that plan did not choose.
- **Related:** Decision 10.
- **Recommendation:** A. The build that the add starts already meets the
  reason of decision 10, that nobody waits for a manual build. A drops
  the newer choice 10 B. If no wait matters, D meets that goal at less
  cost than B or C.
- **Action:** ask the user, because the options of two plans conflict, and
  no rule settles which one wins.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The mockups show the build log without a software step, the start step of
an old workspace, and the notice of an old org setup.

- [ ] Update the build log fixtures in `docs/mockups/src/fixtures/terminal.ts`:
      a first build and a later build from the software image show no
      software step, and a build with an empty install script shows no
      install step. Apply decision 1 to the label of a build without a
      software image.
- [ ] Draw the start steps of an old workspace: the update of the app
      software, and the warning when the update fails.
- [ ] Draw the notice of an old org setup in a workspace, its action, and
      the output of the install script.
- [ ] When decision 13 is B or C, draw New workspace with a waiting
      repository that a member can choose.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the requirements of each moment that this plan changes.

- [ ] Add `docs/protocol/software-image.md`: what the software image holds,
      when the deploy run builds it, the gate of its route, how a first
      build and a later build use it, the fallback, the time limit, and
      the cleanup. Give decisions 2, 3, 4, 6, and 9 with their rejected
      options. Link it from "The org image" in `docs/protocol/org-image.md`
      and from each list of protocol docs.
- [ ] In `docs/protocol/org-image.md`, state that a first build and a later
      build start from the software image, copy each repository fresh, and
      skip an empty install script. State the refresh rules of decisions 7
      and 12.
- [ ] In `docs/protocol/workspace-life.md` and
      `docs/protocol/agent-runner.md`, state the update of an old workspace
      at its later workspace start (decision 8), and the notice of an old
      org setup (decision 11).
- [ ] In `docs/protocol/access-and-security.md`, add the gate of
      `/v1/deploy/software-image` under "Hostnames and gates". Under "The
      app's Boat key" in `docs/protocol/isolation.md`, state that the
      deploy run never gets the key.
- [ ] In `docs/protocol/github-tokens.md`, limit the risk text to the
      refresh, the one image job that still starts from the last org image.
- [ ] In `docs/architecture.md`, change the terms "Build" and "Refresh",
      and add the software image and an old workspace to the terms.
- [ ] In `docs/architecture/components.md`, under "Sandbox software", state
      that the Worker builds one software image for each app software
      version when the deploy run asks.
- [ ] In `docs/automatic-deploys.md`, add the software image step and its
      failure from decision 5. In `docs/deployment.md`, add the
      `version_metadata` binding and the token digest variable.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: App software version and records

Depends on: 2

- [ ] Compute the app software version, as design item 2 says. Tests: the
      same inputs give the same version. A change in the image software
      command, and a change in the tool sources, each give a new version.
- [ ] Add a D1 migration: the table of software images, the app software
      version and the install script revision of each org image, and the
      app software version and the org image of each workspace.
- [ ] Name software image snapshots within the saved image name rule of the
      provider, apart from org image names.

## Milestone 4: The software image build

Depends on: 3

- [ ] Add the coordinator of design item 3 and its phases.
- [ ] Apply the time limit of design item 4, the output tail of design item
      5, and the cleanup of design item 6.
- [ ] Tests with the fake provider: a build reaches ready. A failed command
      reaches failed and deletes its sandbox. A second request for the same
      version starts no second build. The cleanup keeps a software image
      that a running image job names.
- [ ] Update `worker/lifecycle/README.md`, `worker/lifecycle/image-builds.md`,
      and `image/README.md`.

## Milestone 5: The deploy route

Depends on: 4

- [ ] Add the `version_metadata` binding to `wrangler.jsonc`.
- [ ] Add `POST` and `GET` `/v1/deploy/software-image` on
      `api.conductive.build`, with the gate of design item 7.
- [ ] Tests: a request without a valid token, or after 30 minutes, is
      refused. A wrong version tag gets 409. Two `POST` requests start one
      build. `GET` gives the state, and on a failure, the error and the
      output tail.
- [ ] Update the routes in `worker/README.md`.

## Milestone 6: The deploy step

Depends on: 5

- [ ] In the step "Deploy Worker" of `.github/workflows/deploy.yml`, make
      the token and set its digest. Add the step of design item 8 after
      "Check health", and the later job that fails the run when decision 5
      says so.
- [ ] Run each shell block of the steps locally with stub commands. Save
      the proof under `.context/software-image/`, and name the file here.

## Milestone 7: Clean first and later builds

Depends on: 4

- [ ] Start a first build and a later build from the ready software image
      of the job's app software version, and skip the software step. Copy
      each repository fresh. Record the version and the install script
      revision of the new org image.
- [ ] Fall back to the provider's base image and the software step when no
      software image of the version is ready.
- [ ] Skip the install step when the install script is empty.
- [ ] Delete the start from the last org image for builds.
- [ ] Tests: a first build and a later build with a software image start
      from it and run no software command. A build without one runs the full
      install. A build with an empty script runs no install command. A
      refresh after a push does not change.
- [ ] Update `image/install.md`, `worker/lifecycle/image-builds.md`, and
      `worker/lifecycle/README.md`.

## Milestone 8: Daily refresh

Depends on: 7

- [ ] Apply decision 7 E with the answer to decision 12 to the daily
      refresh.
- [ ] When the answer to decision 12 runs the install script in a daily
      refresh, show that refresh on the Cloud computer tab, with its log
      and Try again, and store the revision of the script that it ran.
- [ ] Tests: a refresh after a push copies only the new commits. The daily
      refresh follows decision 12 for an unchanged image, a changed install
      script, and a new app software version.

## Milestone 9: Update an old workspace

Depends on: 3

- [ ] At a workspace start, when the workspace's app software version is
      older than the current one, run the software step before the runner
      starts, and record the new version. Show it as its own start step.
- [ ] When the update fails, go on with the old app software, and warn.
- [ ] Tests: an old workspace gets the current version and starts its
      runner. A current workspace runs no software step. A failed update
      still starts the runner.

## Milestone 10: Old org setup, backend

Depends on: 3

- [ ] Report to the workspace when its org image is older than the current
      org image.
- [ ] Add the action of design item 13, which runs the install script in
      the workspace and streams its output.
- [ ] Tests: a workspace of an older org image gets the notice, and one of
      the current org image does not. The action runs the current install
      script in the folder of the workspace's repository.

## Milestone 11: Old org setup, screens

Tags: ui

Depends on: 1, 10

- [ ] Show the notice and its action in the workspace, as the mockup of
      Milestone 1 draws them.
- [ ] Show the start step and the warning of Milestone 9.

## Milestone 12: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11

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

- [ ] Watch the first deploy run that builds a software image, and read its
      summary.
- [ ] Start the first build of a new test org. Check that it starts from
      the software image and runs no software step. Compare its time with a
      first build before this change.
- [ ] Resume a workspace that was created before a release. Check that its
      start updates the app software and that an agent answers.
