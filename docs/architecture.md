# Architecture

Conductive is a coding tool at `conductive.build`. Each workspace has its
own cloud computer, a sandbox on Boat or E2B, and one branch at a time. It
can hold one task after another. Agents powered by Claude and Codex work
only in the sandbox. The user follows them in the browser or in the Mac
app, which shows the web app. Automations also start agents without a
person, each run in a new workspace. This doc describes the components, their
responsibilities, and the boundaries between them. The
[protocol docs](architecture/protocol-docs.md) hold the requirements of
each feature.

## Terms

- **Org:** a group of people that owns workspaces, sections,
  repositories, and an org image.
- **Admin** and **member:** the two roles in an org. Each person in an org
  has one of them.
- **Operator:** the person who runs the app, as opposed to the admin of an
  org. Only an operator can suspend a user or an org, lift a suspension,
  or switch an org to another provider account. Only an operator opens
  the operator section.
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
- **Workspace:** the work of an org on one repository and one task at a
  time. It has one sandbox, one or more sessions, and one repository and
  one branch at a time. After a merge, Continue moves it on to its next
  task. A repository change moves it to another repository of the org.
- **Workspace owner:** the person who is responsible for a workspace. It is
  the person who created the workspace, until an admin reassigns it.
- **Sub-workspace:** a workspace nested under another workspace, its
  parent workspace. An agent creates it under that parent, or moves it
  there later. The workspace list shows it under the row of its parent, as
  [Sub-workspaces](protocol/sub-workspaces.md) says.
- **Parent workspace:** the workspace that a sub-workspace is nested
  under. The docs also call it the parent. A workspace has at most one
  parent workspace.
- **Continue:** the action after a merge that moves a workspace to a new
  branch. The new branch starts from the branch that the pull request
  merged into, or from the default branch when GitHub no longer has that
  branch. The workspace keeps its sandbox and its sessions.
- **Repository change:** the action that moves a workspace to a new branch
  of another repository of its org, in the folder of that repository in
  its sandbox. The workspace keeps its sandbox and its sessions.
- **Local work:** work in the sandbox of a workspace that GitHub does not
  have: changed files that are not committed, also untracked files, and
  commits that no remote branch holds.
