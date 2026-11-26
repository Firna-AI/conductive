# Needs input at the composer

Status: Active. On branch `calummoore/needs-input-at-the-composer-milestones-3-j8a8`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

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

- [The request stack](../docs/protocol/request-stack.md).
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

### 3. Deny on a card that hides requests

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `docs/protocol/secret-requests.md` line 138.
- **Background:** Under "The stack of requests" below, the newest request
  for the same set of secrets hides the older ones, and its Allow covers
  them. Cal chose on 17 November 2026 that "Deny ends only its own
  request", as decision 2 A of `plans/covered-secret-requests.md`, deleted
  in commit `bea38c226`. He rejected a Deny that also ends the other open
  requests that name only the denied secrets, because "it can end a
  different, valid request".
- **Problem:** After a Deny of the shown card, the hidden requests stay
  open. The next one then shows, with an older command for the same
  secrets. The line "Asked 3 times" suggests that one answer ends them all.
- **Impact if no action:** A member denies the same secrets again for
  each time the agent asked. Each new ask hides the older late requests
  again, and the workspace keeps needs input until the last Deny.
- **Root question:** How does a member refuse an agent that asked several
  times for the same secrets, and know what the refusal ends?
- **Options:**
  - **A.** Keep the rule. The Deny ends the shown request, and the next
    hidden one shows. "Asked 3 times" then speaks only of Allow. Risk: the
    member answers the same question again. Effort: Small.
  - **B.** The Deny ends the shown request and each request that it hides,
    all for the same set of secrets. The app sends one Deny for each, so
    the Worker does not change. It reverses Cal's decision of 17 November
    2026 for this case. Its reason weakens here: a grant covers the
    session, not the command, so a Deny of each command gives no extra
    control. Risk: it ends older commands that the member did not see.
    Effort: Small.
  - **C.** The Deny ends the shown request. The card then asks whether to
    deny the older requests too, or it offers a second button such as
    "Deny all 3". Risk: one more step or one more button. Effort: Medium.
  - **E.** As B, but the Worker gives a Deny the reach of the group in one
    chat operation, as it does for an Allow. Risk: the app and the Worker
    must agree on the group. An older copy of the web app in the Mac app
    shows each card apart, and it sees one Deny end other cards. Effort:
    Medium.
  - **G.** B, and "Asked 3 times" opens a list of the commands of the
    hidden requests. The member then sees each command that one answer
    ends. Risk: a longer card under the 40% cap, and less room on a
    phone. Effort: Medium.
  - **F.** The Worker keeps one open request for each session and set of
    secrets. When the agent asks again, it ends the older late requests
    with a new end reason, such as "The agent asked again". Then each
    answer ends one request, and the app needs no merge. Risk: it changes
    the events and the protocol, and older app copies refuse an unknown
    end reason, so it needs a compatible path. The older cards then do not
    say "allowed". Effort: Large.
- **Left out:**
  - D, B with the group narrowed to the same set of secrets. The design
    call now narrows the group for every option, so D equals B.
  - A Deny that ends the same secrets in every session, because a Deny in
    one session does not judge another session.
  - A Deny that also refuses later requests, because the agent must be
    able to ask again with a better reason.
  - No merge, because it breaks Cal's message.
  - An end of old late requests after a fixed time, because the member
    still meets each hidden request until then.
- **Wider fix:** F. It removes the repeated requests at their source. It
  is Large and the older cards would not say "allowed", so it is not the
  recommendation.
- **Previous examples:** decision 2 A of `plans/covered-secret-requests.md`,
  17 November 2026, and commit `2a0818f3d`.
- **Recommendation:** B. One card takes one answer either way, and for the
  same set of secrets a Deny of each command gives no extra control. The
  options check first recommended D, which the narrowed group made equal
  to B.
- **Outcome:** Cal chose B on 20 November 2026. It replaces his decision
  of 17 November 2026 for requests that a card hides. A Deny of a request
  that hides none still ends only its own request.

### 4. A Mac command on top in a browser

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small.
- **Source:** Implementation.
- **Category:** Product bug.
- **Location:** `stackEntries` in `docs/mockups/src/components/chat/requests.ts`,
  and the page `app/secret-requests/several/mac-command`.
