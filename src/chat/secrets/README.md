# Secret requests

The secret requests of the chat: the requests that an agent makes when it
runs a command with secrets, the answers of members, the runs that follow,
and the line of the app after a late answer. See [the chat](../README.md)
for the whole chat, [Secret requests](../../../docs/protocol/secret-requests.md)
for the requirements, and the
[mockups of secrets](../../../docs/mockups/catalogue-secrets.md) for the
screens.

## Rules for this code

- The chat reads the requests, the runs, and the late answers only from the
  events of the workspace: `secrets.request.updated`, `secrets.run`, and
  `secrets.notice`. The newest page of the history of a session and the
  live stream hold them, so the chat makes no read of its own. No event
  holds a value, an output, a duration, or an exit code.
- A request shows the state of its newest event number, as the contract
  of the events says, also when a clock gave that state an older time.
  The reply of an answer has no event number. It shows at once when its
  `updatedAt` is newer than the shown state. It stays until an event of the
  same or a newer `updatedAt` arrives, so a late event cannot take the
  answer back. The first event number of a request orders the requests
  that were made at the same time.
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
- Each other record takes its place in its turn as the copy of the session
  does, by its time and then its first event number, through
  `placeCommands`. So an answered or ended request leaves the stack at
  once for its place. A request that ever became late never folds with the
  work of its turn. A request that a member allowed in time shows once, as
  its run. A request that a member denied in time shows as a denied run.
  Each run folds with its turn. The line of a late answer stays in view at
  the start of its turn.
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
  typed value and gives the choices back, with a notice. The card of a
  request mounts again when the request ends, so a typed value leaves the
  page with the choices.
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
- `secret-snapshot.test.ts` checks the merge of the states of a request.
- `answer-request.test.tsx` mounts the chat and answers requests: Allow of
  a value waits for the value, a failed answer keeps it, and the answer
  sends the values with how long they last. A late Allow moves the request
  from the stack to its place in its turn. The Deny of a card that hides
  two requests sends three Denies, the shown request last, and its Allow
  sends one Allow.
- `../components/WaitingRequests.dom.test.tsx` and
  `../components/request-stack.test.ts` test the stack itself, as the
  [chat tests](../tests.md) say.
- `../../shell/workspace/SecretValueSheet.test.tsx` opens the sheet of a
  value on a phone, in the whole app.

### Key code

- `read-secret-events.ts`: the readers of the three events, which the
  reader of the stream calls.
- `secret-snapshot.ts`: `SecretsSnapshot`, the requests, runs, and late
  answers of the chat, and their merge.
- `secret-actions.ts`: the route of the answers, `answerSecret`, and
  `denySecrets`, the Deny of a card that hides requests.
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
