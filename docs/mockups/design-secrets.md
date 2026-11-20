# The design of secrets and Capabilities

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
Secrets tab of the org settings, the Capabilities control of New workspace,
of a workspace, and of an automation, and the requests and results of the
secrets in the chat. They come from the secrets decisions of 13 November
2026, and the automation capabilities decisions of 18 November 2026.
[Secrets and Capabilities](catalogue-secrets.md) lists their pages.

A secret is a named value of an org: its name, its description, its
encrypted value, its creator, and the mark for all agents. An agent runs
one command with a secret through the workspace tools, after a member
allows it. The agent gets the name and the variable name of the secret,
never its value. No screen shows a value, except to an admin who reveals
one.

## The Secrets tab

- `SecretsTab` in `src/components/secrets/` draws the tab, after Agents
  in the org group of Settings. One section holds the list,
  its notes, and Add secret.
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
  of the app.
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
  at the end of the title, a hint, and its content. Secrets and Mac access
  are the parts for now. A later feature, such as MCP servers, adds a part
  to the list that `capabilityParts` gives.
- The Secrets part lists each secret of the org with its description and
  a checkbox, which pre-approves it for the workspace. A secret for all
  agents stays checked, off, with the words "All agents". Manage secrets
  opens the Secrets tab. An org without secrets says so, with Add a
  secret.
- In a workspace, the Secrets part also lists the approvals of the
  session that the control opens from, under "This session", each with who
  allowed it and when. An approval whose secret the workspace already
  allows, by a check or for all agents, does not show. The Secrets part
  also lists each value for this workspace, with who gave it. Each has
  Remove. `GrantList` draws them, and a group without grants hides.
- The Mac access part is a switch at the end of its title, off by default.
- The control of an automation has the Secrets part only, from
  `automationCapabilityParts`: no grants, and no Mac access part, because
  run workspaces keep Mac access off (automation capabilities decision
  2 A). Its line says what agents in each run can use, and its hint says
  that each run workspace starts with the checked secrets pre-approved. A
  check changes the form, so Save turns on.
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
  the region of the requests of Mac commands, from
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
- After the time limit, or when the turn ends, the request stays at its
  place in the chat with the same choices, and a line says that the agent
  stopped waiting and that Allow tells it in a new turn. It never folds
  with the work of its turn. After an answer, it shows the answer at the
  end of its names, and its line says who answered and what followed.
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
  above the composer or in the chat.
- `SecretRun` draws a run with secrets at its place in the chat, with the
  card of a Mac command: the names, Allowed or Denied, the command that the
  agent says it will run, and what let it run. The Worker gets no output
  and no time of the command, so the card shows neither. The tool call line
  beside it says whether the command runs or ran. A denied run says who
  denied it and that the command did not run. When its turn ends, the card
  folds with the work of the turn.
- A Mac command that a workspace refused, because a member turned Mac
  access off, shows its card with "Mac access off" and the reason.
- `secretRunCopy.ts` holds the words of the requests and the results.
