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
- **App access:** the right of a user to use the app: to create or join an
  org, and to start cloud computers. A new account starts without it.
- **Waitlist:** the users without app access. Each of them sees only the
  waitlist screen until an approval, a code, or an org invitation gives
  app access.
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
- **Provider account:** an account with a sandbox provider. The Worker
  holds its credentials, and reaches it through its own client.
- **Sandbox:** the Boat sandbox of one workspace. The product calls it a
  cloud computer or a sandbox.
- **Org image:** the saved snapshot that every new sandbox of an org starts
  from. It holds a prepared copy of each repository that the org chose.
- **Build:** a run of the install script on a copy of the org image. An org
  without an org image builds on a copy of the software image. A build
  replaces the org image only when it succeeds.
- **Software image:** the saved snapshot of the base image with the app's
  own software, and no org data. Each deploy run builds the one of its
  version, and a build of an org without an org image starts from it.
- **Refresh:** an update of the org image that fetches the new commits of
  each chosen repository. It does not run the install script.
- **Agent runner:** our program in each sandbox. It runs the agents through
  the agent SDKs, and it reports the files, the changes, and the listening
  ports of its workspace.
- **Session:** one agent conversation in a workspace. It shows as a tab.
- **Turn:** the work of the agent on a message, from the message to the
  result of the agent.
- **Workspace token:** a secret of one workspace. Its sandbox uses the
  token to call the Worker.
- **Preview hostname:** a random hostname on the preview domain. It shows
  one port of one sandbox.
- **Start:** each create or resume of a sandbox, also the sandbox of a
  build, a refresh, or a software image build. The app's Boat account
  limits the starts of all orgs.
- **Plan:** what an org pays for each month, with the cloud hours that it
  includes: Free, Plus, Pro, or Ultra. [Pricing](protocol/pricing.md)
  states the plans. Billing has not started, so no org has a plan yet.
- **Cloud hour:** one hour of one cloud computer that runs. Each plan
  includes a number of cloud hours each month.

## Components

The [components page](architecture/components.md) describes each
component and its responsibilities. It covers the apps, the Worker and
its storage, Boat, the sandbox software, and the external services.

## Hostnames

| Hostname               | What it serves                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `conductive.build`     | The marketing site, with the public docs and the pricing, Terms, Privacy, and comparison pages                                             |
| `app.conductive.build` | The web app, the API, the chat sockets, and the terminal                                                                                   |
| `api.conductive.build` | The GitHub webhooks, the agent tools, the runner, the credential helper, the model gateway, and the software image route of the deploy run |
| `*.conductive.page`    | One random hostname for each open port preview, one level deep                                                                             |

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
separate the orgs, the Boat key, the model gateway, and the sandboxes.

## Decision numbers

A decision number, such as decision 36, names the dated record of one
decision. The plan of the change that wrote these docs keeps the records
while the change is open. The pull request of that change keeps them after
the merge.

A decision of a later change carries the short name of that change, such
as gateway decision 6. The doc that cites it defines the name.

## Protocol docs

[Protocol docs](architecture/protocol-docs.md) lists each protocol doc
and what it covers.
