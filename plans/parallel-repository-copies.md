# Parallel repository copies

Status: Active. On branch `calummoore/oslo-s346`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

An org image build or refresh copies each chosen repository into the build
sandbox with Git. Today the source loader in
`worker/lifecycle/image-sources/` copies one repository at a time. Each
repository needs at least four alarm runs: start the clone, see its end and
revoke the token, start the import, and see the import end. The runs are
1 s apart (`IMAGE_POLL_MS`). On production, on 16 November 2026, an org with
7 repositories spent 75 s of a 126 s build on this step, and the step was
steady at about 75 s over the last 25 builds and refreshes. A refresh takes
about 100 s and spends most of it here.

This change copies the repositories at the same time. It ports Milestone 6
of the older software image plan, commit `bd59b1bc8` on the unmerged
branch `calummoore/build-image-install-order`, to `main`. It then makes two
scheduler fixes, so that one alarm run polls and starts all commands at the
same time, and the imports start in the run that passes the revocation
barrier. Expected copy step for the measured org: about 15–20 s, an
estimate. Expected build: about 70 s. Expected refresh: about 45 s.

Not covered: a refresh that downloads only the new commits, and the
software step and snapshot time. The design keeps the bare clone and the
import, so a later change can let the clone borrow the objects of the
image.

Contract owners:

- [GitHub tokens](../docs/protocol/github-tokens.md#image-builds-and-refreshes).
- [Org image](../docs/protocol/org-image.md).
- The [lifecycle README](../worker/lifecycle/README.md), with
  [image builds](../worker/lifecycle/image-builds.md) and
  [repository layout](../worker/lifecycle/repository-layout.md).

Replaced ways:

- The source loader with one row for each build and one repository at a
  time → one row for each repository, a run row for the shared phase, and
  a scheduler within a memory budget. Consumers:
  `worker/lifecycle/image-sources/materialize.ts`, `source-data.ts`,
  `cleanup.ts`, `cleanup-data.ts`, their tests, and
  `worker/lifecycle/repository-layout.md`. Moved in Milestone 2. The
  legacy path stays only to finish a copy that runs during the deploy of
  the migration. Design call 4 says why.

## Decisions

### 1. The approach for a faster repository copy

- **Chosen:** C, by the user on 16 November 2026: port Milestone 6 and fix
  its scheduler.
- **Options:** **A.** Fewer, shorter alarm runs, one copy at a time, about
  30–40 s. **B.** One run waits inside itself for each copy, about 30–45 s.
  **C.** Port Milestone 6 with two scheduler fixes, about 15–20 s. **D.** A
  smaller parallel rewrite with a fixed limit and no size read, about
  15–20 s, which replaces decision 14 F.
- **Left out:** one sandbox command for all copies, because each token
  then lives until the slowest clone ends. One token for all repositories,
  because each token must read only one repository. A shallow or
  single-branch clone, because the image then lacks history. A Git proxy
  in the Worker, which the protocol rejects. Copies during the software
  step, because they break the revocation barrier. A sandbox that reports
  each end to a new Worker route, because it is no faster than C.
- **Reason:** C is the fastest, it changes no token rule, it follows
  decision 14 F, and its code and tests exist.
- **Includes:** decision 14 F of the software image plan, by the user on
  10 November 2026, "do it based on the size and the ram available". Its
  options were A, all at once. B, at most 4 copies. C, at most 8 copies.
  D, at most 4 Git commands. E, one sandbox command for all copies. F, a
  limit by the size that GitHub reports. The protocol cites this as
  parallel copy decision 1.
- The brainstorm report is in `.context/parallel-copies/`. The options
  check did not run, because the user chose before the plan existed. A
  fresh brainstorm agent widened and narrowed the options instead.

## Design

Each item marked "my call" is a design call of 16 November 2026, unless it
names another date.

1. **One record for each repository.** From Milestone 6. Each copy gets
   its own token and one-use grant. The Worker revokes each token as soon
   as its clone ends. A failed copy fails the job, and cleanup revokes
   each token that still lives.
2. **Barrier.** My call of 10 November 2026, kept: the imports start only
   after GitHub confirms the revocation of every token, so no checkout
   runs while any token lives.
3. **Memory budget.** From design item 8 of the software image plan, my
   calls of 10 and 11 November 2026: half of `MemAvailable`, an estimate of
   twice the GitHub size with a 256 MiB floor, at most 8 Git commands at
   once, and metadata-only tokens in batches of at most 500 for each
   installation, revoked before the first copy.
4. **Legacy path.** My call: keep the path that finishes a copy that
   started before the migration. Reason: the deploy can come during a
   copy, and the path finishes it under the token rules.
5. **Retry.** My call of 10 November 2026, kept: a definite refusal of a
   command start, such as HTTP 429, waits and retries within the provider
   retry window. A start with no confirmed reply still fails closed.
6. **Concurrent calls in one run.** My call: one alarm run polls every
   running command and starts every command that fits the budget at the
   same time, with `Promise.allSettled`, and saves each result. Reason: the
   branch awaits each call in turn (`schedule.ts:133-140`, `:169-182`).
7. **No idle run at the barrier.** My call: the run that passes the
   barrier also starts the imports. Reason: the branch ends that run
   (`schedule.ts:155-156`), which costs one more alarm cycle of about 2 s.
8. **Poll interval.** My call: keep `IMAGE_POLL_MS` at 1 s. Change it only
   when the measurement shows that the waits still cost much time.
9. **Bare clone, then import.** My call: keep both for every folder.
   Reason: most folders already exist in the image, and the later "only
   new commits" change can build on the bare clone.

## Milestone 1: Documentation and protocol

Depends on: none

State the parallel copies, the memory budget, the metadata tokens, the
barrier for every token, and the retry rule.

- [ ] Update `docs/protocol/github-tokens.md`, "Image builds and
      refreshes", from the branch text of `bd59b1bc8`, without the bullet of
      its clean refresh milestone. Keep the "Risk" bullet of `main`.
- [ ] Update `worker/lifecycle/image-builds.md` with the retry sentence.
- [ ] Read the Terms and Privacy pages and every public guide in full.
      Update each sentence that restates a changed fact.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 2: Port the parallel loader

Depends on: 1

Apply `bd59b1bc8` to `main` and resolve its conflicts. The production code
applies with no conflict. The plan, two docs, the migration README, and
one test conflict.

- [ ] Apply the commit. Drop its change to `plans/software-image.md`.
- [ ] Rename `202611110200_parallel_image_sources.sql` so that it sorts
      after the newest migration on `main`, and update
      `migrations/README.md`.
- [ ] Resolve `poll-recovery.test.ts` and `repository-layout.md` for the
      phases of `main`, which has no tools step before the software step.
- [ ] Run the image-source tests and the typecheck.

## Milestone 3: Scheduler fixes

Depends on: 2

- [ ] Poll and start the commands of one run at the same time (design
      call 6). Save each result. A transient error of one call still lets
      the other results save.
- [ ] Start the imports in the run that passes the barrier (design call 7).
- [ ] Tests: one run polls two running copies and starts two imports. The
      run that confirms the last revocation starts the imports. No import
      starts before every revocation.
- [ ] Measure a local build with the test harness, or say why it cannot
      run. Save the result in `.context/parallel-copies/`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [ ] Run the targeted tests and the complete gate named in `CLAUDE.md`.
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

- [ ] Measure the copy step and the total time of one build and one
      refresh on production. Compare them with 75 s, 126 s, and 100 s.
- [ ] Measure the memory of the parallel copies in a real build, and tune
      the numbers of design item 3.
