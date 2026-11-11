# Chat history newest first

Status: Active. On branch `calummoore/chat-history-loading-3c`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

When a tab opens a workspace, the chat reads the stored history of the
shown session from its oldest page to its newest page. The live events
start only after the last page. So a long session shows its newest
messages, and the live work of a running turn, only after its whole history
has loaded. With this change, the browser reads the newest history page
first and starts the live events after it. Then it reads the earlier pages,
and they show above the newest messages.

The newest-first order also fixes two smaller faults of the history load:

- Since PR #239, a long first load shows "Loading earlier messages" above
  its oldest page. Meanwhile the newer pages still load below it. The
  newest-first order makes that line true.
- An earlier page can no longer move the tabs. Each earlier page holds only
  records that are older than the records that the chat already has, and
  the session log ignores an older record.
  `plans/follow-ups/history-pages-change-saved-tabs.md` describes the fault.
  Its part for the paged replay of the events socket stays open.

This change does not cover an index of the stored events of each session,
the chat requests that wait behind a sandbox start, or a copy of the chat
on the disk of the device. The protocol rejects that copy.

## Decisions

- Decision 280, 11 November 2026: the user chose option C of item 3, "The
  chat hides everything until history loads", of the chat loading
  diagnosis. Earlier that day, the user had chosen option B of the same
  item, in PR #239. Then the user asked to start C on top of it. The
  options were:
  - A. Change nothing, and rely on larger history pages. Rejected: a very
    long session still waits for its whole history.
  - B. Read the workspace record first, and show the start steps and the
    composer at once. The live events still start after the full history.
    Kept: this change builds on it.
  - C. Read the newest page first, start the live events, and read the
    earlier pages above it. Chosen: the chat is live after one page, also
    in a very long session.
  - D. Do B, and read the pages newest first, but start the live events
    after the last page. Not chosen: the newest messages show early, but
    they stay still until the whole history has loaded.
- The diagnosis first ranked C lower partly because C changes a protocol
  rule. That reason does not count under the repository rules, so the
  record keeps only the reasons above.

### Open decisions

- What the history route gives a tab or a Mac app that loaded before the
  deploy. The section below holds the item. Its answer sets one TODO of
  Milestone 3.

#### Clients that loaded before the deploy

The options check of 11 November 2026 changed this item. It added the Mac
app as an old client and options D, E, F, and G. Option C moved to "Left
out". Option H is new after the check. The recommendation moved from A to
H. The report is in
`.context/chat-history-newest-first/options-check-2.md`.

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Code structure.
- **Location:** the history route in `worker/chat/http-routes.ts:42`.
- **Terms:**
  - **Forward session read:** the read of the browser history route that
    gives the pages of a session oldest first, after an `after` cursor.
  - **Old client:** a browser tab or an installed Mac app that still runs
    the history reader from before the deploy.
- **Background:**
  - After Milestone 3, no product code reads the forward session pages of
    the browser route. The readers inside the Durable Object keep their
    own forward read.
  - A browser tab runs its old code until it reloads. The app has no step
    that reloads such a tab.
  - The Mac app bundles the web app. So an installed copy keeps the old
    reader until it installs a new release, and a reload does not end
    that. The app checks for a release at launch and every 4 hours.
  - 27 Worker test files read the forward session pages through
    `chatHistoryPath`, most of them to check the stored history.
  - The project is not in production.
- **Problem:** The forward session read stays only for old clients and for
  tests. The plan rules remove an old way when its plan completes. Only the
  user can keep a path for a client outside the repository.
- **Impact if no action:** Milestone 3 cannot finish, because it must
  remove the forward session read or keep it with the user's answer.
- **Root question:** What does the history route give a client that runs
  the history reader from before the deploy, and until when?
- **Options:**
  - **A.** Remove the forward session read in Milestone 3, and move the 27
    Worker test files to the newest-first read. An old client then shows
    "This session didn't load" or "Earlier messages didn't load" for a
    history of more than one page. A tab shows it until it reloads, and a
    Mac app until it installs the update. Effort: Medium.
  - **B.** Keep the forward session read for two weeks after the deploy.
    Then a follow-up item removes it and moves its tests. A Mac app that
    has not updated by then breaks as in A. Effort: Medium.
  - **D.** Keep the forward session read until two weeks after the first
    published release that carries the newest-first reader. Then a
    follow-up item removes it and moves its tests. Old tabs and the Mac
    apps that update in that time keep their full history. Effort: Medium.
  - **E.** Add a version floor for both clients. Each request names the
    protocol version of its build. The Worker refuses a version below a
    floor that rises only after a release. An old tab reloads at a safe
    moment, and the Mac app shows its update dialog. It adds a protocol
    section, a rejection, and an app state with a mockup. Effort: Large.
  - **F.** Keep the forward session read, and log each forward request
    without IDs. Remove the read when the logs show no such request for 7
    days, or at a fixed date at the latest. It needs a new kind of warning,
    because the logs hide query strings. A person with Cloudflare access
    reads the logs. Effort: Medium.
  - **H.** Keep both directions of the route for good. The chat reads
    newest first, and a full read in order keeps the forward direction. No
    old client breaks, and the tests keep their reads. The route keeps a
    direction that no product code calls. Effort: Small.
