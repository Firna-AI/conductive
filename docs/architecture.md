# Architecture

Conductive is a coding tool at `conductive.build`. Each workspace is one
task with its own branch and its own cloud computer, a Boat sandbox.
Agents powered by Claude and Codex work only in the sandbox. The user
follows them in the browser or in the Mac app, which shows the web app.
This doc describes the components, their responsibilities, and the
boundaries between them. The [protocol docs](#protocol-docs) hold the
requirements of each feature.

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

The [components page](architecture/components.md) describes each
component and its responsibilities. It covers the apps, the Worker and
its storage, Boat, the sandbox software, and the external services.

## Hostnames

| Hostname                | What it serves                                                              |
| ----------------------- | --------------------------------------------------------------------------- |
| `conductive.build`      | The marketing site, with the Terms and Privacy pages                        |
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
| Files attached to chat messages                                              | The attachment storage, an R2 bucket     |
| The records of attached files                                                | D1                                       |
| The repository, the files, and the agent sessions                            | The home folder of the sandbox           |
| The prepared repositories and the installed software                         | The org image, in the app's Boat account |
| Panel widths                                                                 | The browser, or the Mac app              |

## Trust boundaries

- The org is the boundary between tenants. A request reaches an org only
  for a member of that org. An operator is the one exception, as
  [Orgs and workspaces](protocol/isolation.md#orgs-and-workspaces)
  says.
- The one Boat key reaches the sandboxes and the saved snapshots of every
  org (decision 80). So the Worker's own records keep the orgs apart, as
  [Access and security](protocol/isolation.md#orgs-and-workspaces)
  says.
- The Boat key never goes to the browser, into a sandbox, into a log, or
  into a saved snapshot.
- Sandbox code is untrusted. Agents write and run it, and previews show it
  only on the preview domain.
- A sandbox gets none of the secrets of the app's Boat account. At a
  start, it gets only the secrets of its workspace and its org.
- During a turn, the sandbox also holds the agent login of the starter of
  its session. The members of one org can reach that login, as
  [Access and security](protocol/isolation.md#agent-logins-in-a-sandbox)
  says.

## Decision numbers

A decision number, such as decision 36, names the dated record of one
decision. The plan of the change that wrote these docs keeps the records
while the change is open. The pull request of that change keeps them after
the merge.

## Protocol docs

- [Workspaces and sandboxes](protocol/workspaces-and-sandboxes.md): the org
  image, the life of a workspace, and the tools of a workspace.
  - [Create a workspace](protocol/create-a-workspace.md): New workspace as a
    page or as a dialog, the create, the branch, and a failed first start.
  - [Repository folders](protocol/repository-folders.md): the folder and the
    shell variable of each repository in a sandbox.
  - [Life of a workspace](protocol/workspace-life.md)
  - [Tools of a workspace](protocol/workspace-tools.md)
- [Chat and events](protocol/chat-and-events.md): sessions, messages, what
  the chat shows, and the events.
  - [Messages and attachments](protocol/messages-and-attachments.md)
  - [Agent runner](protocol/agent-runner.md): the connection of the runner,
    its events and their limits, its turns, and the repair of lost workspace
    updates.
- [Access and security](protocol/access-and-security.md): sign-in, the
  gates, the secrets, and the isolation of sandboxes and previews.
  - [Isolation of orgs and sandboxes](protocol/isolation.md)
  - [Tokens and secrets](protocol/tokens-and-secrets.md)
  - [Terminal, previews, and desktop](protocol/terminal-previews-and-desktop.md)
- [GitHub banner](protocol/github-banner.md): the pull request bar and its
  events.
- [Agent tools](protocol/agent-tools.md): the tools that agents use in a
  sandbox.
- [Orgs and members](protocol/orgs-and-members.md): orgs, sections,
  roles, the first run, and the end of an org.
- [Mac app](protocol/desktop-app.md): the shell for macOS, its sign-in, and
  Mac commands.
  - [Mac app sign-in](protocol/desktop-sign-in.md)
  - [Permissions and Mac commands](protocol/desktop-commands.md)
- [Operator actions](protocol/operator-actions.md): the operator, the
  suspension of a user or an org, the lift of a suspension, and abuse
  reports.
- [Operator section](protocol/operator-section.md): the pages of the
  operator in the web app, their counts, and their searches.
- [Command palette](protocol/command-palette.md): the key and the search
  that finds the workspaces, the actions, and the settings.
- [Command palette: empty and unavailable states](protocol/command-palette-states.md):
  what the palette shows while its workspace data loads or did not load,
  and when a tab or a search has no row.
