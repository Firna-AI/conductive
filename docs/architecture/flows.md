# Flows

Each flow uses the components and the terms of the
[architecture doc](../architecture.md). A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says.

## Create an org

1. A person creates an org with its repositories. An operator can also
   choose its provider account.
2. The Worker sets the first account of the org: the choice of the
   operator, or a draw from the weights.
3. The Worker starts the first build of the org image in that account.

## Switch the account of an org

1. An operator presses Switch account on the page of the org in the
   operator section, and picks another configured account.
2. The Worker records the switch. It starts the switch build in the new
   account, with the inputs of the newest good org image. The switch build
   waits while a job of the org runs, while the org is suspended or
   deleted, and while it has no active admin.
3. Members do not see the switch build. Until it succeeds, new workspaces
   of the org start in the old account.
4. When the switch build succeeds, the Worker makes its image the org
   image and changes the account of the org in the same step. New
   workspaces then start in the new account. Each existing workspace keeps
   its sandbox in the old account.

[Switch account](../protocol/switch-account.md) states the rules.

## Create a workspace

1. The branch control of New workspace asks the Worker for the branches of
   the repository. The Worker reads them from GitHub with the GitHub token
   of the user, and it stores no list.
2. The user sends the first message of a new workspace, with its start
   branch and its base branch. The Worker asks GitHub for each such branch
   that is not the default branch, with the GitHub token of the user.
3. The Worker records the workspace, and its Durable Object keeps the
   message.
4. With the key of the account of the org, the Worker asks its provider
   for a sandbox from the newest good org image of the org. The sandbox
   gets the workspace token and the org's env vars, but no agent login.
5. The Durable Object runs the fetch of the create in the sandbox. It
   fetches the start branch and the base branch, and creates the workspace
   branch from the start branch. It pushes each start step to the open
   tabs.
6. The agent runner starts and connects to the Durable Object. The Durable
   Object sends it the waiting message.

## Chat

1. A tab sends a message to the Worker. The Durable Object forwards it to
   the agent runner, with the turn token of its turn and the current
   branches of the workspace. The sandbox first downloads each new file of
   the message from the attachment storage, through a route of the
   Worker. An action of the pull request bar sends its fixed prompt in the
   same way.
2. The runner gives the message to the agent through the SDK. It numbers
   each agent event and sends it to the Durable Object.