- **Background:** The top card of the stack is the first in the order of
  the region: the requests whose calls wait first, then the late requests,
  each oldest first. Only the Mac app on the Mac of the sender of the turn
  can answer a Mac command request. A browser shows only its state.
- **Problem:** A waiting Mac command comes before an older late secret
  request. In a browser it is the top card, and the member cannot answer
  it there. The request that the member can answer waits behind it.
- **Impact if no action:** A member in a browser must press Next to answer
  the secret request, and can miss it.
- **Root question:** Which card does a member see first when this view
  cannot answer a card of the stack?
- **Options:**
  - **A.** Keep one order for every view. Risk: in a browser, the top card
    has no choices. Effort: Small.
  - **B.** Put the cards that this view cannot answer after the cards that
    it can answer. Each part keeps the order of the region. Risk: two views
    of one chat show a different top card. Effort: Small.
  - **C.** Keep one order, but start each view at the first card that it
    can answer, such as "2 of 2". Risk: a place that does not start at 1
    can surprise. Effort: Small.
  - **D.** Show a Mac command that this view cannot answer as one line above
    the stack. Risk: requests get a second place. Effort: Medium.
- **Left out:** choices for the command in a browser, because only the Mac
  app on the Mac of the sender can allow a command.
- **Wider fix:** None. The order is one rule in `stackEntries`.
- **Previous examples:** None found.
- **Recommendation:** B. The top card is then one that the member can
  answer, whenever such a card exists.
- **Outcome:** Cal chose B on 22 November 2026.

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
- The chat reads the secret requests of every session after its stream
  starts, with the Mac commands, and again after each later connect of the
  stream, when its stored history has applied. A return to a workspace
  that the browser tab keeps is such a connect, because its stream opens
  again. Reason: a read before the cutoff of the stream can miss a change
  of another session between the read and the cutoff. The UI agent's call
  of 26 November 2026.
- The read adds each open request, and the newer state of each request
  that the chat knows, by `updatedAt`, as the reply of an answer does. It
  adds no ended request that the chat does not know. Reason: such a
  request takes its place in its turn, which can still be unloaded, so it
  would show at the end of the chat until its history comes. The UI
  agent's call of 26 November 2026.
- A failed read changes nothing and shows no notice. Reason: the events
  still come, the next reconnect reads again, and the mark only points to
  a request that the stack of its session shows. The UI agent's call of 26
  November 2026.
- In the region, the late line stays at the end of the late card, as in
  the chat. When the region is full, the member scrolls it to read the
  line, as `app/secret-requests/several/waiting-and-late` shows. Reason:
  the card keeps its full form. The UI agent's call of 20 November 2026.
  The stack of requests below replaces this call, and that page now draws
  the stack.

### The stack of requests

