# Operator idle stop time

Status: Active. On branch `calummoore/workspace-sandbox-timeout-6anh`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says. Decisions 1 to 4 below wait for the user.

Today a cloud computer of a workspace stops after 30 minutes without user
activity and without a running agent turn. The time is a constant in the
Worker. `IDLE_MS` in `worker/lifecycle/durable-types.ts` sets the alarm of
the workspace Durable Object. A provider auto-stop of 1,800 seconds, or
1,860 seconds after input, is the backstop at the provider. About eight
workspace calls in `worker/lifecycle/` pass that number.

User decision, 20 November 2026: Cal asked for a global operator setting
that sets this time, with 30 minutes as the current value. The operator
changes it in the operator section. This changes the requirement "It changes
no other setting (decision 143)" of
[Access](../docs/protocol/operator-section.md#access). A setting for each org
or each workspace was not asked for, and stays out of this change.

Contract owners:

- [Stop and resume](../docs/protocol/stop-and-resume.md#the-stop).
- [Operator section](../docs/protocol/operator-section.md).
- [Operator section: the Overview](../docs/protocol/operator-overview.md#long-runs).
- [Pricing](../docs/protocol/pricing.md).
- The [lifecycle README](../worker/lifecycle/README.md) and the
  [operator README](../worker/operator/README.md).

## Design

Design calls, all made by the agent on 20 November 2026:

- Storage: a new D1 table holds one row with the time in whole minutes, the
  time of the last change, and its operator. A second table keeps each
  change with its operator and time. Reason: this is the pattern of the
  provider weights, and the section already names the operator of the last
  change of the weights.
- No row means 30 minutes. Reason: the previous Worker uses its constant
  and ignores the table, so the migration keeps it working.
- Routes: `GET` and `PUT /api/operator/idle-stop`, behind the app gate and
  the operator check, as the weights routes. An equal value changes nothing
  and records no event.
- The workspace Durable Object reads the time through a new lifecycle hook.
  It keeps the value in memory for 60 seconds. Reason: the object schedules
  its alarm often, and a D1 read on each schedule adds a round trip.
- The provider auto-stop of a workspace computer becomes the stop time
  plus 60 seconds. Reason: the backstop must never stop a computer before
  the Worker's own stop, and a longer time must not be cut at 30 minutes.
- Image builds and the restarts near day 14 keep their 1,800 seconds.
  Reason: they are not workspace activity, and this setting covers only
  the stop of a workspace.
- The turn heartbeat of 5 minutes stays.

## Decisions

Decisions 1 to 4 wait for the user. The final report of the session gives
them in the `decisions-and-findings` layout. Their recorded letters are:

1. Which stop times may the operator choose? Recommended: B, whole minutes
   from 5 to 240.
2. When does a change reach the computers that already run? Recommended:
   A, each workspace takes the new time at its next schedule.
3. How do the pricing page and the guides state the stop time?
   Recommended: D, the Worker fills the saved time into the pages when it
   serves them. The first recommendation was B, no number. The options
   check showed that the Worker already fills values into served pages.
4. Where does the setting show in the operator section? Recommended: A, a
   new Settings tab.

The final report of 20 November 2026 gives every option, its effort, and
the reason of each recommendation. The options check of the same day added
option D to decisions 1, 3, and 4, and option E to decisions 2 and 3.

## Milestone 1: Mockups

Tags: mockup

Depends on: decisions 1 and 4

- [ ] Add the stop time box to the operator mockups in
      `docs/mockups/src/entries/app/operator/`, at the place of decision 4.
      Show the saved state, a changed value with Save, a failed save, and
      the line that names the operator of the last change.
- [ ] Update the hours rule of the pricing mockup in
      `docs/mockups/src/entries/marketing/pricing/index.mockup.tsx`, as
      decision 3 says.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1, and decisions 1 to 4

- [ ] Update `docs/protocol/stop-and-resume.md`: the stop time is the
      operator setting, 30 minutes by default.
- [ ] Update `docs/protocol/operator-section.md`: the new setting, its tab,
      its values, and the record of each change.
- [ ] Update `docs/protocol/operator-overview.md` and
      `docs/protocol/pricing.md` for the stop time. The Overview lines on the
      last activity and on how late a run shows must hold for any saved time.
- [ ] Read the Terms and Privacy pages and each public guide in full.
      Update each sentence that restates the stop time, as decision 3 says.
- [ ] Update `worker/lifecycle/README.md` and `worker/operator/README.md`.

## Milestone 3: Backend

Depends on: 2

- [ ] Add the migration with the setting table and the event table. Keep
      the previous Worker working.
- [ ] Add the shared types and path helper in `src/shared/`.
- [ ] Add the GET and PUT routes in `worker/operator/`, with the values of
      decision 1.
- [ ] Add the lifecycle hook that reads the time, with its 60-second cache.
      Use it in `durable-alarm.ts` and `durable-scheduling.ts`.
- [ ] Pass the stop time plus 60 seconds to each workspace `setAutoStop`,
      `resume`, and create call. These include the turn heartbeat in
      `workspace-actions.ts`, `continue-progress.ts`, and
      `repository-change-command.ts`. The turn heartbeat has no margin
      today, and this change gives it 60 seconds.
- [ ] Apply decision 2 to the computers that already run.
- [ ] Add the tests: the routes, the default, a shorter and a longer time,
      and the provider auto-stop.

## Milestone 4: Operator screen

Tags: ui

Depends on: 3

- [ ] Add the box to the operator section, as the mockup shows.
- [ ] Add the DOM tests of the box.
- [ ] Check the box in a browser and save a screenshot under `.context/`.

## Milestone 5: Verification, commit, review, and pull request

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
