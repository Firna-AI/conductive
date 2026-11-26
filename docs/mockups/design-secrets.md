# The design of secrets and Capabilities

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
Secrets tab of the org settings, the Capabilities control of New workspace,
of a workspace, and of an automation, the requests and results of the
secrets in the chat, and the note of a change of the capabilities. They
come from the secrets decisions of 13 November 2026, the automation
capabilities decisions of 18 November 2026, and the capability prompts
decisions of 20 November 2026.
[Secrets and Capabilities](catalogue-secrets.md) lists their pages.

A secret is a named value of an org: its name, its description, its
encrypted value, its creator, and the mark for all agents. An agent runs
one command with a secret through the workspace tools, after a member
allows it. The agent gets the name and the variable name of the secret,
never its value. No screen shows a value, except to an admin who reveals
one.

## The Secrets tab

- `SecretsTab` in `src/components/secrets/` draws the tab, after Agents
  in the tabs of the org settings. One section holds the list, its notes,
  and Add secret. A phone puts the six tabs of the org settings in three
  columns, on two lines.
- `SecretRow` draws each secret: its name in the monospace font, its
  description, who added it, and the record of its last reveal. Then come
  the mark for all agents, the value as dots, and the actions. A narrow
  list puts the text on the first line, and the mark, the value, and the
  actions on a second line.
- `secretRights.ts` holds the rule of the actions, which the app reads
  too. Every member adds secrets. A member replaces and deletes only the
  secrets that they added, and sees each value as dots. An admin replaces
  and deletes each secret, switches the mark for all agents, and reveals
  one value at a time. A member sees the mark as words, without a switch.
  A suspended org shows the tab with no action.
- A revealed value shows on a line of its own under its row, with Copy and
  Hide, and the record of the row says "Revealed by you, just now".
- Replace opens a form under the row, in the place of the value and the
  actions: the description, which the form can change, and an empty field
  of a new value, which keeps the current value when it stays empty. The
  creator of the secret and the admins use it. Delete asks first with
  `ConfirmDialog`, because the value cannot come back and the grants of
  the secret end.
- Add secret opens the form under the list: the name, the description, and
  the value, each with its hint. The form of an admin ends with the switch
  for all agents, which starts off.
- The hint of the name says to use only letters, digits, and underscores.
  When Save secret refuses a name with other characters, the error of the
  name shows in the place of its hint, and each field keeps what the
  member typed. A secret with an older name, such as Cloudflare
  (read-only), keeps its name. Its row shows like the others, and Replace
  has no name field. `secretNameCopy.ts` holds the words of the name rule.
- The notes under the list say what the mark for all agents does and, for
  a member, which secrets the member can change. The last line says to use
  the environment variables of the Cloud computer tab for values that every
  cloud computer needs at each start, and links to that tab.
- `secretsCopy.ts` holds the words of the tab.

## The Capabilities control

- `CapabilitiesButton` in `src/components/capabilities/` draws the small
  Capabilities icon, the Blocks icon of lucide, with its label as the
  tooltip. On a computer it stands right after the attach button in the bar
  of every composer and in the footer of the New workspace dialog. A press
  opens the control, which a computer draws above the icon, as an open menu
  of the app. A long control scrolls inside it.
- A phone has one + button in place of the attach button and the
  Capabilities icon, from `ComposerMenu` in `src/components/chat/`. Its
  menu opens above it, as the menu of the model picker does, with Attach
  files and Capabilities, and Capabilities opens the control as a sheet.
  Stop shows only its icon, from `ComposerButtons.tsx`, and keeps the
  spoken name Stop. So the model and the label of a login stay readable at
  360 px (secrets decision 16 G). Later tools of the composer join the
  menu.
- On the automation page, the icon stands before the model picker in the
  bar of the prompt box, from `PromptBox` in `src/components/automations/`.
  Only the owner gets it. The bar has no attach button, so a phone keeps
  the icon there, with no + menu, and a press opens the control as a
  sheet.
- `CapabilitiesPanel` draws the control: its title, a line about what it
  holds, then each part. A part has a title in the label font, a control
  at the end of the title, a hint, and its content. Secrets and, in the
  Mac app, Mac access are the parts for now. A later feature, such as MCP
  servers, adds a part to the list that `capabilityParts` gives.
- The Secrets part has no hint line. It lists each secret of the org with
  a checkbox, which pre-approves it for the workspace. `SecretOption`
  draws each row, in the app too. The description shows only in the info
  box of the info icon after the name: a small raised card under the
  icon, over the rows below it. A mouse on the icon opens the box, and a
  press keeps it open until a second press. A secret without a
  description shows no icon. A secret for all
  agents stays checked, off, with the words "All agents". Manage secrets
  opens the Secrets tab. An org without secrets says so, with Add a
  secret.
- Above more than ten secrets, the Secrets part shows the shared
  `SearchField` of `src/components/common/`, with the words "Search
  secrets". The search narrows the list by name and by description, and a
  search that matches no secret says so in a line. `secretSearch.ts`
  holds the limit and the filter, which the app uses too.
