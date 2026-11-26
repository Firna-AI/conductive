# Secret requests and results

This page belongs to [secrets and Capabilities](design-secrets.md), a page
of [the design](design.md), which gives the style, the layouts, the design
tokens, and the shared parts. This page gives the requests and the results
of the secrets in the chat: the card of a request, the late request, the
stack of the open requests above the composer, the line of a late Allow,
and the run with secrets at its place.
[Secrets and Capabilities](catalogue-secrets.md) lists their pages.

- `SecretRequest` in `src/components/chat/` draws a request: the key icon,
  the names of the secrets, each description, the reason of the agent, and
  the command that the agent says it will run, never a value. The run call
  sends the command, and nothing checks that the agent runs it, so
  `ClaimedCommand` shows it under that label. A request for one secret
  shows its description under the name. A request for several shows each
  name with its description.
- The tool call line of the agent stands beside each request and each run,
  as the runner sends it: one line with its target, the call of
  `conductive secrets run`, and its state.
- While the tool call waits, the request waits just above the composer, in
  the stack of the requests, with the requests of Mac commands, from
  `components/chat/requests.ts`. A secret of the org offers Deny and Allow
  for this session at the end of the names. A name that the org does not
  have says so, and `ValueAnswer` asks for the value and how long it
  lasts: 15 minutes, This workspace, or Save as secret, with a line that
  says what the chosen one does. Save gives the new secret the reason of
  the agent as its description. Deny and Allow follow the choices, and
  Allow stays off until each value is typed. `RequestActions` holds the
  actions.
- Save as secret is off when a name that the org does not have holds
  characters other than letters, digits, and underscores. A line under the
  choices says what Save as secret needs. One choice covers every value,
  so one such name turns it off for the whole answer. 15 minutes and This
  workspace stay.
- A phone keeps a request for a value short: the card shows Deny and Give
  a value, which opens a sheet with each value field, the choice of how
  long the values last, and Allow. The `value-sheet` overlay of the
  workspace draws the sheet, from `screens/requestSheets.tsx`.
- A request can name secrets of the org and names that the org does not
  have. Each secret of the org then gets the approval of the session, each
  missing name gets its own field, named after it, and one choice of how
  long covers every value. A line says that Allow also allows the secrets
  of the org for this session.
- After the time limit, or when the turn ends, the request becomes a late
  request. It stays just above the composer with the same choices until a
  member answers it or it ends, from needs-input decision 1 A, as
  `app/secret-requests/late` shows. A line says that the agent stopped
  waiting and that Allow tells it in a new turn. The card keeps its full
  form and shows no age, and no Stop comes back for it, because its turn
  ended.
- `RequestStack` in `src/components/chat/` draws the open requests of the
  session as a stack, one card at a time, as
  `app/secret-requests/several/waiting-and-late` shows. It draws the
  shared `RequestStackFrame` of
  [`src/ui/components/chat/`](../../src/ui/components/chat/), which the
  app draws too, with the cards of the mockups and the links of Previous
  and Next. The shared `stackEntries` of `requestStackOrder.ts` there
  orders the cards, with the reader `stackReader` of
  `components/chat/requests.ts`. The requests whose
  calls wait come first, then the late requests, each group oldest first.
  A waiting call has a time limit, and a late request has none. The card
  on top is the first in that order, and an answer shows the next card.
  The edges of at most two other cards show above it, narrower the
  further back they are.
- The cards that the view cannot answer go after the cards that it can
  answer, and each part keeps the order of the stack, from needs-input
  decision 4 B. So the card on top is one that the member can answer,
  whenever such a card exists. Only the Mac app on the Mac that got a
  command answers it, so a browser puts the command after the requests
  for secrets, as `app/secret-requests/several/mac-command` shows. The
  Mac app on that Mac answers both, so its stack keeps the order, as
  `mac-app/command-and-secret` shows. `answersHere` in
  `components/chat/requests.ts` is the test of the view.
