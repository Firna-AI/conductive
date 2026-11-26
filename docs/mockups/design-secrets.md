# The design of secrets and Capabilities

This page belongs to [the design](design.md), which gives the style, the
layouts, the design tokens, and the shared parts. This page gives the
Secrets tab of the org settings, the Capabilities control of New workspace,
of a workspace, and of an automation, and the note of a change of the
capabilities. They come from the secrets decisions of 13 November 2026,
the automation capabilities decisions of 18 November 2026, and the
capability prompts decisions of 20 November 2026. Its linked page
[Secret requests and results](design-secret-requests.md) gives the
requests and results of the secrets in the chat.
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

[Secret requests and results](design-secret-requests.md) gives the
requests and the results of the secrets in the chat: the card of a
request, the late request, the stack of the open requests above the
composer, the line of a late Allow, and the run with secrets at its
place.

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
