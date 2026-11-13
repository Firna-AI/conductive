# Routine trigger for failed checks

Status: Active. On branch `calummoore/riga-b7hb`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A routine is a saved prompt that runs an agent without a person. Today a
routine starts on a schedule, on Run now, or on three GitHub pull request
events: PR opened, PR pushed, and PR merged
([Routines](../docs/protocol/routines.md#schedules)). Nothing starts an
agent when a GitHub check fails. A member must see the red pull request bar
and click Fix checks. Cal asked on 13 November 2026 for "a GitHub routine
for when a check fails".

The chosen approach is decision 518 A. A fourth pull request trigger, "PR
checks failed", starts a routine run when a check fails on an open pull
request of the routine's repository. The run works as a PR pushed run does:
a new workspace, its own branch from the failed commit, and the head branch
of the pull request as its base branch. The owner chooses on each such
trigger whose trust lets a failure start a run (decision 519). This change
does not add automatic Fix checks in an existing workspace, an incoming
webhook for other CI systems, or a filter on check names. The brainstorm
notes are in `.context/check-failed-routine/notes.md`.

Contract owners:

- [Pull request runs](../docs/protocol/pull-request-runs.md): the new
  event, its trust setting, its loop rule, and its run key.
- [Routines](../docs/protocol/routines.md): the Add trigger menu and the
  risks that stay open.
- [Routine runs](../docs/protocol/routine-runs.md): one run for each
  delivery becomes one run for each pull request and commit for this event.
- [Base branches](../docs/protocol/base-branches.md): the branch of a
  checks-failed run.
- [GitHub banner](../docs/protocol/github-banner.md): check webhooks also
  start routine runs.
- The [routines README](../worker/routines/README.md), the
  [GitHub README](../worker/github/README.md), and the
  [migrations README](../migrations/README.md).

## Decisions

### Decision 518: how an agent reacts to failed checks

Cal chose A on 13 November 2026.

- **A. Chosen.** A "PR checks failed" routine trigger. It reuses the Runs
  list, the author filter, and the turn-off after three failed runs.
- **B. Rejected.** Automatic Fix checks in the workspace that owns the
  branch. It covers only branches of Conductive workspaces, and it changes
  decision 220, under which a member clicks each bar action.
- **D. Rejected.** No change: a PR pushed routine whose prompt waits for
  CI. It starts a cloud computer on every push, also when CI passes.
- **C. Left out.** An incoming webhook that CI calls. Each repository must
  change its CI, and the App already receives check events.
- **E. Left out.** An hourly routine that looks for red pull requests. It
  is slower and costs more than D, and the agent chooses whom to trust.

### Decision 519: whose trust lets a failed check start a run

Cal chose on 13 November 2026 to make it a setting of each "PR checks
failed" trigger. The other pull request triggers keep decision 506 C: the
author and the sender must be org members or be named in Author is.

- Reason for a new rule: the sender of a check event is usually a CI bot,
  such as `github-actions[bot]`. That bot did not write the code.
- The choices that the setting offers, and its default, are decision 522.
- **a. Not chosen alone.** The author only.
- **b. Not chosen alone.** The author and the account that pushed the
  failed commit.
- **c. Not chosen alone.** The author and the event sender.

### Decision 520: how runs of a routine stop starting more runs

Open. It blocks Milestone 5. The options check changed the root question,
added options d and e, and changed the recommendation from c to d.

- **Severity:** High. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/routines/pull-request-data.ts:45`
- **Background:** The loop guards stop a run for a pull request whose head
  branch is a run branch of the routine. They also stop runs for the
  owner's events while a run of that pull request works. Caps on runs were
  rejected for the other triggers (`docs/protocol/routines.md`, Schedules).
  GitHub cannot tell a push of a run from a push of the owner, because both
  push as the owner (decision 50).
- **Problem:** A run can push a fix to the pull request. When CI fails
  again after that run ended, a new run starts.
- **Impact if no action:** One pull request can spend cloud computer starts
  without end. All orgs share the daily starts.
- **Root question:** How does the app stop the pushes of a routine's own
  runs from starting more runs without end, while new pushes by people
  still start runs?
- **Options:**
  - **a.** No limit. A prompt that pushes can loop without end. Effort:
    Small.
  - **b.** At most three checks-failed runs for each routine and pull
    request. After that, each failure gives a skipped row. Effort: Small.
  - **c.** The same limit as b, but only commits that the owner pushed
    count. A push by another account resets the count. It also stops runs
    on the owner's own pull requests after three failures. Effort: Medium.
  - **d.** The same limit as b, but only commits that a run pushed count. A
    commit is a run commit when the routine's owner pushes it while a run
    of that routine for the pull request is queued, starting, working, or
    waiting for input. A failure of any other commit resets the count. A
    push that reaches the Worker after the turn ended counts as a push by a
    person, so a short grace time follows each turn. Effort: Medium.
  - **e.** A hop count for each pull request run, for every trigger. A run
    that another run caused gets the hop count of that run plus one. An
    event past a set hop count gives a skipped row. It also bounds loops
    through several routines and through PR opened, PR pushed, and PR
    merged, so it changes the Loops rules of those triggers. Effort: Large.
- **Left out:** A time window, such as one run an hour for each pull
  request, because it still loops, only slower. A progress check that stops
  when the same checks fail again, because it still loops when the failed
  checks change each time.
- **Wider fix:** e. c and d bound only a loop through a checks-failed
  trigger of one routine.
- **Previous examples:** The loop guards of
  [Loops](../docs/protocol/pull-request-runs.md#loops).
- **Recommendation:** d. It stops the run's own fixes and does not count
  the owner's own pushes. Option e best protects the codebase, but it
  changes the rules of the other triggers.
- **Action:** ask the user, because it adds a cap, and an earlier decision
  rejected caps on runs.

### Decision 521: failures on the default branch

Open. It blocks the name of the trigger in Milestone 1 and the scope of
Milestone 5. The options check changed the root question, added options c
and d, and changed the recommendation from a to c.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** None.
- **Background:** CI also runs on pushes to the default branch, such as
  `main`. Such a push has no pull request and no pull request author. A
  broken default branch also fails the next CI run of each pull request
  that tests its merge with that branch.
- **Problem:** The trust rule and the loop rule of this plan assume a pull
  request.
- **Impact if no action:** A broken default branch starts no run for
  itself. It can still start one run for each open pull request whose CI
  tests the merge with it.
- **Root question:** How should routines respond when the default branch
  fails its checks, on that branch and in the pull requests that test
  against it?
- **Options:**
  - **a.** Pull requests only. The trigger is named "PR checks failed". A
    later default-branch watch extends this trigger and renames it.
    Effort: Small.
  - **b.** Also the default branch, in the same trigger. The run starts
    from the failed commit, with the default branch as its base. The pusher
    must be trusted, so the pusher records must also cover pushes to the
    default branch. The trigger is named "Checks failed". Effort: Large.
  - **c.** Pull requests only now, as a. The follow-up is a separate
    trigger for branches without a pull request, with a branch list whose
    default is the default branch. "PR checks failed" keeps its name.
    Effort: Small now, and Large for the later trigger.
  - **d.** c, and a pull request failure gives a skipped row when the same
    check also fails on the newest commit of the base branch. It costs one
    more GitHub read for each failure. A check that fails by chance on the
    base branch can hide a real failure. Effort: Medium.
- **Left out:** A fixed rule for every branch, because the branch list of c
  can name every branch and can also limit them.
- **Wider fix:** None. This decision sets scope.
- **Previous examples:** None found.
- **Recommendation:** c. It ships the scope of a, and the name of the
  trigger stays right when the later trigger comes.
- **Action:** ask the user, because it sets the scope of the feature.

### Decision 522: the choices and the default of the trust setting

Open. It blocks Milestones 1, 3, and 5. The options check added options E
and F, and changed the recommendation from A to F.

- **Severity:** High. **Effort:** Small.
- **Source:** Design. Decision 519 opened it.
- **Category:** Security.
- **Location:** `worker/routines/pull-request-dispatch.ts:23`
- **Terms:**
  - **Pusher:** the GitHub account that pushed the failed commit to the
    head branch. The Worker records it from the push webhook.
- **Background:** A run uses the owner's agent login, GitHub token, and the
  org's env vars. The author of a pull request can write instructions into
  the code that the agent reads. Any account with write access can push to
  that pull request. Any account that can write a commit status can choose
  the name of that status.
- **Problem:** Cal chose a setting on the trigger. The setting needs a list
  of choices and a choice for a new trigger.
- **Impact if no action:** Milestone 1 cannot draw the trigger form.
- **Root question:** Whose accounts must be trusted before a failed check
  starts a run with the owner's logins, by default and as the owner's
  looser choice?
- **Options:**
  - **A.** Two choices: "Author and pusher", the default, and "Author
    only". Author only lets an untrusted pusher steer a run, and the
    protocol doc names that risk. Effort: Small.
  - **B.** Three choices: A and "Author and sender". The sender is usually
    a CI bot, so that choice skips most runs until the owner names the bot
    in Author is. Effort: Small.
  - **C.** The same choices as A, with "Author only" as the default. More
    runs start, with the weaker rule by default. Effort: Small.
  - **D.** The setting on every pull request trigger, not only on checks
    failed. It lets the owner loosen PR opened, PR pushed, and PR merged.
    Effort: Medium.
  - **E.** "Author and every pusher" as the default, and "Author only" as
    the looser choice. Every account that pushed to the head branch must be
    trusted. It needs pusher records for the life of the branch. A branch
    older than the records gives skipped rows. Effort: Medium.
  - **F.** The choices and the default of A. The run text also leaves out
    the name of the failed check. The agent reads the failed checks itself
    with the GitHub CLI, as Fix checks does. Effort: Small.
- **Left out:** Trust in GitHub roles, because it trusts accounts that no
  admin of the org invited (decision 506 C). A run without env vars and with
  a read-only token, because it still spends the owner's agent login and
  needs a new kind of start.
- **Wider fix:** E. A and F check only the last push, so untrusted code
  stays in the run when a trusted push follows it.
- **Previous examples:** Decision 506 C, in
  [Who may start a run](../docs/protocol/pull-request-runs.md#who-may-start-a-run).
- **Recommendation:** F. It keeps the safe default of A, and it keeps text
  that no trust choice checks out of the owner's first message. Option E
  best protects the codebase, at the cost of skipped rows on older branches.
- **Action:** ask the user, because the default sets a security rule.

## Design

These are my design calls of 13 November 2026, unless a decision names
them. The options check of the same day corrected the calls on the signal,
the webhook path, the overlap, the pusher records, and the run text. The
user can override each one.

- **Signal.** A `check_run` with action `completed` and the conclusion
  `failure`, `timed_out`, or `startup_failure` starts a run. A `status`
  with the state `failure` or `error` starts a run too. Cancelled, stale,
  action-required, neutral, and skipped results start nothing. Reason: a
  cancel or a stale result usually means a newer push. The bar counts
  cancelled, stale, and action-required as failures
  (`src/shared/github.ts:94`), so the protocol doc states the difference.
- **Webhook path.** The routine path for check events is separate from the
  refresh of the pull request bar. Open PR #250 removes the bar refresh for
  check events. This path stays whether #250 merges or not. A check event
  that is not a failure returns 204 and reads nothing. A failure reads D1
  for active routines with a checks-failed trigger on that repository
  before it reads GitHub.
- **Finding the pull request.** A `check_run` names its pull requests, with
  their numbers and head commits, in `pull_requests`. The Worker computes
  the run key from those facts and reads GitHub only when no run with that
  key exists. A `status` names no pull request, so the Worker reads the
  open pull requests of the commit with the installation token. A status
  whose commit has no open pull request, such as a test merge commit,
  starts nothing.
- **Forks.** A pull request whose head repository is not the base
  repository starts no run, as for the other triggers.
- **Timing and key.** The first failure of a head commit starts the run.
  The run key is `github-check:<routine>:<pull request>:<head commit>`. So
  each routine starts at most one run for each pull request and commit,
  also when many checks fail. The run text says that other checks can
  still run.
- **Overlap.** While a checks-failed run of the same routine for that pull
  request is queued, starting, working, or waiting for input, a failure of
  a newer commit starts no run. It gives a skipped row that says that a run
  still works on the pull request. Reason: without a row, the newest
  failure can stay unfixed with no reason in the Runs list.
- **Stale commit.** A failure for a commit that is no longer the head of
  the pull request starts nothing.
- **Pusher records.** A new D1 table keeps the sender of each push webhook
  for its repository, branch, and new head commit. A PR opened sender is
  not used, because that account opened the pull request and need not have
  pushed its commits. Rows older than 30 days are deleted by the minute
  scan. When no row exists, the pusher is unknown, and "Author and pusher"
  gives a skipped row with that reason.
- **Author filter.** The trigger has the same Authors control as the other
  pull request triggers. The filter decides first, as today.
- **Run text.** The label is "PR checks failed". The facts are the pull
  request, the head, the base, and the target of the work. Decision 522
  decides whether "Failed check:" with the name of the check is a fact too.
  Reason: any account that can write a commit status chooses its name.
- **Branch.** As PR pushed: the run branch starts at the failed commit, and
  its base branch is the head branch of the pull request (decision 505 A).
- **Run now.** A routine whose triggers are all pull request triggers,
  including this one, keeps no Run now (decision 510 C).
- **Turn-off.** The turn-off after three failed runs does not change.

## Milestone 1: Mockups

Tags: mockup

Depends on: none. Decisions 521 and 522 must be answered first.

- [ ] Add "PR checks failed" to the GitHub group of the Add trigger menu in
      `app/routines/triggers`.
- [ ] Add a child page of `app/routines/triggers` with a checks-failed
      trigger, its trust setting, and its author filter, on desktop and
      phone.
- [ ] Add checks-failed runs to `app/routines/runs`: a started run, a run
      skipped for an unknown pusher, a run skipped for an untrusted pusher,
      a run skipped while another run works on the pull request, and, if
      decision 520 adds a limit, a run skipped at the limit.
- [ ] Add a checks-failed run to `app/routines/run-workspace`, with its
      line under the header.
- [ ] Update `docs/mockups/catalogue-chat-and-routines.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update the five contract owner docs above with the requirements and
      the decisions 518 to 522 in force.
- [ ] Read both legal pages, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`, in full. Update each sentence that
      restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact.
- [ ] Update the note of the Routines row in
      `src/marketing/from-conductor/areas/automation-and-api.ts` if it no
      longer matches.
- [ ] In `docs/protocol/routine-runs.md`, "a failed check" already means a
      check before the create, such as the agent login check. Use another
      word for a GitHub check there.
- [ ] Add to [Risks that stay open](../docs/protocol/routines.md#risks-that-stay-open)
      that code which other accounts pushed earlier reaches the agent, and
      that "Author only" lets an untrusted pusher steer a run.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Trigger contract and storage

Depends on: 2

- [ ] Add the `checks-failed` event and its trust setting to the trigger
      types in `src/shared/routines.ts`.
- [ ] Parse and store them in `worker/routines/triggers.ts`,
      `prepare-routine.ts`, and `stored-triggers.ts`. A stored trigger
      without the setting reads as the default.
- [ ] Keep Run now off for a routine whose triggers are all pull request
      triggers.
- [ ] Add route tests for a save, a read, and a refused setting.

## Milestone 4: Pusher records

Depends on: 2

- [ ] Add the migration for the pusher table, and document it in the
      migrations README.
- [ ] Record the sender of each push webhook with its repository, branch,
      and new head commit, also when no routine matches.
- [ ] Delete rows older than 30 days in the minute scan.
- [ ] Add tests for the record, a repeat delivery, and the cleanup.

## Milestone 5: Checks-failed dispatch

Depends on: 3, 4. Decisions 520 and 521 must be answered first.

- [ ] Route a failed `check_run` and a failed `status` to the routine path
      in `worker/github/webhook-routing.ts` and `webhook.ts`, apart from
      the bar refresh.
- [ ] Find the pull requests, refuse forks and stale commits, and apply the
      author filter and the trust setting.
- [ ] Store the run with the per-commit run key and the overlap guard, and
      apply the loop rule of decision 520.
- [ ] Start the run as a PR pushed run in `run-starter.ts`, and add the run
      text in `run-text.ts`.
- [ ] Update `worker/routines/README.md` and `worker/github/README.md`.
- [ ] Add tests for each signal, a fork, a stale commit, a status without a
      pull request, each trust choice, a repeat failure of one commit, the
      overlap row, and the loop rule.

## Milestone 6: Trigger form and run copy

Tags: ui

Depends on: 1, 3

- [ ] Add "PR checks failed" to the Add trigger menu and the trust setting
      to its row in `src/shell/routines/`.
- [ ] Add the run label, the skip reasons, and the run workspace line.
- [ ] Add component tests for the form and the runs list.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm run test -- worker/routines worker/github src/shell/routines`
      and the complete gate, `npm run check`.
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

- [ ] Confirm with a real failed check on the test deployment that a run
      starts once, and that its row and its workspace show the pull request.