- **Left out:**
  - C. Reload old browser tabs at a safe moment. It fails the goal alone,
    because a reload of the Mac app loads the same old bundle.
  - G. A gate step that runs the reader of the last release against the
    current route. E is better on every point, because it removes the
    class, and the gate step only detects it.
  - Refuse an old request with an error. A is better on every point: the
    old reader shows the same failure, and A adds no rejection.
  - Give an old request the whole session in one reply. H is better on
    every point: it reuses the paged read, and one large reply would hold
    the chat queue.
  - Give an old request only the newest page, marked as the last page. It
    fails the goal, because an old client then shows a partial chat as
    complete.
  - Load the Mac app's web app from the Worker. It fails the goal alone,
    because a window that loaded before the deploy still runs old code.
- **Wider fix:** E. It covers every later change of a route, for tabs and
  Mac apps. No fix reaches a client that loaded before the fix shipped, so
  this change still needs A, B, D, F, or H.
- **Previous examples:**
  - `plans/follow-ups/desktop-pause-rollout-check.md`: installed Mac
    builds keep old code until they update.
  - The runner protocol version in `docs/protocol/agent-runner.md`: the
    Worker serves older runners above a floor.
- **Recommendation:** H. The forward direction costs a few lines of the
  route, and keeping it breaks no old client and moves no test. The check
  recommended D, and the first recommendation was A. E best protects the
  codebase.
- **Action:** ask the user, because A removes a route behaviour that old
  tabs and installed Mac apps still reach, and the other options keep a
  path for them, which only the user decides.

## Design

- The Worker gives the pages of a session newest first. The first page
  reads back from the cutoff, the newest event number at the first read.
  Each later page reads back from where the page before it stopped.
- Each newest-first page uses the page limits of the browser route. It
  holds its events in event order, and it names the cursor of the next
  earlier page while one remains. Every page keeps the cutoff of the first
  page, so that the history compaction projects every page through the
  same cutoff.
- The browser merges the newest page into the session log. The first load
  then reads the workspace and the session list again. It starts the live
  events after the cutoff, as it does today after the full history.
- The browser reads the earlier pages one after the other. The session log
  puts their events in event order and drops repeats. A session that opens
  after the first load already gets its history after its live events in
  this way.
- The history status of the session stays loading until the oldest page.
  Meanwhile the chat shows "Loading earlier messages" above the messages
  that it has. A failed earlier page keeps the messages, and the notice
  "Earlier messages didn't load" offers Try again by the composer. Both
  views exist today.

### Design calls

These are my calls, made on 11 November 2026.

- Build on option B and on option A of item 1, not beside them. Reason:
  both change the functions that this change rewrites. A second base
  would mean two rewrites and a merge conflict.
- The readers inside the Durable Object keep their forward read: the
  events socket, the transcript copy, the workspace summary, and Continue.
  Reason: each needs the events in order, and none is part of the load of
  the chat.
- Use the newest-first read for every session: the shown session of the
  first load, and each session that becomes the shown session later.
  Reason: one read path.
- Show a turn whose start is on an earlier page as it is, under "Loading
  earlier messages". When the earlier page arrives, the session log folds
  the session again in event order. So the final chat is the chat of an
  in-order load. Rejected: extend the first page back to the start of its
  oldest turn, because a long turn makes the first page large and slow.
  Rejected: hide a partial turn until its start loads, because it hides
  the newest work, which this change exists to show.
- Read the earlier pages at once, one after the other, until the oldest
  page. Rejected: read them only when the reader scrolls up. More parts of
  the chat would then see a partial history, such as the agent of the model
  menu.
