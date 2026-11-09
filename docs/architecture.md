# Architecture

Conductive is a coding tool at `conductive.build`. Each workspace is one
task with its own branch and its own cloud computer, a Boat sandbox.
Agents powered by Claude and Codex work only in the sandbox. The user
follows them in the browser or in the Mac app, which shows the web app.
This doc describes the components, their responsibilities, and the
boundaries between them. The [protocol docs](architecture/protocol-docs.md)
hold the requirements of each feature.

## Terms

- **Org:** a group of people that owns workspaces, sections,
  repositories, and an org image.
- **Admin** and **member:** the two roles in an org. Each person in an org
  has one of them.
- **Operator:** the person who runs the app, as opposed to the admin of an
  org. Only an operator can suspend a user or an org, or lift a
  suspension. Only an operator opens the operator section.
- **Suspension:** the block of one user or one org by an operator, until
  an operator lifts it. It stops the sandboxes of the workspaces that the
  user owns, or of every workspace of the org, and blocks new starts. A
  user suspension also ends the sign-in sessions of the user.
- **Workspace:** one task in an org. It has one repository, one branch,
  one sandbox, and one or more sessions.
- **Workspace owner:** the person who is responsible for a workspace. It is
  the person who created the workspace, until an admin reassigns it.
- **Sender:** the person who sent the message of a turn. The GitHub token
  and the Mac requests of the turn belong to its sender. The agent login
  belongs to the starter of the session, the member who started it.
- **Boat key:** the one key of the app's own Boat account, where every
  sandbox and every org image of every org runs. It is a Worker secret.
- **Sandbox:** the Boat sandbox of one workspace. The product calls it a
  cloud computer or a sandbox.
- **Org image:** the saved snapshot that every new sandbox of an org starts
  from. It holds a prepared copy of each repository that the org chose.
- **Build:** a run of the install script on a copy of the org image. It
  replaces the org image only when it succeeds.
- **Refresh:** an update of the org image that fetches the new commits of
  each chosen repository. It does not run the install script.
- **Agent runner:** our program in each sandbox. It runs the agents through
  the agent SDKs, and it reports the files and the changes of its
  workspace.
- **Session:** one agent conversation in a workspace. It shows as a tab.
- **Turn:** the work of the agent on a message, from the message to the
  result of the agent.
- **Workspace token:** a secret of one workspace. Its sandbox uses the
  token to call the Worker.
- **Preview hostname:** a random hostname on the preview domain. It shows
  one port of one sandbox.
- **Start:** each create or resume of a sandbox, also the sandbox of a
  build or a refresh. The app's Boat account limits the starts of all orgs.

## Components

### Marketing site

- Static pages at the root of `conductive.build`, with the public docs and
  the Terms and Privacy pages. Visitors see them without a sign-in.
- The public docs are guides to the product, at `/docs`. The team writes
  them in Markdown, and the site builds them with a docs layout of its own.
  [Website docs](protocol/website-docs.md) states their requirements.
- Astro builds these pages ahead of time. The Worker serves the built files
  on `conductive.build`. It fills in the values of each request, such as
  the app address in the sign-in links and the year in the footer.
- [The marketing site README](../src/marketing/README.md) describes how the
  Worker serves them.
