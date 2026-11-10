# Agent session tools

Status: Active. On branch `calummoore/conductive-mcp-chat-access`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents in a cloud computer can create and list workspaces through the
workspace tools, the MCP server and the `conductive` CLI. They cannot
start a session, list the sessions of a workspace, send a message to a
session, or read a chat. So an agent can hand out work, but it cannot
follow up on that work or use its result. This change adds four calls to
both tools: `create_session`, `list_sessions`, `send_message`, and
`read_session`. They reach every workspace of the org (decision 255).
`read_session` returns the Markdown of the transcript copy (decision 256).
Each message that an agent tool sends ends with a `Sent by:` line that
links to the sending session (decision 257).

The change does not cover these things: files in a tool message, a call
that stops a turn or closes a session, a Copy link item for a session, and
a session address that follows each change of the shown tab.

The user answered every decision of this plan on 10 November 2026.

Cal approved the plan and every recorded choice on 10 November 2026, in
the words "impl all plans and milestones".

Contract owners:

- [Agent tools](../docs/protocol/agent-tools.md).
- [Session transcripts](../docs/protocol/session-transcripts.md).
- [Tokens and secrets](../docs/protocol/tokens-and-secrets.md) and
  [Isolation](../docs/protocol/isolation.md).
- [Workspace links](../docs/protocol/workspace-links.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- The [tools README](../tools/README.md) and the
  [Worker tools README](../worker/tools/README.md).

Decision numbers 255 to 260 were the next free numbers on 10 November
2026. Renumber them before the pull request when `origin/main` uses them
by then, as `plans/follow-ups/decision-numbers-across-plans.md` says.

The options check of 10 November 2026 ran over decisions 255 to 259. Its
report is in `.context/agent-session-tools/options-check.md`.

## Decisions

### 255. How far the session tools reach

Added on 10 November 2026 from the brainstorm of this change. Changed on
the same day by the options check, which added F, G, and H.

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/agent-tools.md:23`
- **Terms:**
  - **Sandbox code:** any program in a cloud computer, such as the agent, a dev server, or a package script.
  - **Calling turn:** the agent turn that makes a tool call. Its sender is the member whose message started the turn.
  - **Starter:** the member who started a session. Each turn of the session runs on the agent login of the starter.
  - **Pull request run:** a workspace that a routine starts for a pull request event. Comments by other GitHub accounts reach its agent.
- **Background:** Every member can already read and send messages in each workspace of the org through the app. The sessions of one workspace share one cloud computer. Each agent keeps its session logs on the disk there. Every process in a cloud computer can read its workspace token, and a copied token keeps working after its copier leaves the org. `create_workspace` already records which workspace created each new workspace.
- **Problem:** Each new call needs a rule for the sessions that it may reach, and for when it may reach them. A wide reach lets sandbox code in one cloud computer read the chats of other members. It also lets that code start turns in their live workspaces.
- **Impact if no action:** The build must guess the reach. If the guess is too wide, one compromised cloud computer can read every chat of the org. It can also run work in every live workspace.
- **Root question:** Which sessions can each holder of a workspace token reach through the session calls, and when?
- **Options:**
  - **A.** Only the sessions of the calling workspace. Sandbox code gains little new reach, because it can already read the session logs on its disk. The agent cannot follow up on a workspace that it created. Effort: Medium.
  - **B.** The calling workspace and each workspace that it created with `create_workspace`. Sandbox code reaches only work that its own workspace started. This includes the messages that members added there later. A workspace that a person made stays out of reach. Effort: Medium.
  - **C.** The calling workspace and each workspace that the sender of the calling turn owns. The agent can follow up on a workspace that the person made by hand. Sandbox code can read and run work in all live workspaces of that person, also in other repositories. Effort: Medium.
  - **D.** Every workspace of the org, as Conductor's CLI allows. Sandbox code in any cloud computer can read every chat of the org. It can also start turns in every live workspace, on the logins of their starters. Effort: Medium.
  - **E.** `list_sessions` and `read_session` reach every workspace of the org, as `list_workspaces` does. `create_session` and `send_message` reach as in B. Sandbox code in any cloud computer can read every chat of the org. Effort: Medium.
  - **F.** The reach of D. `list_sessions` and `read_session` also need an active turn, as the write calls do. An agent reads during its own turns, when it works. A copied token alone, or a process that runs between turns, then reads nothing. Effort: Small.
  - **G.** The reach of D for the turns that a member's message started, and the reach of A for the turns of a routine run. This closes the path where text from outside the org steers a run that no person watches. The limit must pass to each workspace, session, and message that such a turn creates, or the run escapes it with `create_workspace`. A routine then cannot follow up on work that it handed out. Effort: Large.
  - **H.** The reach of D, with an org setting that lets an admin limit the session calls to the reach of B. Each org then chooses its own risk. It needs a stored setting, a settings control, a mockup, and a protocol section. Effort: Large.
- **Left out:**
  - An approval of each message to another workspace fails the goal, because delegation stops while no member answers.
  - A tool identity as the sender breaks the rule that the GitHub token and the Mac requests follow the sender.
  - A reach by repository fails the goal, because follow-ups can go to workspaces of other repositories.
- **Wider fix:** None. This is a design choice, not a class of defect.
- **Previous examples:** For decision 52 on 6 November 2026, the user chose the create and list calls "as Conductor does it". On 9 November 2026, an agent call of the workspace link plan left chat reads and messages out until a brainstorm.
- **Related:** Decision 256 reads inside this reach. Decision 258 follows from the reach to stopped workspaces. Decision 260 follows from the reach to every live workspace.
- **Recommendation:** F, from the options check. It keeps the reach that the user chose, and it stops chat reads by a copied token or between turns at Small cost. The first recommendation was B. G closes the path of a steered pull request run, at Large cost.
- **Action:** ask the user, because F, G, and H change the choice of D, which the user made before these options existed.
- **Chosen:** D, by Cal on 10 November 2026, in the words "1 = D". After the options check, Cal kept D on the same day: "255 = D". So the reads need only the workspace token, and the protocol docs state the risks of D.

### 256. How an agent gets the result of delegated work

Added on 10 November 2026 from the brainstorm of this change. Changed on
the same day by the options check, which added E, F, G, and H.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `tools/mcp-tools.ts`
- **Terms:**
  - **Mac command:** a command that an agent asks to run on the Mac of the sender of its turn. Its output comes from that member's own computer.
- **Background:** The first three calls start work and show its state. No call reads what an agent answered. The Worker keeps the history of each session, with exact copies of secret values hidden. The transcript copy builds a concise or a full Markdown text of one session from that history, in `worker/chat/session-transcript.ts`. Both texts give the output of each Mac command of the session.
- **Problem:** An agent that delegates needs the answer to continue. Without a read, a person must copy each answer back.
- **Impact if no action:** The agent can hand out work but cannot use the results.
- **Root question:** How does a delegating agent learn that the delegated turn ended, and how does it get the result?
- **Options:**
  - **A.** No read tool. `list_sessions` gives the title and the state of each session. A person reads the answers in the app. Effort: Small.
  - **B.** A `read_session` tool returns the concise transcript of one session, with paging. Effort: Medium.
  - **C.** A `read_session` tool returns the full transcript. The text can be very large. Effort: Medium.
  - **D.** `send_message` can wait for the turn to end, up to a time limit, and return the final answer. A turn longer than the limit still needs another way to get its answer. Effort: Medium.
  - **E.** The tool descriptions tell an agent that gets a message with a `Sent by:` line to send its result back to that session with `send_message`. It needs no new call. The result then depends on the receiving agent, and two agents can reply to each other without end. Effort: Small.
  - **F.** `read_session` takes an optional wait. The call returns when the session has no running turn, or at a time limit below the tool time limit of each agent. Effort: Medium.
  - **G.** As the chosen read, but a read of a session of another workspace leaves out the output of each Mac command. It keeps the command, the Mac, and the state. That output can hold secrets of a member's computer that the app does not know. For those sessions, the text then differs from the copy. Effort: Small.
  - **H.** Each row of `list_sessions` also gives the newest answer, cut to a short limit. One call then shows the end of each task. Each list call must read the history of each session, and the rows get long. Effort: Medium.
- **Left out:** None. Each approach is a lettered option. The branch and the pull request of a delegated workspace are no choice here, because the agent already reads them with Git and the GitHub CLI.
- **Wider fix:** None. This is a design choice, not a class of defect.
- **Previous examples:** Decision 215 B of 9 November 2026 chose a concise and a full copy. Conductor's `conductor session message` lists the transcript of a session.
- **Related:** Decision 255 sets which sessions a read reaches. Decision 260: E makes a loop of two agents likely.
- **Recommendation:** G, from the options check, added to the chosen read. Decision 255 D gives sandbox code in every cloud computer the output of commands that ran on a member's Mac, and G keeps that output in its own workspace. The first recommendation was B.
- **Action:** ask the user, because G changes the text of the chosen read, which the user asked to be the same as the copy.
- **Chosen:** a `read_session` tool with the text of the transcript copy, by Cal on 10 November 2026: "add read_session (or similar, could be a different name) option, so it can read the chat - we already have ability to copy transcript so maybe we can use the same thing here". The copy offers both kinds, so the choice covers B and C. After the options check, Cal answered on the same day: "we should not be showing the output of a mac command in the prompt - have a workspace for that". That workspace is "Mac Command Output Privacy", at `https://app.conductor.build/workspace/fb0f5422-5c2b-42c0-9926-b5a2235a212a`. It removes the output of Mac commands from the chat history. So this plan does not apply G. `read_session` keeps the text of the copy, and it gets that change through the shared builder.

### 257. How a reader knows that an agent sent a message

Added on 10 November 2026 from the brainstorm of this change. Changed in its second round, when the run text of routines gave option D. The options check added E.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/agent-instructions.md:90`
- **Terms:**
  - **Sender line:** a line at the start of each message to the agent. It names the member who sent the message. The chat does not show it.
  - **Run text:** the first message of a routine run. It holds the prompt, a `---` line, and fact lines such as `Routine:` and `Trigger:`.
- **Background:** A message from a tool goes in the name of the sender of the calling turn. That member's GitHub token then serves the turn that the message starts. Today, the first message of a workspace from `create_workspace` shows as a plain message of that member. A workspace link in a message shows as a chip.
- **Problem:** With `send_message`, messages appear in sessions where people work. Each message names a member who did not type it.
- **Impact if no action:** Members and agents take the text as the words of a colleague. Nobody can see which agent sent it.
- **Root question:** How do members and agents know that an agent wrote a message?
- **Options:**
  - **A.** No mark. The message shows as a message of the sender. Effort: Small.
  - **B.** A mark for the agent only. The sender line says that the agent in W-12 sent the message for that member. Effort: Small.
  - **C.** A mark for both. The chat shows a label on the message, such as "Sent by an agent in W-12", with a chip. The sender line says the same. It needs a mockup and a new message field. Effort: Medium.
  - **D.** The Worker adds a `---` line and a fact line at the end of the text, such as `Sent by:` and a link. The run text of a routine does the same. Members and agents see the line, and the link shows as a chip. A member can type the same line, so the line proves nothing. It also goes on the first message from `create_workspace`. Effort: Small.
  - **E.** The Worker stores the sending session in a field of the message. It adds the same lines when it builds the text for the agent, the copy, and the chat. The stored text stays the text that the agent wrote. It needs a new message field and changes in the history, the copy, and the chat. Effort: Medium.
- **Left out:** A line at the start of the text, because the first line of a first message becomes the session title.
- **Wider fix:** E. It keeps every line that the Worker adds out of the stored text, so no reader of that text meets one. D with the two fixes of the design is the direct fix.
- **Previous examples:** The run text of a routine, at `docs/protocol/routine-runs.md:86`.
- **Related:** Decision 259 sets what the link of the line shows.
- **Recommendation:** D, as chosen, with two fixes: the title request and the repeat check read only the text before the line. These fixes remove the known side effects of a stored line.
- **Action:** ask the user, because the options change what the chat shows.
- **Chosen:** D, by Cal on 10 November 2026: "3 = D - we could include "Sent by: session link/widget"". So the line links to the sending session, and that link shows as a widget. Decision 259 asks what the widget shows.

### 258. Work that an agent sends to a workspace that does not run

Added on 10 November 2026 while planning, from decision 255. Changed on
the same day by the options check, which widened the root question and
added E and F.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/workspace-life.md`, the section "Stop and resume", `src/app/first-start.ts:33-39`, and `worker/lifecycle/workspace-resume.ts`.
- **Terms:**
  - **Stopped workspace:** a workspace whose cloud computer stopped after 30 minutes without activity and without a running turn. Its files and agent sessions stay.
- **Background:** An open of a workspace starts its cloud computer when it is stopped, or when a later start failed. After a failed first start, the workspace waits for Try again. While the cloud computer does not run, the chat shows its state in place of the composer. The Worker still accepts a message, and the message waits until the cloud computer runs. All orgs share the daily starts of the app's account.
- **Problem:** No rule says whether a message from `send_message`, or a first message from `create_session`, starts such a workspace.
- **Impact if no action:** A delegated message can wait for hours until a member opens that workspace. The agent that sent it does not learn why.
- **Root question:** What happens to work that an agent sends to a workspace whose cloud computer does not run, because it stopped or because its start failed?
- **Options:**
  - **A.** No start. The message waits until a member opens the workspace. The reply says that the message waits for the cloud computer. Effort: Small.
  - **B.** The call starts the workspace in the same cases as an open, with the same checks. A failed first start still waits for Try again. Each start counts toward the daily starts that all orgs share. Effort: Small.
  - **C.** The call refuses a message to such a workspace with an error that names its state. The agent can then ask a member to open it. It adds a rejection. Effort: Small.
  - **D.** A new `start_workspace` call starts such a workspace, and a message keeps the rule of A. The agent decides when a start is worth it. Effort: Small.
  - **E.** `send_message` and `create_session` take an optional field that asks for a start. Without the field, the message waits as in A. The agent chooses the start in the same call. Effort: Small.
  - **F.** The rule of A. The workspace list and the chat of that workspace also show that a message waits, so a member sees why to open it. It needs a new mark and a mockup. Effort: Medium.
- **Left out:** A start for every accepted message, also from the app, because the app hides the composer while the cloud computer does not run, and an open already starts it.
- **Wider fix:** None. This is a design choice, not a class of defect.
- **Previous examples:** `create_workspace` starts a new cloud computer with no approval step (decision 8). An open of a file tab starts a stopped workspace (decision 247).
- **Related:** Decision 255 sets which workspaces a message reaches.
- **Recommendation:** B. Any member can already start each workspace of the org with an open, and a delegated task then runs without a member.
- **Action:** ask the user, because a start spends the daily starts that all orgs share, and no requirement lets anything other than a member's open start a workspace.
- **Chosen:** B, by Cal on 10 November 2026: "258 = B".

### 259. What the link of the `Sent by:` line shows

Added on 10 November 2026 from the answer to decision 257. Changed on the
same day by the options check, which added D and E.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Mockup.
- **Location:** `docs/protocol/workspace-links.md`, the section "Chips", and `src/chat/links/workspace-links.ts`.
- **Terms:**
  - **Chip:** a small rounded box in a line of text. It shows the state mark, the label, and the name of one workspace. A press opens the page of its link.
  - **Session link:** a new app address of one session, such as `…/workspaces/<workspace ID>/sessions/<session ID>`. Today no address names a session.
- **Background:** With decision 257, each message from an agent tool ends with a `Sent by:` line. The user asked that the line hold a link of the sending session that shows as a widget. Today a link to any page of a workspace shows as the chip of that workspace. The app holds the session titles only of the open workspace, and it gets no live updates from another workspace.
- **Problem:** The chip of a workspace does not say which session sent the message. A message from one of several sessions of a workspace then looks like a message from any of them.
- **Impact if no action:** The build must guess what the widget shows. A workspace chip alone does not name the session for the reader.
- **Root question:** How does the `Sent by:` line tell the reader which session sent the message?
- **Options:**
  - **A.** The session link shows as the chip of its workspace, as a link to a tab of a workspace does today. A press opens the session. Effort: Small.
  - **B.** The Worker also writes the title of the sending session into the line, such as `Sent by: Reviewer in` and the session link. The link shows as the chip of its workspace. The title is the title at the time of the send. A session without a title gives the line of A. Effort: Small.
  - **C.** A new session chip shows the workspace label and the title of the session. For a session of another workspace, the app reads the sessions of that workspace when the chat loads, so that title does not change live. It needs a new chip kind and its mockup. Effort: Medium.
  - **D.** The Worker writes `Sent by:` and a Markdown link whose text is the session title. The chip uses that text as the session name. Any member or agent can write that text, so the chip breaks the rule that a chip shows only data that the app already shows. It needs a new chip kind and a mockup. Effort: Medium.
  - **E.** Each session gets a number in its workspace, and its tab shows the number. The line names the session by the workspace label and that number, so the name stays short, unique, and stable. It needs the number, a migration of old sessions, new tabs in the mockups, and a protocol section. Effort: Large.
- **Left out:** A session chip with no workspace label, because a message from another workspace then hides where the work is.
- **Wider fix:** None. This is a design choice, not a class of defect.
- **Previous examples:** Decision 211 chose the chips of workspace links on 9 November 2026. The run text of a routine names its routine in plain text after `Routine:`. The line of a linked session shows the live title of a session of the open workspace, in `src/chat/components/SourceLine.tsx`.
- **Related:** Decision 257: this decision sets the words of its `Sent by:` line.
- **Recommendation:** B. It names the session at the lowest cost and keeps the existing chip, as the run text names its routine in plain text. C gives the title inside one widget.
- **Action:** ask the user, because the options change what the chat shows, and the request names a widget but not its content.
- **Chosen:** C, by Cal on 10 November 2026: "259 = C". So the line holds `Sent by:` and the session link, and the link shows as a session chip.

### 260. Agents that message each other without end

Added on 10 November 2026 from the options check of decisions 255 to 259.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Review.
- **Category:** Docs or spec.
- **Location:** `plans/agent-session-tools.md`, the section "Calls and routes".
- **Background:** With decision 255 D, an agent can message each session of the org. A message to an idle session starts a turn. Each turn spends the agent login of its starter and keeps its cloud computer running. Decision 8 set no limit on agent-made workspaces, and the design follows it for sessions and messages.
- **Problem:** Two agents that each answer the session of a `Sent by:` line can message each other without end. No person may watch either workspace.
- **Impact if no action:** A loop spends agent logins and the daily starts that all orgs share until a member stops a turn.
- **Root question:** How does the app keep agents from messaging each other without end?
- **Options:**
  - **A.** No limit. A member stops a loop with Stop. The tool descriptions tell an agent not to answer a `Sent by:` message only to confirm it. Effort: Small.
  - **B.** A chain limit. Each tool message holds the chain count of its calling turn plus one. The Worker refuses a send whose count passes a limit, such as 20. It adds a stored count and a rejection. Effort: Medium.
  - **C.** A rate limit for each calling workspace, such as 30 tool messages in an hour. It adds a counter and a rejection. A busy agent that hands out much work can meet it. Effort: Medium.
- **Left out:** An approval of each message by a member, because it fails the goal, as in decision 255.
- **Wider fix:** None. This is a design choice, not a class of defect.
- **Previous examples:** Decision 8 set no limit on agent-made workspaces. Routines add no limit beyond the hourly rule of schedules (decision 503 B).
- **Related:** Decision 255 gives the reach. Option E of decision 256 makes a loop likely.
- **Recommendation:** A. An agent does not answer without end unless an instruction tells it to, and decision 8 chose no limit for the same kind of risk. B is the guard to add when loops show up.
- **Action:** ask the user, because B and C add a rejection, and A accepts a cost risk that no requirement covers.
- **Chosen:** A, by Cal on 10 November 2026: "260 = A".

## Design

Each item below is an agent call of 10 November 2026, unless it names a
decision.

### Calls and routes

| MCP tool | CLI command | Route on the machine host | Needs |
| --- | --- | --- | --- |
| `list_sessions` | `conductive sessions list` | `GET /v1/tools/workspaces/{workspaceId}/sessions` | workspace token |
| `read_session` | `conductive sessions read` | `GET /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/transcript` | workspace token |
| `create_session` | `conductive sessions create` | `POST /v1/tools/workspaces/{workspaceId}/sessions` | active turn |
| `send_message` | `conductive sessions send` | `POST /v1/tools/workspaces/{workspaceId}/sessions/{sessionId}/messages` | active turn |

- Agent call: the routes nest under the workspace, as the session routes of
  the app do. Reason: a session lives in the store of its workspace, so
  each call needs the workspace ID.
- Agent call: each tool takes a workspace ID and a session ID. The
  workspace ID defaults to the calling workspace. The descriptions say that
  a session link holds both IDs. Reason: the `Sent by:` line gives a link,
  and the lists give the IDs.
- Agent call: `create_session` and `send_message` need an active turn.
  Reason: the create call needs one today, and the Worker takes the sender
  from the turn.
- Decision 255 D: `list_sessions` and `read_session` need only the
  workspace token, as the list calls of today do.
- Agent call: the `conductive` CLI gets the same four commands as the MCP
  server. Reason: the protocol says that both tools give the same calls.
- Agent call: both tools give the agent the error code and the message of
  each refusal of the Worker, for every call. Reason: the new calls have
  refusals that an agent can act on, such as a closed session. Today
  `tools/client.ts` gives one general message for each error except HTTP
  401.
- Decision 260 A: no limit on the sessions and messages that agents make.
  The tool descriptions tell an agent not to answer a `Sent by:` message
  only to confirm it.

### Reach and the sender

- Decision 255 D: each call reaches every workspace of the org of the
  calling workspace, and nothing outside it. The Worker reads the target
  workspace from its own records, and only within that org.
- Agent call: a read reaches an archived workspace, as the copy route
  does. A create or a send refuses an archived workspace with the existing
  `workspace_archived` error. Reason: an archived chat is read-only.
- Agent call: the tools act for the sender of the calling turn. That
  member starts each new session and sends each message. The Worker takes
  the sender from its record of the turn and checks the current membership.
  Reason: `create_workspace` and Mac commands already follow that sender.
- Agent call: `callingToolTurn` also returns the session of the turn.
  Reason: the `Sent by:` line links to that session.

### Sessions and messages

- Agent call: `create_session` takes the workspace, the model and the
  effort, an optional title, an optional first message, and an optional
  request ID. Reason: "+" makes an empty session, and a first message
  saves a second call.
- Agent call: without a model or an effort, `create_session` uses the
  saved default of the sender, else the default of the app. Reason: the
  new session runs on the sender's login, as "+" uses the member's own
  choice.
- Agent call: the optional title follows the name rule of
  `create_workspace`. Reason: one rule for both create calls.
- Agent call: `send_message` takes the workspace, the session, the text,
  an optional model and effort of the same agent, and an optional request
  ID. Without a model, it uses the current model of the session. Reason:
  the session route refuses another agent, and files need an upload from
  a device.
- Agent call: a request ID makes a repeat of the same call return the
  first result, as the message ID of the app does. Without one, the tool
  makes an ID. Reason: Mac commands take an optional request ID for the
  same reason.
- Agent call: a tool message follows the message rules of the app. It
  joins a running turn. It opens a linked session when the sender cannot
  use the starter's login. A closed session refuses it with
  `session_closed`. The reply gives the message, its turn, and the session
  that took it. Reason: these rules apply to every message today.
- Agent call: an empty `create_session` starts no cloud computer. Reason:
  an empty session carries no work.
- Decision 258 B: a message from `send_message`, or a first message from
  `create_session`, starts its workspace in the same cases as an open: a
  stopped workspace, and a workspace whose later start failed. It uses the
  same checks as an open. A failed first start keeps waiting for Try
  again.
- Agent call: the reply comes at once, and the message waits in the
  workspace for the start. Reason: `create_workspace` waits for its
  creation, but a start can take minutes and the message is already safe.

### The `Sent by:` line

- Decision 257 D: the Worker adds a blank line, a `---` line, and a
  `Sent by:` line at the end of the text of each message from
  `send_message`, of each first message from `create_session`, and of each
  first message from `create_workspace`.
- Decision 259 C: the line is `Sent by:` and the link of the sending
  session. The link shows as a session chip.
- Agent call: the text before the line stays exact. Reason: the agent and
  the session title read the text that the agent wrote.
- Agent call: the title request of a new workspace reads only the text
  before the line. Reason: the title model must name the task, not the
  sender. This is a fix of decision 257 D, from the options check.
- Agent call: the repeat check of a request ID stays as it is. Reason:
  with decision 259 C, the line holds only the session link, so a repeat
  from the same turn makes the same text. The options check proposed a fix
  for the title in the line of option 259 B, which the user did not
  choose.
- Agent call: the agent instructions say what the workspace tools can do
  and what a `Sent by:` line means. Reason: today they name only the
  create, list, and Mac calls.
- Agent call, from the mockups: the chat shows the `---` line and the
  `Sent by:` line as plain text in the message of the sender, as it shows
  the facts of a routine run. Only the link becomes a session chip.
  Reason: the lines are stored text, and the chat shows the text of a
  message as it is.

### Reads

- Decision 256: `read_session` returns the Markdown of the copy items, from
  the same builder. The workspace "Mac Command Output Privacy" removes the
  output of Mac commands from the chat history, and `read_session` gets
  that change through the builder.
- Agent call: `read_session` gives the concise transcript by default, and
  the full transcript on request. Reason: the concise text is smaller, and
  the copy offers both.
- Agent call: a long transcript returns its newest part within a size
  limit. The reply says which lines it holds and how many lines the text
  has. An optional start line returns an earlier part. Milestone 3 sets
  the limit from the documented tool result limits of both agents.
  Reason: agent clients cut long tool results, and the newest answer
  matters most.
- Agent call: `read_session` also reads a closed session. Reason: the copy
  route reads one too.
- Agent call: `list_sessions` gives the ID, the title, the agent, the
  model, the effort, the starter, the state, the closed mark, and the link
  of each session of one workspace. The state is `running`, `failed`, or
  `idle`. A turn that waits for its cloud computer counts as `running`.
  The reply also gives the state of the workspace. Reason: every member
  already sees these fields, and the workspace state shows a stop.

### Session links

- Agent call: the app address of a session is
  `/orgs/{orgId}/workspaces/{workspaceId}/sessions/{sessionId}`. Reason:
  the file tabs already use addresses under the workspace.
- Agent call: a session address opens the workspace and shows that
  session. The address then becomes the workspace address. A closed or
  unknown session opens the workspace page, as a workspace link does.
  Reason: the session tabs keep their behaviour, and a press reopens
  nothing for the other members.
- Agent call: the tool replies give the link of each session that they
  name, as the workspace replies give workspace links. Reason: an agent can
  then point to a session that it started.
- Decision 259 C: a session link shows as a session chip. The chip gives
  the state mark and the label of its workspace, and the title of the
  session. For a session of another workspace, the app reads the sessions
  of that workspace when the chat loads, so that title does not change
  live.
- Agent call: the app reads the sessions of each linked workspace once for
  each load of a chat, with the session route that the app already has.
  Reason: one read serves every link to that workspace.
- Agent call: a link to an unknown session shows the chip of its
  workspace. Reason: the link still opens that workspace.
- Agent call, from the mockups: a session chip shows the icon of a session
  tab between the label of its workspace and the session title. Its title
  is the whole session title, and screen readers hear "Session" before the
  title. Reason: without the icon, a session chip looks like a workspace
  chip, because the session title takes the place of the workspace name.
  The one session of a new workspace also has the name of the workspace.
- Agent call, from the mockups: the chip of a closed session looks like the
  chip of an open session. A press on it in its own workspace keeps the
  shown tab, as a workspace link to the open workspace does. Reason:
  decision 259 C names what the chip shows, and the workspace page is
  already open there.
- Agent call, from the mockups: the bubble of a sent message is never
  wider than its column, and in a message field the box around a chip is
  never wider than the chip. Reason: the mockups showed a long session
  title that pushed a bubble past the edge of a phone, and a gap after a
  long chip in the message field. The fix is in the shared chat styles of
  the mockups, which the app also uses.

### Documentation details

Agent calls of 10 November 2026, checked by the orchestrator:

- `session-calls.md` owns the four session calls. Reason: adding them to
  `agent-tools.md` would pass the document length target.
- `version-pins.md` holds the moved version pin rules. Stub headings keep
  the old inbound links valid. The text keeps its words.
- The protocol pages near 250 lines stay whole. Reason: a small amount
  above the target does not need another page.
- Unknown and cross-org workspaces return `workspace_not_found`. Reason:
  this keeps the existing scoped lookup and hides another org's records.
- Machine reads use the copy's `detail` query with concise as the default.
  Writes use the existing calling-turn and membership errors.
- An omitted send choice keeps the session's model and effort. Closed
  sessions remain in the list. The newest failed turn gives `failed`,
  even without a retry message. A stopped turn gives `idle`.
- A line over the read budget comes in recoverable pieces. Reason: every
  part must fit, and the agent must be able to read all the text.
  Milestone 3 chooses the positions and field names.
- The access doc states the current Mac output risk without a second
  filter. The separate privacy change owns its removal.
- A message that joins a turn keeps that turn's stored sender. Reason:
  the approved tool messages follow the current message admission rule.
- The read budget follows published guidance. Reason: each agent can
  have a different configured limit, so no universal runtime limit exists.

### Images

- Agent call: a cloud computer gets the new tools and instructions only
  from an org image that a full build made after the deploy, as for the
  earlier tool lists. The follow-up item
  `plans/follow-ups/full-image-build-for-agent-tools.md` gets the new
  commands. Reason: a refresh keeps the tools of its image.

### Session read implementation

These are agent calls of 10 November 2026 within the approved read contract.

- The omitted workspace uses the reserved machine path value `current`.
  The server resolves it from the caller's token. Reason: the installed
  tools have no calling workspace ID and need no new credential.
- The shared `sessionAddressPath` and `sessionLink` helpers build the app
  address and absolute link. The machine paths stay in `agent-tools.ts`.
  Reason: an app address and a browser API path name different surfaces.
- The list orders all sessions by creation time, then by ID. It gives a
  `closed` boolean and the existing `choice` and `startedBy` fields.
  Reason: those fields preserve the shared model and sender contracts.
- The serialized transcript reply has a 32,000-byte UTF-8 budget, including
  JSON escapes and metadata. Reason: it leaves room below the 10,000-token
  guidance of Codex and the warning threshold of Claude for ordinary text,
  including the MCP wrapper. Bytes do not promise tokens for every text.
  The [Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
  gives that guidance. The [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
  makes the stored output budget configurable. The [Claude MCP guide](https://code.claude.com/docs/en/mcp#MCP-output-limits-and-warnings)
  gives the warning and its configurable 25,000-token default limit.
- Replies use `startLine`, `endLine`, and `totalLines`, with one-based line
  numbers. The final newline adds no empty line. Reason: the text keeps its
  original newline characters while the range names the returned lines.
- A long line uses `startOffset` and exclusive `endOffset`, in UTF-16 code
  units within their lines. `next` gives the next `{ line, offset }`, or
  null at the end. The next read takes `startLine` and `startOffset`.
  Fragments never divide a surrogate pair. Reason: every fragment stays
  valid Unicode and the positions recover every character.
- A line or offset beyond the text clamps to the last available content.
  Reason: an older position after a changed transcript still gives a
  useful reply without a new refusal.
- The browser copy and machine read share `buildSessionTranscript` and its
  fixed event cutoff. The builder yields the queue between history pages.
  Reason: both texts stay the same and a long read keeps chat available.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the `Sent by:` line of a tool message, the session chip of decision
259 C, and the open of a session link, on desktop and on a phone.

- [x] Read the `mockups` and `product-ui` skills and
      `docs/mockups/README.md`.
- [x] In `app/workspace-links`, draw the session chip: the state mark and
      the label of its workspace, and the title of the session. Draw a
      session without a title, which shows "Untitled", and a long title.
- [x] In `app/workspace-links`, add a message from an agent tool whose text
      ends with the `---` line and the `Sent by:` line with a session chip.
      Draw it for a session of the same workspace and of another
      workspace, on desktop and on a phone.
- [x] In `app/workspace-links`, add a session chip in an agent answer and a
      pasted session link in the message field.
- [x] In `user-flows`, add "open a session link": a press on a session chip
      opens the workspace of that session and shows the session. Include a
      closed session, which opens the workspace page.
- [x] Run `npm run mockups:check`. Smoke-test the changed pages with
      `npm run mockups:serve`.
- [x] Update the design and the TODOs of this plan for each problem that the
      mockups show.

Evidence: `.context/agent-session-tools/reports/m1-mockups.md`.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions of the four calls, the reads, the
`Sent by:` line, and session links. Read the `documentation` skill first.

- [x] Update `docs/protocol/agent-tools.md`: the four calls, their reach
      (decision 255), the token and turn rules, the sender, the inputs and
      defaults, the refusals, the replies with session links, the
      `Sent by:` line (decisions 257 and 259), the start of a workspace
      that does not run (decision 258), and no limit (decision 260). Remove
      the line that leaves out chat reads and messages.
- [x] Update `docs/protocol/session-transcripts.md`: the machine route gives
      the transcript to the workspace token (decision 256), with the size
      limit and the start line.
- [x] Update `docs/protocol/tokens-and-secrets.md`: the calls that the
      workspace token allows.
- [x] Update `docs/protocol/isolation.md` with the risks of decision 255.
      Any process with the token can read every chat of the org at any
      time. A copy of the token keeps that read after its copier leaves the
      org. While a turn of its workspace runs, such a process can also
      start sessions and turns in every live workspace, on the logins of
      their starters.
- [x] Add the reach of decision 255 to the open risks of
      `docs/protocol/routines.md`: a steered pull request run can read
      every chat of the org and start turns in every live workspace.
- [x] Update `docs/protocol/agent-instructions.md`: the instructions name
      the four calls and say what a `Sent by:` line means.
- [x] Update `docs/protocol/workspace-links.md` and
      `docs/protocol/agents-and-sessions.md`: the session address, what it
      opens, and its session chip (decision 259 C).
- [x] Update `docs/protocol/messages-and-attachments.md`: a message from an
      agent tool follows the message rules and ends with the `Sent by:`
      line.
- [x] Update `docs/protocol/workspace-life.md`: a tool message starts a
      workspace that does not run, in the same cases as an open (decision
      258 B).
- [x] Read `src/marketing/terms.ts` and `src/marketing/privacy.ts` in full.
      Update each sentence that restates a changed fact.
- [x] Read each guide under `src/marketing/docs/` in full, with
      `docs/protocol/website-docs.md`. Update each sentence that restates a
      changed fact. `security.md` says that the tools "do not offer a call
      to read or message another workspace's chat".
- [x] Update the rows "Agents that delegate" and "Agent-to-agent messages"
      under `src/marketing/from-conductor/areas/`. Give each the status and
      the note that hold at the merge, as
      `docs/protocol/conductor-comparison.md#statuses` says.
- [x] Check each relative link of each changed Markdown file.

Evidence: `.context/agent-session-tools/reports/m2-internal-docs.md`,
`.context/agent-session-tools/reports/m2-external-docs.md`, and
`.context/agent-session-tools/evidence/orchestrator-markdown-links.txt`.

## Milestone 3: Session reads for agents

Depends on: 2

Add the list and the read of sessions to the Worker. Read the
`typescript` and `testing` skills first.

- [x] Add the routes and the request and reply types to
      `src/shared/agent-tools.ts`. Add one helper for the session address
      that the Worker and the app share.
- [x] Let `worker/tools/handler.ts` accept the two GET routes. Check that
      the target workspace belongs to the org of the caller and that the
      org is active.
- [x] Add a read method to the workspace Durable Object for the session
      list and the transcript. Reuse the builder of
      `worker/chat/session-transcript.ts` with a machine access in place
      of the browser access.
- [x] Return the newest part of a long transcript within the size limit,
      with its line range and the start line. Set the limit from the
      documented tool result limits of both agents.
- [x] Give each session its link, and the reply the workspace state, in the
      list reply.
- [x] Add tests beside the code: a workspace of another org is refused, an
      archived workspace reads, an unknown session gives
      `session_not_found`, the text equals the copy route, and the window
      keeps whole lines at its edges.
- [x] Update `worker/tools/README.md` and `worker/chat/README.md`.

Evidence: `.context/agent-session-tools/reports/m3-session-reads.md` and
the focused checks, ten-run results, failure proofs, and copy comparison
under `.context/agent-session-tools/evidence/m3-*`.

## Milestone 4: Session writes for agents

Depends on: 3

Add the create and the send of sessions to the Worker, with the calling
turn, the `Sent by:` line, and the start of decision 258 B.

- [ ] Let `callingToolTurn` return the session of the turn.
- [ ] Let `worker/tools/handler.ts` accept the two POST routes. Check the
      active turn, the sender's membership, and that the target workspace
      is not archived.
- [ ] Add Durable Object methods that create a session and accept a message
      for a given sender. Reuse `createSession` and `send` of `worker/chat`
      without a browser context.
- [ ] Apply the defaults and the request IDs of the design.
- [ ] Add the `Sent by:` line to each message of the two calls and to the
      first message of `create_workspace`, as decisions 257 and 259 say.
- [ ] Let the title request in `worker/chat/workspace-titles.ts` read only
      the text before the line.
- [ ] Start a workspace that does not run, as decision 258 B says, with the
      checks of an open. An empty `create_session` starts nothing.
- [ ] Add tests beside the code: the sender is the sender of the calling
      turn, a message that the starter's login refuses opens a linked
      session, a closed session refuses, an archived workspace refuses, a
      workspace of another org refuses, a message joins a running turn, the
      text of the `Sent by:` line, the first message of `create_workspace`,
      the title request, a stopped workspace starts, and a failed first
      start keeps waiting.
- [ ] Update `worker/tools/README.md`.

## Milestone 5: CLI, MCP commands, and agent instructions

Depends on: 4

Give both workspace tools the four calls, and tell the agents about them.

- [ ] Add `conductive sessions list`, `read`, `create`, and `send` to
      `tools/cli.ts`, and `list_sessions`, `read_session`,
      `create_session`, and `send_message` to `tools/mcp-tools.ts` and
      `tools/mcp.ts`. Parse inputs in `tools/input.ts` and replies in
      `tools/responses.ts`.
- [ ] Give the agent the error code and the message of each Worker refusal
      in `tools/client.ts`, for every call.
- [ ] Write the tool descriptions: what a session link holds, the default
      workspace, the active turn rule, and that a workspace or session link
      in an answer shows as a chip. Tell an agent not to answer a
      `Sent by:` message only to confirm it (decision 260 A).
- [ ] Update the workspace tools line of `runner/src/instructions.ts` and its
      tests: the four calls, and what a `Sent by:` line means.
- [ ] Add CLI and MCP tests in `worker/tools/` against the handler.
- [ ] Update `tools/README.md` and `runner/agent-tools.md`.
- [ ] Add the four commands to
      `plans/follow-ups/full-image-build-for-agent-tools.md`.

## Milestone 6: Session links in the app

Tags: ui

Depends on: 1, 2, 3

Open a session from its address, and show each session link as the
session chip of decision 259 C.

- [ ] Read the `product-ui` and `typescript` skills.
- [ ] Parse the session address in `src/app/router.ts`. Show that session
      in the workspace, then replace the address with the workspace
      address. A closed or unknown session opens the workspace page.
- [ ] Show each session link as a session chip in messages, answers, and
      the message field, as the mockups draw. Read the sessions of each
      linked workspace once for each load of the chat. A link to an unknown
      session shows the chip of its workspace.
- [ ] Add tests beside the code for the address and the session chip.
- [ ] Update `src/app/README.md`, `src/chat/README.md`, and
      `src/shell/workspace/README.md` where they describe the changed code.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the
      targeted tests and `npm run check`.
- [ ] Smoke-test a session link and its `Sent by:` line in the app of
      `npm run dev`.
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

- [ ] In a deployed workspace with a fresh org image, let an agent create a
      session in another workspace, send it a message, and read its
      transcript. Press the link of the `Sent by:` line and check that the
      sending session opens.