3. The agent sends each model request to the model gateway of the Worker,
   with the turn token. The gateway checks the token with the Durable
   Object, adds the login of the session, and streams the answer of
   Anthropic or OpenAI back. For an own endpoint login, the gateway sends
   the request with the key to the endpoint of that login instead, as
   [Own endpoints](../protocol/model-gateway-requests.md#own-endpoints)
   says. The requests of a ChatGPT sign-in pass through the egress container
   on their way to OpenAI. A settings file in the repository can send the requests of Claude
   to another address, as
   [How the agents reach the gateway](../protocol/model-gateway.md#how-the-agents-reach-the-gateway)
   says.
4. The Durable Object stores each event, confirms it to the runner, and
   pushes it to every open tab of the workspace.

## A run with secrets

1. In a turn, the agent runs a command with secrets through the agent
   tools. The tool sends the names, the reason, the command text, and the
   turn to the Worker, with the workspace token.
2. The Worker finds the session of the turn. When grants cover each name,
   it returns the values to the tool at once.
3. Otherwise the Durable Object keeps a request and pushes it to every
   open tab of the workspace. A member allows it in a browser or in the
   Mac app, and the Worker returns the values to the tool.
4. The tool starts the command with the values in its environment. It
   hides each exact copy of a value in the output for the agent.
5. The Durable Object shows the result in the chat with no value and no
   output. It also hides each exact copy of each used value in later
   events.
6. When no member answers in 90 seconds, the call ends, and the request
   stays in the chat. A later Allow starts a turn for the sender of the
   turn that asked.

[Secrets](../protocol/secrets.md) and
[Secret requests](../protocol/secret-requests.md) state the rules.

## Terminal, previews, and desktop

- The terminal socket goes from the browser to the Worker on
  `app.conductive.build`. The Worker connects it to the private terminal
  port.
- A preview frame loads its preview hostname. The Worker proxies the
  request to the private preview relay of the sandbox, with the port
  credential of its provider. The relay forwards it to the previewed
  server with its local address as `Host`.
- The frame of an HTML file tab loads the files preview of its workspace
  in the same way. The relay forwards each of its requests to the file
  server of the agent runner, which reads the files of the repository.
- For a sandbox on Boat, the Worker asks Boat for a short-lived desktop
  URL, and the browser shows Boat's desktop stream. A sandbox on E2B has
  no desktop stream. The app hides the Desktop tool for now.

## GitHub events

- GitHub sends pull request, check, status, and push webhooks. The Worker
  routes each event to the workspace whose current branch it names.
- A push to the default branch of a chosen repository can also start a
  refresh of the org image, in the account of the org.
- A pull request event can also start the runs of automations, as
  [Automation runs](#automation-runs) says.
- When GitHub no longer has the base branch of a workspace, the Worker
  moves it to the default branch in D1, as
  [A base branch that GitHub deleted](../protocol/base-branches.md#a-base-branch-that-github-deleted)
  says. The Durable Object keeps one saved retry for the rest of the move.
- That retry and each resume run a trusted fetch of the default branch in
  the sandbox. The fetch gets the GitHub token of the workspace owner
  through the credential helper, only while it runs. Only then does the
  sandbox compare with the default branch, as
  [The move in the cloud computer](../protocol/base-branches.md#the-move-in-the-cloud-computer)
  says.

## Merge

1. A member presses Merge in the pull request bar. The Worker starts the
   merge on GitHub with the GitHub token of that member, and with the head
   commit that the bar showed. On a workspace in the merge queue, the
   click goes to the queue, which merges as its next step, as
   [The merge](../protocol/merge-queue.md#the-merge) says.
2. The bar asks the Worker for the result until GitHub reports it.
3. GitHub sends the event of the merge. The Worker routes it to the
   workspace, and the Durable Object pushes the merged state to every open
   tab.

## Continue

1. A member presses Continue after the merge. The Worker reads the merged
   pull request from GitHub with the GitHub token of that member. The
   branch that it merged into is the new base branch, or the default branch
   when GitHub no longer has that branch.
2. The Durable Object starts the sandbox when it is stopped. It runs a
   trusted Continue job in the sandbox. Its fetch of the new base branch
   gets the GitHub token of that member through the credential helper, only
   while the fetch runs.
3. The job creates the new branch with the changed files. The Worker stores
   the new branch and its base branch in D1 and in the Durable Object, and
   reads the GitHub state of the new branch.
4. The Durable Object pushes the new state and the note of Continue to
   every open tab. Each later message carries the new branch to the agent.

## Repository change

1. A member picks another repository in the header. The Durable Object
   refuses the change while a turn runs, while Continue or Restart runs,
   and when the agent runner of the sandbox cannot move. It starts the
   sandbox when it is stopped.
2. The Durable Object reads the work that the workspace stops following:
   the local work of the old folder, and the open pull request and the
   pushed commits of the old branch. It also reads the changed files of
   the new folder. When it finds work, the app asks the member first.
3. The Durable Object runs a trusted job in the sandbox, as for Continue.
   Its fetch of the default branch of the new repository gets the GitHub
   token of that member, only while the fetch runs. The job adds the
   exclude rule of the context folder, copies the context folder, and
   creates the new branch in the new folder with its changed files.
4. The Worker stores the new repository, branch, and base branch in D1 in
   one guarded write. The Durable Object pushes the new state and one note
   to each session, and reads the GitHub state of the new branch.
5. The Durable Object sends the move to the agent runner. The runner moves
   to the new folder in its own process, so agent processes keep running.
   Held turns go out after the runner names the new folder.
   [Repository change](../protocol/repository-change.md) states the rules.

## Automation runs

1. A trigger fires: the minute Cron Trigger finds a due schedule, a pull
   request webhook matches a trigger, or the owner uses Run now.
2. The Worker stores the run in D1, once for each schedule time, delivery,
   or Run now request. It checks the owner, the org, the default login of
   the owner, and the GitHub access of the owner. A failed check creates
   no workspace.
3. The Worker creates a workspace as the owner, with the run text as its
   first message. The workspace starts as in
   [Create a workspace](#create-a-workspace).
4. The Durable Object of the workspace reports how the first turn ended,
   so that a failed first turn shows as a failed run.

[Automations](../protocol/automations.md) and its linked pages state the rules.

## Stops

- The Durable Object stops a sandbox when the stop rule of
  [Stop and resume](../protocol/stop-and-resume.md) says so.
- On Boat, near day 14 of a stop, the app starts the sandbox briefly and
  stops it again, so that Boat keeps its disk (decision 43). E2B keeps a
  stopped sandbox with no time limit, so it gets no such restart.
- Archive stops a running sandbox at once, and keeps the sandbox. The
  Durable Object deletes it 14 days after the Archive, unless a member
  restores the workspace first, as
  [Archive](../protocol/workspace-life.md#archive) says.
- 14 days after the Archive, the workspace also leaves the lists of the
  app and of the agent tools. D1, the Durable Object, and the attachment
  storage keep its data, as
  [Removed workspaces](../protocol/workspace-life.md#removed-workspaces)
  says.
