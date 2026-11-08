# Deploy on push to main

Status: Active. On branch `calummoore/deployment-on-merge-to-main`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

No push deploys the app today. An agent deployed the test app at
`conductive.build` by hand, from the primary branch of the Boat-native
plan, with a Cloudflare token file on its own machine. It also packaged
the runner archive and uploaded it to R2 by hand. This change adds a
GitHub Actions workflow. Each push to `main` builds the app, publishes the
runner archive when it changed, applies the D1 migrations, deploys the
Worker, and checks the health route.

The user chose the approach in a brainstorm on 8 November 2026: decision
1 B and decision 2 B below. Decisions 3 and 4 came from the options check.
The user chose decision 3 B on 8 November 2026. Decision 4 waits for the
user. The survey of the other repositories is in
`.context/deploy-on-main/notes.md`. The change does not cover the Mac app,
a staging deployment, pull request previews, or a clean-up of old runner
archives.

Contract owners:

- [Deployment inputs](../docs/deployment.md).
- The [image README](../image/README.md#the-runner-archive) and
  [Developer scripts](../image/developer-scripts.md#package-the-archive).
- The [repository README](../README.md) and [AGENTS.md](../AGENTS.md#ci).

## Decisions

### 1. Choose how a merge to main deploys

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Process.
- **Location:** `.github/workflows/ci.yml:12`
- **Terms:**
  - **Complete gate:** `npm run check`. CI runs it on each pull request and on each push to `main`. It takes about 25 minutes.
  - **`workflow_run`:** a GitHub Actions trigger. It starts one workflow when another workflow finishes.
  - **Workers Builds:** Cloudflare's build service. It watches a GitHub branch, then builds and deploys each push.
  - **GitHub environment:** a named deploy target in the repository settings. It holds its own secrets, and it can let only `main` use them.
- **Background:**
  - CI deploys nothing, as `README.md:160` says. A newer push cancels the running gate. Two of the last four CI runs on `main` ended that way.
  - Milestones 16 and 16a of the Boat-native plan deployed by hand with `wrangler deploy` and `wrangler d1 migrations apply`.
  - Shared assumption: one deployment, the Worker `conductive` in `wrangler.jsonc`. Source: the code. Option E drops it.
  - Shared assumption: secrets and variables stay set on the Worker. Source: `keep_vars` in `wrangler.jsonc`. Its reason holds: no secret goes into Git.
  - Shared assumption: only `main` deploys. Source: the task message.
  - Shared assumption: a Worker deploy does not ship the runner archive. Source: the code. Decision 2 drops it.
- **Problem:** A merge does not reach the test deployment by itself. A deploy needs an agent that has a token file on its machine.
- **Impact if no action:** The live app falls behind `main`. Agents keep deploying from branches, as with the unreviewed deploy fixes that decision 141 of the Boat-native plan records.
- **Root question:** How should each merge to `main` reach the test deployment at `conductive.build`?
- **Options:**
  - **A.** Connect the repository to Workers Builds in the Cloudflare dashboard. No Cloudflare token goes into GitHub. It cannot wait for the gate, and its settings are in the dashboard, not in Git. Effort: Small.
  - **B.** Add `deploy.yml` on each push to `main`. It builds, migrates, deploys, and checks the app. A merge goes live in about 5 minutes. A commit that fails the tests still goes live. Effort: Small.
  - **C.** Add a deploy job to `ci.yml` that runs after the gate, as `twilight-timer` does. One run shows both the gate and the deploy. A merge goes live in about 30 minutes. Effort: Small.
  - **D.** Add `deploy.yml` with a `workflow_run` trigger for a CI success on `main`. It deploys the commit that passed, and it skips a commit that is older than the newest commit on `main`. It has its own history and a Run button. A merge goes live in about 30 minutes. Effort: Medium.
  - **E.** As D, but first deploy to a second Worker that has its own database and hostnames. Run a smoke test there, then deploy to `conductive.build`. Effort: Large.
  - **H.** Split `npm run test` over about four parallel CI jobs with the Vitest `--shard` option. Then deploy after CI passes, as D does. The tests take about 20 of the 25 minutes, so a merge could go live in about 12 minutes. It costs more runner minutes and a test matrix in `ci.yml`. Effort: Medium. Added by the options check of 8 November 2026, after the user chose B.
- **Left out:**
  - Manual deploys by an agent, as today, because they do not meet the goal.
  - A deploy on a tag or on a schedule, because the goal is a deploy on each merge.
  - A script that polls for the CI result, as `mokly-cloud` uses, because D gets the same result from a trigger that GitHub provides.
  - A GitHub merge queue, because GitHub offers it for a private repository only on Enterprise Cloud. `Firna-AI` is on the Team plan. The options check corrected this reason.
  - The options check also proposed a rule on `main` and the end of hand deploys. Each answers its own root question, so they are decisions 3 and 4.
- **Wider fix:** None. This item chooses a new pipeline. Decisions 3 and 4 guard the paths that B leaves open.
- **Previous examples:**
  - `calummoore/twilight-timer` `ci.yml`: a Worker built with the same Vite plugin. It deploys after `npm run check`, in the same job. CI runs on `main` wait in a queue.
  - `futex-ai/firna-apps` `deploy-apps.yml`: a `workflow_run` trigger after CI passes on `main`.
  - `mokly-ai/mokly-cloud` `deploy.yml`: polls for the CI result, deploys to staging, then deploys to production after a reviewer approves.
  - `futex-ai/accounting`, `terminal`, `firna`, and `backlinks`: deploy on each push with no wait for CI. `accounting` skips a commit when `main` has a newer one.
- **Recommendation:** D. It deploys only commits that passed the complete gate, and it keeps deploys in a workflow of their own. C is the simpler choice for the same shape as `twilight-timer`.
- **Action:** ask the user, because the options trade the time to go live against the gate. They also differ in where the token is kept.
- **Chosen:** B, by the user on 8 November 2026.

### 2. Choose whether the deploy ships the runner

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Process.
- **Location:** `docs/deployment.md:125`
- **Terms:**
  - **Runner archive:** the `.tar.gz` file that holds the agent runner.
  - **Org image:** the prepared cloud computer image of an org. Each build of it installs the runner archive.
  - **R2:** Cloudflare's file storage. The bucket `conductive-runner` serves the archive at `runner.conductive.build`.
- **Background:** Two Worker variables give the archive URL and its SHA-256 digest. Today a person runs `image/package-runner.mjs`, uploads the file by hand, and sets the two variables. The same source always gives the same digest.
- **Problem:** A Worker deploy does not ship a runner change. New org images keep the old runner until someone does the manual steps again.
- **Impact if no action:** A merged runner fix looks deployed, but it does not reach new cloud computers.
- **Root question:** How does each new build of an org image install the runner of the code that is live? The options check gave this question in the words of the protocol rule "Each build of the org image installs the newest runner."
- **Options:**
  - **A.** Keep the manual steps. The docs say that the deploy does not ship the runner. Effort: Small.
  - **B.** Build the archive in each deploy run, and name it by its digest. Upload it only when that name is new. Then deploy the Worker with the two variables set to that archive. The token also needs R2 write access. Effort: Medium.
  - **C.** As B, but upload with a separate R2 key pair that can only read and write objects in `conductive-runner`. It needs two more secrets, and the deploy token then needs no R2 access. Effort: Small. Added by the options check of 8 November 2026.
  - **D.** Name the archive by a hash of its inputs, and build it only when that name is new. It saves the runner install in most runs. If the hash misses an input, a deploy ships an old runner with no error. Effort: Medium. Added by the options check of 8 November 2026.
- **Left out:** A separate runner workflow, because its variable update would race the Worker deploy. B does both steps in order in one run.
- **Wider fix:** B. It removes the manual step that can be forgotten.
- **Previous examples:** Milestone 16a of the Boat-native plan uploaded `runner-a145db0.tar.gz` by hand. No other repository publishes a runner archive.
- **Related:** Decision 1. B adds steps to the deploy that decision 1 chooses.
- **Recommendation:** B. A runner change then reaches the next build of each org image. The options check kept B, and it named C as the option with the narrowest upload key.
- **Action:** ask the user, because B adds to what a deploy ships and lets the token write to R2. The manual step works today.
- **Chosen:** B, by the user on 8 November 2026, before the options check added C and D.

### 3. Choose what may land on main

Added on 8 November 2026 from option F of the options check.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Process.
- **Location:** None. The rule is a GitHub setting of the repository.
- **Terms:**
  - **Ruleset:** a GitHub setting that limits how commits reach a branch. It can require a pull request and passing checks.
- **Background:**
  - `main` has no branch protection and no ruleset. The rule "Agent merges: off" in `AGENTS.md` is written, not enforced.
  - Under decision 1 B, each push to `main` goes live within minutes, also when its tests fail.
  - The agents act on GitHub as `calummoore`, the only collaborator, with the admin role. Their token cannot change the repository settings. `calummoore` opened and merged each of the last 20 merged pull requests.
  - On 8 November 2026, #61 and #66 merged with no CI run on the newest `main`.
- **Problem:** Nothing stops a red pull request, or a direct push, from reaching `main`. The live app then runs code that failed the complete gate.
- **Impact if no action:** A merge of a failing pull request breaks the live app, which you use for your own work.
- **Root question:** What may land on `main`, now that each push to `main` goes live?
- **Options:**
  - **A.** No rule, as today. Any push or merge lands and goes live. Effort: Small.
  - **B.** Add a ruleset on `main` that requires a pull request and the `Complete gate` check. A merge waits for a green pull request run, as it mostly does today. Direct pushes to `main` stop. An admin can still bypass the rule. Effort: Small.
  - **C.** As B, and also require each branch to hold the newest `main` before it merges. It stops two pull requests that pass alone but fail together. Each update of a branch costs another 25-minute run, so parallel pull requests wait for each other. Effort: Small.
  - **D.** As B, with no bypass actor. A ruleset lets only the actors in its bypass list skip it. The agents act as the admin, so a bypass for the admin is a bypass for every agent. The agents' token cannot change the ruleset. An urgent fix then needs a green run, or a change of the ruleset in the settings. Effort: Small. Added by the options check of 8 November 2026.
  - **E.** As D, and add a second ruleset that only the admin may bypass, and only through a pull request. You then merge on github.com, and an agent cannot merge into `main`. GitHub does not document whether the agents' token gets that admin bypass, so a test branch must prove it first. Effort: Medium. Added by the options check.
  - **F.** As B, and add a third-party merge queue, such as Mergify or Trunk. The queue tests the combined code before each pull request lands. It adds an outside app with write access to the private repository. Effort: Medium. Added by the options check.
  - **G.** Give the agents their own GitHub account, and require one approval in the ruleset. You approve and merge each pull request. It needs a paid seat, and a token of that account in each workspace. Effort: Large. Added by the options check.
- **Left out:**
  - GitHub's own merge queue, because GitHub offers it for a private repository only on Enterprise Cloud. F brings back a queue from another vendor.
  - A check in the deploy workflow for a green pull request run, because the red commit stays on `main`, and the next deploy ships it.
  - A local Git hook that refuses a push to `main`, because it runs only where someone installed it, and `git push --no-verify` skips it.
- **Wider fix:** D. B prevents the class only when no actor can skip it. Only C or F also stops two pull requests that pass alone but fail together.
- **Previous examples:** Decision 141 of the Boat-native plan records deploy fixes that reached the live app with no review.
- **Related:** Decision 1. B and D guard the path that decision 1 B opens. Decision 4: a hand token is the other path to the live app.
- **Recommendation:** D. It keeps failed code off `main` and off the live app, and no agent can skip it. The options check changed the recommendation from B, because the agents act as the admin.
- **Action:** ask the user, because D adds a new gate, and the always-on rules reserve a new gate for the user. It also needs admin access to the repository settings.
- **Chosen:** B, by the user on 8 November 2026. The option text said that the agents act as the admin, so each agent can also bypass the rule. The user creates the ruleset, because the agents' token cannot change the settings.

### 4. Choose who may deploy by hand

Added on 8 November 2026 from option G of the options check.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** None. The token lives on the machine of the Boat-native workspace.
- **Background:**
  - The agents of the Boat-native workspace hold a Cloudflare token file. They used it to deploy, to read logs with `wrangler tail`, and to query D1 with `wrangler d1 execute`.
  - Under decision 1 B, a hand deploy of Worker code from a branch stays live until the next merge to `main`. A hand migration, a D1 write, or a secret change stays after that merge.
  - Nobody has checked whether other tokens or Wrangler logins exist.
- **Problem:** Any agent with that token can put unreviewed branch code live. The docs alone cannot stop it.
- **Impact if no action:** Unreviewed code can run in the live app, which stores agent logins and GitHub tokens.
- **Root question:** Who may change the live app once the workflow deploys `main`?
- **Options:**
  - **A.** Keep the hand token. The docs say that only `main` deploys. Effort: Small.
  - **B.** After the first green deploy run, revoke the hand token. Give the agents a new token that can read logs and query D1 but cannot deploy a Worker. Cloudflare's Workers role "Metadata Read-Only" allows logs and `wrangler tail`, and a "D1 Read" token cannot write. `wrangler tail` can show the query string of a request, because the redaction in `wrangler.jsonc` covers only Workers Logs. A query string can hold a sign-in code. Effort: Small.
  - **C.** Revoke the hand token, and give the agents no token. Logs and queries then need you or the Cloudflare dashboard. Effort: Small.
  - **D.** As B, and tag each workflow deploy with its commit through `wrangler deploy --tag`. A scheduled check fails when the live Worker version has no tag of a commit on `main`. It finds a deploy by any credential, also an edit in the dashboard, but only at its next run. Effort: Medium. Added by the options check of 8 November 2026.
  - **E.** As C, and add a manual workflow on `main` that runs one read-only D1 query or one short log read. Its read-only token stays in the environment `production`, and agents start it with `gh workflow run`. No Cloudflare token reaches an agent machine. A live `wrangler tail` does not fit in a run. Effort: Medium. Added by the options check.
- **Left out:**
  - A required approval of each deploy in the environment `production`, because the Team plan offers required reviewers only for public repositories.
  - A second Worker where agents may deploy branches, because the user chose decision 1 B, not E.
- **Wider fix:** D. B must know which tokens exist. D finds a live version from any source. No Cloudflare setting limits a Worker to one deploy source.
- **Previous examples:** Decision 141 of the Boat-native plan records deploy fixes that went live from the primary branch with no review.
- **Related:** Decision 1. B closes the hand-deploy path that decision 1 B leaves open. Decision 3: the agents can also reach `main` through GitHub, so B protects the live app only together with decision 3 B or D.
- **Recommendation:** B. It stops branch deploys, and the agents keep their tools to debug the live app. The options check kept B.
- **Action:** ask the user, because the change needs your Cloudflare credentials, and it changes the tools of the agents in another workspace.

## Design

Each item is an agent call of 8 November 2026. The user can override any
of them. The options check of 8 November 2026 changed the items that say
so.

**Trigger and order.**

- `.github/workflows/deploy.yml` runs on each push to `main` and on a
  manual run from `main`. Reason: decision 1 B, and a manual run deploys
  again after a change of a Cloudflare setting.
- Deploys run one at a time in the concurrency group `deploy-production`.
  A new push never cancels a running deploy. Reason: a cancel could stop a
  deploy between the migrations and the Worker upload. GitHub keeps only
  the newest waiting run, so a burst of merges deploys the newest commit.
- A re-run deploys nothing when `main` already has a newer commit. A first
  run always deploys. A failed lookup warns and deploys. Reason: the
  concurrency group starts first runs in push order, so only a re-run can
  put old code live. A newer commit with `[skip ci]` starts no run, so a
  first run must not wait for one. Changed by the options check, which
  found that a check of push runs only missed manual re-runs.
- `ci.yml` does not change. Reason: decision 1 B does not wait for the
  gate.

**Settings.**

- The deploy job uses the GitHub environment `production`. Its secret
  `CLOUDFLARE_API_TOKEN` holds the token, and its variable
  `CLOUDFLARE_ACCOUNT_ID` holds the account ID. Only `main` may deploy to
  it. Reason: the workflow of a pull request from a branch of this
  repository can read a repository secret, and agents push such branches.
- The user creates the environment with its `main` rule before the merge.
  Reason: GitHub creates a missing environment with no rule at the first
  run that names it. Added by the options check.
- When neither setting exists, the run warns and deploys nothing. When
  only one exists, the run fails. Reason: the always-on rules ask to warn
  and continue when input is recoverable. A half setup is a mistake that
  must show.
- The deploy sets only the two runner variables. Every other variable and
  secret stays on the Worker, as `keep_vars` in `wrangler.jsonc` intends.
- Only the steps that use the token get it in their environment.

**Steps.**

- The job builds first with `npm run build`, which also runs the
  typecheck. Then it publishes the runner, applies the D1 migrations,
  deploys the Worker, and checks the health route. Reason: a build error
  stops the run before it changes anything live. The migrations run before
  the new Worker starts, so it finds its tables.
- Between the migrations and the Worker upload, the old Worker runs on the
  new schema. A failed upload leaves it so until the next deploy. The docs
  say this. Added by the options check.
- The migrations run with `--config wrangler.jsonc`. Reason: the build
  writes a redirect to its own Wrangler config. A local run showed that
  both configs read the same migrations folder. The flag keeps the
  migrations independent of the build output. The deploy follows the
  redirect to the built Worker, as the manual deploys did.
- The run fails when `https://app.conductive.build/api/health` does not
  answer `{"status":"ok"}` within about a minute. Reason: a failed run is
  the only alert. The route answers without D1 and without a version, so
  the check proves only that the Worker answers. Wrangler reports the
  version that it deployed.
- No automatic rollback. `docs/deployment.md` gives `npx wrangler rollback`
  for the Worker and D1 Time Travel for the database. A rollback cannot
  cross a Durable Object migration. Reason: a Worker rollback does not
  undo a migration.
- The job does not use the npm cache. Reason: the cache would share its
  key with the CI job, and the shorter deploy job could save a cache
  without the packages of the Mac app first. `twilight-timer` also turns
  the cache off in the job that holds the Cloudflare token. Changed by the
  options check.

**Runner archive.**

- `image/package-runner.mjs` gets a `--base-url` option. After it computes
  the digest, it names the archive URL `runner-<sha256>.tar.gz` under that
  base. It adds a missing final `/` to the base. `--url` keeps working.
  Reason: the URL is not part of the archive, so the digest can name it.
  An unchanged runner then makes no new upload.
- The packager also fixes the file modes of the archive entries, with
  `--mode=u+rwX,go+rX,go-w` in its `tar` call. Reason: a local proof
  showed that the umask of the package install changes the modes, and so
  the digest. Two archives differed only in their modes. With fixed modes,
  the same source and packages give the same digest on any machine, as
  `image/developer-scripts.md` already says.
- The base URL is `https://runner.conductive.build/`, the custom domain of
  the R2 bucket `conductive-runner`.
- A new archive reaches the next build of each org image. A refresh keeps
  the installed runner, as `docs/deployment.md` says. So an existing image
  keeps its runner until its next build.
- The upload uses the S3 API of R2 with the AWS CLI of the GitHub runner.
  Reason: the archive is 319 MiB, and `wrangler r2 object put` refuses
  files over 300 MiB. The manual upload of `runner-a145db0.tar.gz` met
  this limit.
- The AWS CLI runs with `AWS_REQUEST_CHECKSUM_CALCULATION` and
  `AWS_RESPONSE_CHECKSUM_VALIDATION` set to `when_required`. Reason: R2
  refused the default checksums of newer AWS tools. The manual upload used
  the AWS SDK for JavaScript, not the CLI. Added by the options check.
- The S3 key pair comes from the deploy token, as decision 2 B says. The
  key ID is the ID of the token, and the secret key is the SHA-256 of the
  token, as Cloudflare documents. The run asks
  `/accounts/<account>/tokens/verify` for the ID first, then
  `/user/tokens/verify`, because an account token answers only the first.
  The run masks the secret key in the log, because GitHub masks only the
  stored token. The manual upload used the same key pair.
- The docs ask for the R2 permission group `Workers R2 Storage Bucket Item
  Write` on the bucket `conductive-runner`, where the token is made
  through the API. Otherwise the account group `Workers R2 Storage Write`
  works. Reason: Cloudflare documents both groups. The bucket group limits
  the derived key pair to the one bucket with no second secret, as option
  C of decision 2 wanted.
- An S3 HEAD request checks whether the archive exists. After an upload, a
  HEAD request to the public URL checks the size. Reason: the S3 check
  does not put a 404 answer into the cache of the public domain.
- Old archives stay in the bucket. Reason: each is about 320 MB, and a new
  one comes only when the runner or its packages change. A build that
  started before a deploy also reads the URL that its job stored.

**Out of scope.**

- The Mac app stays out. Reason: it has no signed release, and its updater
  is off.
- The docs say that only `main` deploys. A hand deploy of Worker code from
  another branch stays live only until the next merge. A hand migration, a
  D1 write, or a secret change stays after it. Decision 4 asks whether a
  token should enforce this. Changed by the options check.

**Tests.**

- No test reads the workflow YAML, as the `testing` skill says. The
  workflow is checked once with actionlint.
- The packager change is proven once: two packaging runs on a clean
  install give the same digest and URL. No test runs the packager now, and
  one run takes minutes. The post-merge check that the next deploy reuses
  the archive proves it on the GitHub runner.
- A `wrangler deploy --dry-run` of the built app proves once that the
  deploy command and its `--var` values parse.
- A local `npx wrangler d1 migrations list DB --local` after a build, with
  and without `--config wrangler.jsonc`, proves once which config the
  migrations read. Added by the options check.

## Milestone 1: Documentation

Depends on: none

The docs state the automatic deploy, its settings, and the runner archive
that it publishes.

- [ ] `docs/deployment.md`: add a section on automatic deploys. Give the
      steps in order, the skip and fail cases, the environment
      `production` with its branch rule, its secret and its variable, the
      token permissions, the health check, a manual run, the rollback and
      its Durable Object limit, the gap between the migrations and the
      upload, and deploys from other branches. Say that the user creates
      the environment with its rule before the first run.
- [ ] `docs/deployment.md`, "The runner archive": the deploy publishes each
      new archive by its digest. A new archive reaches the next build of
      each org image, not an existing image. Keep the manual steps for a
      deploy by hand, with the 300 MiB limit of Wrangler and the S3 API.
- [ ] `image/README.md`, "The runner archive", and
      `image/developer-scripts.md`, "Package the archive": add
      `--base-url`, and say that the deploy workflow uses it.
- [ ] `README.md`: change the status sentence, the sentence that says the
      setup includes no deploy command, and the CI paragraph that says CI
      does not deploy.
- [ ] `AGENTS.md`, "CI": add the deploy workflow, and the ruleset of
      decision 3 B. `main` takes a commit only through a pull request with
      a green `Complete gate` check, and an admin can bypass the rule.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 2: Runner archive named by its digest

Depends on: 1

`image/package-runner.mjs` can name the archive URL by its digest.

- [ ] Add `--base-url`, as the design says. Pass exactly one of `--url`
      and `--base-url`. Update the usage text.
- [ ] Fix the file modes of the archive entries in the `tar` call, as the
      design says. Say so in `image/developer-scripts.md`.
- [ ] Run the typecheck, the lint, the format check, and the file length
      check named in `AGENTS.md`.
- [ ] Prove once that two runs on a clean install give the same digest and
      URL. Save the output under `.context/deploy-on-main/`.

## Milestone 3: Deploy workflow

Depends on: 2

`.github/workflows/deploy.yml` deploys each push to `main`.

- [ ] Add the workflow with the triggers, the permissions, the concurrency
      group, the environment, and the steps of the design:
  - [ ] the settings check, which skips or fails
  - [ ] the newest-commit check
  - [ ] `npm ci`, `npm ci --prefix runner`, and `npm run build`
  - [ ] the runner package, the S3 check, the upload of a new archive, and
        the check of the public URL
  - [ ] the migrations, the deploy with the two runner variables, and the
        health check
- [ ] Check the workflow once with actionlint. Save the output under
      `.context/deploy-on-main/`.
- [x] Run `npm run build`, then `npx wrangler deploy --dry-run` with the
      two `--var` values, once. Save the output. Done on 8 November 2026,
      before the workflow: it exits 0 with no credential. Evidence:
      `.context/deploy-on-main/proof/deploy-dry-run.log`.
- [ ] Run the scripts of the settings check and the newest-commit check
      once with sample values for each case. Save the output.
- [x] After a build, run `npx wrangler d1 migrations list DB --local` once
      with and once without `--config wrangler.jsonc`. Save the output.
      Done on 8 November 2026: both list the same migrations. Evidence:
      `.context/deploy-on-main/proof/migrations-list.log`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted checks and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] The user creates the environment `production` with its `main` rule
      before the merge, as `docs/deployment.md` says. The secret and the
      variable can follow later, because the run skips without them.
- [ ] The user creates the ruleset of decision 3 B on `main` before the
      merge: require a pull request and the `Complete gate` check, with
      the admin role on the bypass list.
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

- [ ] The user creates the token, and stores its secret and the account ID
      variable in the environment `production`, as `docs/deployment.md`
      says.
- [ ] Check the first deploy run on `main`: the runner upload or reuse, the
      migrations, the deploy, and the health check.
- [ ] Start an org image build in the deployed app. Check that it installs
      the runner from the new archive URL.
- [ ] Check that the next deploy run reuses the archive with no upload.