- With more than one card, the place of the card on top, such as
  "1 of 3", then Previous and Next sit above the stack, at its end.
  Previous is off on the first card, and Next on the last. The keyboard
  reaches them before the actions of the card, and the place is a polite
  live region. One card shows no place, no buttons, and no edges.
  `requestStackCopy.ts` of the shared UI holds the words. Previous and
  Next are the registered Icon button, with the chevrons.
- Each stack of more than one card is a walk of the catalogue, from
  `screens/stackWalks.ts`: a page for each place, one for each card, and
  the answers that lead on through the same example, as
  [how a screen is built](screens.md) gives. Each answer that the
  walk does not take draws no link, so no answer drops the other
  requests. `app/secret-requests/several/answered` follows the walk of
  `waiting-and-late` to the end of its stack.
- The stack keeps its height limit of 40% of the window, also on a phone.
  The stack draws the outline of the card on top, so a long card scrolls
  inside it, and an edge that cuts the card fades. The card takes its
  `inStack` form there, without an outline of its own.
- A newer open request of the session hides each older open request for
  the same set of secrets, so one card stands for them, as the user asked
  on 20 November 2026. The card says how often the agent asked, such as
  "Asked 3 times", after the names, from `askedTimes`, as
  `app/secret-requests/several/asked-again` shows. The names and the count
  are one row that wraps, so a count that does not fit starts the next
  line at the start of the names, with no indent. The card takes the
  place of the oldest request that it holds, so a new ask does not move
  it. Its
  Allow covers each of them, and its Deny ends each of them, from
  needs-input decision 3 B. The card is one place in the stack, whatever
  it hides.
- A Mac command takes its place in the stack, but it never hides another
  request.
- After an answer, or when it ends, a late request leaves the stack at once
  and takes its place in its turn. There it never folds with the work
  of its turn. It shows the answer at the end of its names, and its line
  says who answered and what followed. After the answer of a card that
  hides requests, each of them takes its own place with the same answer.
  One Allow sends at most one line of the app for each session. So only
  the request whose answer sent it says that a new turn told the agent,
  and each other request that the Allow covers names only who answered,
  such as "You answered.", as
  `app/secret-requests/several/asked-again/allowed` shows.
- A late Allow starts a turn that acts for the sender of the turn that
  asked, under the login rules of that sender. `LateAnswerLine` draws the
  line of the app that starts it, such as "Priya Raman allowed
  PROD_DATABASE_URL for this session". It is not a message of the member
  who answered. The agent gets the same sentence with the name of that
  member, from `lateAnswerWords`, and never a value. When that turn cannot
  run, the app sends nothing. When the starter does not share the login
  with that sender, the line of the request says that the agent learns of
  the answer at the next message. When the login of the session is gone,
  the line names the action that gets the agent going again: a connect of
  that login. For a personal login, and for an older session whose record
  names no login, the starter connects it, such as "The agent learns of it
  when Cal connects Claude again". For the org login, an admin connects
  it, such as "The agent learns of it when an admin connects Acme's Claude
  login again".
- An Archive of the workspace, or a suspension of its org, ends each open
  request as Not answered, with no choices, and Needs input ends. Its line
  says what ended it.
- The header and the workspace list show Needs input while a request waits
  above the composer of any session of the workspace. The tab of that
  session shows the needs-input mark, as [the workspace](design-workspace.md)
  gives.
- `SecretRun` draws a run with secrets at its place in the chat, with the
  card of a Mac command: the names, Allowed or Denied, the command that the
  agent says it will run, and what let it run. The Worker gets no output
  and no time of the command, so the card shows neither. The tool call line
  beside it says whether the command runs or ran. A denied run says who
  denied it and that the command did not run. When its turn ends, the card
  folds with the work of the turn.
- A Mac command that a workspace refused while its Mac access was off,
  before agents could always ask (Mac access decision 7), keeps its card
  with "Mac access off" and the reason.
- `secretRunCopy.ts` holds the words of the requests and the results.
