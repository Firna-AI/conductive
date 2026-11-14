# Last active time on the operator Users tab

Status: Active. On branch `calummoore/milan-mq6q`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The Users tab of the operator section, at `/operator/users`, lists each
user with Joined, Orgs, and Workspaces. The app records no time of last
use, so the operator cannot tell an active account from a dormant one.
On 14 November 2026 the user asked to "add last online/active to this
table", with a screenshot of the tab.

This change records the time of the last real action of each person: a
new workspace, or a chat message that the person sends from the app. The
Users tab shows that time in a new Last active column, and the page of a
user shows it in its details. The change does not add an "online now"
mark, a sort by last activity, or a history of actions.

Contract owners:

- [Operator section](../docs/protocol/operator-section.md).
- The [operator README](../src/shell/operator/README.md) and the
  [operator backend README](../worker/operator/README.md).
- The [migrations README](../migrations/README.md).
- The [mockup catalogue](../docs/mockups/catalogue-operator.md).
- The Privacy page in `src/marketing/privacy.ts` and
  `src/marketing/privacy-uses.ts`.

## Terms

- **Operator:** a person whose GitHub ID is in the Worker setting
  `OPERATOR_GITHUB_IDS`. Only an operator can open `/operator`.
- **Real action:** a new workspace that the person creates in the app, or
  a chat message that the person sends or sends again from the app.
- **Last active time:** the time of the last real action of a person, in
  the new nullable column `users.last_active_at`.

## Decisions

### 1. Choose the use that counts as "last active"

Answered on 14 November 2026: the last real action, "like creating a
workspace or sending a message". This is option D, widened to also count
a new workspace.

- **Root question:** How does the operator see, for each user in the
  Users tab, when that user last used Conductive?
- **Options:**
  - **A.** Show the last sign-in from `users.updated_at`. The time can be
    up to 7 days older than the last use, because a session lasts 7 days.
  - **B.** Record the last signed-in request. A forgotten open tab counts,
    because an org screen sends a request every 5 to 30 seconds.
  - **C.** Record the last key press, click, or scroll in the app.
  - **D.** Record the last chat message that the person sends.
  - **E.** Send activity events to Cloudflare Workers Analytics Engine.
- **Left out:** the activity time of the workspaces, the read marks, live
  presence from open sockets, the Mac app heartbeat, a time on the session
  record, Cloudflare logs, and a write on each request. Each fails the
  goal, or B is better on every point.
- **Recommendation of the brainstorm:** C. The user chose D, widened.

## Design

Each item below is my call, made on 14 November 2026, unless it says
otherwise.

- **What counts.** A successful browser request that creates a workspace,
  sends a chat message, or sends a failed message again. The Mac app
  counts too, because it shows the web app. Reason: these are the two
  actions that the user named, and a retry is the same send.
- **What does not count.** Sign-in, page loads, reads, Continue, archive,
  settings, and each action of an agent tool or a routine for the person.
  Reason: the user asked for real activity. An agent tool or a routine
  acts for the person, but the person did not act.
- **Where the time is recorded.** In the Worker, after the request
  succeeds:
  - A message send or retry: in `routeChat` of `worker/chat/router.ts`,
    after the workspace object answers with a 2xx status. Agent tools and
    routines do not pass this route.
  - A new workspace: in `chatLifecycleRoute` of
    `worker/app-api/lifecycle.ts`, after the create answers with 201.
  - Reason: one place for each action, outside the workspace object, and
    only the person's own browser requests reach it.
- **Storage.** A nullable `last_active_at` column on `users`, like
  `suspended_at`. Reason: one time per user, read in the same query as
  the row. A separate table adds a join and is only useful for a history.
- **Throttle.** One conditional `UPDATE` that writes only when the stored
  time is older than 1 minute. Reason: the table shows minutes at most.
