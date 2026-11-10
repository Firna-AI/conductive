# Software image for first builds

Status: Active. On branch `calummoore/build-image-install-order`, no pull
request yet. The pull request that completes the work deletes this plan,
as the `plans` skill says.

Each build of an org image installs the app's own software in its software
step: the agent runner, the private Node, the terminal service, the agent
tools, and the git credential helper. The runner archive alone is about
320 MiB. The first build of an org starts from an empty machine, so it
always pays the full install. A planned automatic first build in
onboarding makes that time part of the first experience of a new org.

This change adds a software image: one saved snapshot for each app
software version, which holds only the app software. The last step of
each deploy run asks the Worker to build it and waits for the result. The
first build of an org then starts from the software image of its app
software version and skips the software step. Later builds and refreshes
do not change, unless decision 4 says otherwise. The label of the
software step in the build log is a separate question, outside this plan.

Contract owners:

- [Org image](../docs/protocol/org-image.md), with a new page
  `docs/protocol/software-image.md`.
- [Isolation](../docs/protocol/isolation.md).
- [Access and security](../docs/protocol/access-and-security.md).
- [Automatic deploys](../docs/automatic-deploys.md).
- The [lifecycle README](../worker/lifecycle/README.md) and the
  [sandbox software README](../image/README.md).

## Design

Each item marked "my call" is a design call of the planning agent, made
on 9 November 2026.

1. **Name.** My call: the new snapshot is the "software image". The
   brainstorm called it the "app base image", but "base image" already
   names the provider's default image, in `src/shared/base-image.ts` and
   in the protocol docs.
2. **App software version.** The Worker computes it as the SHA-256 digest
   of the exact commands of the software step: the agent tools install and
   the image software install. These commands hold the runner archive URL
   and digest, the Node release and digest, the staged scripts, and the
   terminal setup. My call: hash the commands, not a version number that a
   person keeps, so that no change of the app software misses a new
   software image. My call: a newer ttyd or tmux package makes no new
   version, because each new version installs the newest packages.
3. **Software image build.** One coordinator object, named
   `software-image` on the workspace object class like the
   `org-image:<orgId>` coordinators, runs one build at a time. Its phases
   are allocate, software, snapshot, publish, and cleanup. It reuses the
   provider retry policy, the resource intents, and the command journal of
   org builds. My call: its sandbox starts as an empty machine with no env
   var, no token, and no repository, because all orgs share the software
   image, so it must hold no secret and no org data.
4. **Time limit.** My call: a software image build has the time limit of
   an org image build, 60 minutes, from decision 128 in Workspaces and
   sandboxes, unless decision 5 sets a shorter one. The deploy step waits
   at most 15 minutes, because the deploy job has a time limit of 30
   minutes. A build that is still running when the wait ends goes on in
   the Worker.
5. **Output.** My call: D1 keeps the state of each version and the last
   64 KiB of its output, so the deploy step can print the end of a failed
   build.
6. **First builds.** At admission, a build of an org without an org image
   records the ready software image of its app software version, when one
   exists. The build sandbox starts from it, and the build skips the
   software step. My call: the skip is safe, because the software image
   holds the output of the same commands, and no org code ran in it. My
   call: without such a software image, the build installs the app
   software itself, as it does today, so a missing software image slows a
   build and never fails it.
7. **Cleanup.** My call: after a software image becomes ready, the cleanup
   deletes each other software image that no running build names. A
   rollback with `wrangler rollback` then finds no software image of its
   version, and first builds fall back to the full install until the next
   deploy.
8. **Deploy route.** `POST /v1/deploy/software-image` on
   `api.conductive.build` starts the build of the Worker's current
   version, when no software image of that version is ready or building.
   `GET` on the same path returns the state, and on a failure, the error
   and the end of the output. Each request names the version tag of the
   deploy, the short commit hash that `wrangler deploy --tag` sets. My
   call: the Worker answers 409 while another version of the Worker serves
   the request, because an older version can still answer just after a
   deploy. The Worker reads its own tag from the `version_metadata`
   binding. The gate checks a token for each deploy run, as decision 6
   says.
9. **Deploy step.** After "Check health", a new step of the job `deploy`
   calls `POST`, then calls `GET` every 10 seconds until the state is
   ready or failed, for at most 15 minutes. The run summary names the
   result. A failure or a timeout follows decision 5. My call: the step
   does not fail the job `deploy`. It sets an output, and a later job with
   no environment fails the run when decision 5 says so. So GitHub never
   records a live deploy as a failed deployment of `production`, and a
   token of decision 6 never leaves the job `deploy`.
10. **Deploy order.** My call: the wait holds the concurrency group
    `deploy-production`, so a later merge can wait up to 15 minutes more.
    Only a deploy that changes the app software version waits for a
    build.
