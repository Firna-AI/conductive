# Needs input at the composer

Status: Active. On branch `calummoore/finding-old-actions-oc8k`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

A workspace shows needs input while a Mac command request or a secret
request of the workspace is open (decision 68). A request whose tool call
waits shows as a card just above the composer of its session (decision 62).
A secret request becomes late when its tool call ends before an answer,
after 90 seconds or at the end of its turn. Today a late request leaves the
composer and stays at its place in the chat. In a long chat, that place can
be far up, so a member cannot find the request that the workspace waits
for. A request can also wait in another session tab, and no tab shows it.

Cal asked on 20 November 2026: "needs input should attach something to the
chat box - so that if the requested action was long ago in the chat, the
user can still easily find and approve or reject it". The brainstorm notes
are in `.context/needs-input-chat-box/brainstorm.md`.

This change does not cover an agent question in plain text. Such a
question does not set needs input, and it stays in view at the bottom of
the chat as the answer of its turn. It does not change the Worker, the
events, the runner messages, or stored data.

Contract owners:

- [Late secret requests](../docs/protocol/secret-late-answers.md).
- [Secret requests](../docs/protocol/secret-requests.md).
- [Agent tools](../docs/protocol/agent-tools.md#what-the-chat-shows).
- [The tab row](../docs/protocol/tab-row.md).
- [Mac commands](../docs/protocol/desktop-commands.md).
- The [chat README](../src/chat/README.md) and the
  [secrets README](../src/chat/secrets/README.md).

## Decisions

### 1. Late requests leave the chat box

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/secrets/session-secrets.tsx` line 96 and
  `docs/protocol/secret-late-answers.md` line 19.
- **Background:** Only a request whose tool call waits goes to the request
  region above the composer. A late request goes back to its place in its
  turn, and it never folds. The rule "A late request leaves the composer"
  came from an agent's design call in `plans/agent-secrets.md`, with no
  recorded reason. Agents often ask again after a request turns late, as
  the message of commit `2a0818f3d` says.
- **Problem:** The workspace shows needs input, but the request can sit
  far up the chat. Nothing at the composer points to it.
- **Impact if no action:** Members scroll up long chats to find the
  request. Some never find it, and the workspace stays in needs input.
- **Root question:** How does a member find and answer a request that
  waits for them, when it sits far up the chat?
- **Options:**
  - **A.** Keep each late request in the request region until a member
    answers it or it ends. Then it takes its place in its turn. Risk:
    unanswered requests fill the region, and a member must Deny one to
    clear it. Effort: Medium.
  - **B.** Keep the card at its place. Add a line above the composer that
    names the late request and offers Show, which scrolls to the card.
    Risk: the member answers far up and scrolls back. Effort: Large.
  - **C.** Make Needs input in the workspace header open a list of every
    open request of the workspace, with Show for each. Risk: a new
    surface in a full header, away from the composer. Effort: Large.
- **Left out:** no change, because the member still scrolls up. A copy of
  the card above the composer with the card kept at its place, because A
  is better on every point. A card below the newest turn, because it
  scrolls away. A notification, because it does not find the card and it
  reverses secrets decision 13 A. A call that waits with no limit, because
  it breaks the 90-second limit.
- **Wider fix:** A. It removes the one case where an open request is not
  at the composer.
- **Previous examples:** commit `d837a9897` added the late card at its
  place. Commit `2a0818f3d` lets one Allow settle each covered request.
- **Related:** decision 2. Option C also answers decision 2.
- **Recommendation:** A. It is the smallest change that puts each open
  request at the composer with its choices.
- **Outcome:** Cal chose A on 20 November 2026.

### 2. No sign of a request in another tab

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `src/chat/components/SessionTab.tsx` line 68.
- **Background:** Each chat shows only the requests of its own session. A
  session tab shows only a spinner while a turn runs. A click on the row
  of a workspace opens the tab that showed last, as the user chose on 17
  November 2026.
- **Problem:** A member can open a workspace that needs input and see no
  request, because it waits in another session tab. Also,
  `docs/protocol/desktop-commands.md` says that a click on the row "opens
  the request", which conflicts with the rule of the tab at a return.
- **Impact if no action:** Members open the tabs one by one to find the
  request.
- **Root question:** How does a member find the session that holds the
  request?
- **Options:**
  - **A.** Change nothing in the app. Correct the Mac commands doc to say
    that the row opens the workspace. Effort: Small.
  - **B.** Show the needs-input mark on each session tab that holds an
    open request. Effort: Medium.
  - **C.** Show every open request of the workspace in the request region
    of every session, each with its session name. Effort: Medium.
  - **D.** B, and a click on a workspace that needs input opens the
    session of the oldest request. It changes the user's rule of 17
    November 2026. Effort: Large.
- **Left out:** None.
- **Wider fix:** B. The mark shows the right tab from every tab, also on a
  phone.
- **Previous examples:** None found.
- **Recommendation:** B. It shows the right tab and keeps the rule of the
  tab at a return.
- **Outcome:** Cal chose B on 20 November 2026.

## Design

- The request region holds each open request of the shown session: each
  Mac command request and each secret request whose call waits, and each
  late secret request. A late card keeps its late line and its choices.
- The region shows the requests whose call waits first, then the late
  requests. Each group keeps the oldest first. Reason: a waiting call has
  a clock, and a late request has none. My call of 20 November 2026.
- The region keeps its cap of 40% of the window and its inner scroll, also
  on a phone. The late card keeps its full form, because a member must see
  the command before the answer. My call of 20 November 2026.
- An answered or ended late request leaves the region at once. It takes
  its place in its turn, unfolded, as today. Reason: a request that gets
  its answer in time does the same. My call of 20 November 2026.
- A late card in the region brings back no Stop. Stop follows the running
  turn, and the turn of a late request ended. My call of 20 November 2026.
- A late card in the region shows no age. A request shows no time limit,
  and its line says that the agent stopped waiting. My call of 20 November
  2026.
- A session tab with an open request shows the needs-input mark in place
  of its icon: blue, in the accent colour, with the slow pulse of the list
  mark. With reduced motion it stays blue and still. Its accessible name
  says "Needs input". The mark wins over the spinner of a running turn,
  because the member must act. My call of 20 November 2026.
- The shown tab carries the mark too. Reason: the region of that tab then
  holds the request, and the same rule for each tab is simpler. My call of
  20 November 2026.
- The chat learns the open secret requests of every session of the
  workspace from the existing `GET .../secret-requests` read, at the start
  of the chat and after each reconnect, and then from the events. Reason:
  a history page holds one session, and in a long chat the earlier pages
  merge late. The route exists, so the Worker does not change. The Mac
  command requests already come for the whole workspace. My call of 20
  November 2026.
- A click on the row of a workspace keeps the rule of the tab at a return.
  The Mac commands doc then says that the row opens the workspace, where
  the marked tab shows the request. My call of 20 November 2026, under
  decision 2 B.
- The mark of a session tab is the needs-input form of the list mark,
  drawn by `WorkspaceMark`, and not the column of the header. It takes the
  13 px of the chat icon, so the title does not move when the mark comes or
  goes. Reason: needs input then looks the same in the list and in the
  row. The UI agent's call of 20 November 2026.
- The mark shows on the lifted copy of a drag, as the spinner does.
  Screen readers hear "Needs input" before the title of the tab, in the
  words of the header. The UI agent's call of 20 November 2026.
- In the region, the late line stays at the end of the late card, as in
  the chat. When the region is full, the member scrolls it to read the
  line, as `app/secret-requests/several/waiting-and-late` shows. Reason:
  the card keeps its full form. The UI agent's call of 20 November 2026.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The secret request mockups and the tab row of the workspace change, on a
computer and on a phone.

- [x] Change `isPendingRequest` in
      `docs/mockups/src/components/chat/requests.ts` so that an open late
      request waits above the composer.
- [x] Update `app/secret-requests/late` and
      `app/secret-requests/temporary/late`: the late card above the
      composer, with its late line and its choices, on a computer and on a
      phone. The answered, denied, and not-answered pages keep the card at
      its place.
- [x] Add a variant of `app/secret-requests/several` with a waiting
      request and a late request in the region, the waiting one first.
- [x] Update step 2 of `user-flows/secret-request`.
- [x] Add the needs-input mark to `SessionTabIcon` and show it on a
      session tab in a workspace mockup, also while the turn of that tab
      runs, and with reduced motion. Add a phone page.
- [x] Update `docs/mockups/catalogue-secrets.md` and each other catalogue
      page that names the changed pages.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/needs-input-at-the-composer/` holds the check logs, the
smoke-test results, and the screenshots in `mockups/`.

## Milestone 2: Documentation and protocol

Depends on: 1

The protocol docs state the new place of a late request and the mark of a
session tab.

- [ ] Update `docs/protocol/secret-late-answers.md` "Late requests": a late
      request stays above the composer until a member answers it or it
      ends, then takes its place in its turn.
- [ ] Update `docs/protocol/secret-requests.md` and
      `docs/protocol/agent-tools.md` "What the chat shows" so that the
      region holds each open request.
- [ ] Add the needs-input mark of a session tab to
      `docs/protocol/tab-row.md`.
- [ ] Update `docs/protocol/workspace-marks.md`: the needs-input form of
      the list mark also shows on a session tab that holds an open
      request.
- [ ] Update `plans/follow-ups/mockup-tab-row-clips-shown-tab.md`: `full`
      is now a child page of `app/tabs`, with the same path, not a variant.
- [ ] Correct `docs/protocol/desktop-commands.md`: a click on the row opens
      the workspace, and the marked tab shows the request.
- [ ] Check `docs/protocol/chat-and-events.md` "The work of a turn" and the
      architecture doc for sentences that restate the old place.
- [ ] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.
- [ ] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact.
- [ ] Check each relative link of the changed Markdown files.

## Milestone 3: Late requests above the composer

Tags: ui

Depends on: 2

- [ ] Put each open late request in the region in
      `src/chat/secrets/session-secrets.tsx`, and keep it out of its turn
      while it is open.
- [ ] Order the region in `src/chat/components/WaitingRequests.tsx`: the
      waiting requests first, then the late requests, each oldest first.
- [ ] Update the tests in `src/chat/secrets/secret-requests.test.tsx` and
      `src/chat/secrets/answer-request.test.tsx`: a late request shows above
      the composer, and its answer moves it to its place.
- [ ] Update `src/chat/secrets/README.md` and `src/chat/README.md`.
- [ ] Check the flow in a browser on a computer and on a phone width. Save
      the screenshots under `.context/needs-input-at-the-composer/`.

## Milestone 4: The needs-input mark of a session tab

Tags: ui

Depends on: 3

- [ ] Read the open secret requests of every session of the workspace with
      the existing `GET .../secret-requests` read, at the start of the chat
      and after each reconnect. Merge them with the events, under the merge
      rules of `src/chat/secrets/secret-snapshot.ts`.
- [ ] Give each session tab a `needsInput` flag in
      `src/chat/components/tab-row.ts`, from the open secret requests and
      the waiting Mac command requests of its session.
- [ ] Show the mark in `src/chat/components/SessionTab.tsx` with the
      `SessionTabIcon` of the mockups, through its `needsInput` prop, also
      on the lifted copy of a drag.
- [ ] Capture the pictures of the marketing site again with
      `npm run marketing:pictures`. The Mac picture shows the tab of a
      waiting Mac command, which the mockups now draw with the needs-input
      mark.
- [ ] Add DOM tests: a tab of another session shows the mark, the mark
      wins over the spinner, and the mark ends with the answer.
- [ ] Update `src/chat/README.md` and `src/chat/tab-row.md`.
- [ ] Check the marks in a browser. Save the screenshots under
      `.context/needs-input-at-the-composer/`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and the complete gate `npm run check`.
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

- [ ] On `conductive.build`, let a secret request turn late in a long
      chat. Check that it shows above the composer and that its session
      tab shows the mark.
