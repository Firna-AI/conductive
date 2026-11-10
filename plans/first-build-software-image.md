# Software image for first builds

Status: Active. On branch `calummoore/bootstrap-v113`, no pull request
yet. The pull request that completes the work deletes this plan, as the
`plans` skill says.

The first build of a new org starts from the provider's base image. After
it copies the repositories, it installs all of the app's own software in
its software step: the agent runner, the private Node, the terminal
service, the agent tools, the git credential helper, and the GitHub CLI.
The runner archive alone is about 320 MiB. So each first build waits for
this install, also when the org's install script is empty.

This change adds a software image: one saved snapshot for each app
software version. It holds the provider's base image and the app software,
and no org data. Each deploy run asks the Worker to build it. The first
build of an org then starts from it, copies the repositories, and runs the
install script. It skips the software step. Without a ready software
image, a first build does the full install, as today.

The user chose this smaller scope on 10 November 2026, in workspace #513:
"we build a global snapshot, that runs/updates during deploy, so we can
skip the our own internal tools step [...] we can leave the other stuff,
this still helps making the first org build faster". The change takes
decisions 2, 3, and 6 of `plans/software-image.md` on branch
`calummoore/build-image-install-order` (workspace #413), with their
numbers, and its open decision 5.

Not covered. That plan keeps these parts:

- Later builds and refreshes. They keep today's steps: they start from
  the last org image, and a later build installs the app software again.
- The update of the app software in old workspaces and old org images.
- The copy of a missing repository at a workspace start, and the notice
  of an old org setup.
- The label of the software step, and the skip of an empty install
  script.

Contract owners:

- [Org image](../docs/protocol/org-image.md).
- [Access and security](../docs/protocol/access-and-security.md),
  [Isolation](../docs/protocol/isolation.md), and
  [GitHub tokens](../docs/protocol/github-tokens.md).
- [Automatic deploys](../docs/automatic-deploys.md) and
  [Deployment inputs](../docs/deployment.md).
- The [lifecycle README](../worker/lifecycle/README.md), the
  [sandbox software README](../image/README.md), and the new README of
  `worker/software-image/`.

## Design

Each item marked "my call" is a design call of the planning agent, made on
10 November 2026. An item "from #413" repeats a design call of the plan of
workspace #413.

1. **Name.** The new snapshot is the "software image", from #413. "Base
   image" already names the provider's image in `src/shared/base-image.ts`
   and in the protocol docs.
2. **App software version.** The Worker computes the SHA-256 digest of the
   exact commands of the software step: the agent tools install and the
   image software install, which hold the runner archive URL and digest.
   My call, from #413: hash the commands, not a number that a person
   keeps, so that no change of the app software misses a new software
   image. A newer ttyd, tmux, or GitHub CLI package makes no new version.
3. **What moves a build on.** My call: the requests of the deploy step.
   Each request reads the state of the build from D1, moves the build
   through each step that needs no wait, and answers with the state. The
   15-minute Cron Trigger also moves each unfinished software image build
   in the same way. So a build that the deploy step stopped waiting for
   still ends: it becomes ready, or it fails at its time limit and its
   sandbox goes. Such a build moves on only every 15 minutes, so it can
   reach its time limit first. Reason: this needs no new Durable Object
   class, no new alarm code, and no change of the test runtime. The plan
   of #413 used a coordinator object, which goes on at once after the
   wait. Each state change is a compare-and-set in D1, so a request and
   the Cron can run at the same time.
4. **Build steps.** Create the sandbox, wait until it is ready, install the
   agent tools, run the image software command detached in the command
   journal, clear the journal, save the snapshot, publish, and clean up.
   The steps reuse the resource intents, the command journal, and the
   provider state reads of org builds. My call, from #413: the sandbox
   starts from the provider's base image with no env var, no token, and no
   repository. All orgs share the software image, so it holds no secret
   and no org data.
5. **One build at a time.** My call: each provider account runs at most
   one software image build. A request for a newer version ends an
   unfinished build of an older version as failed, and starts the new one.
   A failed build starts again only for a request of another deploy run,
   which has another token digest. The deploy run of the failed build gets
   the failure. So Re-run all jobs, which deploys a new Worker version,
   retries a failed build. Reason, from the options check: a restart at
   each request hides a failure that the Cron records, or whose answer
   was lost.
6. **Time limit and output.** My call: a software image build has the
   60-minute limit of an org build. D1 keeps the state, the error, and the
   last 64 KiB of the output. Each answer gives the new output. An answer
   for a failed build gives the error and the kept output.
7. **Errors.** My call: a transient provider error keeps the state, and the
   next request or Cron run tries again. Any other provider error, a failed
   command, and the time limit fail the build. A failed build deletes its
   sandbox and its snapshot.
8. **Deploy route.** `POST /v1/deploy/software-image` on
   `api.conductive.build` builds the software image of the Worker's own
   version, or gives its state when one is ready. The body names the
   SHA-256 digest of the deploy token. The gate follows decision 6. My
   call: its checks run in this order.
   - A request with a cookie or an `Origin` header gets 403, as at the
     build grant route.
   - Without the `version_metadata` binding or the variable
     `CONDUCTIVE_DEPLOY_TOKEN_SHA256`, the route answers 404.
   - A digest in the body that is not the Worker's own variable gets 409.
     An older Worker version that still serves requests after the deploy
     gives this answer, and the deploy step tries again. The plan of #413
     compared the version tag instead. A re-run of one commit keeps its
     tag, but each deploy run makes a new token.
   - A token whose SHA-256 digest is not the variable gets 401.
   - A request more than 30 minutes after the Worker version was made gets
     401. The Worker reads that time from the `version_metadata` binding.
9. **Deploy token.** My call: the step "Deploy Worker" makes 32 random
   bytes, masks them, and keeps them in a file under `$RUNNER_TEMP` with
   mode 600. It sets the digest with
   `--var CONDUCTIVE_DEPLOY_TOKEN_SHA256:<digest>`. The token never leaves
   the job `deploy`.
10. **Deploy step.** After "Check health", a new step calls the route
    every 10 seconds, for at most 15 minutes. It prints each new phase and
    the new output, and it writes the result to the run summary. It tries
    again after a 409, a 429, a 5xx answer, the 501 answer of an older
    Worker without the route, and a network error. It stops at a 400, 401,
    403, or 404 answer. Decision 5 says what the run does when the step
    does not end with a ready software image. My call, from #413: when the
    run must fail, the step sets an output, and a later job with no
    environment fails the run. So GitHub never records a live deploy as a
    failed deployment of `production`. My call: the job `redeploy` also
    needs that later job, and that later job does nothing in a re-run of
    only some jobs. So Re-run failed jobs starts a new deploy run of
    `main`, as it does for the other jobs. My call, from #413: the wait
    holds the concurrency group `deploy-production`, so a later merge can
    wait up to 15 minutes more. A deploy run waits only when no software
    image of its version is ready. So after a failed build, the next
    deploy run builds again.
11. **First build.** At admission, a build without an org image in its
    provider account pins the ready software image of its app software
    version. The same D1 statement records the job and the pin. The build
    starts from that image, and it goes from the repository copy to the
    install script (decision 2). Without a ready software image, it starts
    from the provider's base image and runs the software step after the
    copy, as today. My call, from #413: a missing software image slows a
    build and never fails it. A later build and a refresh do not change.
12. **Cleanup.** My call: after a software image becomes ready, the Worker
    deletes each other software image of the same provider account that no
    unfinished build pins. The statement that marks an image for deletion
    checks the pins, so an admission and a cleanup cannot both win. The
    Cron Trigger retries the cleanup of a kept image. A rollback with
    `wrangler rollback` then finds no software image of its version, and
    first builds do the full install until the next deploy run that builds
    one. My call: only the Worker's own cleanup deletes a software image,
    so a build trusts the record of a ready image.
13. **Provider accounts.** My call: the deploy step builds the software
    image only in the default provider account. A first build in another
    account does the full install. Reason: no other account is in use yet.
14. **Code.** My call: the software image code goes into a new area,
    `worker/software-image/`, with its own README. The lifecycle area keeps
    the change of the first build.
15. **Docs.** My call: the requirements go into a new section of
    `docs/protocol/org-image.md`, which has 98 lines. The plan of #413
    planned a new page, for its larger scope.

## Decisions

The options check of the `implementation-review` skill ran over decision 5
for this scope on 10 November 2026. Its report is in
`.context/first-build-software-image/`.

### 2. A software image for first builds

- **Chosen:** B, by the user on 9 November 2026, in workspace #413. The
  recommendation was A.
- **Options:** **A.** Skip the parts that the org image already holds, in
  each build. **B.** A software image for each app software version. First
  builds start from it. **C.** Install the app software at each workspace
  start, not in the org image.
- **Left out:** Change nothing, because each build keeps the repeated
  install.
- **Reason:** B makes the first build of each org fast.

### 3. Build the software image in the deploy run

- **Chosen:** C, by the user on 9 November 2026, in workspace #413. The
  recommendation was A.
- **Options:** **A.** The Worker's cron job builds the software image when
  the app software version changes. **B.** The first org build after a
  release builds it first. **C.** A last step of the deploy run asks the
  Worker to build it and waits for the result.
- **Left out:** The deploy run builds the snapshot with the Boat key,
  because C gives the same result without the key in GitHub. A manual
  command after each deploy, because it is a manual step.
- **Reason:** the deploy run shows the result.

### 5. Deploy run: when the software image build fails

Open.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/deploy.yml`, the new last step of the
  job `deploy`.
- **Background:**
  - The new last step asks the Worker for the software image and waits up
    to 15 minutes. The new Worker is already live at that time.
  - The build moves on while the step waits, and after that only at each
    15-minute Cron run.
  - The step can end in four ways: a ready image, a failed build, a wait
    that ends first, or a stop at a 400, 401, 403, or 404 answer.
  - Without a software image, a first build does the full install, so no
    org build fails.
- **Problem:** No rule says what the deploy run does when its step ends
  without a ready software image.
- **Impact if no action:** A quiet failure keeps first builds slow, and
  nobody sees why.
- **Root question:** How does the person who started a deploy run learn
  that the run ended without a ready software image, whatever the cause?
  The options check replaced "How does the person who merged learn that a
  deploy run made no software image?", because no option covered a stop
  at a refused answer.
- **Options:**
  - **A.** Fail the deploy run when the build fails or the wait ends
    first. GitHub alerts the person who started the run. The live Worker
    stays. Effort: Small.
  - **B.** Pass the run with a warning in its summary. Effort: Small.
  - **C.** Fail the run when the build fails. Pass with a warning when only
    the wait ends first. Effort: Small.
  - **D.** As A, and give the build a time limit below the wait, such as
    12 minutes. A slow but healthy build then fails. Effort: Small.
  - **E.** As A, but after a failed build, the step asks once for a new
    one within the same wait. A real failure then costs a second sandbox.
    The request needs a retry mark, because a failed build starts again
    only for another deploy run. Effort: Small.
  - **F.** Fail the deploy run unless the step ends with a ready software
    image. One rule then covers a failed build, a wait that ends first,
    and a stop at a 400, 401, 403, or 404 answer. The summary names the
    cause. A failure that persists fails each later deploy run until
    someone fixes it. Effort: Small.
- **Left out:**
  - A Worker cron that starts a build when its version has none, because
    it reopens decision 3. A cron that only retries a failed build also
    fails the goal, because a build that only the Cron moves often passes
    its time limit.
  - A Worker warning only, because nobody reads the Worker logs without an
    alert.
  - A warning at the first failed build, and a failed run only when a
    later run fails the same version again. The person who started the
    first run then gets no alert.
  - The state of the software image in the app, such as in the operator
    section, because nobody opens it without an alert.
  - A scheduled workflow that checks the live software image, because it
    must read the state without the token of a deploy run. That breaks
    decision 6.
- **Wider fix:** F. It does not need to know the cause, so a new cause of a
  missing software image still fails the run. The alert for each failed
  run, whoever started it, is option C of
  `plans/follow-ups/deploy-alerts-for-started-runs.md`.
- **Previous examples:** A failed health check already fails the deploy
  run.
- **Related:** `plans/follow-ups/deploy-alerts-for-started-runs.md`: a run
  that the workflow starts by itself alerts nobody.
- **Recommendation:** F. The first recommendation was A. F keeps the rule
  of A, and it also fails a run that stopped for a cause that A does not
  name.
- **Action:** ask the user, because a failed build becomes a new failure of
  the deploy run, and the repository rules leave each new failure to the
  user.

### 6. Deploy run: how the Worker trusts its request

- **Chosen:** D, a token for each deploy run, by the user on 10 November
  2026, in workspace #413. The first recommendation was B.
- **Options:** **A.** A shared secret in GitHub and the Worker. **B.** A
  GitHub OIDC token. **C.** No credential, with a rate limit. **D.** A
  token for each deploy run, with only its digest on the Worker. **E.** No
  route: a request row in D1 and a cron that runs each minute.
- **Left out:** A Cloudflare Access service token, a Worker that starts the
  build by itself, and a request signed with a stored private key.
- **Reason:** D stores no secret, needs no setup, and its check is one
  digest comparison.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The first build of Firna, the new org of the sign-up, shows no software
step on the Cloud computer tab.

- [ ] In `docs/mockups/src/fixtures/terminal.ts`, make the first-build log
      of Firna go from the repository copy to "Running the install script",
      with no software step. Give the failed and the timed-out first builds
      a failure that a first build from the software image can meet, such
      as a failed repository copy. Update the comments of the fixtures.
- [ ] Run `npm run mockups:check`. Smoke-test the building, failed, and
      time-limit states of the first build of Firna.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The docs state the software image, the new start of a first build, and the
deploy step.

- [ ] In `docs/protocol/org-image.md`, add the section "The software
      image": what it holds, when the deploy run builds it, one build at a
      time, the time limit, the cleanup, and the fallback. Give decisions 2,
      3, and 6 with their rejected options. In "The first build", state
      that a first build starts from the software image, copies the
      repositories, runs the install script, and skips the software step.
- [ ] In `docs/protocol/access-and-security.md`, under "Hostnames and
      gates", add the gate of `/v1/deploy/software-image` (decision 6).
- [ ] In `docs/protocol/isolation.md`, state that the software image holds
      no org data and no secret, and that the deploy run never gets the
      Boat key.
- [ ] In `docs/protocol/github-tokens.md`, limit the risk text to the later
      build and the refresh, which start from the last org image. A first
      build starts where no org code has run.
- [ ] In `docs/architecture.md`, add the term "Software image", and change
      the terms "Build" and "Start". In `docs/architecture/components.md`,
      under "Sandbox software", state that the Worker builds one software
      image for each app software version when the deploy run asks.
- [ ] In `docs/automatic-deploys.md`, add the deploy token and the software
      image step to "Steps of a run", with the outcome of decision 5. In
      "When it runs" and "When a deploy fails", state how a run can fail
      after the new Worker is live, and how a re-run retries the software
      image. In `docs/deployment.md`, add the `version_metadata` binding
      and the variable `CONDUCTIVE_DEPLOY_TOKEN_SHA256`.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: App software version and records

Depends on: 2

- [ ] Compute the app software version of design item 2. Make the agent
      tools command a pure function, so that the build and the version use
      the same text. Tests: the same inputs give the same version. A change
      of the runner archive and a change of the tool sources each give a
      new version.
- [ ] Add a D1 migration: the table `software_images`, with at most one
      unfinished build for each provider account, and the nullable column
      `image_build_jobs.software_image_name` for the pin.
- [ ] Name each software image snapshot within the saved image name rule
      of the provider, apart from the org image names.

## Milestone 4: The software image build

Depends on: 3

- [ ] Add `worker/software-image/` with the build steps of design items 4
      to 7, and its README.
- [ ] Add the cleanup of design item 12.
- [ ] From the Cron Trigger, move each unfinished software image build,
      fail it at its time limit, and retry the cleanup.
- [ ] Tests with the fake provider:
  - [ ] Repeated requests reach ready. The sandbox create has no env var
        and no snapshot. A second request for the same version starts no
        sandbox.
  - [ ] A failed command fails the build, keeps the output, and deletes
        the sandbox. The next request starts a new build.
  - [ ] A newer version ends an unfinished build of an older version.
  - [ ] The Cron path fails a build at its time limit and deletes its
        sandbox.
  - [ ] A transient provider error keeps the state.
  - [ ] The cleanup deletes an older software image, and keeps one that an
        unfinished build pins until that build ends.

## Milestone 5: The deploy route

Depends on: 4

- [ ] Add the `version_metadata` binding to `wrangler.jsonc`. Add the
      binding and the variable `CONDUCTIVE_DEPLOY_TOKEN_SHA256` to
      `AppEnv`.
- [ ] Add `POST /v1/deploy/software-image` on the machine host, with the
      gate of design item 8.
- [ ] Tests: a request without the token, with a wrong token, or 30
      minutes after the version was made gets 401. A request with another
      token digest gets 409. A request with a cookie or an `Origin` header
      gets 403. A Worker without the binding or the variable answers 404.
      A valid request moves the build and gives its state. A request of
      the deploy run of a failed build gets the failure, and a request of
      another deploy run starts a new build.
- [ ] Update the machine routes in `worker/README.md`.

## Milestone 6: The deploy step

Depends on: 5

- [ ] In the step "Deploy Worker" of `.github/workflows/deploy.yml`, make
      the token and set its digest, as design item 9 says.
- [ ] Add the step of design item 10 after "Check health", with the outcome
      of decision 5. Make the job `redeploy` also need the later job of
      design item 10.
- [ ] Run each shell block of the new steps locally with stub commands.
      Save the proof under `.context/first-build-software-image/`, and name
      the file here.

## Milestone 7: First builds from the software image

Depends on: 3

- [ ] At admission, pin the ready software image of a build without an org
      image in its provider account, as design item 11 says. Start the
      build sandbox from it. Go from the repository copy to the install
      script.
- [ ] Tests:
  - [ ] A first build with a ready software image of its version starts
        from it, runs no software command, and logs no software step.
  - [ ] A first build without a ready software image, or with one of
        another version, runs the full install.
  - [ ] A later build and a refresh do not change.
- [ ] Update `worker/lifecycle/README.md`, `worker/lifecycle/image-builds.md`,
      `image/README.md`, and `image/install.md`.

## Milestone 8: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7

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

- [ ] Watch the first deploy run that builds a software image. Check the
      creation time that the Worker reads from the `version_metadata`
      binding, and the length of the build.
- [ ] Start the first build of a new test org. Check that it starts from
      the software image and runs no software step. Compare its length with
      a first build before this change.
- [ ] Update `plans/software-image.md` on branch
      `calummoore/build-image-install-order` so that it builds on this
      change.
