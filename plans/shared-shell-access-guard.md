# Shared access guard for shell writers

Status: Active. On branch `calummoore/conductive-mcp-nested-agents-v2-sdjn`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A shell writer is a Worker function that changes the workspace list or
its sections and automations in D1: a rename, a section move, a parent
change, a section write, or an automation write. Each writer checks access
early with `requireShellWriter`, then repeats the check inside its SQL with
the condition `activeShellMemberPredicate`. So a member who loses access,
or an org that is suspended, between the two steps changes nothing. Each
writer writes that condition and its two bound values by hand, about 18
times in 4 files. A writer can leave it out, bind it to wrong values, or
put it in the wrong statement, and only a race test of that writer finds
it. The section writer had this gap (commit `446204638`), and the parent
writer of `move_workspace` had it too (review finding 3 of PR #444).

This change moves the condition into one builder. Writers get their write
statements only from the builder. A lint keeps raw statements out of the
writer files. The behaviour stays the same, so no protocol doc changes.

## Decisions

- **Item 1 of PR #444's final report, answered by Cal on 2026-11-17: C.**
  One builder adds the guard and its bindings and returns a branded
  statement type. One race test covers the builder. A lint keeps raw
  statements out of the writer files. Cal's answer approves the new lint.
  - Rejected A: keep one race test for each writer. Reason: the gap
    happened twice under that rule.
  - Rejected B: one shared table of race tests. Reason: a writer that
    nobody adds to the table is still missed.

## Design calls

These are my calls, made on 2026-11-17.

- **The builder:** a new file `worker/app-api/shell-guard.ts`. It owns the
  guard SQL, which no other file exports. Its function takes the database,
  the access (`orgId`, `userId`), the SQL, and the values. The SQL marks
  the place of the guard with one token, and the builder puts the guard
  there. Reason: the guard can sit in a `WHERE`, a `CASE`, or a CTE, as the
  writers need today.
- **Bindings:** the builder binds the guard's org and user to numbered
  placeholders after the last value, such as `?8` and `?9` for seven
  values. The SQL of a guarded statement uses numbered placeholders only.
  The builder throws when the SQL has a bare `?` or no token. Reason: a
  bare `?` after a numbered one takes a number that is easy to get wrong,
  and that caused the fragile bindings of the parent writer.
- **The branded type:** the builder returns `GuardedStatement`, a
  `D1PreparedStatement` with a brand that only the builder can add.
  `guardedBatch` and `guardedRun` accept only that type. Reason: the type
  system then refuses an unguarded write.
- **Reads:** a writer file that also reads, such as `shellSectionExists`,
  gets its read statements from a `shellRead` helper of the same file. The
  helper refuses SQL that is not a read. Reason: the lint can then forbid
  `.prepare(` in the writer files.
- **The lint:** in the writer files, ESLint forbids `.prepare(`,
  `.batch(`, and `.run(`, and forbids imports of the guard SQL. The rule
  names the builder in its message. The writer files are
  `worker/app-api/feature-workspaces-data.ts`,
  `worker/app-api/workspace-parent-change-data.ts`,
  `worker/app-api/feature-sections-data.ts`, and
  `worker/automations/automation-write-data.ts`. Reason: these are the
  files that hold the guard today.
- **Archive:** Archive keeps its own access check, which also allows only
  an admin or the owner. Its branch of `writeWorkspaceTree`, with the
  promotion write, moves into `worker/app-api/archive-data.ts`, outside
  the lint scope. Reason: the shared member check cannot express the
  owner or admin rule, and the move keeps one guarded-only path in the
  writer files with no behaviour change.
- **Errors:** each writer keeps its current results and errors. Only the
  way the SQL gets the guard changes.
- **Tests:** one race test of the builder suspends the org before the
  batch, and proves that nothing changes. Each existing race test of a
  writer stays, unchanged, so the refactor keeps every result.

Contract owners:

- The [app API README](../worker/app-api/README.md) and the
  [automations README](../worker/automations/README.md).
- [Agent tool access](../docs/protocol/agent-tool-access.md) and
  [Operator actions](../docs/protocol/operator-actions.md) state the
  requirement, which does not change.

## Milestone 1: The builder

Depends on: none

- [x] Add `worker/app-api/shell-guard.ts` with the guard SQL, the builder,
      `GuardedStatement`, `guardedBatch`, `guardedRun`, and `shellRead`.
- [x] Add its tests: a race test that suspends the org before the batch,
      the numbered bindings, and the throws for a bare `?`, a missing
      token, and a write in `shellRead`.
- [x] Prove that the race test fails when the builder leaves out the
      guard. Record the proof under `.context/shared-shell-access-guard/`.

## Milestone 2: Move the writers

Depends on: 1

Each writer gets its statements from the builder. Each existing test
passes with no change.

- [x] `worker/app-api/feature-workspaces-data.ts`.
- [x] `worker/app-api/workspace-parent-change-data.ts`.
- [x] `worker/app-api/feature-sections-data.ts`.
- [x] Move the Archive branch of `writeWorkspaceTree` into
      `worker/app-api/archive-data.ts`.
- [x] `worker/automations/automation-write-data.ts`.
- [x] Stop exporting `activeShellMemberPredicate` from
      `worker/app-api/feature-shell-access.ts`.
- [x] Update `worker/app-api/README.md` and
      `worker/automations/README.md`.

## Milestone 3: The lint

Depends on: 2

- [x] Add the rule to `eslint.config.js` for the writer files.
- [x] Check that the rule fails on a raw `.prepare(` in a writer file,
      and passes on the moved code.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Delete `plans/follow-ups/shared-access-guard-for-shell-writers.md`,
      because this change applies its answer.
- [ ] Run the targeted tests, and the complete gate named in `AGENTS.md`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decision and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.
