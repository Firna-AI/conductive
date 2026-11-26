# The request stack

This page belongs to [Chat and events](chat-and-events.md). It holds the
requirements and the decisions in force for the open requests of a
session above its composer. It covers what the stack holds, the order of
its cards, the moves through it, and the requests for the same secrets.
[Mac commands](agent-tools.md#mac-commands) and
[Secret requests](secret-requests.md) state each request, its answers,
and its result. The terms are those of the
[architecture doc](../architecture.md#terms) and of
[Secrets](secrets.md#terms). The
[mockup catalogue](../mockups/catalogue-secrets.md) draws the stack at
`app/secret-requests/several`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A
needs-input decision names a decision of the change that keeps each open
request above the composer and marks the session tab that holds it. Its
plan keeps the dated record while the change is open. Its pull request
keeps it after the merge.

## What the stack holds

- An open request waits for a member. It is a Mac command request whose
  call waits, a secret request whose call waits, or a late secret request.
- The request stack shows just above the composer of a session. It holds
  each open request of that session, also each late secret request
  (needs-input decision 1 A).
- A request stays in the stack until a member answers it or it ends. Then
  it leaves the stack at once and takes its place in its turn.
  [Late requests](secret-late-answers.md#late-requests) says why a late
  request stays there.
- The stack shows one card at a time, on top. A card shows one open
  request. A card can also stand for older secret requests that it hides,
  as [Requests for the same secrets](#requests-for-the-same-secrets) says.
- Reason: the user asked on 20 November 2026 that only one request shows
  at a time, with the others stacked behind it. A list that scrolls
  through every card was rejected for that reason.
- The edges of at most two other cards show above the card on top. They
  stand for all the other cards, so the stack keeps its height while the
  member moves through it. Reason: a stack of many requests is then as
  high as a stack of three.
- The stack takes at most 40% of the height of the window, also on a
  phone, so the chat and the composer stay in view.
- A long card scrolls inside the outline of the stack, also with the
  keyboard. Reason: the outline, the edges, Previous, and Next stay in
  view, so the card still reads as the front of the stack.
- The session tab of each open request shows the needs-input mark, as
  [The needs-input mark](tab-row.md#the-needs-input-mark) says.

## The order

- The cards follow one order: first the requests whose calls wait, then
  the late requests. Each group keeps the oldest first.
- Reason: a call that waits has a time limit, and a late request has none.
- The cards that this view cannot answer go after the cards that it can
  answer. Each part keeps the order above (needs-input decision 4 B). A
  view is the app in one browser tab or in the Mac app.
- Reason: the card on top is then one that the member can answer, whenever
  such a card exists.
- A browser, and the Mac app on another Mac, cannot answer a Mac command
  request, as [Who answers](agent-tools.md#who-answers) says. There, each
  Mac command request goes after the secret requests. The Mac app on the
  Mac that got the command can answer it, so its stack keeps the order.
- Risk: two views of one chat can show a different card on top.
- One order for every view was rejected. In a browser, the card on top
  could then offer no choices, and the request that the member can answer
  would wait behind it.
- The stack starts with the first card of the order on top. An answer
  shows the next card.
- A request that joins or leaves the stack does not change the card on
  top, unless that card leaves. The place of the card on top shows the new
  count. Reason: the card must not change while the member reads it or
  presses Allow.
- When this view cannot answer the card on top, a new request that it can
  answer becomes the card on top. Reason: such a card comes first, and no
  Allow moves under the pointer, because the card on top had no choices in
  this view.

## Moves through the stack

- With more than one card, Previous and Next show above the card on top,
  with its place, such as "1 of 3". With one card, the place, the buttons,
  and the edges do not show.
- Previous is off on the first card, and Next is off on the last card. So
  the place never jumps from the end to the start.
- The keyboard reaches Previous and Next before the actions of the card.
  So a member moves through the stack first and then answers. No other key
  moves the stack.
- A screen reader hears the new place after each move, as a polite
  announcement.
- When a press shows the first or the last card, the focus moves to the
  other button. Reason: the focus never stays on a button that is off.
- When the card that holds the focus leaves, such as after its answer, the
  focus moves to the new card on top. A screen reader then reads that
  card, and the next Tab reaches its first action. With no card left, the
  focus moves to the composer. While a bar takes the place of the
  composer, such as while the sandbox is stopped, the focus moves to that
  place, and to the composer when it shows again.
- Reason: the focus never jumps to an action that the member did not see.

## Requests for the same secrets

- A newer open secret request hides each older open request of the same
  session for the same set of secrets. One card then shows the newest of
  them.
- Reason: the user asked on 20 November 2026 that the requests for one
  key show only the latest. Its Allow then approves them all.
- A wider group, such as one that also holds an older request for fewer
  secrets, was rejected. Its Deny would then end a request that asks for
  less, and one request could hide behind two cards.
- The card says how often the agent asked, such as "Asked 3 times", after
  the names. It counts each request that the card stands for. Reason: the
  member then knows that one answer covers each of them.
- The card is one place in the stack. It takes the place of the oldest
  request that it holds. When the call of its newest request waits, it
  goes with the requests whose calls wait. Reason: a new ask of the agent
  then does not move a card that already waits.
- An Allow of the card covers each request that it hides, as
  [Covered requests](secret-requests.md#covered-requests) says.
- A Deny of the card also ends each request that it hides
  (needs-input decision 3 B). Each of them shows that the member denied
  it. A Deny of a card that hides no request ends only its own request.
- Reason: a grant covers the session, not the command. So for the same set
  of secrets, a Deny of each command gives no extra control, and one card
  takes one answer.
- A Deny that ends only the newest request was rejected, because the next
  hidden request then shows, and the member answers the same question
  again. A Worker that ends the older requests when the agent asks again
  was rejected. It changes the events, and older copies of the app refuse
  its end reason.
- The app sends one Deny for each request of the card. A Deny that the
  Worker gives the reach of the card was rejected. The app and the Worker
  must then agree on the requests of each card.
- After the answer, each request takes its place in its own turn, with its
  own result. Reason: the chat needs no new form, and each turn keeps its
  own answer.
- After an Allow, the app sends the agent at most one line, as
  [Late answers](secret-late-answers.md#late-answers) says.
- A Mac command request never hides another request, and no request hides
  it. Reason: each Allow runs one exact command.
