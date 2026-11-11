# Version pins

This page belongs to [Isolation of orgs and sandboxes](isolation.md). It
states the login rules and the risks of a sandbox for each version pin.
[Agent logins in a sandbox](isolation.md#agent-logins-in-a-sandbox) states
the version pin, the share setting, and the other login rules. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A gateway
decision number names a decision of the change that adds the
[model gateway](model-gateway.md), as that doc says.

## A sandbox with a version pin of 2 or later

- A sandbox with a version pin of 2 or later holds no agent login. The
  [model gateway](model-gateway.md) keeps each login in the Worker, and
  adds it to each model request of a turn (decision 120).
  [No login in the sandbox](model-gateway.md#no-login-in-the-sandbox)
  gives the approaches that were rejected.
- No process in such a sandbox can get a login when it connects as an
  older runner. The workspace refuses a runner below its version pin, as
  [The agent runner](agent-runner.md#the-agent-runner) says (gateway
  decision 5).
- Risk: while a turn runs, each process in the sandbox can read its turn
  token. A member with a terminal in the sandbox can read it too.
- Claude reads the token from a file that only the sandbox user can read.
  Each process of the sandbox runs as that user, so it can read the file
  (gateway decision 11).
- Codex reads its ChatGPT turn token from the login file of its session.
  Only the sandbox user can read it. Processes of that user can copy it
  while the turn runs (decision 175).
- The email, account ID, and ChatGPT workspace name of the signed-in account also reach
  the sandbox. A process or member with a terminal can read them.
- Such a process or member can spend the login of the starter through the
  gateway while the turn runs. A copy of the token works in the same way
  outside the sandbox. A request that still runs at the end of the turn
  stops within 30 seconds, as
  [Streams](model-gateway-requests.md#streams) says.
- The token works only on the model routes of the gateway.
  [The turn token](model-gateway.md#the-turn-token) states when it works.
  It never gives the login itself.
- Risk: a settings file in the repository, such as `.claude/settings.json`,
  can set the address of the model requests of Claude. Claude then sends
  each model request, with its content and the turn token, to that
  address. A commit, the agent, or other code in the sandbox can change
  that file (gateway decision 11).
- Risk: a process that keeps running in the sandbox can also get the turn
  token of each later turn while that turn runs. This holds also for the
  turns of other starters. Examples of such a process are a server that a
  tool started, and a program that the startup script started. It can
  read each token from the runner, or from the file of Claude, while that
  turn runs.
- So the members of one org trust each other with the use of their logins
  while their turns run. The share setting does not keep a turn token away
  from them. No other member and no process in the sandbox can get the
  login itself.

## A sandbox with a version pin of 1

- The workspace of a sandbox with a version pin of 1 accepts an older
  runner and a newer runner. An older runner gets a supported agent login
  itself with each turn (gateway decision 2). It never gets a ChatGPT
  sign-in or an own endpoint login.
- Reason: an older runner cannot use a turn token, and a sandbox keeps the
  runner of its org image. A refusal of each turn of an older runner was
  rejected, because each workspace with an older runner would then lose
  its agent turns.
- A newer runner in such a sandbox gets a turn token for each of its
  turns. The turn token risks of
  [A sandbox with a version pin of 2 or later](#a-sandbox-with-a-version-pin-of-2-or-later)
  then apply to those turns.
- A newer runner does not keep the agent logins out of such a sandbox.
  Any process with the workspace token can still connect as an older
  runner, and then get the agent logins of later turns.
- The login rules and risks below apply to turns that use an older
  runner.
- No process that the agent starts inherits the login of its turn. The
  login is not in the environment, the arguments, or an inherited open file
  of such a process. The agent program writes no copy of the login to disk.
  So a dev server that a tool starts gets no copy of the login (decision
  114).
- Reason: a server that a tool starts can run for days after its turn.
  Stopping every program of the agent at the end of each turn was rejected,
  because it also stops the servers behind port previews. The Claude
  program's setting that removes the login from tool processes was rejected,
  because it runs each tool command in isolation.
- Risk: a member with a terminal in the same sandbox can read the login of
  the turn that runs now. Every other process of the same sandbox user can
  read it too, such as a tool of the agent or a server that the startup
  script started.
- Risk: such a process can copy the login while the turn runs, and use the
  copy after the turn. The rule against inheritance stops only the
  automatic copy into new processes.
- Risk: the `.claude/settings.json` file of the repository can set the
  address of the model requests of Claude. The agent program then sends
  the real login of the starter to that address.
- With a change of that file, a commit, the agent, or other code in the
  sandbox can send the login to any host. On a newer runner, this path
  gives only a turn token, as
  [How the agents reach the gateway](model-gateway.md#how-the-agents-reach-the-gateway)
  says.
- So the members of one org trust each other with their logins, also after
  a turn ends. The share setting does not keep a login away from them.
