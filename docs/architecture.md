# Architecture

Conducting is a browser-only coding tool at `conducting.build`. Each
workspace is one task with its own branch and its own cloud computer, a
Boat sandbox. Agents powered by Claude and Codex work in the sandbox, and
the user follows them in the browser. Nothing runs on the user's computer.
This doc describes the components, their responsibilities, and the
boundaries between them. The app has no product features yet, so the doc
describes the structure that the [protocol docs](#protocol-docs) require.

## Terms

- **Org:** a group of people that owns workspaces, sections,
  repositories, an org image, and one Boat key.
- **Admin** and **member:** the two roles in an org. Each person in an org
  has one of them.
- **Workspace:** one task in an org. It has one repository, one branch,
  one sandbox, and one or more sessions.
- **Workspace owner:** the person who is responsible for a workspace. It is
  the person who created the workspace, until an admin reassigns it.
- **Sender:** the person who sent the message of a turn. The turn runs on
  the agent login of its sender.
- **Boat key:** the key of one Boat account. Each org has one, and every
  sandbox of the org runs on that account.
- **Sandbox:** the Boat sandbox of one workspace. The product calls it a
  cloud computer or a sandbox.
- **Org image:** the saved snapshot that every new sandbox of an org starts
  from. It holds a prepared copy of each repository that the org chose.
- **Build:** a run of the install script on a copy of the org image. It
  replaces the org image only when it succeeds.
- **Refresh:** an update of the org image that fetches the new commits of
  each chosen repository. It does not run the install script.
- **Agent runner:** our program in each sandbox. It runs the agents through
  the agent SDKs.
- **Session:** one agent conversation in a workspace. It shows as a tab.
- **Turn:** the work of the agent on a message, from the message to the
  result of the agent.
- **Workspace token:** a secret of one workspace. Its sandbox uses the
  token to call the Worker.
- **Preview hostname:** a random hostname on the preview domain. It shows
  one port of one sandbox.
- **Start:** each create or resume of a sandbox, also the sandbox of a
  build or a refresh. The Boat account of the org limits its starts.

## Components

### Marketing site

- A few static pages at the root of `conducting.build`, with the Terms and
  Privacy pages. Visitors see them without a sign-in.
- The Worker serves them as static assets.
- The main action is "Start free with GitHub". The site says that users
  need their own Boat account (decision 47).

### Web app

- A React app, built with Vite, that uses the `@firna/ui` components.
- It lives on `app.conducting.build`, behind the GitHub sign-in.
- It shows the orgs, the workspaces, the chat, the files, the tools, and
  the org settings. It follows the phone and the desktop layouts of the
  [mockups](mockups/README.md) (decision 15).
- Tabs are links, so each tool and each file view has its own address.
- The browser keeps only the panel widths. All other state comes from the
  Worker.

### Worker

- One Cloudflare Worker serves the web app, the marketing site, the API,
  the proxies to sandboxes, and the GitHub webhook endpoint.
- It holds the GitHub App key, the key that signs the session cookies, and
  the key that encrypts the stored secrets. The browser never holds them.
- It stores the Boat key of each org, encrypted. It uses that key only for
  the sandboxes of that org (decision 44).
- It reaches Boat through one provider adapter, so that a later change can
  add another provider. It calls only a fixed list of Boat routes.
- It runs one gate for each hostname before every route and every
  WebSocket upgrade. [Access and security](protocol/access-and-security.md)
  states the gates.

### D1

- D1 holds the records of the app: users, orgs, members, sections,
  repositories, workspaces, settings, and the active preview hostnames.
- Boat labels alone cannot hold these records, because a label is fixed
  after a create or a fork.

### Workspace Durable Object

- One Durable Object for each workspace. It runs in Western Europe, near
  Boat's machines.
- It holds the open tabs, the connection of the agent runner, and the
  messages that wait for the sandbox.
- It also holds the start steps, the stop timer, and the banner state.
- Its storage keeps the chat history, so a stopped or archived workspace
  still shows its chat.
- It revokes the preview hostnames of its workspace.

### Boat

- Boat runs the sandboxes and keeps the saved snapshots (decision 2).
  Sprites on Fly.io was the other option. Boat costs less, and it already
  has forks, saved snapshots, port URLs, desktop streams, and environments.
- Each org runs on the Boat account of its own Boat key (decision 46). That
  account holds the org image and every sandbox of the org, and its plan
  limits apply.
- The app does not depend on Boat webhooks, because each Boat account would
  need its own (decision 44). The agent runner reports when a sandbox is
  ready. The Worker reads the state of a sandbox from Boat's API when it
  needs it.
- A stop ends every process. Boat keeps the disk and the enabled system
  services, and restarts those services after each resume and fork.
- The app's own Boat organization serves only development and tests.

### Sandbox software

Every org image holds the app's own sandbox software:

- the agent runner, a Node program that runs as an always-on service
- the terminal service, on a private port
- the agent tools: an MCP server and a CLI that create and list workspaces
- a git credential helper that gets a fresh GitHub token for each git
  operation

The agent runner runs Claude through the Claude Agent SDK, with the agent
program that the SDK bundles at its own version. A pinned version guards
against a change in how the agent program reads logins. The runner runs
Codex through the Codex SDK or the Codex App Server (decision 36).

### External services

- **GitHub App:** one app gives the sign-in, the repository access, and the
  webhooks of every org.
- **Anthropic and OpenAI:** the model use of each turn bills to the own
  Claude or OpenAI account of its sender.
- **Boat:** the Boat account of each org pays for its sandboxes and its
  saved snapshots. The app itself is free (decision 45).

## Hostnames

| Hostname                | What it serves                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| `conducting.build`      | The marketing site, with the Terms and Privacy pages                        |
| `app.conducting.build`  | The web app, the API, the chat sockets, and the terminal                    |
| A hostname for machines | The GitHub webhooks, the agent tools, the runner, and the credential helper |
| The preview domain      | One random hostname for each open port preview, one level deep              |

The preview domain is a separate registrable domain, so preview code is
never same-site with the app (decision 6). The names of the machine
hostname and of the preview domain are not chosen yet.

## Flows

### Create a workspace

1. The user sends the first message of a new workspace. The Worker records
   the workspace, and its Durable Object keeps the message.
2. With the org's Boat key, the Worker asks Boat for a sandbox from the
   newest good org image. The sandbox gets the workspace token and the
   org's env vars, but no agent login.
3. The Durable Object pushes each start step to the open tabs.
4. The agent runner starts and connects to the Durable Object. The Durable
   Object sends it the waiting message.

### Chat

1. A tab sends a message to the Worker. The Durable Object forwards it to
   the agent runner, with the agent login of its sender.
2. The runner gives it to the agent through the SDK. It numbers each agent
   event and sends it to the Durable Object.
3. The Durable Object stores each event, confirms it to the runner, and
   pushes it to every open tab of the workspace.

### Terminal, previews, and desktop

- The terminal socket goes from the browser to the Worker on
  `app.conducting.build`. The Worker connects it to the private terminal
  port.
- A preview frame loads its preview hostname. The Worker proxies the
  request to the private port of the sandbox.
- The Worker asks Boat for a short-lived desktop URL, and the browser
  shows Boat's desktop stream.

### GitHub events

- GitHub sends pull request, check, status, and push webhooks. The Worker
  routes each event to the workspace of its branch.
- A push to the default branch of a chosen repository can also start a
  refresh of the org image.

### Stops

- The Durable Object stops a sandbox when the stop rule of
  [Workspaces and sandboxes](protocol/workspaces-and-sandboxes.md#stop-and-resume)
  says so.
- Near day 14 of a stop, the app starts the sandbox briefly and stops it
  again, so that Boat keeps its disk (decision 43).

## Where data lives

| Data                                                     | Home                                     |
| -------------------------------------------------------- | ---------------------------------------- |
| Users, orgs, members, sections, workspaces, and settings | D1                                       |
| Boat keys, env var values, and agent logins              | The Worker's storage, encrypted          |
| Chat history and banner state                            | The workspace Durable Object             |
| The repository, the files, and the agent sessions        | The home folder of the sandbox           |
| The prepared repositories and the installed software     | The org image, in the org's Boat account |
| Panel widths                                             | The browser                              |

## Trust boundaries

- The org is the boundary between tenants. A request reaches an org only
  for a member of that org.
- A Boat key reaches only the sandboxes of its own org. It never goes into
  a sandbox or to the browser.
- Sandbox code is untrusted. Agents write and run it, and previews show it
  only on the preview domain.
- A sandbox gets none of the secrets of its Boat account. At a start, it
  gets only the secrets of its workspace and its org.
- During a turn, the sandbox also holds the agent login of the sender. The
  members of one org can reach that login, as
  [Access and security](protocol/access-and-security.md#agent-logins-in-a-sandbox)
  says.

## Decision numbers

A decision number, such as decision 36, names the dated record of one
decision. The plan of the change that wrote these docs keeps the records
while the change is open. The pull request of that change keeps them after
the merge.

## Protocol docs

- [Workspaces and sandboxes](protocol/workspaces-and-sandboxes.md): the org
  image, the life of a workspace, and the tools of a workspace.
- [Chat and events](protocol/chat-and-events.md): sessions, messages, the
  agent runner, and the events.
- [Access and security](protocol/access-and-security.md): sign-in, the
  gates, the secrets, and the isolation of sandboxes and previews.
- [GitHub banner](protocol/github-banner.md): the pull request bar and its
  events.
- [Agent tools](protocol/agent-tools.md): the tools that agents use in a
  sandbox.
- [Orgs and members](protocol/orgs-and-members.md): orgs, Boat keys,
  sections, roles, and the end of an org.