Cal asked on 20 November 2026, after Milestone 1: "what if there are
multiple requests? we could stack them behind (so only one is visible at
the same time) - this would only be requests for different things (i.e.
multiple requests for the same key should only show the latest and it
approves all of them when you approve the one". His message chose the
approach, so no brainstorm ran. It replaces the inner scroll through every
card and the call above on the late line in a full region.

- The region shows one card at a time, on top of a stack. The edges of the
  cards behind it show. A label such as "1 of 3" with Previous and Next
  buttons moves through the stack, also with the keyboard. My call of 20
  November 2026.
- The top card is the first in the order of the region: the waiting
  requests first, then the late requests, each oldest first. An answer
  shows the next card. My call of 20 November 2026.
- The cards that this view cannot answer go after the cards that it can
  answer. Each part keeps the order above. So the top card is one that the
  member can answer, whenever such a card exists. A browser, and the Mac
  app on another Mac, cannot answer a Mac command, so there the command
  goes last, as `app/secret-requests/several/mac-command` shows. The Mac
  app on the Mac that got the command answers it, so its stack keeps the
  order. Cal's decision 4 B of 22 November 2026.
- A newer open request of the same session hides an older one when the
  two ask for the same set of secrets. Only the newest shows. Its Allow
  then covers each hidden request, under the rule of covered requests that
  is already in force. Reason: Cal's message says "the same key". A wider
  group, such as an older request for fewer secrets, would end a request
  with a smaller grant, and one request could hide behind two cards. My
  call of 20 November 2026, after the options check.
- A card that hides older requests says how often the agent asked, such as
  "Asked 3 times". The member then knows that one Allow covers them. My
  call of 20 November 2026.
- Mac command requests take their place in the stack, but they never merge.
  Reason: each Allow runs one exact command. My call of 20 November 2026.
- One card keeps the cap of 40% of the window and its inner scroll, for a
  long command. My call of 20 November 2026.
- "1 of 3", Previous, and Next sit above the card on top, at the end of the
  stack. The keyboard reaches them before the actions of the card, so a
  member moves through the stack first and then answers. The place is a
  polite live region. No other key moves the stack. With one card, none of
  them shows. The UI agent's call of 20 November 2026.
- Previous is off on the first card, and Next on the last, so the place
  never jumps from the end to the start. When a press shows the first or
  the last card, the focus moves to the other button, so it stays in the
  steps. The UI agent's call of 20 November 2026.
- The edges of at most two other cards show above the card on top,
  narrower the further back they are, with the outline of a card and the
  soft fill. They stand for the other cards, not only the cards after the
  one on top, so the stack keeps its height while the member moves through
  it. Reason: a stack of many requests is then as high as a stack of
  three. The UI agent's call of 20 November 2026.
- The stack draws the outline of the card on top. A long card scrolls
  inside it, and the edge that cuts the card fades. Reason: the outline,
  the edges, and the steps stay in view, so the card still reads as the
  front of the stack. The UI agent's call of 20 November 2026.
- A card that hides requests takes the place of the oldest request that it
  holds. A card whose newest request has a call that waits goes with the
  requests whose calls wait. Reason: a new ask of the agent then does not
  move a card that already waits. The UI agent's call of 20 November 2026.
- "Asked 3 times" follows the names of the card, in its muted text. It
  counts the requests that the card stands for, and the card is one place
  in the stack. The UI agent's call of 20 November 2026.
- After the Deny of a card that hides requests, each request takes its
  place in its own turn with the result of its own Deny: Denied, and "You
  denied it.", as `app/secret-requests/several/asked-again/denied` shows.
  After its Allow, each takes its place as a covered request, and one line
  of the app starts one turn. Reason: the chat needs no new form, and each
  turn keeps its own answer. The UI agent's call of 20 November 2026, under
  decision 3 B.
- A request that joins or leaves the stack does not change the card on
  top, unless that card leaves. The place shows the new count. Reason: the
  card must not change while the member reads it or presses Allow. The UI
  agent's call of 20 November 2026.
- When this view cannot answer the card on top, a new request that it can
  answer becomes the card on top. Reason: decision 4 B puts such a card
  first, and no Allow moves under the pointer, because the card that it
  replaces shows no choices in this view. The UI agent's call of 22
  November 2026.
- After an answer, the focus moves to the new card on top, so a screen
  reader reads it and the next Tab reaches its first action. With no card
  left, the focus moves to the composer. Reason: the focus does not jump
  to an action that the member did not see. The UI agent's call of 20
  November 2026.
- The app and the mockups draw the stack with one plain part,
  `RequestStackFrame` in `src/ui/components/chat/`, and order it with one
  function, `stackEntries` in `requestStackOrder.ts` there, with a reader
  for each side. The mockup's `RequestStack.tsx` keeps only its cards and
  the links of Previous and Next. Reason: the two cannot drift apart. The
  UI agent's call of 26 November 2026.
- When the card on top leaves, the card after it in the order shows, or
  the card before it when it was the last. Reason: an answer shows the
  next card, and the member keeps the walk through the stack. The UI
  agent's call of 26 November 2026.
- The stack holds the focus while any of its parts has it: the steps, the
  card, and a sheet or a menu that the card opens. When the part that
  holds it leaves, such as the steps when one card is left, the focus
  moves to the card on top, or to the composer. A control that turns off
  while its answer runs keeps the stack the holder. Reason: the focus never
  drops to the page. The UI agent's call of 26 November 2026.
- The page holds only the card on top. A value typed into a card leaves
  the page when Previous or Next shows another card, and each card starts
  at its top. Reason: the stack draws one card, as the mockups do, and a
  value stays in the page only while its card shows. The UI agent's call
  of 26 November 2026.
- The Deny of a card that hides requests sends the Denies of the hidden
  requests first, then the Deny of the request that the card shows. When
  a Deny of a hidden request fails, the shown request stays open with its
  choices, and a notice says that the answer was not sent. Reason: the
  card keeps its command and its reason until it leaves. The UI agent's
  call of 26 November 2026, under decision 3 B.
- A late secret request counts as a request that waits for a member in the
  marks of Explain and in the height of its phone sheet, as
  `docs/protocol/request-stack.md` defines an open request. The UI agent's
  call of 26 November 2026.

### Calls of review round 1

The UI agent's calls of 26 November 2026, in milestone 8:

- After the Allow of a card, only the older open requests of the same
  session and set of secrets settle. A newer one does not, because the
  agent can ask again after the grant ends.
- After an Allow from this window, the read that releases the settling
  requests waits for the reply, because the Worker replies after it
  allowed each covered request. After an Allow from another view, the
  read goes at once.
- While the history of a session loads or failed, an answered request
  shows nowhere until a row of its turn loads. With the whole history, a
  record with no row still follows the last row.

The UI agent's calls of 26 November 2026, in milestone 7:

- One shared definition, `Walk` in `docs/mockups/src/screens/walks.ts`,
  gives the step links, the answer links, and the tab links of each
  example. An answer that a walk does not take draws no link.
- The walk of three requests denies the preview deploy. An Allow of a late
  request while a turn runs would add its line to that running turn, which
  the mockups do not draw.
- `several/mac-command` and `mac-app/command-and-secret` only step
  through their cards. The four commands of `mac-app/requests` keep their
  own result links.
- Outside the walks, no tab links while a session tab shows the
  needs-input mark, because each generic page would drop the open request.
- When an explanation tab shows, the first session tab no longer takes its
  needs-input mark or its spinner.
- `app/chat/menu-placement` shows the long script alone, in the chat
  `mac-waiting-script`, so it draws no stack without pages.

### Calls of the protocol docs

The docs agent's calls of 26 November 2026, in milestone 3:

- One new page, `docs/protocol/request-stack.md`, holds the rules of the
  stack, and `secret-requests.md` and `agent-tools.md` link to it. Reason:
  the stack holds both kinds of request, each fact lives in one place, and
  `secret-requests.md` would pass 300 lines.
- The page belongs to Chat and events, and `protocol-docs-chat.md`
  indexes it, because the stack is part of the chat.
- A late request in its turn never folds "so its answer and its line stay
  in view". The old reason, that it still waits for a member, no longer
  holds.
- The focus moves to the new card on top only when the card that holds
  the focus leaves. So an answer in another view never takes the focus
  from the composer.
- The composer keeps Stop while the call of a request waits, not while a
  late request waits. Stop follows the running turn.
- The tab mark rule states the result, not the read of every session.
- "Stays in the chat" in `docs/architecture/flows.md` and
  `docs/protocol/secrets.md` stays, because the stack is part of the chat.
- The split of `secret-requests.md`, now 299 lines, stays with its
  follow-up item `protocol-state-doc-length.md`.

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

## Milestone 2: Mockups of the stack

Tags: mockup

Depends on: 1

The region draws its requests as a stack, as "The stack of requests"
says. Decision 3 sets the words of Deny on a card that hides requests.
Decision 4 puts the cards that a view cannot answer last.

- [x] Draw the stack in `app/secret-requests/several` and its
      `waiting-and-late` variant: one card on top, the edges of the cards
      behind it, and "1 of 3" with Previous and Next, on a computer and on
      a phone.
- [x] Add a page with a late request that hides two older requests for the
      same secret, with "Asked 3 times".
- [x] Draw a stack with a Mac command request and a secret request.
- [x] Draw the Deny of a card that hides requests, as decision 3 says.
- [x] Update `docs/mockups/catalogue-secrets.md` and the design docs of the
      mockups.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.
- [x] Update the design and the TODOs of this plan for each problem that
      the mockups show.

Evidence: `.context/needs-input-at-the-composer/mockups-stack/` holds the
check logs, the smoke-test and keyboard results, and the screenshots.

## Milestone 3: Documentation and protocol

Depends on: 2

The protocol docs state the new place of a late request and the mark of a
session tab.

- [x] Update `docs/protocol/secret-late-answers.md` "Late requests": a late
      request stays above the composer until a member answers it or it
      ends, then takes its place in its turn.
- [x] Update `docs/protocol/secret-requests.md` and
      `docs/protocol/agent-tools.md` "What the chat shows" so that the
      region holds each open request.
- [x] Add the needs-input mark of a session tab to
      `docs/protocol/tab-row.md`.
- [x] Update `docs/protocol/workspace-marks.md`: the needs-input form of
      the list mark also shows on a session tab that holds an open
      request.
- [x] Update `plans/follow-ups/mockup-tab-row-clips-shown-tab.md`: `full`
      is now a child page of `app/tabs`, with the same path, not a variant.
- [x] State the stack, the merge of requests for the same secrets, and
      the outcomes of decisions 3 and 4 in `docs/protocol/secret-requests.md`
      and `docs/protocol/agent-tools.md`. Replace the sentence that the
      member scrolls through all waiting requests.
- [x] Correct `docs/protocol/desktop-commands.md`: a click on the row opens
      the workspace, and the marked tab shows the request.
- [x] Check `docs/protocol/chat-and-events.md` "The work of a turn" and the
      architecture doc for sentences that restate the old place.
- [x] Read the Terms page and the Privacy page in full. Update each
      sentence that restates a changed fact.
- [x] Read each public guide in `src/marketing/docs/` in full. Update each
      sentence that restates a changed fact.
- [x] Check each relative link of the changed Markdown files.

## Milestone 4: Late requests above the composer

Tags: ui

Depends on: 3

- [x] Put each open late request in the region in
      `src/chat/secrets/session-secrets.tsx`, and keep it out of its turn
      while it is open.
- [x] Order the region in `src/chat/components/WaitingRequests.tsx`: the
      waiting requests first, then the late requests, each oldest first. A
      card that hides requests takes the place of the oldest request that
      it holds. Then put the cards that this view cannot answer after the
      cards that it can answer, as decision 4 says. A Mac command card
      takes an answer only where it shows its choices: `canAnswer` of
      `src/chat/device/device-snapshot.ts` holds, and the workspace is not
      read-only, as `src/chat/device/PendingCommands.tsx` decides.
- [x] Draw the region as the stack of the mockups, with "1 of 3",
      Previous, and Next, and the keyboard. Use
      `docs/mockups/src/components/chat/RequestStack.module.css`, the words
      of `requestStackCopy.ts`, and the `stacked` class of each card.
      Move each of these mockup modules that the app then imports into
      `src/ui/components/`, as `src/ui/README.md` says.
- [x] Keep the card on top when a request joins or leaves the stack,
      except when this view cannot answer that card, and move the focus
      after Previous, Next, and an answer, as "The stack of requests"
      says.
- [x] Hide each older request behind a newer one of the same session for
      the same set of secrets, with `askedTimes` of `secretRunCopy.ts`.
      Give Deny the outcome of decision 3.
- [x] Delete `.requests` and its fade from
      `src/ui/components/chat/ChatPane.module.css` when the app
      draws the stack. Only the list region of the app uses them.
- [x] Update the tests in `src/chat/secrets/secret-requests.test.tsx` and
      `src/chat/secrets/answer-request.test.tsx`: a late request shows above
      the composer, and its answer moves it to its place. Add tests of the
      stack, of its order in a browser and in the Mac app, of the merge,
      and of Deny.
- [x] Update `src/chat/secrets/README.md` and `src/chat/README.md`. Also
      update `src/chat/device/README.md` (many requests "scroll inside"
      the region) and `worker/secrets/README.md` ("`late` belongs in the
      chat"), which state the old place.
- [x] Check that the Explain popover (`src/chat/explain/PopoverChat.tsx`)
      shows the stack, as `docs/protocol/explain.md` says that it shows a
      waiting request as the session tab does.
- [x] Check the flow in a browser on a computer and on a phone width. Save
      the screenshots under `.context/needs-input-at-the-composer/`.

## Milestone 5: The needs-input mark of a session tab

Tags: ui

Depends on: 4

- [x] Read the open secret requests of every session of the workspace with
      the existing `GET .../secret-requests` read, at the start of the chat
      and after each reconnect. Merge them with the events, under the merge
      rules of `src/chat/secrets/secret-snapshot.ts`.
- [x] Give each session tab a `needsInput` flag in
      `src/chat/components/tab-row.ts`, from the open secret requests and
      the waiting Mac command requests of its session.
- [x] Show the mark in `src/chat/components/SessionTab.tsx` with the
      `SessionTabIcon` of the mockups, through its `needsInput` prop, also
      on the lifted copy of a drag.
- [x] Capture the pictures of the marketing site again with
      `npm run marketing:pictures`. The Mac picture shows the tab of a
      waiting Mac command, which the mockups now draw with the needs-input
      mark.
- [x] Add DOM tests: a tab of another session shows the mark, the mark
      wins over the spinner, and the mark ends with the answer.
- [x] Update `src/chat/README.md` and `src/chat/tab-row.md`.
- [x] Check the marks in a browser. Save the screenshots under
      `.context/needs-input-at-the-composer/`.

Evidence: `.context/needs-input-at-the-composer/m5/` holds the check logs,
the break checks, the repeated runs, and the screenshots.

## Milestone 6: Verification, commit, review, and pull request

Depends on: every other milestone

- [x] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and the complete gate `npm run check`.
- [x] Commit with Conventional Commits and push the branch.
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

Evidence: `.context/needs-input-at-the-composer/gate/` holds the gate
logs. The findings file of the branch is under
`.context/reviews/calummoore/needs-input-at-the-composer-milestones-3-j8a8/`.

## Milestone 7: Mockup fixes of review round 1

Tags: mockup

Depends on: 6 (review round 1)

The review found defects in the mockups of milestones 1 and 2. Each TODO
names its finding in the findings file of the branch.

- [x] Finding 84 C: a mockup chat runs while the sandbox is ready and its
      last item is the Working line. Delete the hand-kept running lists.
      Capture the Mac marketing pictures again. Delete the two follow-up
      items about Stop on the waiting Mac command.
- [x] Finding 41 D: one walk for each stack example, from shared example
      definitions. Answer controls outside the walk draw no link. Fix the
      late card of `several/mac-command` and the command of
      `mac-app/requests/with-secret` too.
- [x] Finding 42 C: the position pages and the step links come from the
      card count of each fixture. Fix `app/chat/menu-placement` too.
- [x] Finding 43 B, or C when its conditions do not hold: each marked tab
      keeps the open requests. Fix the code tab too.
- [x] Finding 44 A: the stack buttons use the registered Icon button.
- [x] Lay out the names and "Asked 3 times" as one wrapping row, so the
      count does not wrap to an indented line at 460 to 640 px.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages.

## Milestone 8: UI fixes of review round 1

Tags: ui

Depends on: 6 (review round 1)

- [x] Finding 1 D: a card leaves at once after its Allow. Its older
      requests settle out of the stack until their own events, and one
      list read releases the rest.
- [x] Finding 3 A: the focus rescue of the stack runs as a passive effect,
      so the focus reaches the card on top or the composer after the value
      sheet closes.
- [x] Finding 4 B: an answered request shows nowhere until a row of its
      turn loads.
- [x] Finding 6 C: the grouped Deny test covers a failed hidden Deny and a
      second press.
- [x] Finding 7 C: one list of the offered Mac scenarios for both
      development pages.
- [x] Run the targeted tests, the typecheck, lint, and format check.

## Milestone 9: Docs fixes of review round 1

Depends on: 6 (review round 1)

- [x] Finding 83 C: the Secret requests page states the rule against a
      notification, not a closed list of cues.
- [x] Record a follow-up item for each deferred finding, each split-off or
      blocked wider fix, and each problem outside the scope.

## Post-merge follow-up (non-blocking)

- [ ] On `conductive.build`, let a secret request turn late in a long
      chat. Check that it shows above the composer and that its session
      tab shows the mark.