11. **Docs.** My call: the new requirements go to a new protocol page,
    `docs/protocol/software-image.md`. Each long protocol doc gets only a
    link and the lines that must change, because
    `plans/follow-ups/protocol-docs-split.md` owns the split of the long
    docs.

## Decisions

The options check of the `implementation-review` skill ran over decisions
4, 5, and 6 on 9 November 2026. Its report is in
`.context/software-image/options-check.md`.

### 2. A software image for first builds

- **Chosen:** B, by the user on 9 November 2026. The recommendation was A.
- **Background:** Each build installs the app software in its software
  step. The first build of an org starts from an empty machine. Each later
  build starts from the last org image, and installs the app software
  again.
- **Options:**
  - **A.** Skip the parts that the org image already holds, in each
    build. Effort: Medium.
  - **B.** A software image for each app software version. First builds
    start from it. Effort: Large.
  - **C.** Install the app software at each workspace start, not in the
    org image. Effort: Large.
- **Left out:** Change nothing, because each build keeps the repeated
  install.
- **Reason:** B makes the first build of each org fast. A does not.

### 3. Build the software image in the deploy run

- **Chosen:** C, by the user on 9 November 2026. The recommendation was A.
- **Options:**
  - **A.** The Worker's cron job builds the software image when the app
    software version changes. Effort: Small, on top of decision 2.
  - **B.** The first org build after a release builds the software image
    first. Effort: Medium.
  - **C.** A last step of the deploy run asks the Worker to build the
    software image and waits for the result. Effort: Medium.
- **Left out:** The deploy run builds the snapshot itself with the Boat
  key, because C gives the same result without the key in GitHub. A
  command that a person runs after each deploy, because it is a manual
  step.
- **Reason:** the deploy run shows the result of the build.

### 4. Later builds still reinstall the app software

Open. When the answer is A, C, or D, this plan gets a milestone for it.

- **Severity:** Low. **Effort:** Medium.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `image/install.sh:11`
- **Terms:**
  - **Mark:** a file in the org image that holds the digest of the
    installed runner archive.
- **Background:** Only the first build of an org starts from the software
  image. Each later build starts from the last org image, as decision 107
  of `plans/boat-native-remote-workspaces.md` keeps. Its software step
  downloads and unpacks the runner archive again, and runs `apt-get`
  again. The private Node install already skips its download when the
  image holds that release.
- **Problem:** With decision 2 alone, only the first build of each org
  gets faster.
- **Impact if no action:** Every later build keeps the repeated install. A
  guess, not a measurement: 15 to 45 seconds.
- **Root question:** Should later builds stop spending time on app
  software that their start image already holds?
- **Options:**
  - **A.** Add a check to the software step. The runner install skips the
    download when the mark matches the current archive and each runner
    file matches its saved hash. The terminal install skips `apt-get` when
    ttyd and tmux are installed. The software image build writes the same
    mark. Each later build reads about 800 MB of runner files, and builds
    no longer upgrade ttyd and tmux. Effort: Medium.
  - **B.** Keep later builds as they are. Effort: Small.
  - **C.** Start every build from the software image, as
    `plans/follow-ups/org-image-clean-builds.md` proposes. No build
    reinstalls the app software, and no program from an earlier install
    survives. Each build then runs the whole install script again with no
    caches. Effort: Medium.
  - **D.** Decide in the Worker. D1 keeps the app software version that
    each org image holds. A build sets it from its own software step or
    from its software image, and a refresh keeps it. A later build skips
    the whole software step when that version equals the current one. One
    rule then serves first builds, later builds, and each part that the
    software step gets later. Damage that an earlier install script did
    stays until the next version. ttyd and tmux still update at each new
    version. Effort: Medium.
- **Left out:** Install the app software at each workspace start, because
  it breaks decision 2. Run the software step while the repositories
  copy, because `docs/protocol/github-tokens.md` allows no software
  step before the Worker revokes the clone token. Pinned ttyd and tmux
  downloads alone, because the runner still installs again.
- **Wider fix:** D. One rule on the version of the whole software step
  covers each part, also parts added later.
- **Previous examples:** `plans/follow-ups/org-image-clean-builds.md`.
- **Related:** Decision 2. D reuses the version and the skip of the first
  builds.
- **Recommendation:** D. The first recommendation was A. D reuses the
  skip and the version that this plan builds anyway, reads no 800 MB of
  files, and keeps ttyd and tmux updated.
- **Action:** ask the user, because the user chose B over A for decision
  2, and each of A, C, and D adds work that the user did not choose.

### 5. What a failed software image build does to the deploy run

