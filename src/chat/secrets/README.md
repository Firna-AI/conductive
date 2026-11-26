# Secret requests

The secret requests of the chat: the requests that an agent makes when it
runs a command with secrets, the answers of members, the runs that follow,
and the line of the app after a late answer. See [the chat](../README.md)
for the whole chat, [Secret requests](../../../docs/protocol/secret-requests.md)
for the requirements, and the
[mockups of secrets](../../../docs/mockups/catalogue-secrets.md) for the
screens.

## Rules for this code

- The chat reads the requests, the runs, and the late answers from the
  events of the workspace: `secrets.request.updated`, `secrets.run`, and
  `secrets.notice`. The newest page of the history of a session and the
  live stream hold them. No event holds a value, an output, a duration, or
  an exit code.
- The history of a session holds only its own requests. So the chat also
  reads the requests of every session of the workspace, with the existing
  `GET .../secret-requests` of the Worker. It reads them after the stream
  starts, with the Mac commands, and after each later connect of the
  stream, when the stored history of that connect has applied. The tab of
  each session with an open request then shows the needs-input mark, also
  when the chat never loaded the history of that session. A read before
  the cutoff of the stream was rejected, because a change of another
  session between the read and the cutoff would then get lost.
- The read adds each open request, and the newer state of each request
  that the chat knows. An ended request that the chat does not know waits
  for the history of its session, which places it in its turn. Each read
  also releases the requests that settle after the Allow of a card, as the
  rule of that Allow below says. A failed read releases them too, so no
  open request stays hidden. It changes nothing else: the events still
  come, and the next reconnect reads again.
- A request shows the state of its newest event number, as the contract
  of the events says, also when a clock gave that state an older time.
  The reply of an answer has no event number, and neither has the read. A
  state of either shows at once when its `updatedAt` is newer than the
  shown state. It stays until an event of the same or a newer `updatedAt`
  arrives, so a late event cannot take the answer back. So a read that an
  event overtook never takes back the state of that event either. The
  first event number of a request orders the requests that were made at
  the same time.