- Hold the earlier pages, and merge them into the session log once, after
  the oldest page. Reason: the browser folds a session in time that grows
  with the square of its length, and each merge of older events folds the
  whole session again. In a one-time measurement, 4,200 items in four
  pages folded for 5.2 s page by page and for 3.2 s with one merge. Today's
  load folded them for 5.5 s. Rejected: merge each page as it arrives,
  because each page then freezes the live chat. Rejected: fold the earlier
  pages only when the reader scrolls up, for the reason of the call above.
  The faster fold that removes the last freeze is the follow-up item
  `plans/follow-ups/chat-fold-slows-long-sessions.md`, on its own branch.
- Try again after a failed earlier page reads again from the newest page.
  Reason: one read path, and no saved cursor. The session log drops the
  events that it already has.
- Use the same page limits as the forward read of the browser route.
  Reason: one cost bound for each request in the chat queue.
- Add no mockup milestone. Reason: the chat already has the "Loading the
  session" view and the "Loading earlier messages" line, and no screen or
  flow changes. The mockups show no loading state of the chat.

### Work outside this plan

- Option A of item 1, larger history pages for the browser route, is
  commit `9f90e551` on branch `calummoore/chat-loading-issue`. On 11
  November 2026 it had no pull request yet. It adds `PageLimits`,
  `BROWSER_PAGE_LIMITS`, and `SessionPage` to
  `worker/chat/history-pages.ts`, and it passes the limits from
  `worker/chat/http-routes.ts`. Milestone 2 changes the same code.
- Option B of item 3 merged into `main` on 11 November 2026 as commit
  `2b3a3e03`, PR #239. This branch starts after it.

Contract owners:

