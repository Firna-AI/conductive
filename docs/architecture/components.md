# Components

This page describes each component of Conductive, its responsibilities, and
its boundaries. It uses the terms of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says.

## Marketing site

The [marketing site page](marketing-site.md) gives the responsibilities and boundaries of the public site.

## Web app

- A React app, built with Vite, that uses the `@firna/ui` components.
- It lives on `app.conductive.build`, behind the GitHub sign-in.
- It shows the orgs, the workspaces, the chat, the files, the tools, and
  the org settings. It follows the phone and the desktop layouts of the
  [mockups](../mockups/README.md) (decision 15).
- For an operator, it also shows the operator section at `/operator`. The
  section gives counts across every org. It finds any org or user, and it
  suspends or lifts it. It also approves people who wait, makes and
  disables codes, and pauses sign-ups.
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
- It holds the GitHub App key, the Boat key, the key that signs the session
  cookies, and the key that encrypts the stored secrets. The browser never
  holds them.
- It reaches Boat through one provider adapter, so that a later change can
  add another provider. It calls only a fixed list of Boat routes.
- It calls each sandbox and each saved snapshot through the client of its
  provider account. It takes that account from its own records, as it
  takes the sandbox or the saved snapshot.
- It runs one gate for each hostname before every route and every
  WebSocket upgrade. [Access and security](../protocol/access-and-security.md)
  states the gates.

## D1

- D1 holds the records of the app: users, orgs, members, sections,
  repositories, workspaces, settings, the active preview hostnames, and the
  records of attached files. D1 also holds app access, codes and their uses,
  the sign-up pause, and the state of approval emails.
- Boat labels alone cannot hold these records, because a label is fixed
  after a create or a fork.

## Workspace Durable Object

- One Durable Object for each workspace. It runs in Western Europe, near
  Boat's machines.
- It holds the open tabs, the connection of the agent runner, and the
  messages that wait for the sandbox.
- It also holds the start steps, the stop timer, and the banner state.
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
  the message into the sandbox, through an upload address that Boat gives
  for each file.
- [Chat and events](../protocol/messages-and-attachments.md#attachments) states how
  long a file stays.

## Boat

- Boat runs the sandboxes and keeps the saved snapshots (decision 2).
  Sprites on Fly.io was the other option. Boat costs less, and it already
  has forks, saved snapshots, port URLs, desktop streams, and environments.
- Every org runs in the app's Boat account (decision 80). That account
  holds every org image and every sandbox of every org. Its plan limits
  apply to all orgs together.
- Boat is the only provider for now, and the app's Boat account is the
  only provider account (decision 213). The records still name the account
  of each sandbox and saved snapshot. So a second provider can come later,
  and each existing one keeps working in its own account.
- The app does not depend on Boat webhooks. The agent runner reports when
  a sandbox is ready. The Worker reads the state of a sandbox from Boat's
  API when it needs it.
- A stop ends every process. Boat keeps the disk and the enabled system
  services, and restarts those services after each resume and fork.

## Sandbox software

Every org image holds the app's own sandbox software:

- the agent runner, a Node program that runs as an always-on service
- the terminal service, on a private port
- the agent tools: an MCP server and a CLI that create and list workspaces
- a git credential helper that gets a fresh GitHub token for each git
  operation

The agent runner runs Claude through the Claude Agent SDK, with the agent
program that the SDK bundles at its own version. A pinned version guards
against a change in how the agent program reads logins. The runner runs
Codex through the Codex SDK or the Codex App Server (decision 36). It finds
the listening ports in the sandbox itself, with no Boat call (decision 218).

## External services

- **GitHub App:** one app gives the sign-in, the repository access, and the
  webhooks of every org.
- **Anthropic and OpenAI:** the model use of each turn bills to the own
  Claude or OpenAI account of the starter of its session.
- **Workers AI:** the Cloudflare model service writes a title for a
  workspace that has no name, from its first message. Its use bills to the
  Cloudflare account of the app (decision 184).
- **Boat:** the app's Boat account pays for every sandbox and every saved
  snapshot. The app is free, with no limits (decision 81).