- In a workspace, the Secrets part also lists the approvals of the
  session that the control opens from, under "This session", each with who
  allowed it and when. An approval whose secret the workspace already
  allows, by a check or for all agents, does not show. The Secrets part
  also lists each value for this workspace, with who gave it. Each has
  Remove. `GrantList` draws them, and a group without grants hides.
- `OpenCapabilities` draws the open control with the parts of its shell,
  the Mac app or a browser, from `useMacApp`. It does not read a pairing of
  this Mac, because the Mac app with no device connection reads no device
  either (Mac access decisions of 20 November 2026). A browser shows no Mac
  access part, because only the page of the Mac app on that Mac starts a
  grant (Mac access decision 7 of 21 November 2026).
- `MacAccessPart.tsx` draws the Mac access part of the Mac app: one switch
  at the end of its title, with no hint. Each member sees the switch of
  their own Mac. It is on while this Mac has a grant until Stop for the
  workspace, and off otherwise, also while the 15 minutes run, where the
  bar gives the time left. On starts the grant, and off stops it, as Stop
  does. While the page cannot read the settings of this Mac, the switch is
  off and disabled, and the words under it say that this Mac is not
  available, unless a result already says why. `ChangeOutcome` shows the
  result of the last start or Stop under the switch: Not started and the
  cause of a start that failed, or the result of the Stop of a switch-off.
- In New workspace, the switch is a choice of the draft, and it starts
  off. The create starts the grant only while the switch is on.
- `StartFailedNotice` draws the notice over the composer of a new workspace
  whose grant did not start after the create: the cause, and Try again.
- The control of an automation has the Secrets part only, from
  `automationCapabilityParts`: no grants, and no Mac access part, because
  no person watches the Mac of the owner during a run (automation
  capabilities decision 2 A). Its line says what agents in each run can
  use, and its hint says that each run workspace starts with the checked
  secrets pre-approved. A check changes the form, so Save turns on.
- Under the prompt box of an automation, a muted line with the key icon
  names the chosen secrets for every member, each in the monospace font,
  such as "Runs can use FIGMA_TOKEN and VERCEL_TOKEN with no question."
  While the page shows a pull request trigger, also one that the owner
  added before Save, a hint with the warning icon follows it: text in a
  pull request, such as a comment, can steer the agent to use these
  secrets. The lines follow the line of the logins of the runs. A
  suspended org keeps the line of the secrets, because its settings stay
  readable, and shows no hint, because no run starts.
- `capabilitiesCopy.ts` holds the words of the control, and
  `runSecretsWords` there holds the words of the lines under the prompt.

## Requests and results in the chat

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
  `app/secret-requests/several/waiting-and-late` shows. The requests whose
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
  Mac app on that Mac answers both, so its stack keeps the order, as the
  `with-secret` variant of `mac-app/requests` shows. `answersHere` in
  `components/chat/requests.ts` is the test of the view.
- With more than one card, the place of the card on top, such as
  "1 of 3", then Previous and Next sit above the stack, at its end.
  Previous is off on the first card, and Next on the last. The keyboard
  reaches them before the actions of the card, and the place is a polite
  live region. One card shows no place, no buttons, and no edges.
  `requestStackCopy.ts` holds the words.
- The stack keeps its height limit of 40% of the window, also on a phone.
  The stack draws the outline of the card on top, so a long card scrolls
  inside it, and an edge that cuts the card fades. The card takes its
  `inStack` form there, without an outline of its own.
- A newer open request of the session hides each older open request for
  the same set of secrets, so one card stands for them, as the user asked
  on 20 November 2026. The card says how often the agent asked, such as
  "Asked 3 times", after the names, from `askedTimes`, as
  `app/secret-requests/several/asked-again` shows. It takes the place of
  the oldest request that it holds, so a new ask does not move it. Its
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

## A change of the capabilities in the chat

- The facts of a session are the secrets that it uses with no approval. A
  write that changes the facts of a session gives that session a note in
  its chat, and its agent gets the same words (capability prompts decision
  4 B). The changes are a pre-approval added or removed, an approval of the
  session removed, and a value for this workspace given or removed.
- Mac access is not a fact, so no note names it, as
  [The facts of a session](../protocol/capabilities-agents.md#the-facts-of-a-session)
  says.
- `CapabilityChangeLine` in
  [`src/ui/components/chat/`](../../src/ui/components/chat/) draws the
  note, centred and muted as the note of Continue, with the Capabilities
  icon. It shows at the time of the change and belongs to no turn, so it
  does not fold with the work of a turn. It takes no fixtures, so the app
  can use it too.
- The note names the member, "You" for the viewer who made the change,
  then each change of one write in one sentence, such as "Priya Raman
  pre-approved VERCEL_TOKEN, removed the pre-approval of FIGMA_TOKEN, and
  removed the approval of PROD_DATABASE_URL for this session." Each secret
  is in the monospace font. No note holds a value.
- The changes keep a fixed order: pre-approvals added, pre-approvals
  removed, approvals of the session removed, values given, then values
  removed.
- [capabilityChangeCopy.ts](../../src/ui/components/chat/capabilityChangeCopy.ts)
  holds the words, as pieces of text and names of secrets. The agent gets
  the same words, with the name of the member.
