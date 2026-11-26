# Secret requests

This doc holds the requirements and the decisions in force for the use of
secrets by agents. It covers the two calls of the workspace tools, the
requests, covered requests, their time limit, temporary values, mixed
requests, what the chat shows, the exact-copy filter, and the end of a
request. It belongs to [Secrets](secrets.md), which covers the secrets,
their rights, their grants, and Capabilities. [Late secret requests](secret-late-answers.md)
covers late requests and late answers.
[Secret variables](secret-variables.md) covers the names of new secrets
and the environment of the command. The terms are those of
[Secrets](secrets.md#terms) and of the
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
- It gives each secret of the org with its name, its description, its
  [variable name](secret-variables.md#variable-names), and whether the
  calling session may use it with no request. It never gives a value.
- Reason: a read gives data that each member already sees. The variable
  name follows from the name alone.
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
- The tool refuses a run with a
  [conflict](secret-variables.md#conflicting-variable-names) before it
  calls the Worker.
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
- The result of a command that ran also gives the variable name of each
  name, as [What the tools give](secret-variables.md#what-the-tools-give)
  says.
- The help of the CLI and the descriptions of the MCP tools tell the agent
  to keep each value out of its output, its files, and its answers.
- They also tell the agent to read each value through its variable name,
  and they say what a conflict does.
- They also say when to use each call. The agent calls `list_secrets`
  before it asks a member for a credential, and it runs each command that
  needs a secret with `run_with_secrets`.

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
- The request shows as a card in the [request stack](request-stack.md)
  above the composer of its session. It stays there until a member
  answers it or it ends, also after it becomes late.
- While a request waits, its workspace shows needs input (decision 68).
  The workspace keeps needs input while any of its requests waits, also a
  late request.
- Starting shows over needs input. So the workspace shows Starting during
  a start or a [Restart](restart-the-software.md#restart), also while a
  request waits. When Starting ends and the agent runner is ready, the
  workspace shows needs input again while any request still waits. Cal
  chose this on 20 November 2026.
- Reason: each member and the app then see when the cloud computer is
  ready again. A new field or event for that was rejected, because the
  state already shows Starting. An end of the open requests at a Restart
  was rejected, because a member can still answer a late request.
- While the call waits, the composer keeps Stop, because the turn runs.
- A request for secrets of the org offers Deny and Allow for this session.
  Allow gives the session an approval of each secret that the request
  names.
- No notice outside the screens of the app tells that a request waits. The
  Mac app and a browser show no notification for it (secrets decision 13 A).
  A [Mac command request](desktop-commands.md#the-request-on-the-mac) gets one from the Mac app.

## Covered requests

- An Allow also allows each other open request, waiting or late, that its
  new grants cover. A request is covered when the grant of the answer
  reaches each secret that it asks for, in the session of the request.
- The scope of each grant sets the reach. An approval for the session and
  a value for 15 minutes reach the session that asked. A value for this
  workspace reaches each session of the workspace.
- A covered request names the member who answered. A waiting call of a
  covered request gets its values at once.
- A request that asks for a secret that the answer does not give stays
  open, and does not change. This holds also when another grant, such as
  one of Capabilities, now covers that secret. Reason: the request then
  names only grants that the member gave.
- Reason: an agent often asks again after its request becomes late. The
  member then answers once, and no call waits for an answer that it
  already has.
- A Deny ends only the requests of its card, as
  [Requests for the same secrets](request-stack.md#requests-for-the-same-secrets)
  says. A Deny that also ends each other open request that names only the
  denied secrets was rejected, because it can end a different, valid
  request. A Deny refuses no later request, because the agent can ask
  again with a better reason.
- A settle of the requests that a grant of Capabilities covers was
  rejected. Each such write must then reach every workspace that it
  covers, for a rare case. So was a new call that waits on the open
  request of the same secrets, because its card then shows an old command.

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

[Late requests](secret-late-answers.md#late-requests) states a request
after the wait of its tool call ends.

## Late answers

[Late answers](secret-late-answers.md#late-answers) states what an answer
to a late request does.

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
- Save as secret needs each name that gets a value to follow
  [New names](secret-variables.md#new-names). Otherwise Save as secret
  shows but stays off, with a line under the choices that says why.
  15 minutes and This workspace stay.
- The Worker checks each name of a Save as secret answer before it writes.
  It refuses an answer with a name that breaks the rule. The request then
  stays open, with no new secret and no approval.
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
- [Answer text secrets](answer-text-secrets.md) states how the end of an
  unfinished answer keeps to the times above.

## The end of a request

- An Archive of the workspace ends each of its open requests as Not
  answered, with no choices. A suspension of its org does the same, and so
  does a close of the session of the request.
- Needs input then ends. The request says what ended it.
- Reason: no agent waits there, and a request that comes back after a
  Restore would surprise.
