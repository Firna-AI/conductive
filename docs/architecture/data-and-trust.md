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
| App access, the codes and their uses, and approval email states              | D1                                       |
| The pause and the waitlist switch                                            | D1                                       |
| The org and the provider account of each sandbox and each saved snapshot     | D1                                       |
| Env var values and agent logins                                              | The Worker's storage, encrypted          |
| The Boat key and the other keys of the Worker                                | Worker secrets                           |
| Chat history and banner state                                                | The workspace Durable Object             |
| Files attached to chat messages | The attachment storage, an R2 bucket |
| The records of attached files | D1 |
| The repository, the files, and the agent sessions                            | The home folder of the sandbox           |
| The prepared repositories and the installed software                         | The org image, in the app's Boat account |
| Panel widths                                                                 | The browser, or the Mac app              |

## Trust boundaries

- The org is the boundary between tenants. A request reaches an org only
  for a member of that org. An operator is the one exception, as
  [Orgs and workspaces](../protocol/isolation.md#orgs-and-workspaces)
  says.
- The one Boat key reaches the sandboxes and the saved snapshots of every
  org (decision 80). So the Worker's own records keep the orgs apart, as
  [Access and security](../protocol/isolation.md#orgs-and-workspaces)
  says.
- The Boat key never goes to the browser, into a sandbox, into a log, or
  into a saved snapshot.
- Sandbox code is untrusted. Agents write and run it, and previews show it
  only on the preview domain.
- A sandbox gets none of the secrets of the app's Boat account. At a
  start, it gets only the secrets of its workspace and its org.
- During a turn, the sandbox also holds the agent login of the starter of
  its session. The members of one org can reach that login, as
  [Access and security](../protocol/isolation.md#agent-logins-in-a-sandbox)
  says.
