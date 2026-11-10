# Parallel repository loading in image builds

Status: Active. On branch `calummoore/build-time-increase`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The repository step of an org image build loads the chosen repositories one
at a time. For each repository, it gets a GitHub token, clones the whole
repository into a staging folder, and revokes the token. Then it checks out
the commits into the repository folder. Each of these steps waits for the
next alarm of the image coordinator, at least 1 s later. On 2026-11-10, the
repository step of one org grew from 34 s with 3 repositories to 124 s with
7 repositories. The other steps of the build stayed between 12 s and 29 s.
The build log keeps no time for each repository, so the slow part of the
124 s build is unknown.

User decision, 2026-11-10: record the start and end time of each repository,
and load the repositories in parallel. These were options B and E of the
build-time question. The rejected options were: change nothing, use fewer
alarms for each repository, and download only the new commits. Reason: the
user's choice. The new times show later whether the other two options still
pay off.

The change does not cover fewer alarms for each repository, downloads of
only the new commits, the software step of later builds, or the old build
cleanup that waits for a workspace creation that never ended.

Design calls, all mine, all 2026-11-10:

- The step runs in two waves. The clone wave runs clones at the same time,
  up to the limit of decision 2. It revokes each token when its clone ends.
  The checkout wave starts only after GitHub confirms every revocation of the
  build. It runs checkouts at the same time, up to the same limit. Rejected:
  one pipeline for each repository, in which a checkout can start while the
  clone of another repository runs. Reason: a checkout can run repository
  code, and the [GitHub tokens](../docs/protocol/github-tokens.md#image-builds-and-refreshes)
  requirements allow no repository code while a clone token is live. Cost:
  every bare clone stays in its staging folder until the checkout wave, so
  the peak disk use is the sum of the bare clones, not the largest one.
- A copy keeps its place in the limit until GitHub confirms the revocation of
  its token. Reason: otherwise a GitHub outage lets the clone wave make new
  tokens while earlier tokens stay live.
- A free place starts the next copy in the same alarm. So the limit costs
  less than a whole round.
- Each repository copy gets its own D1 row in a new table,
  `image_source_copies`. The row of the build in `image_source_jobs` keeps
  the layout command and the phase of the whole step. Reason: each copy
  needs its own token, grant, process, output offsets, and times. The new
  table has no cascading key to the build or the org, as the old one has
  none. Reason: no delete may drop a live encrypted token before its
  revocation.
- Each copy row keeps the fields of the token context of today: the org,
  the build, the sandbox, the repository, and the index. Reason: the
  migration moves each live ciphertext unchanged, and cleanup must decrypt
  it to revoke the token.
- The migration rebuilds `image_source_jobs` without its columns for one
  repository: `source_index`, `repository_id`, `grant_hash`, and
  `token_ciphertext`. It creates the index and the two computer ledger
  triggers of that table again. Rejected: keep the unused columns. Reason: an
  unused unique grant column misleads later code, and SQLite cannot drop a
  unique column without a rebuild.
- The migration ends each repository step that is past its layout command
  when it runs. It moves each live encrypted token to a copy row, so that
  cleanup revokes it. That build fails and keeps the last good image. Its
  error names the GitHub App access, which is not its cause. Reason: this
  happens once, only for a build that is in its repository step in that
  minute. A conversion of the old state for one repository at a time needs
  complex SQL, and a message for this one case adds text that no other case
  uses. Try again builds again.
- The old Worker runs on the new schema between the migrations and the
  Worker upload of the deploy. A build in its repository step in that time
  fails too. Reason: the project is not in production, and the window is
  about one minute.
- Each recorded time comes from the injected Worker clock, at the alarm that
  sees the event. So a time is accurate to about one alarm, about 1.4 s.
- One alarm polls every running command of the step at the same time. A
  Worker invocation keeps at most six connections open, so a poll past six
  waits for a free connection. That costs time, not correctness.

Contract owners:

- [GitHub tokens](../docs/protocol/github-tokens.md#image-builds-and-refreshes).
- [Org image](../docs/protocol/org-image.md#the-org-image).
- The [repository layout page](../worker/lifecycle/repository-layout.md#the-source-loader)
  of the lifecycle README.
- The [migrations README](../migrations/README.md).

Replaced ways:

- One source row for each build, which holds one repository at a time in the
  `source_index`, `repository_id`, `grant_hash`, and `token_ciphertext`
  columns of `image_source_jobs` → one row for each repository copy in
  `image_source_copies`. Consumers: `materialize.ts`, `source-data.ts`,
  `cleanup.ts`, `cleanup-data.ts`, and `credential.ts` in
  `worker/lifecycle/image-sources/`, `worker/lifecycle/image-builds.ts`, the
  source tests `materialize.test.ts`, `local-materialize.test.ts`,
  `poll-recovery.test.ts`, `poll-exhaustion.test.ts`, `deadline.test.ts`,
  `credential.test.ts`, and `members.test.ts`, the test
  `worker/lifecycle/image-job-time-limit.test.ts`, the fixture
  `local-source-test-support.ts`, and `repository-layout.md`. Moved in
  Milestone 3. Deleted in Milestone 3 by the migration.

## Decisions

The options check of 2026-11-10 added options E and F to decision 1 and
option E to decision 2. It kept both recommendations. Its report is
`.context/parallel-image-repositories/options-check-1.md`.

### 1. Where the time of each repository shows

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/lifecycle/image-sources/materialize.ts:85` and
  `docs/mockups/src/fixtures/terminal.ts:59`
- **Background:** The build log shows one fixed line, "Updating the
  repositories.", for the whole repository step. The Cloud computer tab shows
  the log only while a build runs or after it fails. The mockups of the tab
  show one line for each repository, with a check mark and its commit. The
  product never writes that line, and it cannot read the commit, because no
  command output of the step reaches the Worker. No protocol doc says what
  the log shows for each repository.
- **Problem:** The user chose to record the start and end time of each
  repository. No requirement says where an admin or an operator reads those
  times.
- **Impact if no action:** The times exist only while the build runs. Only
  a new database query can show which repository is slow.
- **Root question:** Where can an operator, and an admin when useful, read
  when each repository started and ended its download and its checkout, also
  after the build ends?
- **Options:**
  - **A.** Keep the times in D1 only, in a row for each repository of each
    build. The log and the mockups stay as they are. Only an operator with
    database access sees the times. Effort: Small.
  - **B.** Write a log line when each download ends and when each checkout
    ends. Examples: "Downloaded acme/storefront in 9 s." and "Checked out
    acme/storefront in 2 s." The mockup build logs change to the same lines.
    D1 keeps each line with its time. An admin sees the lines while the build
    runs and after it fails. Effort: Medium.
  - **C.** Write one line for each repository after its checkout, in the
    shape of the mockup line, with both times. Example: "✓ acme/storefront:
    download 9 s, checkout 2 s". The admin sees no line for a repository
    until the checkout wave ends. Effort: Medium.
  - **D.** Both A and B. Effort: Medium.
  - **E.** B, and each build of the History list opens its log. An admin
    then reads the repository lines also after a build succeeds. This changes
    the History list, adds mockup states, and adds a line to Org image.
    Effort: Large.
  - **F.** Keep the times with each build in D1, as in A, and show each
    repository with its two times in the History list, for every build. This
    keeps D1 rows after the cleanup, adds a field to the builds reply and its
    shared type, and adds a screen part with its mockup. Effort: Large.
- **Left out:** The Worker logs of the Cloudflare dashboard, because they
  keep each line for only 3 to 7 days, which fails a later analysis.
- **Wider fix:** None. This is a choice of what the product shows, not a
  class of defect.
- **Previous examples:** None found.
- **Recommendation:** B. Its lines keep their own times in D1, which is how
  the build times of 2026-11-10 were read. Unlike C, B still names the
  repositories that finished when the clone wave fails or reaches the time
  limit. D only adds a second copy of the same numbers.
- **Action:** ask the user, because B to F add build log text or screen text
  that no requirement covers, and they change the mockups.

### 2. How many repositories load at the same time

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Performance.
- **Location:** `worker/lifecycle/image-sources/materialize.ts:110`, where
  the loader takes the next repository.
- **Background:** Each clone holds its own GitHub token, which can read only
  its own repository. Each running clone or checkout costs one status call to
  the sandbox provider in each alarm. The clones share the network, the
  processors, and the disk of the build sandbox. No requirement sets a limit.
- **Problem:** The parallel repository step needs a bound for the clones and
  the checkouts that run at the same time.
- **Impact if no action:** The repository step cannot run in parallel.
- **Root question:** How does a build bound its parallel copies, so that a
  typical org loads in one round and a large org cannot overload the build
  sandbox?
- **Options:**
  - **A.** Four at the same time. An org with seven repositories waits for a
    free place for three of them. Effort: Small.
  - **B.** Eight at the same time. Most orgs load all their repositories in
    one round. More tokens are live at the same time, and large clones share
    the sandbox. Effort: Small.
  - **C.** All at the same time. Every org loads in one round. A large org
    starts many clones and many status calls at once. Effort: Small.
  - **D.** A limit that an admin sets in the org settings. This adds a
    setting, its screen, and its protocol text for an internal detail.
    Effort: Large.
  - **E.** A size budget. The next clone starts only while the GitHub sizes
    of the running clones stay under a fixed total, and one clone can always
    run. This needs one more GitHub call for each repository, or a saved size
    that can be stale. No measurement supports a budget value yet. Effort:
    Medium.
- **Left out:**
  - Batches, each with its own checkout barrier, because a token of a later
    batch is live after a checkout of an earlier batch can run repository
    code.
  - One command for all clones, because the Worker then sees only the end of
    the whole command, and it cannot revoke each token when its own clone
    ends.
  - One command for all checkouts, because it loses the checkout time of each
    repository, which the user chose to record.
- **Wider fix:** None. This is a choice of a bound, not a class of defect.
- **Previous examples:** None found.
- **Recommendation:** B. Eight loads the only measured org in one round, and
  the times of decision 1 can tune one named constant later.
- **Action:** ask the user, because the options trade build time against the
  load on the build sandbox, and no option is clearly best.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Only when decision 1 picks B, C, D, or E. The build log fixtures of the Cloud
computer tab show the lines of the chosen option.

- [ ] Change the build log fixtures in `docs/mockups/src/fixtures/terminal.ts`
      to the repository lines of the chosen option. Replace the heading
      "Cloning 3 repositories into ~/code" with the heading that the product
      writes, and remove the commit from each repository line, because the
      product cannot read it.
- [ ] Run `npm run mockups:check`. Smoke-test the Cloud computer pages of the
      catalogue.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1, when decision 1 keeps Milestone 1. Otherwise none.

The protocol docs state the parallel copies, the checkout barrier, the bound,
and the repository lines of the build log.

- [ ] Update [GitHub tokens](../docs/protocol/github-tokens.md#image-builds-and-refreshes):
      several copies can run at the same time, within the bound of decision
      2. Each copy keeps its own token and grant. The build starts no
      checkout, software step, install script, snapshot, or other repository
      code until GitHub confirms the revocation of every token of the build.
      The risk sentence covers the tokens of copies that run at the same
      time. Give the decision in force: copies at the same time with one
      checkout barrier. Rejected: one pipeline for each repository.
- [ ] Update [Org image](../docs/protocol/org-image.md#the-org-image) with the
      repository lines of the build log, as decision 1 chooses.
- [ ] Read the Terms page in `src/marketing/terms.ts`, the Privacy page in
      `src/marketing/privacy.ts`, and each public guide in
      `src/marketing/docs/` in full. Update each sentence that restates a
      changed fact.

## Milestone 3: Parallel repository step

Depends on: 2

The source loader clones and checks out the repositories in two waves, and
records the time of each repository.

- [ ] Add the migration `migrations/<YYYYMMDDHHMM>_parallel_image_sources.sql`
      with `image_source_copies`, the move of each live token, the end of each
      repository step past its layout command, and the rebuild of
      `image_source_jobs` with its index and its two computer ledger
      triggers. Add its entry to the [migrations README](../migrations/README.md).
- [ ] Run the migration once on a local D1 that holds rows of each old phase.
      Check that each moved ciphertext still decrypts with the token context
      of its copy row. Save the output under
      `.context/parallel-image-repositories/`.
- [ ] Move every consumer under "Replaced ways" to the copy rows:
  - [ ] The build row and copy row data, the grant claim, and the cleanup of
        every live token.
  - [ ] The two waves in the source loader, with the bound of decision 2 as
        one named constant, and polls of every running command in one alarm.
  - [ ] The recorded times, and the output that decision 1 chooses.
  - [ ] The abort check of `worker/lifecycle/image-builds.ts`.
- [ ] Take the time of the heading "Updating the repositories." from the
      injected clock, not from `Date.now()`.
- [ ] Delete the `sources` branch of `phaseLabel` in
      `worker/lifecycle/build-execution.ts`. It never runs, because only the
      software and install phases reach it. Record the search in the commit.
- [ ] Keep each changed file under 300 lines. Split the source loader when it
      passes about 200 lines.
- [ ] Update the existing source tests to the copy rows. Add these cases, and
      see each fail first:
  - [ ] Clones run at the same time within the bound, and no checkout starts
        while a token of the build is live.
  - [ ] A copy that waits for its revocation keeps its place, so no new token
        starts while the revocation fails.
  - [ ] A failed clone revokes every live token of the build and fails the
        build with the fixed repository error.
  - [ ] The times of each repository reach the output that decision 1
        chooses.
- [ ] Update the [repository layout page](../worker/lifecycle/repository-layout.md#the-source-loader)
      and the [image builds page](../worker/lifecycle/image-builds.md) with
      the waves, the copy rows, and the times. Change "The build log gets only
      fixed progress text" so that it keeps its reason: no command output of
      the step reaches the log.
- [ ] Add to [Automatic deploys](../docs/automatic-deploys.md#when-a-deploy-fails)
      that a build in its repository step fails while the old Worker runs on
      the new schema, and that a Worker version from before the migration
      fails the repository step of each build after a rollback.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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

- [ ] Build the org with seven repositories on the test deployment. Compare
      its repository step with the 124 s build of 2026-11-10, and read the
      time of each repository.
