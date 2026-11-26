# Build computer during a refresh

Status: Active. On branch `calummoore/computer-build-not-working-i7cz`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

On 26 November 2026 the org Bookfolio looked as if Build computer did not
work. A push started a refresh at 13:53 UTC. Cal added the repository
`futex-ai/ui` at 13:55 and selected Build computer three times. The Worker
answered each click with the running refresh and saved nothing. The tab
showed "Building" with the log of the refresh, which held only the old
repository. The added build of the new repository started by itself after
the refresh, at 13:57, and succeeded at 14:01. A change of the install
script alone gets no added build, so for such a change the click is lost.
[Org image](../docs/protocol/org-image.md#the-org-image) says that Build
computer starts a build, with a wait only during a switch build.

The change makes a Build computer click during a refresh start a build when
the refresh ends. The Cloud computer tab names a running refresh as a
refresh and says when a build follows it. The change does not cover a click
during a running build, Done of the Repositories tab, or operator routes.
They keep their behaviour.

## Decisions

### Decision 1: a Build click during a refresh takes effect

Cal chose B on 26 November 2026.

- **Root question:** How does a Build computer click during a refresh take
  effect?
- **Options:**
  - **A.** Change nothing in the code. Write the current behaviour into the
    protocol doc. Admins click again after the refresh.
  - **B.** Save the click as a waiting build. That build starts when the
    refresh ends, as the added build does.
  - **C.** Stop the refresh and start the build at once. A stopped refresh
    must clean up its sandbox, so the risk is higher.
- **Left out:** Keep Build computer disabled during a refresh. It is
  disabled already, but a tab that has not seen the push refresh still
  sends the click.
- **Reason:** B makes the click do what the protocol promises, with no
  extra step for the admin.

### Decision 2: the tab names a refresh and the build after it

Cal chose C on 26 November 2026.

- **Root question:** How does the tab tell an admin which job runs, and
  what comes next?
- **Options:**
  - **A.** Change nothing.
  - **B.** Show "Refreshing · <time>" for a refresh.
  - **C.** Do B. Also add one line when a build follows the refresh: "A
    build starts when this refresh ends."
- **Reason:** Admins then see what runs and what comes next.

## Open decisions

The options check of 26 November 2026 found three points that need Cal.
Its report is in `.context/build-after-refresh/options-check.md`.

- **Decision 3:** Build computer is disabled while any job runs, so only a
  tab that missed the refresh can send the click. Recommended: enable it
  while the running job holds older settings and has no request.
- **Decision 4:** A running build that holds older settings loses the
  click too. A push refresh becomes such a build when the image holds old
  values. Recommended: apply decision 1 to every running job that is not a
  switch build and holds older settings.
- **Decision 5:** The added build follows only a successful job.
  Recommended: show "A build starts if this refresh succeeds." for that
  case, and keep "A build starts when this refresh ends." for a request.

## Design

Design calls of the agent, 26 November 2026:

- **The click marks the refresh.** A new nullable column
  `image_build_jobs.requested_build_user_id` holds the admin who clicked.
  A later click replaces the admin, so the last admin who clicked starts
  the build. My call. Reason: a second admin who clicks still gets the
  build when the first one loses the role. A
  separate waiting row in `image_builds` was the other way. The queries of
  running builds, the switch builds, and the history assume one running
  row that does not wait for a switch. So that way touches many more
  queries for the same result.
- **Only Build computer and Try again mark.** These are the
  `POST /api/orgs/<id>/builds` route. Done of the Repositories tab keeps
  its rule, "While a job runs, Done starts no second job", because the
  added build already takes in its adds. My call.
- **The mark holds only while the refresh runs.** The `UPDATE` requires the
  refresh to be in the state `running` and without an operator switch.
  When it matches no row, the refresh has just ended, and the click starts
  a normal build. My call. Reason: a click then never lands on a refresh
  that does not read the mark again.
- **The end reads the mark again.** When a job becomes `done`, the Worker
  reads the mark from D1, not from the job that the alarm read first.
  Reason: a click can land after that first read and before the end. One
  helper runs at each place where a job becomes `done`: the end of
  `cleanupBuild`, and the failure path without a provider in
  `worker/lifecycle/image-build-failure.ts`, which skips `cleanupBuild`.
  The options check found the second place.
- **A job admitted in between gets the mark.** A push or daily refresh can
  start after the end and before the cleanup. The requested start then goes
  through the same marking path, so it marks that new refresh and is not
  lost. The options check found this.
- **A failed refresh still starts the requested build.** My call. Reason:
  an admin asked for the build, and a failed refresh says nothing about the
  install script. The rule that the app starts no build by itself after a
  failed build stays, because the admin started this one.
- **The starter is the admin who clicked.** When that member is no longer an
  active admin, no build starts, and the Worker logs a warning. My call.
  Reason: no build runs in the name of a member who did not ask for it. The
  added build, which needs no click, keeps the first active admin.
- **One build at most.** A refresh with a mark that also gets an added
  build starts one build. Its starter is the admin who clicked.
- **The tab learns that a build follows.** `ImageBuild` gets an optional
  field that says when a build follows a running job. One SQL fragment
  holds the added-build condition, with a form that the history reader can
  use for each row. My call. Reason: the line and the end then use one
  rule. An added build follows only a success, so the line for it waits for
  open decision 5.
- **The POST answers with the refresh.** The answer of a click during a
  refresh is the running refresh, now with `buildFollows: true`. Older
  copies of the app and the Mac app ignore the field and show the refresh
  as before.
- **Compatibility.** The migration only adds a nullable column, so the
  previous Worker keeps working. A mark that the new Worker saves on a
  refresh that the previous Worker ends starts no build. This can happen
  only in the minutes of a deploy.

Contract owners:

- [Org image](../docs/protocol/org-image.md).
- [Org image repositories](../docs/protocol/org-image-repositories.md).
- The [cloud computer guide](../src/marketing/docs/cloud-computer.md).
- The [migrations README](../migrations/README.md).

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The build card of the Cloud computer tab shows a running refresh and the
line of the build that follows it.

- [ ] Add a running refresh state to
      `docs/mockups/src/components/settings/BuildSection.tsx`, with the
      head "Refreshing · <time>".
- [ ] Add a running refresh state with the line "A build starts when this
      refresh ends."
- [ ] Run `npm run mockups:check`. Smoke-test the changed entries.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Update [Org image](../docs/protocol/org-image.md): Build computer or
      Try again during a refresh starts a build when the refresh ends,
      also after a failed refresh. The starter is the admin who clicked.
      The tab names a running refresh and the build that follows it.
- [ ] Update
      [Org image repositories](../docs/protocol/org-image-repositories.md)
      where it restates when a build follows a job.
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates a changed fact.
- [ ] Read each public guide under `src/marketing/docs/` in full. Update
      each sentence that restates a changed fact, such as the build after a
      refresh in `cloud-computer.md`.

## Milestone 3: The Worker

Depends on: 2

- [ ] Add the migration of the nullable column
      `image_build_jobs.requested_build_user_id`.
- [ ] Mark the running refresh in `startImageBuild` when the route of Build
      computer asks for a build. Fall back to a normal start when the mark
      matches no row.
- [ ] Move the added-build condition of `worker/lifecycle/build-end-data.ts`
      into one SQL fragment.
- [ ] After the cleanup of a refresh, read the mark again and start the
      requested build for that admin. Start at most one build with the
      added build.
- [ ] Add `buildFollows` to `ImageBuild` in `src/shared/org-settings.ts` and
      fill it in the build readers.
- [ ] Add Worker tests: a click during a refresh, during a failed refresh,
      a click by an admin who then loses the role, a mark with a waiting
      repository, and a click as the refresh ends.

## Milestone 4: The Cloud computer tab

Tags: ui

Depends on: 1, 3

- [ ] Show "Refreshing · <time>" in `src/shell/settings/BuildCard.tsx` for a
      running refresh.
- [ ] Show "A build starts when this refresh ends." when the running refresh
      has `buildFollows`.
- [ ] Add app tests for both texts.
- [ ] Update `src/shell/settings/` docs and `src/app/screens.md` where they
      describe the build card.

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

## Post-merge follow-up (non-blocking)

- [ ] On production, select Build computer during a refresh of a test org.
      Check that a build starts when the refresh ends.
