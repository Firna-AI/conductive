# Components

This page describes each component of Conductive, its responsibilities, and
its boundaries. It uses the terms of the
[architecture doc](../architecture.md#terms). The [flows page](flows.md)
describes how the components work together. A decision number names a dated
record, as [Decision numbers](../architecture.md#decision-numbers) says. An
e2b decision number names a decision of the change that adds E2B as the second
[sandbox provider](../protocol/workspaces-and-sandboxes.md#the-provider), as that
doc says.

## Marketing site

The [marketing site page](marketing-site.md) gives the responsibilities and boundaries of the public site.

## Web app

- A React app, built with Vite, that uses the `@firna/ui` components.
- It lives on `app.conductive.build`, behind the GitHub sign-in.
- It shows the orgs, the workspaces, the routines, the chat, the files, the tools, and
  the org settings. It follows the phone and the desktop layouts of the
  [mockups](../mockups/README.md) (decision 15).
- For an operator, it also shows the operator section at `/operator`. The
  section gives counts across every org. It finds any org or user, and it
  suspends or lifts it. It also approves people who wait, makes and
  disables codes, pauses sign-ups, and sets the weights of new orgs.
  [Operator section](../protocol/operator-section.md) states its rules.
- Tabs are links, so each tool and each file view has its own address.
- The browser stores only the panel widths. All other state comes from
  the Worker. A tab keeps the chats that it showed in memory, as
  [Chat and events](../protocol/chat-and-events.md#events) says.

## Mac app

- An Electron shell for macOS, as [Mac app](../protocol/desktop-app.md) says.
- Its packages and updates come from the GitHub releases of the public source repository, as
  [Packages and updates](../protocol/desktop-packages-and-updates.md) says.

## Worker

- One Cloudflare Worker serves the web app, the marketing site, the API,
  the proxies to sandboxes, and the GitHub webhook endpoint.
- It holds the GitHub App key, the Boat key, the E2B key, the key that
  signs the session cookies, and the key that encrypts the stored secrets.
  The browser never holds them.
- It runs the model gateway. The gateway takes the model requests of the
  agent programs in a sandbox, with the
  [turn token](../protocol/model-gateway.md#terms) of their turn. It adds the
  agent login of the turn, and forwards each request to Anthropic or
  OpenAI. [Model gateway](../protocol/model-gateway.md) states its rules.
- It reaches each provider through its own provider client, for Boat and
  for E2B. It calls only a fixed list of routes of each provider.
- It calls each sandbox and each saved snapshot through the client of its
  provider account. It takes that account from its own records, as it
  takes the sandbox or the saved snapshot.
- It sets the provider account of each new org once, from the choice of an
  operator or from a draw by the weights.
- It runs one gate for each hostname before every route and every
  WebSocket upgrade. [Access and security](../protocol/access-and-security.md)
  states the gates.

- Two Cron Triggers run the timed work. One runs every 15 minutes for
  deleted orgs, lifecycle repairs, and pending approval emails. One runs
  every minute for due routine runs and runs that stayed queued.

## D1

- D1 holds the records of the app: users, orgs, members, sections,
  repositories, workspaces, routines and their runs, settings, the active preview hostnames, and the
  records of attached files. D1 also holds app access, codes and their uses,
  the sign-up pause, and the state of approval emails.
- D1 also holds the provider account of each org, and the weights of new
  orgs with the record of each change.
- Boat labels alone cannot hold these records, because a label is fixed
  after a create or a fork.

## Workspace Durable Object

- One Durable Object for each workspace. It runs in Western Europe, near
  Boat's machines and E2B's EU cluster.
- It holds the open tabs, the connection of the agent runner, and the
  messages that wait for the sandbox.
- It gives each turn its turn token. For each model request, it tells the
  model gateway whether the token still works and which login the turn
  uses.
- It also holds the start steps, the stop timer, the delete timer of an
  archived workspace, and the banner state.
- For each start, it keeps the provider account with the org image and the
  sandbox. So the start continues after a restart.
- Its storage keeps the chat history, so a stopped or archived workspace
  still shows its chat.
- It revokes the preview hostnames of its workspace.

## Attachment storage

- One R2 bucket holds the bytes of the files that users attach to chat
  messages, and D1 holds their records (decision 132). The bucket holds the
  files of every org, so the Worker's own records keep the orgs apart, as
  [Access and security](../protocol/isolation.md#orgs-and-workspaces)
  says.
- Only the Worker reads and writes the bucket. The browser sends each file
  as raw bytes in one request, and the Worker streams it into the bucket
  (decision 144).
- Before the agent runner gets a message, the Worker copies the files of
  the message into the sandbox. On Boat, it uses an upload address that
  Boat gives for each file. On E2B, it uses a fixed file route of the
  sandbox.
- [Chat and events](../protocol/messages-and-attachments.md#attachments) states how
  long a file stays.

## Sandbox providers

- Boat and E2B run the sandboxes and keep the saved snapshots
  (decision 2, and e2b decision 222). The app has one account with each.
- Boat was the first choice (decision 2). Sprites on Fly.io was the other
  option. Boat costs less, and it already has forks, saved snapshots, port
  URLs, desktop streams, and environments.
- E2B is the second provider, so that a Boat outage does not stop every
  org (e2b decision 222).
- Each org runs in one provider account for its whole life (decision 80,
  and e2b decision 222). That account holds the org image and every sandbox
  of the org.
  Its plan limits apply to its orgs together.
- A new org gets its account from the choice of an operator or from the
  weights. No org moves to another account.
- The records name the account of each org, each sandbox, and each saved
  snapshot.
- The app does not depend on provider webhooks. The agent runner reports
  when a sandbox is ready. The Worker reads the state of a sandbox from the
  API of its provider when it needs it.
- A stop ends every process. Each provider keeps the disk and the enabled
  system services, and starts those services again after each resume.
- E2B runs in its EU cluster, in an E2B project that holds only the app's
  work. Each E2B sandbox has private traffic.
- On E2B, the agents get no computer tools for now (e2b decision 216), and a
  sandbox has no desktop stream.

## Sandbox software

Every org image holds the app's own sandbox software:

- the agent runner, a Node program that runs as an always-on service
- the terminal service, on a private port
- the preview relay, on a private port
- the agent tools: an MCP server and a CLI that create and list workspaces
- a git credential helper that gets a fresh GitHub token for each git
  operation

The Worker builds one software image for each version of this software,
in the `boat` account, when the deploy run asks. The software image holds
the base image and this software, and no org data. A build of an org on
`boat` without an org image starts from it, so that build installs none of
this software. A first build of an org on another account, such as `e2b`,
starts from the base image of that account, and installs this software.

The agent runner runs Claude through the Claude Agent SDK, with the agent
program that the SDK bundles at its own version. A pinned version guards
against a change in how the agent program reads its credential and its
model address. The runner runs Codex through the Codex SDK or the Codex
App Server (decision 36).

The runner finds the listening ports in the sandbox itself, with no Boat
call (decision 220).

A runner of protocol version 2 or later makes both agent programs send
their model requests to the [model gateway](../protocol/model-gateway.md). It
gives each agent program the turn token of its turn, and no agent login. A
settings file in the repository can send the requests of Claude to another
address, as
[How the agents reach the gateway](../protocol/model-gateway.md#how-the-agents-reach-the-gateway)
says. A runner of protocol version 1 gives the agent programs the agent
login itself. Each sandbox keeps the runner of the org image that it starts
from.

The preview relay forwards each preview request to a local port of the
sandbox. The previewed server then gets its local address as `Host`
(decision 218).
[Terminal, previews, and desktop](../protocol/terminal-previews-and-desktop.md#port-previews)
states the rules of the relay.

The Worker gives each sandbox the commit author of its workspace owner.
The agent runner gives each agent the commit author of the sender of its
turn. [Commit author](../protocol/github-tokens.md#commit-author) states
the rules.

## External services

- **GitHub App:** one app gives the sign-in, the repository access, and the
  webhooks of every org.
- **Anthropic and OpenAI:** the model use of each turn bills to the own
  Claude or OpenAI account of the starter of its session. With a runner of
  protocol version 2 or later, the model requests of a turn reach them
  through the model gateway of the Worker. A settings file in the
  repository can send the requests of Claude to another address instead.
  The gateway keeps no copy of a request or an answer. With a runner of
  version 1, the agent programs send their model requests from the sandbox
  to the provider.
- **Workers AI:** the Cloudflare model service writes a title for a
  workspace that has no name, from its first message. Its use bills to the
  Cloudflare account of the app (decision 184).
- **Boat and E2B:** the app's accounts with them pay for every sandbox and
  every saved snapshot. Use of the app is free until billing starts, as
  [Pricing](../protocol/pricing.md) says.
