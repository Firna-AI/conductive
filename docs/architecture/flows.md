# Flows

Each flow uses the components and the terms of the
[architecture doc](../architecture.md). A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.

## Create an org

1. A person creates an org with its repositories. An operator can also
   choose its provider account.
2. The Worker sets the account of the org once: the choice of the
   operator, or a draw from the weights. The org keeps that account for
   its whole life.
3. The Worker starts the first build of the org image in that account.

## Create a workspace

1. The user sends the first message of a new workspace. The Worker records
   the workspace, and its Durable Object keeps the message.
2. With the key of the account of the org, the Worker asks its provider
   for a sandbox from the newest good org image of the org. The sandbox
   gets the workspace token and the org's env vars, but no agent login.
3. The Durable Object pushes each start step to the open tabs.
4. The agent runner starts and connects to the Durable Object. The Durable
   Object sends it the waiting message.

## Chat

1. A tab sends a message to the Worker. The Durable Object forwards it to
   the agent runner, with the turn token of its turn. A runner of protocol
   version 1 gets the agent login of the starter of the session in place
   of the token. The Worker first copies the files of the message from the
   attachment storage into the sandbox.
2. The runner gives the message to the agent through the SDK. It numbers
   each agent event and sends it to the Durable Object.
3. The agent sends each model request to the model gateway of the Worker,
   with the turn token. The gateway checks the token with the Durable
   Object, adds the agent login of the starter, and streams the answer of
   Anthropic or OpenAI back. A settings file in the repository can send
   the requests of Claude to another address, as
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
  request to the private preview relay of the sandbox, with the port
  credential of its provider. The relay forwards it to the previewed
  server with its local address as `Host`.
- For a sandbox on Boat, the Worker asks Boat for a short-lived desktop
  URL, and the browser shows Boat's desktop stream. A sandbox on E2B has
  no desktop stream. The app hides the Desktop tool for now.

## GitHub events

- GitHub sends pull request, check, status, and push webhooks. The Worker
  routes each event to the workspace of its branch.
- A push to the default branch of a chosen repository can also start a
  refresh of the org image, in the account of the org.

## Stops

- The Durable Object stops a sandbox when the stop rule of
  [Workspaces and sandboxes](../protocol/workspace-life.md#stop-and-resume)
  says so.
- On Boat, near day 14 of a stop, the app starts the sandbox briefly and
  stops it again, so that Boat keeps its disk (decision 43). E2B keeps a
  stopped sandbox with no time limit, so it gets no such restart.
