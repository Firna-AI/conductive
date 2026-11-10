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
  request to the private preview relay of the sandbox. The relay forwards
  it to the previewed server with its local address as `Host`.
- The Worker asks Boat for a short-lived desktop URL, and the browser
  shows Boat's desktop stream.

## GitHub events

- GitHub sends pull request, check, status, and push webhooks. The Worker
  routes each event to the workspace of its branch.
- A push to the default branch of a chosen repository can also start a
  refresh of the org image.

## Import from Conductor

[Import from Conductor](../protocol/conductor-import.md) states the rules
of this flow.

1. The page in the Mac app asks the Worker for a scan. The Worker sends
   the scan to the Mac app of the same sign-in session, over its device
   connection.
2. After the person allows it, the Mac app reads the local data of
   Conductor in read-only mode. It sends the list of workspaces to the
   Worker, which adds the state of each row and relays it to the page.
3. The person selects rows and imports them. The Worker records a
   reservation for each row and asks the Mac app to upload.
4. The Mac app builds the stored work with Git and the old documents from
   the memory files. It gets short-lived upload links from the Worker and
   sends each part straight to the attachment storage.
5. When each part of a reservation is stored and checked, the Worker
   creates its workspace in the section Import from Conductor, with no
   sandbox.

## Activation

1. A member activates an imported workspace. The Worker asks Boat for a
   sandbox from the newest good org image, as for each first start.
2. The sandbox fetches the branch from GitHub. The agent runner connects
   to the Durable Object of the workspace.
3. The Worker copies the stored work from the attachment storage into the
   sandbox. The runner checks the disk, puts the work in place, and
   restores the sessions from their memory files.
4. The Worker deletes the stored work and keeps the old documents. The
   agent can then take messages.

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