- Each open request, whose tool call waits or that is late, waits in the
  stack of the requests just above the composer, with the waiting Mac
  commands, as [The request stack](../../../docs/protocol/request-stack.md)
  says. It stays out of its turn while it is open, and a late request keeps
  its late line and its choices there. The stack orders its cards and
  moves through them as [the chat README](../README.md#the-request-stack)
  says.
- A newer open request of the session hides each older one for the same
  set of secrets, so one card shows the newest of them and says how often
  the agent asked, such as "Asked 3 times". Its Allow is one answer, which
  the Worker gives to each request that the grant covers. Its Deny sends
  one Deny for each request of the card through `denySecrets`: the hidden
  requests first, then the request that the card shows, so the card keeps
  that request until it leaves. When a Deny of a hidden request fails, the
  shown request stays open, with its choices.
- The card leaves at once after its Allow. The Worker publishes the Allow
  of the shown request first, and then allows each covered request, each
  with its own event. So when the shown request becomes allowed, by the
  reply or by its event, each older open request of its session for the
  same set of secrets settles, through `withSettling`. It leaves the stack
  with the card, counts for no mark, and shows nowhere until its own event
  ends it. Then one read of the list releases each request that still
  settles, such as one that the grant did not cover: at once after the
  Allow of another view, and after the reply of an Allow of this window,
  because a read before that reply can come before the Worker allowed the
  covered requests. `watchSettling` starts that read.
- Each other record takes its place in its turn as the copy of the session
  does, by its time and then its first event number, through
  `placeCommands`. So an answered or ended request leaves the stack at
  once for its place. While the history of the session loads, or after an
  earlier page failed, a record waits for a row of its own turn, because
  `placeCommands` puts a record whose turn has no row after the last row,
  which can belong to a newer turn. So each request shows in one place: in
  the stack, at its place in a loaded turn, or nowhere until a row of its
  turn loads. A request that ever became late never folds with the work of
  its turn. A request that a member allowed in time shows once, as its
  run. A request that a member denied in time shows as a denied run. Each
  run folds with its turn. The line of a late answer stays in view at the
  start of its turn.
- Any member who sees the session answers an open request (secrets
  decision 4 B). A read-only chat, archived or of a suspended org, shows the
  requests with no choices.
- A request that names a secret that the org does not have asks for a
  value. Allow stays off until each such value is typed. One choice of how
  long covers every value, and it starts at 15 minutes, as the mockups draw
  it. A computer shows the fields in the card. A phone shows Deny and Give
  a value, which opens a sheet in the layer of the app frame.
- Save as secret stays in the choices, but it is off for every value when
  one name that asks for a value breaks the rule of new names of
  `validSecretName` in `src/shared/secret-names.ts`. A line under the
  choices says what Save as secret needs. The names of secrets of the org do
  not count, and 15 minutes and This workspace stay.
- A value leaves the browser once, in the answer. A failed answer keeps the
  typed value and gives the choices back, with a notice. In the stack, a
  newer request for the same secrets keeps the card, with the typed
  values, how long they last, the focus, and the sheet of a phone, and
  Allow sends them in the answer to the newer request. A value stays only
  for a name that still asks for one. The card starts again when another
  card shows, or when no request of it carries over, as
  [the chat README](../README.md#the-request-stack) says. When the card
  leaves the stack, a typed value leaves the page with the choices.
- The words come from the shared `secretRunCopy.ts`, and the line of
  Save as secret from `secretNameCopy.ts`. The mockup words of a grant, of
  a late answer, and of an answered request take the fixture people of the
  mockups, so `secret-words.ts` writes them again for the members of the
  contract. A suspension of the owner and a close of the session follow
  the pattern of the mockup words of an Archive.
- The line of a late answer uses the words of the mockups, with "You" for
  the member who answered. Until the app knows whether the answer told the
  agent, the line under the request says only who answered.

## Tests

- `secret-requests.test.tsx` renders the chat with secret events in its
  history: a request above the composer and its read-only form, the choices
  of a request with a name that a new secret cannot take, the runs in the
  fold of their turn, an open late request above the composer, and the
  lines of late, answered, and ended requests at their places.
- `secret-stack.test.tsx` renders the stack: a request whose call waits on
  top of two late requests with "1 of 3", three requests for the same
  secret as one card with "Asked 3 times", and the order of a late request
  and a waiting Mac command in a browser and in the Mac app.
- `secret-snapshot.test.ts` checks the merge of the states of a request,
  also from a read: a read adds an open request and the newer state of a
  known request, but no older state and no unknown ended request.
- `secret-reads.test.ts` drives the read through the controller and reads
  the marks of the tab row. The read at the start marks the tab of another
  session whose request no event holds. After a reconnect, the read adds
  a request that no event holds, and the late state that it still holds
  does not take back the newer state of an event. After the Allow of a
  card, the requests that the card hides count for no mark until one read
  after the Allow ended, which gives back each one that is still open,
  also when the read fails. It checks each source of the Allow: the event
  of another view, the reply of this window alone, and the event of the
  Allow while the answer of this window runs, which reads only after the
  reply.
- `answer-request.test.tsx` mounts the chat and answers requests: Allow of
  a value waits for the value, a failed answer keeps it, and the answer
  sends the values with how long they last. A newer request for the same
  secret keeps the typed value, how long it lasts, and the focus, and
  Allow sends them in the answer to the newer request. A late Allow moves
  the request from the stack to its place in its turn.
- `answer-group.test.tsx` mounts the chat and answers a card that hides
  two requests. Its Deny sends three Denies, the shown request last. When
  the Deny of a hidden request fails, the card keeps the shown request with
  its choices and a notice, and a second press denies the rest. Its Allow
  sends one Allow, and the card leaves at the event of that Allow, before
  the Worker allows the hidden requests with their own events.
- `answer-place.test.ts` loads a session in two pages and holds the
  earlier one. The answer of a late request of that page, which the read
  gave, shows nowhere until the page loads, and then at its place in its
  turn.
- `../components/WaitingRequests.dom.test.tsx` and
  `../components/request-stack.test.ts` test the stack itself, as the
  [chat tests](../tests.md) say.
- `../../shell/workspace/SecretValueSheet.test.tsx` opens the sheet of a
  value on a phone, in the whole app. After Allow in the sheet, the focus
  goes to the card while the answer runs, and then to the composer. A card
  that leaves while its sheet is open gives the focus to the new card on
  top.

### Key code

- `read-secret-events.ts`: the readers of the three events, which the
  reader of the stream calls.
- `secret-snapshot.ts`: `SecretsSnapshot`, the requests, runs, and late
  answers of the chat, and their merge, with `withRequestRead` for a read.
- `secret-open.ts`: `isOpen`, `waitsForAnswer`, and the marks of the
  requests that settle: `withSettling`, `releasable`, and `withReleased`.
- `secret-actions.ts`: the routes of the list and of the answers,
  `readSecretRequests`, the read of every request of the workspace,
  `answerSecret`, and `denySecrets`, the Deny of a card that hides
  requests.
- `settling-reads.ts`: `watchSettling`, which starts the read after an
  Allow that settles requests.
- `session-secrets.tsx`: `sessionSecrets`, the cards of the shown session,
  in the stack above the composer and at their places in the chat.
- `waiting-secrets.tsx`: `waitingSecrets`, the open requests as the stack
  takes them, and the card on top with "Asked 3 times" and its Deny.
- `SecretRequestCard.tsx`, `RequestParts.tsx`, `RequestAnswers.tsx`, and
  `ValueFields.tsx`: the card of a request, its facts and its end, its
  answers, the phone sheet, and the value fields.
- `SecretRunCard.tsx`: a run, or a request denied in time.
- `LateAnswerLine.tsx`: the line of the app after a late Allow.
- `secret-words.ts`: the words of the cards.
- `../components/WaitingRequests.tsx`: the stack of the open requests,
  with the Mac commands.