- **Sender:** the person who sent the message of a turn. The GitHub token
  and the Mac requests of the turn belong to its sender. The turn runs on
  the login of its session, which can belong to another member or to the
  org. A turn that a late answer to a secret request starts has the sender
  of the turn that asked, as
  [Late answers](protocol/secret-requests.md#late-answers) says. A turn
  that the wake of a watch starts has the sender of the turn that set the
  watch, as [Delivery](protocol/session-watches.md#delivery) says.
- **Starter:** the member who started a session. The starter of a session
  never changes.
- **Agent login:** the key, the token, the sign-in, or the own endpoint
  that the turns of an agent run on. It is a personal login or an org
  login.
- **Personal login:** an agent login that a member connects on the account
  page. It serves all of the orgs of that member.
- **Org login:** an API key or an own endpoint that an admin connects for
  one agent of an org. It serves the members of that org.
- **Login of a session:** the agent login that each turn of a session runs
  on: the personal login of its starter, or the org login.
- **Default login:** the agent login that a new session of a member takes,
  as [The default login](protocol/org-logins.md#the-default-login) says.
- **Provider account:** an account of the app with a sandbox provider:
  `boat` with Boat, or `e2b` with E2B. Each org runs in one provider
  account at a time, the account of the org. Each workspace keeps the
  account that it started on. The Worker holds the credentials of each
  account, and reaches it through its own client.
- **Boat key** and **E2B key:** the one key of the app's account with Boat
  or with E2B. Each key reaches every sandbox and every org image of the
  orgs on its account. Each is a Worker secret.
- **Weights:** the chance, in percent, that a new org gets each provider
  account. An operator sets them.
- **Switch:** the change of the provider account of one org by an
  operator. Its switch build builds the org image on the new account, and
  members do not see that build. New workspaces of the org start on the
  new account when that build succeeds, as
  [Switch account](protocol/switch-account.md) says.
- **Sandbox:** the cloud computer of one workspace, on Boat or on E2B. The
  product calls it a cloud computer or a sandbox.
- **Org image:** the saved snapshot that every new sandbox of an org starts
  from. It holds a prepared copy of each repository that the org chose
  when the build of the image began.
- **Build:** a run of the install script on a copy of the org image. A
  build also installs the newest release of the sandbox software. An org
  without an org image builds on a copy of the software image of its
  account, or else on the base image of that account. A build replaces the
  org image only when it succeeds.
- **Software image:** the saved snapshot of the base image with the app's
  own software, and no org data. Each deploy run builds the one of its
  version in the `boat` account. A build of an org on that account without
  an org image starts from it.
- **Refresh:** an update of the org image that fetches the new commits of
  each repository that the org image holds. It does not run the install
  script.
- **Sandbox software:** the app's own software in each sandbox. It is the
  program `conductive` and the parts that the program installs. Each deploy
  from `main` publishes a release of it. Each sandbox updates it by itself,
  as [Sandbox software](protocol/sandbox-software.md) says.
- **Agent runner:** the part of the sandbox software that runs the agents.
  It runs them through the agent SDKs, and it reports the files, the
  changes, and the listening ports of its workspace. Its file server
  serves the files of the repository for the preview of an HTML file.
- **Session:** one agent conversation in a workspace. It shows as a tab.
- **Turn:** the work of the agent on a message, from the message to the
  end of the agent's reply. A Claude turn stays open after that reply
  while its background work runs, up to a time limit, as
  [Background work](protocol/agent-runner.md#background-work) says.
- **Background work:** the tasks that a Claude agent runs in the
  background, such as a command or a subagent, and the wake-ups that it
  schedules. A wake-up is a prompt for the agent at a later time.
- **Workspace token:** a secret of one workspace. Its sandbox uses the
  token to call the Worker.
- **Secret:** a named value of an org that agents use in one command at a
  time, after a member allows it. It is not an env var.
  [Secrets](protocol/secrets.md) states the secrets.
- **Preview hostname:** a random hostname on the preview domain. It shows
  one port of one sandbox.
- **Start:** each create or resume of a sandbox, also the sandbox of a
  build, a refresh, or a software image build. Each provider account of
  the app limits the starts of its orgs.
- **Plan:** what an org pays for each month, with the cloud hours that it
  includes: Free, Plus, Pro, or Ultra. [Pricing](protocol/pricing.md)
  states the plans. Billing has not started, so no org has a plan yet.
- **Cloud hour:** one hour of one cloud computer that runs. Each plan
  includes a number of cloud hours each month.

- **Automation:** a saved prompt of an org that runs an agent without a
  person. A schedule, a GitHub pull request event, or Run now starts each
  run. Each run creates a new workspace, the run workspace.
- **Automation owner:** the member in whose name the runs of an automation
  act. The runs use the GitHub access and the default login of that member.
  It is the member who created the automation, until that member leaves the
  org.
- **Base branch:** the branch that the work of a workspace targets. Changes
  compares with it, and "Create PR" opens into it.
- **Start branch:** the branch whose newest commit a new workspace branch
  starts from. It is the default branch of the repository, unless the
  create names another branch.
- **Merge queue:** the ordered list of the queued workspaces of one
  repository of an org. The app uses GitHub stacks to merge their pull
  requests into the default branch, as
  [Merge queue](protocol/merge-queue.md) says.

## Components

The [components page](architecture/components.md) describes each
component and its responsibilities. It covers the apps, the Worker and
its storage, the sandbox providers, the sandbox software, and the external
services. The [sandbox software page](architecture/sandbox-software.md)
describes the two programs in each sandbox, their releases, and their
updates.

## Hostnames

| Hostname                  | What it serves                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `conductive.build`        | The marketing site, with the public docs and the pricing, Terms, and Privacy pages                                                         |
| `app.conductive.build`    | The web app, the API, the chat sockets, and the terminal                                                                                   |
| `api.conductive.build`    | The GitHub webhooks, the agent tools, the runner, the credential helper, the model gateway, the software image route of the deploy run, and the attachment downloads |
| `*.conductive.page`       | One random hostname for each open port preview and for the files preview of each workspace, one level deep                                 |
| `runner.conductive.build` | The public files of each [release](protocol/sandbox-software.md#releases) of the sandbox software, from an R2 bucket                       |

`api.conductive.build` is the hostname for machines. Each of its routes has
a path under `/v1/` (decision 102). The preview domain, `conductive.page`,
is a separate registrable domain, so preview code is never same-site with
the app (decision 6).

## Flows

The [flows page](architecture/flows.md) describes how the components work
together for a new org, a switch of its account, a new workspace, chat, a
run with secrets, the terminal, previews, the desktop, GitHub events, a
merge, Continue, automation runs, and stops.

## Where data lives

The [data locations](architecture/data-and-trust.md#where-data-lives) give
where each kind of data lives.

## Trust boundaries

The [trust boundaries](architecture/data-and-trust.md#trust-boundaries)
separate the orgs, the provider keys, the model gateway, and the sandboxes.

## Decision numbers

A decision number, such as decision 36, names the dated record of one
decision. The plan of the change that made the decision keeps the record
while that change is open. The pull request of that change keeps the
record after the merge. The decisions of automations use the numbers from
501, so that each number names one record.

A decision of a later change carries the short name of that change, such
as gateway decision 6. The doc that cites it defines the name.

## Protocol docs

[Protocol docs](architecture/protocol-docs.md) lists each protocol doc
and what it covers.
