# Secret requests

This doc holds the requirements and the decisions in force for the use of
secrets by agents. It covers the two calls of the workspace tools, the
requests, their time limit, late requests and late answers, temporary
values, mixed requests, what the chat shows, the exact-copy filter, and
the end of a request. It belongs to [Secrets](secrets.md), which covers
the secrets, their rights, their grants, and Capabilities. The terms are
those of [Secrets](secrets.md#terms) and of the
[architecture doc](../architecture.md#terms). The
[mockup catalogue](../mockups/catalogue-secrets.md) draws the requests and
the results at `app/secret-requests`.

A decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says.

## The calls

| Call | MCP tool | CLI command | Needs |
| --- | --- | --- | --- |
| List the secrets | `list_secrets` | `conductive secrets list` | The workspace token |
| Run a command with secrets | `run_with_secrets` | `conductive secrets run` | An active turn |

- Both workspace tools give both calls. Their names follow decision 278.
- Both calls have fixed routes under `/v1/tools/secrets` on
  `api.conductive.build`, as the other calls of
  [Workspace tools](agent-tools.md#workspace-tools) do.
- [Agent tool access](agent-tool-access.md) states what each call reaches,
  and which calls need an active turn.
- A cloud computer has the workspace tools of the org image that it
  starts from, as [Workspace tools](agent-tools.md#workspace-tools) says.
  So a cloud computer from an older org image has no secret calls.

## List the secrets

- `list_secrets` is a read. It needs only the workspace token, and no
  active turn.
- It gives each secret of the org with its name, its description, and
  whether the calling session may use it with no request. It never gives
  a value.
- Reason: a read gives data that each member already sees.
- A call from a command of a turn names that turn. The session of a turn
  that runs in the calling workspace is the calling session.
- Without such a turn, the list says only whether the mark for all agents
  or a pre-approval of the calling workspace covers each secret.

## Run a command with secrets

- `run_with_secrets` is a write, so it needs an active turn. The call
  names its turn, and the Worker finds the session from its own record of
  that turn.
- The call takes one or more names of secrets, the command, and an
  optional reason. The CLI takes them as
  `conductive secrets run --secret NAME [--reason TEXT] -- <command>`.
- The call also sends the text of the command (secrets decision 11 D).
- When grants cover each name, the Worker returns the values at once.
- Otherwise the Worker makes one request for the names that no grant
  covers. The call waits for its answer, up to
  [the time limit](#the-time-limit).
- After an Allow, the Worker returns the values to the tool. The tool then
  starts the command, as
  [How an agent uses a secret](secrets.md#how-an-agent-uses-a-secret)
  says.
- The Worker returns values only to a run call of a session that grants
  cover, while the turn of that call runs.
- The CLI runs the command in the shell call of the agent, with its
  standard input and output.
- The MCP server runs the command in its own process and returns its
  output. Reason: an MCP server cannot reach the shell of the agent.
- Both tools hide each exact copy of a value in the output of the command
  before the agent reads it.
- The result gives the exit code of the command. When the command did not
  run, the result says why, such as a member who denied the request, or a
  request that stays open.
- The help of the CLI and the descriptions of the MCP tools tell the agent
  to keep each value out of its output, its files, and its answers.

## The request

- A request names one or more secrets, the reason of the agent, and the
  command that the agent says it will run. One answer covers the whole
  request.
- The request shows each name with its description, the reason, and the
  command. It never shows a value.
- Reason: one task then shows one card, as a Mac command request shows
  its reason.
- The command is only the claim of the agent. The grant covers the
  session, and the values go to the caller. So nothing checks that the
  command that runs is that command.
- The request labels the command as the command that the agent says it
  will run.
- Reason: a member sees what the agent says it will run before the answer,
  also on a late request.
- While the call waits, the request shows as a card just above the
  composer of its session, with the waiting
  [Mac command requests](agent-tools.md#what-the-chat-shows).
- While a request waits, its workspace shows needs input (decision 68).
  The workspace keeps needs input while any of its requests waits, also a
  late request.
- The composer keeps Stop while a request waits, because the turn runs.
- A request for secrets of the org offers Deny and Allow for this session.
  Allow gives the session an approval of each secret that the request
  names.
- Only the request and needs input show that a request waits. The Mac app
  shows no notification for it, as it does for a Mac command request.

## Who answers

- Any member who sees the session answers a request, in any browser or in
  the Mac app (secrets decision 4 B).
- Reason: this rule is the fastest, and every member can already send
  messages in each workspace of the org.
- An answer only by the sender of the turn, only by an admin, or only by
  the creator of the secret or an admin was rejected for that reason.
- A member answers through the app, with a sign-in. The workspace token
  can never answer a request, as
  [The workspace token](tokens-and-secrets.md#the-workspace-token) says.

## The time limit

- A run call waits at most 90 seconds for the answer to its request. The
  call then ends without a run.
- Its result tells the agent that the request stays open, and that a
  member can answer it later. It also says that the app tells the agent of
  a later answer.
- Reason: Claude stops a shell command after 2 minutes by default, so the
  call must end first.
- The request shows no time limit.
- When the turn of a waiting call ends, also after Stop, its request
  becomes a late request in the same way.

## Late requests

- A late request leaves the composer. It stays at its place in the chat,
  with the choices of its card.
- A line on it says that the agent stopped waiting, and that Allow tells
  the agent in a new turn.
- A late request never folds into the work of its turn. Reason: it still
  waits for a member.

## Late answers

- When a member allows a late request, a line of the app tells the agent
  in the session that asked (secrets decision 10 B). This holds for Allow
  for this session, for a temporary value, and for Save as secret.
- The line names the member who answered and each secret, and it says
  what the answer gives. It never holds a value. It is not a message of
  the member who answered.
- The agent gets the same text, with the name of the member who answered.
- The line starts a turn in that session. The turn acts for the sender of
  the turn that asked, under the login rules of that sender. So its GitHub
  token, its Mac requests, and the writes of its workspace tools follow
  that sender.
- When a turn of that session runs at the time of the answer, the line
  joins that turn, as a message does. That turn keeps its sender.
- When the line can start no turn, the app sends nothing. Examples are a
  starter who does not share the login with that sender, a login that is
  gone, and a sender who left the org.
- The late request then says that the agent learns of the answer at the
  next message. The grant of the answer stays.
- Reason: the answer then acts as an answer in time does, and the share
  setting of each login keeps its rule.
- A turn on the login of the starter, also while the starter does not
  share it, was rejected, because the share setting exists to stop that
  use.
- A rule that sends nothing whenever the message of the member who
  answered would open a new session was rejected. Most late answers of
  other members would then send nothing, because a new subscription login
  is not shared by default.
- A notice that waits for the next message of the session was rejected.
  So was a new linked session, because it has none of the earlier history.
- A late Deny sends nothing. The late request then shows that it was
  denied. Reason: no agent waits, because its call already ended.

## Temporary values

- When a run names a name that the org has no secret for, and no
  temporary value covers it, the request asks for a value.
- The member who answers types the value. That member chooses how long
  the value lasts: 15 minutes, This workspace, or Save as secret
  (secrets decision 7). A line says what the chosen one does.
- Allow stays off until each value is typed.
- A value for 15 minutes serves each run of the session that asked, for
  15 minutes from the answer.
- A value for this workspace serves each run of each session of the
  workspace, until the workspace is archived.
- Reason: the 15 minutes bound a short task, and This workspace names its
  own scope.
- Save as secret creates a secret of the org with that name. The member
  who answers is its creator, and the reason of the agent is its
  description. The session gets an approval of it.
- Reason: the reason says why the value is needed, and the card stays
  short.
- The other two choices create no secret of the org.
- The Durable Object of the workspace keeps a temporary value encrypted
  for the time of that value.
- A value for one run only, a value for the rest of the turn, and a value
  for the rest of the session were rejected. Reason: the user asked for
  the choice of 15 minutes or this workspace.
- While a value for this workspace exists, a run that names it makes no
  request. A member removes a wrong value in Capabilities, as
  [Grants](secrets.md#grants) says.
- On a phone, a request for a value shows Deny and Give a value. Give a
  value opens a sheet with each value field, the choice of how long the
  values last, and Allow.
- Reason: the forms of a phone open as sheets, and a sheet leaves room for
  the keyboard.

## Mixed requests

- A request can name secrets of the org and names that the org has no
  secret for.
- Allow then gives the session an approval of each secret of the org. It
  takes a value for each other name, each in a field of its own.
- One choice of how long covers every value.
- A line says that Allow also allows the secrets of the org for this
  session.
- Reason: one task keeps one card.

## What the chat shows

- The result of a run shows at its place in the chat, with the look of the
  card of a Mac command. It shows the names, whether the run was allowed
  or denied, the command that the agent says it will run, and the grant
  that let it run.
- No output and no time of the command reach the chat
  (secrets decision 11 D). The tool call line of the agent shows whether
  the command runs or ran.
- Reason: no output with a changed form of a value then reaches the chat.
- A result with the output of the tool call was rejected, because no tool
  output reaches the chat. A report of the output by the tools was
  rejected, because the output can hold a changed form of a value that the
  filter does not hide.
- A denied run names the member who denied it, and it says that the
  command did not run.
- A result folds with the work of its turn, as the result of a Mac command
  does (decision 151). A late request never folds.
- A copy of the session gives each request and each result as the chat
  shows them, with no value and no output. So does `read_session`.

## The exact-copy filter

- The Durable Object hides each exact copy of each value that a run of the
  workspace used, in the text that screens show. The values of secret env
  vars get the same filter, as
  [Secrets that users enter](tokens-and-secrets.md#secrets-that-users-enter)
  says.
- The filter also covers the text of each request that comes from the
  cloud computer: the reason and the command. Reason: that text reaches
  the chat of every member.
- For a secret of the org, the filter reads the current value. It keeps no
  old value of a replaced or deleted secret. Reason: the filter of the env
  vars does the same.
- For a temporary value, the filter keeps its copy for the time of that
  value.
- Reason: the filter costs little, and it catches a value that reaches the
  chat by mistake.
- Risk: the filter hides only exact copies. A changed or encoded value
  still shows.

## The end of a request

- An Archive of the workspace ends each of its open requests as Not
  answered, with no choices. A suspension of its org does the same, and so
  does a close of the session of the request.
- Needs input then ends. The request says what ended it.
- Reason: no agent waits there, and a request that comes back after a
  Restore would surprise.
