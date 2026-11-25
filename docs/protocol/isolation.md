# Isolation of orgs and sandboxes

This doc holds the requirements and the decisions in force for the isolation
of orgs and sandboxes. It covers the checks that keep the orgs apart, the
app's Boat and E2B keys, what a sandbox holds, and what its workspace tools
reach. Linked pages cover
[the agent logins in a sandbox](sandbox-logins.md),
[the share setting](share-setting.md) of a personal login, and
[the version pins](version-pins.md) with the risks of the turn token. It
belongs to [Access and security](access-and-security.md), which covers
sign-in, the gates of the Worker, the request bodies, and the content
security policy.
The terms are those of the [architecture doc](../architecture.md#terms). A
decision number names a dated record, as
[Decision numbers](../architecture.md#decision-numbers) says. A secrets
decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An e2b decision number names a
decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says.

## Orgs and workspaces

- The key of each provider account reaches the sandboxes and the saved
  snapshots of all orgs on that account (decision 80). So no key keeps the
  orgs apart. The checks in this section do.
- A request reaches an org, its workspaces, and their sandboxes only for a
  member of that org.
- An org login serves only the members of its org, in the workspaces of
  that org, as [Org logins](org-logins.md) says.
- The workspace token of a sandbox reaches the workspaces of its own org
  through the agent tools, as
  [What the workspace tools reach](#what-the-workspace-tools-reach) says.
- An operator is the one exception. An operator can suspend or lift any
  user or org, as [Operator actions](operator-actions.md) says. An
  operator can also switch any org to another provider account, as
  [Switch account](switch-account.md) says. In the
  [operator section](operator-section.md#what-the-section-shows), an
  operator also reads counts, names, IDs, dates, roles, states, and codes
  across every org (decisions 142, 144, 147, and 160). An operator also
  reads the provider account of each org (e2b decision 221).
- The operator section shows no chat, file, env value, agent login, or
  email address. Its org search takes the ID of a cloud computer or a
  preview address only to find its org.
- An open tab loses its workspace connection within 30 seconds after its
  user loses access: a removal from the org, a sign-out, or a deleted
  org (decision 70). The workspace checks the access of its open tabs
  again at most every 30 seconds, and closes each tab that fails. A
  [suspension](operator-actions.md#sessions-and-sign-in) of the user ends
  that access too.
- A runner connection gets no turn token after its workspace token is
  revoked. The workspace checks the token again before it sends each one.
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  states the checks of an open runner connection.
- No request names a sandbox or a saved snapshot. The Worker takes each
  one from its own records, and only from the records of an org that the
  request may reach.
- One R2 bucket holds the uploaded files of all orgs (decision 132). So the
  bucket does not keep the orgs apart. The checks in this section do.
- Only the Worker reads and writes that bucket. A cloud computer gets each
  file from a route of the Worker, as
  [The transfer](attachment-transfers.md#the-transfer) says.
- Each upload names one workspace, or the first message of a new workspace
  of one org (decision 132). Only a message of the uploader in that
  workspace, or that first message, can use the file.
- The Worker refuses a message or a create that names a file that it cannot
  use, with HTTP 404 and the error code `attachment_not_found`. A deleted
  file gets the same refusal.
- Before each sandbox call, the Worker checks in its records that the
  sandbox belongs to a workspace or a build of that org.
- The Worker calls only a fixed list of routes of each provider. It has
  no general pass-through to a provider.
- The Worker gives the token of an attachment download only to the sandbox
  that the workspace of the file names. The token gives only that one
  file, as [Hostnames and gates](access-and-security.md#hostnames-and-gates)
  says.
- Lifecycle, saved snapshot, file metadata, and error replies from a
  provider can contain at most 1 MiB, or 1,048,576 bytes (decision 84).
- A successful command reply from a provider can contain at most 18 MiB,
  or 18,874,368 bytes. The limit includes the whole body of the reply.
- A reply above these budgets gets HTTP 502, even when the provider
  permits it. For a command reply, the error says "The command output is
  too large."
- [Orgs and members](orgs-and-members.md#members-and-roles) states the
  rules of each role.

## The app's Boat key

[The app's Boat key](provider-keys.md#the-apps-boat-key) holds these
requirements.

## The app's E2B key

[The app's E2B key](provider-keys.md#the-apps-e2b-key) holds these
requirements.

## What a sandbox holds

- A sandbox gets none of the secrets of the app's provider accounts. On
  Boat, every sandbox starts with Boat's `noEnv` setting for that reason.
- At a start, a sandbox gets only two secrets: its workspace token and the
  env vars of its org.
- The sandbox gets them at create and at each resume. A changed secret
  applies at the next start.
- The restart of an archived sandbox near day 14 gets neither of them, as
  [Stop and resume](workspace-life.md#stop-and-resume) says.
- No saved snapshot holds these secrets. Builds and refreshes get none of
  them.
- A saved snapshot on E2B keeps only the disk of its sandbox, never its
  memory. Reason: the memory of a build can hold a secret, such as the
  token of a repository copy.
- The software image holds no org data and no secret, because every org
  uses it. Its build sandbox starts with no env var, no token, and no
  repository.
- A sandbox gets no agent login at a start.
  [Agent logins in a sandbox](#agent-logins-in-a-sandbox) says how each
  turn uses an agent login.
- A sandbox gets no value of a [secret](secrets.md) at a start. The value
  of a secret reaches it only in the reply to a run call that a grant
  allows, while the turn of that call runs (secrets decision 1 B). Builds
  and refreshes make no run call.
- GitHub access reaches a workspace sandbox only through the git credential
  helper.
- A build sandbox gets GitHub access only for the Git command that copies
  each repository, as [GitHub tokens](tokens-and-secrets.md#github-tokens) says (decision 90).

## What the workspace tools reach

- The calls of the [workspace tools](agent-tools.md#workspace-tools) of a
  sandbox reach each workspace of its org, and no workspace of another org
  (decisions 257 and 277). [Reach](agent-tool-access.md#reach) gives the
  reasons and the smaller reaches that were rejected.
- Risk: every process in a sandbox can read its workspace token, and so can
  every member with a terminal there. With the token, such a process can
  read every chat of the org at any time, also between turns. It can also
  read each workspace, session, and message of the org, and list the
  previews of each workspace.
- Risk: a copy of the token keeps these reads after the member who copied
  it leaves the org or is suspended. The copy works until the token stops
  working, as
  [Workspace tokens and runners](operator-actions.md#workspace-tokens-and-runners)
  says.
- Risk: while a turn of its workspace runs, such a process can also start
  sessions and turns. It can do so in each workspace of the org that is
  not archived.
- Each such turn goes in the name of the sender of the running turn. It
  runs on the login of its session.
- Risk: such a message also starts the cloud computer of a workspace that
  does not run, as an open does. Each start counts toward the starts that
  the orgs of its provider account share.
- Risk: while a turn of its workspace runs, such a process can also
  rename, move, and archive workspaces, close and stop sessions, change the
  sections, and open and close previews in the whole org. It acts with the
  rights of the sender of the turn.
- So with a turn of an admin, such a process can archive each workspace of
  the org. Archive deletes the cloud computer of a workspace 14 days later.
  Until then, a member can restore the workspace, as
  [Restore](workspace-life.md#restore) says.
- Risk: while a turn of its workspace runs, such a process can also change
  the target branch of each workspace of the org that is not archived.
  When that workspace has an open pull request, the Worker also changes
  its base on GitHub, as the sender of the turn.
  [Change the target branch](workspace-management.md#change-the-target-branch)
  states the call.
- GitHub checks the rights of that sender. A later merge of such a pull
  request goes into the new base, which the pull request bar names. The
  change deletes no work, and a later call can undo it.
- Risk: a read gives each Mac command of a session with its output, as a
  copy does. So sandbox code in each workspace of the org can read output
  from the Mac of a member.
- With the token, such a process can also list the names and the
  descriptions of the secrets of the org. The list gives no value.
- Risk: while a turn of its workspace runs, such a process can also make a
  run call in the name of that turn. It then gets the value of each secret
  that the session of that turn may use, with no request.
- Risk: a turn that such a process starts through the session calls uses
  the grants of its workspace and its session with no request
  (secrets decision 5 C). [Secrets](secrets.md#turns-that-no-person-started)
  states this risk.

## Agent logins in a sandbox

[Agent logins in a sandbox](sandbox-logins.md) states how each turn uses
the login of its session. It also states the checks of the runner, and the
risks of the logins and the tokens in a sandbox.

### Turn tokens in a sandbox

[Turn tokens in a sandbox](version-pins.md#turn-tokens-in-a-sandbox)
states the login rules and the risks of the turn token in a sandbox.
[Version pins](version-pins.md) also states which runner version a
workspace accepts, and its version pin.
