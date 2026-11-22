# Machines

This page describes the machines that run the workspaces and the builds of
Conductive: the sandbox providers, the own computers, and the Durable
Objects that reach each machine and each own computer. It belongs to the
[components page](components.md), and it uses the terms of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. An e2b decision number names a decision of the change that adds E2B
as the second
[sandbox provider](../protocol/workspaces-and-sandboxes.md#the-provider), as
that doc says. An own computer decision number names a decision of the
change that adds own computers and the host connection, as
[Host connection](../protocol/host-connection.md) says.

## Sandbox providers

- Boat and E2B run the cloud computers and keep the saved snapshots
  (decision 2, and e2b decision 222). The app has one account with each.
- Boat was the first choice (decision 2). Sprites on Fly.io was the other
  option. Boat costs less, and it already has forks, saved snapshots, port
  URLs, desktop streams, and environments.
- E2B is the second provider, so that a Boat outage does not stop every
  org (e2b decision 222).
- Each org runs in one provider account at a time (decision 80, and e2b
  decision 222). That account holds the org image and the sandboxes of the
  new workspaces of the org.
  Its plan limits apply to its orgs together.
- A new org gets its account from the choice of an operator or from the
  weights. An operator can later switch the org to another account. The
  switch builds the org image on that account, and new workspaces start
  there when that build succeeds.
- Each workspace keeps its sandbox on the account that it started on. So
  after a switch, one org can have sandboxes on two accounts, and an older
  org image on the old account.
- The records name the account of each org, each sandbox, and each saved
  snapshot.
- The app does not depend on provider webhooks. The agent runner reports
  when a sandbox is ready. The Worker reads the state of a sandbox from the
  API of its provider when it needs it.
- A stop ends every process. Each provider keeps the disk and the enabled
  system services, and starts those services again after each resume. The
  [services](../protocol/services.md) of a workspace run in transient
  units, not enabled ones, so no resume starts them.
- E2B runs in its default cluster, in the United States, in an E2B project
  that holds only the app's work. Each E2B sandbox has private traffic.
- On E2B, the template gives the agents the same computer tools as on
  Boat (e2b decision 216). An E2B sandbox has no desktop stream.

## Own computers

- An admin of an org adds each own computer: a Linux server on x86_64,
  with systemd and Podman (own computer decisions 1 D and 5 C). The org
  provides the server. One own computer serves one org.
- The program `conductive` runs on it in computer mode, as a systemd user
  service of a separate user, with Podman without root. It opens the
  computer connection, and it runs each workspace and each build of the
  org in its own container.
- Each container runs the same sandbox software as a cloud computer, with
  its own host connection.
- Each own computer builds its own org image from the container base
  image, which each deploy publishes with a signature.
  [Own computers](../protocol/own-computers.md) states the rules.

## Machine Durable Object

- One Durable Object for each machine: each sandbox, and the machine of
  each build, refresh, and software image build. It holds the host
  connection of its machine, as
  [Host connection](../protocol/host-connection.md) says.
- The workspace object and the build jobs reach the machine only through
  it. Reason: a build machine has no workspace object.
- It carries only the fixed operations of the host connection: commands,
  file reads, and the streams of the terminal and of the previews.

## Computer Durable Object

- One Durable Object for each own computer. It holds the computer
  connection of that computer, as
  [Own computers](../protocol/own-computers.md#the-computer-connection)
  says.
- It carries only the fixed container operations. The provider kind `own`
  gives the life of each container through it, as each provider client
  does for Boat and for E2B.
- It checks that each call comes for a workspace or a build of the org of
  its computer.