- **Failure.** A failed write logs a warning through the Worker warnings
  and never fails the request of the person. It runs in `waitUntil` where
  the route has an execution context, so it adds no wait to the answer.
- **Backfill.** The migration sets each existing user's time to the
  creation time of the newest workspace that the user owns. Chat messages
  live in the workspace objects, so a migration cannot read them. A user
  with no workspace keeps no time. Reason: an approximate time is more
  useful than an empty column for the existing accounts.
- **Table.** A desktop column "Last active" after Joined, with the width
  of Joined. A time of today shows as the time of day, such as 14:32.
  Another day shows as Joined does, such as 12 Nov. No time shows
  "Unknown", in the muted style. The phone layout does not change, as
  Joined and Orgs are desktop-only too.
- **Page of a user.** A "Last active" row in Details after Joined, with
  the full moment, such as "14 Nov 2026 at 14:32", or "Unknown".
- **Order.** The list stays newest first. A sort by last activity changes
  the rule of the protocol doc and the cursor, so it can be a later
  request.
- **Privacy.** The Privacy page says that the app records the time of
  the last new workspace or sent message of each account, and that the
  operator sees it. It gets a new effective date.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The Users tab and the page of a user show the last active time.

- [ ] Add the Last active column to
      `docs/mockups/src/screens/OperatorUsersScreen.tsx`, with a time of
      today, another day, and Unknown in the sample rows.
- [ ] Add the Last active row to the Details of
      `docs/mockups/src/screens/OperatorUserScreen.tsx`.
- [ ] Update the `app/operator/users` and `app/operator/user` lines of
      `docs/mockups/catalogue-operator.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the two changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

- [ ] Add the rules of the last active time to the "Orgs and Users"
      section of `docs/protocol/operator-section.md`: what counts, what
      does not count, the column, the row of the user page, and Unknown.
- [ ] Read both legal pages in full. Add the Privacy bullet in
      `src/marketing/privacy-uses.ts` and the new effective date in
      `src/marketing/privacy.ts`. Update each other sentence that
      restates the fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update
      each sentence that restates the fact.
- [ ] Check that the "Product analytics" row in
      `src/marketing/from-conductor/` stays true.

## Milestone 3: Backend

Depends on: 2

- [ ] Add the migration `migrations/<YYYYMMDDHHMM>_user_last_active.sql`.
      It adds `users.last_active_at` and fills it from the newest owned
      workspace. Describe it in `migrations/README.md`.
- [ ] Add the throttled write of the last active time beside the other
      user records in `worker/data/`.
- [ ] Record a message send and a retry in `worker/chat/router.ts`, and a
      new workspace in `worker/app-api/lifecycle.ts`.
- [ ] Add `lastActiveAt: number | null` to `OperatorUserSummary` and
      `OperatorUserDetail` in `src/shared/operator.ts`. Read it in
      `worker/operator/user-directory.ts` and
      `worker/operator/user-detail.ts`, and parse it in
      `src/app/api/read-operator.ts` and `read-operator-pages.ts`.
- [ ] Update the dev state, the dev seed, and the test fixtures.
- [ ] Add Worker tests: a send, a retry, and a create record the time.
      An agent tool send and a failed send do not. A second action within
      the minute does not write. The operator readers return the time.
- [ ] Update `worker/operator/README.md` and `worker/README.md`.

## Milestone 4: Users tab and page of a user

Tags: ui

Depends on: 3

- [ ] Add the Last active column to `src/shell/operator/UsersTab.tsx`.
- [ ] Add the Last active row to `src/shell/operator/UserDetails.tsx`.
- [ ] Add a format helper in `src/shell/operator/format.ts` for the
      column: the time of day for today, else the short day.
- [ ] Update `UsersTab.test.tsx` and `UserPage.test.tsx`.
- [ ] Update `src/shell/operator/README.md`.
- [ ] Check the two pages in a browser with `npm run dev`.

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
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the test deployment, send a message and check that the Users
      tab shows the new time.
