# Faster workspace create

Status: Active. On branch `calummoore/milan-ofz5`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The first message of New workspace creates the workspace. The Create
button of the dialog and the Send button of the page stay busy until the
server answers the create request. Only then does the app open the new
workspace. The user said that this wait makes the app feel slow. This
change makes the server answer faster. The screens do not change. The
change does not open the workspace before the answer, and it does not
remove the second load of the workspace screen after the answer.

What the create waits for today:

- The `records` step stores the workspace and the first message. The
  answer waits for it. It runs in the alarm of the workspace object.
  `storage.begin` sets the start alarm to now
  (`worker/lifecycle/start-storage.ts`). Then `enqueueWorkspaceStart`
  calls `storage.schedule()` (`worker/lifecycle/start-admission.ts`).
  That call writes the same alarm key, `lifecycle:start`, for now + 1 s.
  So the answer usually waits about 1 s more than it must. A resume gets
  the same wait before its first step.
- The Worker runs near the user. The D1 database is in Western Europe.
  Before the workspace object runs, the route makes about 20 D1 queries,
  one after another. Some check the same fact again in the same request,
  such as the membership of the same person.
- The workspace object has the location hint `weur`. So its queries are
  near the database, and this change keeps them as they are.
- Nobody measured the times. The guess is about 1.5 s near Europe and
  2.5–4 s far from it.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md#the-create).
  The requirements do not change: the create answers when the workspace
  and its first message are stored (decision 91).
- The [lifecycle README](../worker/lifecycle/README.md#browser-routes).
- The [previews README](../worker/previews/README.md), for the shared
  timing helper.

## Decisions

### create-speed decision 1. How the create feels fast

- **Date:** 13 November 2026. The user chose option A.
- **Root question:** How does a user who sends a first message see the new
  workspace and the message at once?
- **Options:**
  - **A.** Remove the extra wait of about 1 s and the repeated checks,
    and add timing. The screens stay the same. Chosen.
  - **B.** Do A. Also fill the workspace screen from the answer, so the
    second load goes. Not chosen. It was the recommendation.
  - **C.** Do B. Also open a temporary workspace at once, and switch to
    the real one when the answer comes. Not chosen. It changes the
    recorded rule that the workspace opens when the server accepts the
    create.
- **Left out:**
  - The browser picks the workspace ID. A forged ID could reach the
    workspace of another org.
  - The server answers before it stores the workspace. Refusals would then
    come after the workspace opens, and it changes decision 91.
  - The server reserves the workspace at the first key press. It adds
    server records for drafts that nobody sends.
- **Item 2 of the brainstorm:** where a failed optimistic create shows.
  It applied only to C, so it closed with this decision.

## Design calls

These are my calls, made on 13 November 2026.

- **Start at once.** The `records` step of a create, and the first step
  of a resume, start at once. Reason: the 1 s delay does no work. The
  later steps keep their own times.
- **Timing in a `Server-Timing` header.** The create answer gets a
  `Server-Timing` header with the duration of each step. The helper of
  the previews moves to a shared place, so both routes use it. Reason:
  the previews already do this, and anyone can measure from the browser
  without access to the Worker logs. The header holds only fixed step
  names and durations, with no ID and no secret.
- **Each fact is checked once in the route.** The route drops a check that
  the same request already made for the same person and the same org. A
  check of a different fact stays. Reason: each dropped query is one trip
  to Western Europe.
- **Independent checks run in parallel.** Checks and reads that do not
  depend on each other run together. When more than one fails, the error
  of the first check in the current order wins. Reason: the error that the
  user sees stays the same.
- **The workspace object keeps its checks.** The checks in the
  `records` step run later in time, near the database. They catch a member
  who left after the route checked. Reason: they protect isolation, and
  they cost little.
- **No protocol doc change.** The behaviour stays, so only the READMEs
  change.
- **No mockup work.** No screen changes.

## Milestone 1: Timing of the create

Depends on: none

The create answer gets a `Server-Timing` header, so that the later
milestones and the deployed app can be measured.

- [x] Move `PreviewTiming` from `worker/previews/timing.ts` to a shared
      Worker module with a general name. Keep the preview behaviour and
      its tests.
- [x] Time the steps of the create route in
      `worker/lifecycle/browser.ts`: `create`, which holds the plan, the
      claim, and the admission, then `message` and `project`. Add the
      header to the 201 answer only.
- [x] Test that a create answer has the header with the fixed step names,
      and no ID.
- [x] Update the lifecycle README and the previews README.

## Milestone 2: Start the records step at once

Depends on: none

- [x] Make `enqueueWorkspaceStart` keep the start alarm at now, in place
      of now + 1 s. Read the history of `storage.schedule()` first, and
      keep any case that needs it.
- [x] Test with a fake clock that a create gets its admission with no
      wait of 1 s. A resume uses the same queue, so one test covers both.
- [x] Check that the later steps of a start keep their times.
- [x] Update `worker/lifecycle/workspace-object.md` if it names the delay.

## Milestone 3: Fewer database trips in the create route

Depends on: 1

- [x] List each D1 query of the create route, from the gate to the
      answer. The list is in `.context/create-speed/create-route-queries.md`.
- [x] Drop each repeated check of the same fact in the same request, such
      as the second membership check when the sender is the user.
- [x] Read the saved creation plan and its sender together, and reuse the
      sender as the owner when they are the same person. My call on
      13 November 2026, in place of the plan in memory: the saved plan
      stays the one source for each repeat of the same message ID.
- [x] Run the independent checks and reads in parallel. Keep the current
      order of their errors.
- [x] Test that each refusal stays the same: a person who is not a member,
      a suspended org, a missing repository, and a repeat of the same
      message ID. `create-access.test.ts` adds the first two with their
      order. Existing tests keep the others.
- [x] Update the lifecycle README.

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

- [ ] Measure a create on `conductive.build` with the `Server-Timing`
      header, from Europe and from far away. When the wait still feels
      slow, offer options B and C of create-speed decision 1 again.