Open.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/deploy.yml`, the new last step.
- **Terms:**
  - **Deploy run:** one run of the GitHub Actions workflow `Deploy`, which
    deploys each push to `main`.
- **Background:** The last step of the deploy run asks the Worker to build
  the software image and waits for the result. The new Worker is already
  live at that point. Without a software image, a first build installs
  the app software itself.
- **Problem:** No rule says whether a failed build, or a wait that ends
  first, fails the deploy run.
- **Impact if no action:** The implementation must guess. A quiet failure
  keeps first builds slow, and nobody sees why.
- **Root question:** How does the person who merged learn that a deploy
  has no software image?
- **Options:**
  - **A.** Fail the deploy run. GitHub then alerts the person who started
    the run. The live Worker stays, and first builds fall back to the full
    install. Effort: Small.
  - **B.** Pass the run with a warning in its summary. A failure stays
    quiet until someone reads the run. Effort: Small.
  - **C.** Fail the run when the build fails. Pass with a warning when
    only the wait ends first, because the build goes on in the Worker.
    Effort: Small.
  - **D.** As A, and give the build a time limit below the wait, such as
    12 minutes. The step then always sees ready or failed. A slow but
    healthy build then fails. Effort: Small.
  - **E.** As A, but after a failed build, the step asks once for a new
    one within the same wait. One failed download then fails no deploy
    run. A real failure costs a second sandbox and a longer run. Effort:
    Small.
- **Left out:** A Worker cron that starts a build when its version has
  none, because it reopens decision 3. A Worker warning at each first
  build without a software image, because nobody reads the Worker logs
  without an alert.
- **Wider fix:** None. The alert for each failed run is option C of
  `plans/follow-ups/deploy-alerts-for-started-runs.md`, outside this plan.
- **Previous examples:** The deploy run already fails when its health
  check fails after the deploy, as `docs/automatic-deploys.md` says.
- **Related:** `plans/follow-ups/deploy-alerts-for-started-runs.md`: a
  run that the job `redeploy` starts alerts no person.
- **Recommendation:** A. The deploy run builds the software image so that
  the run shows the result, and a warning hides it. D and E each remove a
  rare false alarm but add a new cost.
- **Action:** ask the user, because a failed build becomes a new failure
  of the deploy run, and the repository rules leave each new failure to
  the user.

### 6. How the deploy run proves itself to the Worker

**Chosen:** D, a token for each deploy run, by the user on 10 November
2026. The recommendation was D.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** The new route `/v1/deploy/software-image` on
  `api.conductive.build`.
- **Terms:**
  - **OIDC token:** a short-lived token that GitHub signs for one workflow
    run. It names the repository, the branch, the environment, and the
    workflow.
- **Background:** The gate of `api.conductive.build` accepts a webhook
  signature, a workspace token, or a one-use build grant. None of them
  fits a deploy run. The new route starts a build in the app's provider
  account, which costs money and uses the start limit that all orgs share.
  It reads no org data.
- **Problem:** The route needs a gate that only the deploy run on `main`
  passes.
- **Impact if no action:** Without a gate, anyone can start builds and
  read their state.
- **Root question:** Who may start a software image build and read its
  state, and what stops everyone else?
- **Options:**
  - **A.** A shared secret. The user stores one random value as a secret
    of the GitHub environment `production` and as a Worker secret. The
    Worker compares the two in constant time. A leaked value works until
    someone replaces it. Effort: Small.
  - **B.** A GitHub OIDC token. The step asks GitHub for a token for the
    Worker's audience. The Worker checks its signature with the keys that
    GitHub publishes. It checks the repository and owner IDs, the branch
    `main`, the environment `production`, and the workflow `deploy.yml`.
    No secret is stored. Each step of a job with `id-token: write` can ask
    for a token, also the package scripts that `npm ci` runs, unless the
    request runs in its own job. Effort: Medium.
  - **C.** No credential. The route can only start the build of the
    Worker's own version, at most once in 10 minutes. Anyone can then
    start a retry after a failure, up to 144 starts a day from the shared
    start limit, and read the state. Effort: Small.
  - **D.** A token for each deploy. The step "Deploy Worker" makes a
    random token, masks it in the log, and gives the new Worker its
    SHA-256 digest with `--var`. The software image step sends the token.
    The Worker accepts it only for its own version tag, and only for 30
    minutes after Cloudflare created that version. Nothing is stored, and
    the user sets nothing up. The token moves only between steps of the
    job `deploy`. Effort: Small.
  - **E.** No route. The deploy step writes a request row to D1 with the
    Cloudflare token that it already holds, and reads the state the same
    way. A Worker cron that runs each minute starts the requested build.
    The workflow then depends on the D1 schema. Effort: Medium.
- **Left out:** A Cloudflare Access service token in front of the route,
  because A gives the same stored secret without a Zero Trust setup. The
  Worker starts the build by itself when it sees a new version, because it
  reopens decision 3. A request that the run signs with a private key
  stored in GitHub, because D is better on every point.
- **Wider fix:** None. No other workflow calls the Worker. B can replace
  D when a second caller comes.
- **Previous examples:** The deploy run keeps `CLOUDFLARE_API_TOKEN` in
  the environment `production`. The Mac release job keeps its signing
  secrets in the environment `desktop-release`.
- **Recommendation:** D. The first recommendation was B. Like B, D stores
  no secret and needs no setup, and its check is one digest comparison.
- **Action:** ask the user, because the route adds a new gate on
  `api.conductive.build`, and no requirement covers it.

## Milestone 1: Documentation and protocol

Depends on: none

The docs state the requirements of the software image, its build in the
deploy run, and the gate of its route.

- [ ] Add `docs/protocol/software-image.md`: what the software image
      holds, when the deploy run builds it, how a first build uses it, the
      fallback, the time limit, and the cleanup. Give decisions 2 and 3
      with their rejected options. Link it from "The org image" in
      `docs/protocol/org-image.md`, and from each list of protocol docs.
- [ ] In `docs/protocol/access-and-security.md`, add the gate of
      `/v1/deploy/software-image` from decision 6 under "Hostnames and
      gates". Under "The app's Boat key" in `docs/protocol/isolation.md`,
      state that the deploy run never gets the key.
- [ ] In `docs/architecture/components.md`, under "Sandbox software", state that the
      Worker builds one software image for each app software version when
      the deploy run asks.
- [ ] In `docs/automatic-deploys.md`, add the software image step to
      "Steps of a run", and its failure from decision 5 to "When a deploy
      fails".
- [ ] In `docs/deployment.md`, add the `version_metadata` binding and the
      token digest variable that each deploy run sets, from decision 6.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: App software version and software image records

Depends on: 1

- [ ] Compute the app software version from the commands of the software
      step, as design item 2 says. Tests: the same inputs give the same
      version. A change in the image software command, and a change in the
      tool sources, each give a new version.
- [ ] Add a D1 migration: a table of software images with the version, the
      state, the snapshot name, the job fields, and the output tail. Add
      the software image name to the build jobs.
- [ ] Name software image snapshots within the saved image name rule of
      the provider, apart from org image names.

## Milestone 3: The software image build

Depends on: 2

- [ ] Add the coordinator of design item 3 and its phases: allocate,
      software, snapshot, publish, and cleanup.
- [ ] Reuse the provider retry policy, the resource intents, and the
      command journal of org builds. Apply the time limit of design item 4.
- [ ] Keep the output tail of design item 5.
- [ ] Clean up as design item 7 says.
- [ ] Tests with the fake provider: a build reaches ready. A failed
      command reaches failed and deletes its sandbox. A second request for
      the same version starts no second build. The cleanup keeps a
      software image that a running build names.
- [ ] Update `worker/lifecycle/README.md`, `worker/lifecycle/image-builds.md`,
      and `image/README.md`.

## Milestone 4: First builds start from the software image

Depends on: 3

- [ ] At the admission of a build of an org without an org image, record
      the ready software image of the job's app software version.
- [ ] Start the build sandbox from it, and skip the software step.
- [ ] Tests: a first build with a software image starts from it and runs
      no software command. A first build without one runs the full
      install. A later build and a refresh do not change.
- [ ] Update `image/install.md` and `worker/lifecycle/image-builds.md`.

## Milestone 5: The deploy route

Depends on: 3

- [ ] Add the `version_metadata` binding to `wrangler.jsonc`.
- [ ] Add `POST` and `GET` `/v1/deploy/software-image` on
      `api.conductive.build`, with the gate of decision 6.
- [ ] Answer 409 to a request whose version tag is not the Worker's own.
- [ ] Tests: a request without a valid credential is refused. A wrong
      version tag gets 409. Two `POST` requests start one build. `GET`
      gives the state, and on a failure, the error and the output tail.
- [ ] Update the routes in `worker/README.md`.

## Milestone 6: The deploy step

Depends on: 5

- [ ] Add the step of design item 9 after "Check health" in
      `.github/workflows/deploy.yml`, and the later job that fails the run
      when decision 5 says so.
- [ ] Run each shell block of the step locally with stub commands. Save
      the proof under `.context/software-image/`, and name the file here.

## Milestone 7: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6

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

- [ ] Watch the first deploy run that builds a software image, and read
      its summary.
- [ ] Start the first build of a new test org. Check that it starts from
      the software image and runs no software step. Compare its time with
      a first build before this change.
