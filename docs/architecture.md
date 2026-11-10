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
- **App access:** the right of a user to use the app: to create or join an
  org, and to start cloud computers. A new account starts without it,
  except during open sign-up.
- **Waitlist:** the users without app access. Each of them sees only the
  waitlist screen until an approval, a code, an org invitation, or open
  sign-up gives app access. The waitlist switch of the operator section
  turns the waitlist off and on.
- **Open sign-up:** the state while the waitlist is off and sign-ups are
  not paused. Each user without app access then gets it at their next
  sign-in or request.
- **Invite code:** a code that an operator makes, with a use limit. Each
  use gives app access to one person who waits.
- **Referral code:** the personal code of each user with app access. It
  gives app access to up to 5 people who wait. The screens of users call
  it an invite code.
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
| `conductive.build`      | The marketing site, with the Terms, Privacy, and comparison pages                        |
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

The [data locations](architecture/data-and-trust.md#where-data-lives) give
where each kind of data lives.

## Trust boundaries

The [trust boundaries](architecture/data-and-trust.md#trust-boundaries)
separate the orgs, the Boat key, and the sandboxes.

## Decision numbers

A decision number, such as decision 36, names the dated record of one
decision. The plan of the change that wrote these docs keeps the records
while the change is open. The pull request of that change keeps them after
the merge.

## Protocol docs

- [Workspaces and sandboxes](protocol/workspaces-and-sandboxes.md): the org
  image and the life of a workspace.
  - [Create a workspace](protocol/create-a-workspace.md): New workspace as a
    page or as a dialog, the create, the branch, and a failed first start.
  - [Repository folders](protocol/repository-folders.md): the folder and the
    shell variable of each repository in a sandbox.
  - [Life of a workspace](protocol/workspace-life.md)
  - [Workspace tools](protocol/workspace-tools.md)
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
  - [Mac packages and updates](protocol/desktop-packages-and-updates.md)
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

- [Org image](protocol/org-image.md): the org image, its builds and its
  refreshes, and the first build of a new org.

- [Agents and sessions](protocol/agents-and-sessions.md): the agents and
  their logins, the sessions, and the names of workspaces and sessions.

- [Workspace links](protocol/workspace-links.md): Copy link, and the chips
  that show workspace links in chat.

- [Chat Markdown](protocol/chat-markdown.md): the formatting of agent
  messages in the chat, with their tables.

- [GitHub tokens](protocol/github-tokens.md): git and CLI account scope.

- [Agent instructions](protocol/agent-instructions.md): the text that each
  agent session gets, the sender line of each message, and the base
  prompt of Claude agents.

- [Waitlist](protocol/waitlist.md): app access, the waitlist screen, the
  ways in, the approval email, and the record of app access.

- [Invite and referral codes](protocol/waitlist-codes.md): the codes of
  the waitlist, the join link, and the use of a code.

- [Sign-ups](protocol/sign-ups.md): the pause, the waitlist switch, open
  sign-up, and the main action of the marketing site.

- [Conductor Cloud comparison](protocol/conductor-cloud-comparison.md): the
  public page with the status of each Conductor Cloud feature.
