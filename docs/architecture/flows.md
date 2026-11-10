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
   the agent runner, with the agent login of the starter of its session
   and the current branches of the workspace. The Worker first copies the
   files of the message from the attachment storage into the sandbox. An
   action of the pull request bar sends its fixed prompt in the same way.
2. The runner gives it to the agent through the SDK. It numbers each agent
   event and sends it to the Durable Object.
3. The Durable Object stores each event, confirms it to the runner, and
   pushes it to every open tab of the workspace.

## Terminal, previews, and desktop

- The terminal socket goes from the browser to the Worker on
  `app.conductive.build`. The Worker connects it to the private terminal
  port.
- A preview frame loads its preview hostname. The Worker proxies the
  request to the private port of the sandbox.
- The Worker asks Boat for a short-lived desktop URL, and the browser
  shows Boat's desktop stream.

## GitHub events

- GitHub sends pull request, check, status, and push webhooks. The Worker
  routes each event to the workspace whose current branch it names.
- A push to the default branch of a chosen repository can also start a
  refresh of the org image.

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
3. The job creates the new branch with the changed files. The Worker
   stores the new branch in D1 and in the Durable Object, and reads the
   GitHub state of the new branch.
4. The Durable Object pushes the new state and the note of Continue to
   every open tab. Each later message carries the new branch to the agent.

## Stops

- The Durable Object stops a sandbox when the stop rule of
  [Workspaces and sandboxes](../protocol/workspace-life.md#stop-and-resume)
  says so.
- Near day 14 of a stop, the app starts the sandbox briefly and stops it
  again, so that Boat keeps its disk (decision 43).
