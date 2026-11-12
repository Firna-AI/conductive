# Flows

Each flow uses the components and the terms of the
[architecture doc](../architecture.md). A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.

## Create a workspace

1. The user sends the first message of a new workspace. The Worker records
   the workspace, and its Durable Object keeps the message.
2. With the Boat key, the Worker asks Boat for a sandbox from the newest
   good org image of the org. The sandbox gets the workspace token and the
   org's env vars, but no agent login.
3. The Durable Object pushes each start step to the open tabs.
4. The agent runner starts and connects to the Durable Object. The Durable
   Object sends it the waiting message.

## Chat

1. A tab sends a message to the Worker. The Durable Object forwards it to
   the agent runner, with the turn token of its turn and the current
   branches of the workspace. A runner of protocol version 1 gets the agent
   login of the starter of the session in place of the token. The Worker
   first copies the files of the message from the attachment storage into
   the sandbox. An action of the pull request bar sends its fixed prompt in
   the same way.
2. The runner gives the message to the agent through the SDK. It numbers
   each agent event and sends it to the Durable Object.
3. The agent sends each model request to the model gateway of the Worker,
   with the turn token. The gateway checks the token with the Durable
   Object, adds the agent login of the starter, and streams the answer of
   Anthropic or OpenAI back. The requests of a ChatGPT sign-in pass
   through the egress container on their way to OpenAI. A settings file
   in the repository can send the requests of Claude to another address, as
   [How the agents reach the gateway](../protocol/model-gateway.md#how-the-agents-reach-the-gateway)
   says. With a runner of version 1, the agent sends its model requests
   to the provider itself.
4. The Durable Object stores each event, confirms it to the runner, and
   pushes it to every open tab of the workspace.

## Terminal, previews, and desktop

- The terminal socket goes from the browser to the Worker on
  `app.conductive.build`. The Worker connects it to the private terminal
  port.
- A preview frame loads its preview hostname. The Worker proxies the
  request to the private preview relay of the sandbox. The relay forwards
  it to the previewed server with its local address as `Host`.
- The Worker asks Boat for a short-lived desktop URL, and the browser
  shows Boat's desktop stream.

## GitHub events

- GitHub sends pull request, check, status, and push webhooks. The Worker
  routes each event to the workspace whose current branch it names.
- A push to the default branch of a chosen repository can also start a
  refresh of the org image.
- A pull request event can also start the runs of routines, as
  [Routine runs](#routine-runs) says.

## Merge

1. A member presses Merge in the pull request bar. The Worker starts the
   merge on GitHub with the GitHub token of that member, and with the head
   commit that the bar showed.
2. The bar asks the Worker for the result until GitHub reports it.
3. GitHub sends the event of the merge. The Worker routes it to the
   workspace, and the Durable Object pushes the merged state to every open
   tab.

## Continue

1. A member presses Continue after the merge. The Durable Object starts the
   sandbox when it is stopped.
2. The Durable Object runs a trusted Continue job in the sandbox. Its fetch
   of the default branch gets the GitHub token of that member through the
   credential helper, only while the fetch runs.
3. The job creates the new branch with the changed files. The default
   branch becomes the base branch of the workspace. The Worker stores the
   new branch and its base branch in D1 and in the Durable Object, and
   reads the GitHub state of the new branch.
4. The Durable Object pushes the new state and the note of Continue to
   every open tab. Each later message carries the new branch to the agent.

## Routine runs

1. A trigger fires: the minute Cron Trigger finds a due schedule, a pull
   request webhook matches a trigger, or the owner uses Run now.
2. The Worker stores the run in D1, once for each schedule time, delivery,
   or Run now request. It checks the owner, the org, and the owner's
   logins. A failed check creates no workspace.
3. The Worker creates a workspace as the owner, with the run text as its
   first message. The workspace starts as in
   [Create a workspace](#create-a-workspace).
4. The Durable Object of the workspace reports how the first turn ended,
   so that a failed first turn shows as a failed run.

[Routines](../protocol/routines.md) and its linked pages state the rules.

## Stops

- The Durable Object stops a sandbox when the stop rule of
  [Stop and resume](../protocol/workspace-life.md#stop-and-resume) says
  so.
- Near day 14 of a stop, the app starts the sandbox briefly and stops it
  again, so that Boat keeps its disk (decision 43).
- Archive stops a running sandbox at once, and keeps the sandbox. The
  Durable Object deletes it 14 days after the Archive, unless a member
  restores the workspace first, as
  [Archive](../protocol/workspace-life.md#archive) says.