- The same build also makes the page that asks for the
  [agreement to the Terms](protocol/access-and-security.md#sign-in) before
  the GitHub sign-in. The Worker serves that page on `app.conductive.build`.
- The main action is "Start free with GitHub". The site does not name
  Boat, and users need no Boat account (decision 80).

### Web app

- A React app, built with Vite, that uses the `@firna/ui` components.
- It lives on `app.conductive.build`, behind the GitHub sign-in.
- It shows the orgs, the workspaces, the chat, the files, the tools, and
  the org settings. It follows the phone and the desktop layouts of the
  [mockups](mockups/README.md) (decision 15).
- For an operator, it also shows the operator section at `/operator`. The
  section gives counts across every org. It finds any org or user, and it
  suspends or lifts it.
  [Operator section](protocol/operator-section.md) states its rules.
- Tabs are links, so each tool and each file view has its own address.
- The browser stores only the panel widths. All other state comes from
  the Worker. A tab keeps the chats that it showed in memory, as
  [Chat and events](protocol/chat-and-events.md#events) says.

### Mac app

- An Electron shell for macOS, as [Mac app](protocol/desktop-app.md) says.

### Worker

- One Cloudflare Worker serves the web app, the marketing site, the API,
  the proxies to sandboxes, and the GitHub webhook endpoint.
- It holds the GitHub App key, the Boat key, the key that signs the session
  cookies, and the key that encrypts the stored secrets. The browser never
  holds them.
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
- Every org runs in the app's Boat account (decision 80). That account
  holds every org image and every sandbox of every org. Its plan limits
  apply to all orgs together.
- The app does not depend on Boat webhooks. The agent runner reports when
  a sandbox is ready. The Worker reads the state of a sandbox from Boat's
  API when it needs it.
- A stop ends every process. Boat keeps the disk and the enabled system
  services, and restarts those services after each resume and fork.

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
  Claude or OpenAI account of the starter of its session.
- **Workers AI:** the Cloudflare model service writes the title of each new
  workspace from its first message. Its use bills to the Cloudflare account
  of the app (decision 184).
- **Boat:** the app's Boat account pays for every sandbox and every saved
  snapshot. The app is free, with no limits (decision 81).

## Hostnames

| Hostname                | What it serves                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| `conductive.build`      | The marketing site, with the public docs and the Terms and Privacy pages    |
| `app.conductive.build`  | The web app, the API, the chat sockets, and the terminal                    |
| `api.conductive.build`  | The GitHub webhooks, the agent tools, the runner, and the credential helper |
| `*.conductive.page`     | One random hostname for each open port preview, one level deep              |

`api.conductive.build` is the hostname for machines. Each of its routes has
a path under `/v1/` (decision 102). The preview domain, `conductive.page`,
is a separate registrable domain, so preview code is never same-site with
the app (decision 6).

## Flows

The [flows page](architecture/flows.md) describes how the components work
together for a new workspace, chat, the terminal, previews, the desktop,
GitHub events, and stops.

## Where data lives

| Data                                                                         | Home                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------- |
| Users, orgs, members, sections, workspaces, settings, suspensions, and lifts | D1                                       |
| The org of each sandbox and each saved snapshot                              | D1                                       |
| Env var values and agent logins                                              | The Worker's storage, encrypted          |
| The Boat key and the other keys of the Worker                                | Worker secrets                           |
| Chat history and banner state                                                | The workspace Durable Object             |
| The repository, the files, and the agent sessions                            | The home folder of the sandbox           |
| The prepared repositories and the installed software                         | The org image, in the app's Boat account |
| Panel widths                                                                 | The browser, or the Mac app              |

## Trust boundaries

- The org is the boundary between tenants. A request reaches an org only
  for a member of that org. An operator is the one exception, as
  [Orgs and workspaces](protocol/access-and-security.md#orgs-and-workspaces)
  says.
- The one Boat key reaches the sandboxes and the saved snapshots of every
  org (decision 80). So the Worker's own records keep the orgs apart, as
  [Access and security](protocol/access-and-security.md#orgs-and-workspaces)
  says.
- The Boat key never goes to the browser, into a sandbox, into a log, or
  into a saved snapshot.
- Sandbox code is untrusted. Agents write and run it, and previews show it
  only on the preview domain.
- A sandbox gets none of the secrets of the app's Boat account. At a
  start, it gets only the secrets of its workspace and its org.
- During a turn, the sandbox also holds the agent login of the starter of
  its session. The members of one org can reach that login, as
  [Access and security](protocol/access-and-security.md#agent-logins-in-a-sandbox)
  says.

## Decision numbers

A decision number, such as decision 36, names the dated record of one
decision. The plan of the change that wrote these docs keeps the records
while the change is open. The pull request of that change keeps them after
the merge.

## Protocol docs

[Protocol docs](architecture/protocol-docs.md) lists each protocol doc
and what it covers.
