# Data and trust boundaries

This page gives where the data of the app lives, and the trust
boundaries between the components of the
[architecture doc](../architecture.md). It uses the terms of that doc. A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says.

## Where data lives

| Data                                                                         | Home                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------- |
| Users, orgs, members, sections, workspaces, settings, suspensions, and lifts | D1                                       |
| App access, the codes and their uses, the pause, and approval email states   | D1                                       |
| The org and the provider account of each sandbox and each saved snapshot     | D1                                       |
| The provider account of each org, and the weights of new orgs with each change | D1 |
| Env var values, agent logins, and the traffic token of each E2B sandbox | The Worker's storage, encrypted |
| The Boat key, the E2B key, and the other keys of the Worker | Worker secrets |
| Chat history and banner state                                                | The workspace Durable Object             |
| Files attached to chat messages | The attachment storage, an R2 bucket |
| The records of attached files | D1 |
| The repository, the files, and the agent sessions                            | The home folder of the sandbox           |
| The prepared repositories and the installed software | The org image, in the provider account of the org |
| Panel widths                                                                 | The browser, or the Mac app              |

## Trust boundaries

- The org is the boundary between tenants. A request reaches an org only
  for a member of that org. An operator is the one exception, as
  [Orgs and workspaces](../protocol/isolation.md#orgs-and-workspaces)
  says.
- The key of each provider account reaches the sandboxes and the saved
  snapshots of every org on that account (decision 80). So the Worker's own
  records keep the orgs apart, as
  [Access and security](../protocol/isolation.md#orgs-and-workspaces)
  says.
- No provider key goes to the browser, into a sandbox, into a log, or into
  a saved snapshot.
- The port credential of a sandbox, such as its E2B traffic token, stays
  on the server. The proxies add it, and the browser never gets it.
- Sandbox code is untrusted. Agents write and run it, and previews show it
  only on the preview domain.
- A sandbox gets none of the secrets of the app's provider accounts. At a
  start, it gets only the secrets of its workspace and its org.
- For a sandbox with a version pin of 2 or later, the model gateway is the
  boundary between the sandbox and the model providers. The version pin of
  a sandbox is the lowest runner protocol version that its workspace
  accepts, as [The agent runner](../protocol/agent-runner.md#the-agent-runner)
  says. During a turn, such a sandbox holds a turn token, not an agent
  login. The token spends the login of the starter of its session only
  through the gateway, and only while the turn runs. The agent logins stay
  in the Worker.
- During a turn, a sandbox with a runner of protocol version 1 holds the
  agent login of the starter itself. A workspace with a version pin of 1
  accepts such a runner, also after a runner of version 2 or later
  connects. So a runner of version 2 or later does not put a sandbox with
  a version pin of 1 behind the boundary of the gateway.
- The members of one org can reach the turn token or the login in a
  sandbox, as
  [Access and security](../protocol/isolation.md#agent-logins-in-a-sandbox)
  says.