- [Chat and events](../docs/protocol/chat-and-events.md#events).
- [Loads, records, and sends](../src/chat/loads-and-sends.md) of the chat.
- [History and event order](../worker/chat/history.md) of the chat backend.

Replaced ways:

- The oldest-first history load of the browser → the newest-first load.
  Moved and deleted in Milestone 3. Consumers, each a file under `src/`
  that calls `chatHistoryPath` on 11 November 2026:
  - The load: `src/chat/api/client.ts` and `readPages` in
    `src/chat/state/history.ts`.
  - The fake routes: `src/test-support/fake-api.ts`,
    `src/test-support/fake-workspace-routes.ts`,
    `src/chat/state/test-kit.ts`, and `src/chat/state/linked-kit.ts`.
  - The development pages: `src/chat/dev/dev-backend.ts`,
    `src/chat/dev/dev-sessions.ts`, `src/chat/dev/dev-transcript.ts`, and
    `src/shell/workspace/dev/dev-first-start.ts`.
  - The tests: `src/chat/state/history.test.ts`,
    `src/chat/state/history-records.test.ts`,
    `src/chat/state/controller.test.ts`,
    `src/chat/state/linked-replies.test.tsx`,
    `src/chat/components/ChatStatus.test.tsx`,
    `src/chat/components/ContinuedNote.test.tsx`,
    `src/chat/components/RunningTurn.test.tsx`,
    `src/chat/components/SourceLink.dom.test.tsx`,
    `src/chat/components/TableReply.dom.test.tsx`,
    `src/chat/components/TranscriptCopy.dom.test.tsx`,
    `src/chat/components/TryAgain.test.tsx`, and
    `src/shell/workspace/SessionAddress.test.tsx`.
  - The guide `src/chat/loads-and-sends.md`.
- The forward session read of the browser route stays or goes as the open
  decision on old clients says. Its consumers are the 27 Worker test files
  that call `chatHistoryPath`, the route tests, and
  `worker/chat/history.md`.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol states the new order of the history and the live events.

- [ ] In `docs/protocol/chat-and-events.md`, under "Events", replace "A tab
      that opens gets the stored history first, then the live events." with
      these lines:
  - "A tab that shows a session gets the newest part of its stored
    history first. The live events start after that part, and the earlier
    history loads above it (decision 280)."
  - "Reason: the newest messages and the work of a running turn show after
    one read, also in a long session. Live events after the full history
    were rejected, because a long session then showed nothing new until
    its whole history had loaded."
  - "The chat shows each event of a session once and in event order, also
    when earlier history arrives after newer events."
  - "While the earlier history loads, the chat says so above the messages
    that it shows."
- [ ] Read the Terms page in `src/marketing/terms.ts` and the Privacy page
      in `src/marketing/privacy.ts` in full. Update each sentence that
      restates the order of the history and the live events.
- [ ] Read each public guide under `src/marketing/docs/` in full. Update
      each sentence that restates that order, under the rules of
      `docs/protocol/website-docs.md`.
- [ ] Read the rows of the Conductor comparison under
      `src/marketing/from-conductor/`. Change a status only when this
      change ships, starts, or drops a listed feature.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 2: Newest-first session pages in the Worker

Depends on: 1, and option A of item 1 merged into `main`.

The history route also gives the pages of a session newest first. The
forward session pages stay until Milestone 3 moves the browser.

- [ ] Merge `main` into this branch after option A of item 1 merges.
- [ ] Write the tests first, and see each fail before the change:
  - [ ] The first page holds the newest events of the session through the
        cutoff, in event order.
  - [ ] Each later page moves back from its cursor. It skips the events of
        other sessions and of the workspace.
  - [ ] The last page ends at the oldest event of the session.
  - [ ] Each page keeps the scan limit and the size limit, and each page
        moves the cursor back.
  - [ ] An answer that completed before the cutoff shows its full text once,
        at its first place, across the pages.
  - [ ] A request for a session that the member cannot reach gets the same
        refusal as the forward read.
- [ ] Add the newest-first read to `HistoryPages` in
      `worker/chat/history-pages.ts`, with the `BROWSER_PAGE_LIMITS` of the
      forward read. Move it to its own file when `history-pages.ts` would
      pass 300 lines.
- [ ] Accept the newest-first query and its cursor on the history route in
      `worker/chat/http-routes.ts`. Keep the session check before the read.
- [ ] Give the newest-first page its own response type and reader, beside
      `ChatHistoryResponse` in `src/shared/events.ts` and
      `readStoredEvents` in `src/chat/api/read-workspace.ts`. The replay
      of the events socket keeps `ChatHistoryResponse`.
- [ ] A newest-first page with an earlier page sets `hasMore: true` and
      names its cursor in a new field. So an old reader refuses the page
      and never shows a partial chat as complete.
- [ ] Add the newest-first query to `chatHistoryPath`.
- [ ] Update `worker/chat/history.md`.

## Milestone 3: Newest-first history load in the browser

Depends on: 2, and the user's answer on old clients.

The chat shows the newest page and starts the live events. Then it loads
the earlier pages above them. Every consumer moves to the newest-first
pages.

- [ ] Write the tests first, and see each fail before the change:
  - [ ] The first load shows the newest page and starts the live events
        before an earlier page arrives.
  - [ ] An earlier page and a live event that arrives during the load show
        once each, in event order.
  - [ ] The chat shows "Loading earlier messages" above the newest page
        until the oldest page arrives.
  - [ ] A failed earlier page keeps the messages and offers Try again. Try
        again completes the history.
  - [ ] A session that becomes the shown session later loads newest first.
  - [ ] An earlier page that closes and reopens the shown session does not
        move the tabs.
  - [ ] A page that does not move the read back fails the load.
- [ ] Read newest first in `history` of `src/chat/api/client.ts`.
- [ ] In `src/chat/state/history.ts`, read the newest page first, merge it,
      and give its cutoff. Then read the earlier pages. Mark the history
      ready after the oldest page, or failed when an earlier page fails.
- [ ] Hold the earlier pages, and merge them into the session log once,
      after the oldest page, or after the page that failed.
- [ ] In `src/chat/state/load.ts`, start the live events after the cutoff of
      the newest page. Keep the second read of the workspace and the session
      list before them.
- [ ] Keep one history load at a time for each session. Stop the earlier
      reads when the chat stops.
- [ ] Move each consumer of the oldest-first load that "Replaced ways"
      lists to the newest-first pages. Search `src/` for `chatHistoryPath`
      again first, and move each new consumer too.
- [ ] Apply the answer on old clients to the forward session read of the
      browser route:
  - A: remove it, and move the Worker tests that read it.
  - B, D, or F: keep it, and add a follow-up item that removes it at the
    end that the answer names.
  - E: keep it until the version floor ships, in its own change.
  - H: keep it, and state both directions in `worker/chat/history.md`.
- [ ] Update `src/chat/loads-and-sends.md` and the doc comment of
      `loadChat`.
- [ ] Update `plans/follow-ups/history-pages-change-saved-tabs.md`: the
      history load is fixed, and the paged replay of the events socket
      stays open.
- [ ] Measure once the time to the first messages and the main-thread time
      of a long session on the fake API. Give the fold time and the render
      time apart. Save the result under
      `.context/chat-history-newest-first/`.
- [ ] Smoke test a long session with `npm run dev`: the order of the pages,
      the "Loading earlier messages" line, and the live events during the
      load.

## Milestone 4: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record follow-up
      items under `plans/follow-ups/` for the rest, re-review once, and
      report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Open a long session on the deployed app. Check that the newest
      messages show after one page and that live events arrive while the
      earlier pages load.
- [ ] Repeat the check in the Mac app after it installs the first release
      that carries this change.
