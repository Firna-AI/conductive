# Own computers

This doc holds the requirements and the decisions in force for own
computers: Linux servers that an admin adds to an org, where each workspace
runs in its own container. It covers who adds a computer, the Own
computers tab and the page of each computer, the install, the computer
connection and its token, the containers, the org image of each computer,
the limit, and the risks. It
belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md).
[Workspaces on own computers](own-computers-workspaces.md) belongs to this
doc. It holds the computer choice of New workspace, of sub-workspaces, of
the agent tools, and of automations, and the starts, the stop, Archive,
and the removal of a computer.
[Host connection](host-connection.md) holds the connection of each machine,
also of each container. The terms are those of the
[architecture doc](../architecture.md#terms). An own computer decision
number names a decision of the change that adds own computers and the host
connection, as [Host connection](host-connection.md) says. The
[design of own computers](../mockups/design-own-computers.md) and
[its catalogue](../mockups/catalogue-own-computers.md) draw the screens.

## Own computers

- An own computer is a Linux server that an admin adds to an org (own
  computer decisions 1 D and 5 C). Each workspace and each build of the
  org on that server runs in its own container.
- Users see the name "own computer", and the cloud computer keeps its
  name. The admin gives each own computer a name, and the app names it so
  in each screen. No user-facing text names a sandbox provider, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says.
- An own computer runs Linux on x86_64 only, with systemd and Podman.
  Reason: x86_64 Linux is the one release target of the sandbox software.
- Each container runs the same sandbox software as a cloud computer, with
  the host program. So its host connection is the same as on a cloud
  computer.
- Each workspace on an own computer has its own container, with its own
  clone of its repository (decision 4).
- Reason for containers: a container runs the same software as a cloud
  computer, so own computers fit the one path of own computer decision
  1 D. Native workspaces on a Mac follow as a later change, when users
  need Mac tools such as Xcode (own computer decision 5 C).
- Native workspaces only, on a Mac or a Linux server, were rejected (own
  computer decision 5). Linux containers with no later Mac version were
  rejected too.
- One whole server for each workspace, from a pool of the org, was
  rejected (own computer decision 1). Agents and automations create
  workspaces in bursts, so the pool runs out.
- These ways were left out (own computer decision 1):
  - Mac commands only, and commands from a cloud agent to a server,
    because the work then does not run on the server.
  - A runner that a person starts by hand, because agents and automations
    create workspaces when no person is there.
  - A self-hosted E2B cluster, because it breaks decision 80 and gives no
    Mac.
  - Inbound SSH, because it fails behind NAT, and the app then holds a
    shell key for each server.
  - Tailscale or ngrok, because a Cloudflare Tunnel is better on every
    point.
  - The Mac app as the host of the workspaces, because native workspaces
    are better on every point.
  - Machines in a cloud account of the org, because it breaks decision 80.
- An own computer belongs to its org. No provider account runs it, and
  the app does not pay for the server.
- Own computers use no cloud hours, as [Cloud hours](pricing.md#cloud-hours)
  says.
- A workspace on an own computer has no desktop. Only a sandbox on Boat
  has one, as [Desktop](terminal-previews-and-desktop.md#desktop) says.

## Who adds an own computer

- Only an admin adds an own computer, sets its limit, and removes it (own
  computer decision 2 A). Each own computer serves the whole org.
- Each member sees the own computers of the org, read-only.
- Reason: root on the computer can read the workspace tokens and the env
  vars, and during turns the GitHub tokens and the allowed secret values
  of other members. Only an admin changes other settings of the whole org
  (decision 57).
- These ways were rejected (own computer decision 2): any member for the
  own workspaces of that member, and any member for the whole org.
- One own computer serves one org. The Worker checks the org of the
  computer before each call to it.

## The Own computers tab

- The Own computers tab of the org settings follows the Cloud computer
  tab. It shows in each org, also in an org without own computers.
- Reason: users see the name "own computer". A tab named Computers beside
  Cloud computer reads as a list of every computer.
- The tab lists each own computer of the org with its name, its size, its
  builds, its state, and its running workspaces of its limit, such as
  "2 of 4 running". An offline computer shows when it was last seen.
- The state of a computer is the first of these that applies:
  1. Waiting to connect: the computer never connected, and its one-time
     code works.
  2. Code expired: the computer never connected, and its code expired.
  3. Offline: the computer connected before, and it is not connected now.
  4. Building: the computer has no good build yet, and its build runs.
  5. Build failed: the computer has no good build, and its newest build
     failed.
  6. Full: the computer runs as many workspaces of the org as its limit.
  7. Connected.
- A later build that fails keeps the state of the computer. Its row then
  says that the build failed.
- No state depends on colour alone.
- An org without own computers shows one line in place of the list.
- A member who is not an admin reads the same rows, and the tab says that
  only an admin can change them.
- A suspended org shows its own computers read-only. They run no
  workspace.
- The tab says that each own computer uses the setup of the Cloud computer
  tab: its repositories, its scripts, and its env vars. It links to that
  tab. The Cloud computer tab says it too, while the org has an own
  computer.

## The page of an own computer

- Each own computer that connected has a page in the org settings. Its
  row on the Own computers tab opens it. A computer that never connected
  has no page.
- The page gives the facts of the computer: its state, its running
  workspaces of its limit with all of its workspaces, its size and its
  system from its newest connection, and the day of its add.
- The page holds the builds of the computer in the build card of the Cloud
  computer tab, with its log, its history, and Try again. The saved message
  of a failed build names the computer.
- Reason: each own computer builds its own image, so an admin needs its
  log, its saved message, and Try again.
- For an admin, the page also holds the [limit](#the-limit) and Remove
  computer, as
  [Removal of a computer](own-computers-workspaces.md#removal-of-a-computer)
  says.
- While the computer is offline, the page starts with a notice. The notice
  asks to check that the server is on and reaches the internet. Reason:
  only an admin of the server can fix it.

## Add computer

- Add computer asks only for a name. Members see that name when they
  choose where a workspace runs.
- Add computer says that people with root access to the server can read
  the work, the env vars, and the allowed secrets of each workspace on it.
  Reason: own computer decision 2 names that access as the risk.
- After the name, Add computer gives a one-line install command with a
  one-time code. The command runs on the server, as a user who can use
  sudo.
- The code works once, within 1 hour after the app made it.
- Reason: the install can take minutes on the server, and a short life
  limits the harm of a stolen command.
- Add computer says what the server needs: Linux on x86_64, with systemd
  and Podman. The install checks these needs, and that Podman runs without
  root.
- Add computer waits for the first connection of the computer. Close keeps
  the code.
- After Close, the Own computers tab shows the computer as Waiting to
  connect, with Show command. After the code expired, it shows Code
  expired, with New code. New code gives a new one-time code with the same
  rules.
- An admin can remove a computer that never connected. Its code then
  stops working.
- At its first connection, the computer gives its code. The Worker then
  gives it its computer token, and the code stops working.
- The first connection of the computer starts its
  [first build](#the-org-image-of-each-own-computer), and its limit takes
  its default.

## The computer connection

- The install sets up the program `conductive` in computer mode, as a
  systemd user service of a separate user, with Podman without root.
- Reason: an attack through the Worker or through a release then reaches
  only the containers, not the whole server. Access to a Docker socket was
  rejected, because it equals root on the server.
- The computer mode opens one outbound WebSocket, the computer connection,
  to `/v1/computer` on `api.conductive.build`. It proves itself with the
  computer token of its computer.
- The connection ends in the computer object, the Durable Object of that
  own computer.
- The computer connection carries only fixed container operations: create,
  get, start, stop, delete, save an image, and run the
  [bootstrap](host-connection.md#the-bootstrap). It has no general
  pass-through.
- Reason for the bootstrap operation: a container with an older host
  program gets the current one, as for a cloud computer (own computer
  decision 7 D).
- The work inside each container goes over the host connection of that
  container, as [Host connection](host-connection.md) says.
- At each connection, the computer reports its vCPUs, its memory, and its
  system.
- The Worker keeps only a digest of the computer token. The gate of
  `api.conductive.build` accepts a computer token only on `/v1/computer`.
- A removal of the computer revokes its token. A removed computer can no
  longer connect.
- The computer mode updates itself with each release. Before it installs a
  release or uses a container base image, it checks its
  [signature](sandbox-software.md#releases) (own computer decision 4 B).
  Reason: the product needs automatic updates, and a leak of the deploy
  token must not reach the servers of the orgs.

## The org image of each own computer

- Each deploy publishes a signed container base image: the Ubuntu 24.04
  base of the E2B template, with the newest release of the sandbox
  software.
- Each own computer builds its own org image from the container base image,
  and refreshes it, as the account of the org does. So the rules of
  [Org image](org-image.md) hold for each own computer on its own: its
  builds, its refreshes, its last good image, and its waiting repositories.
- Reason: the agents then get the same computer tools as on E2B, and the
  install script of the org runs on the same base.
- The first build of each own computer starts from the container base
  image. Each later build and refresh of it starts from its last org image.
- The first connection of an own computer starts its first build by
  itself. It runs for an admin who is not suspended, as each build that the
  app starts by itself does.
- A build of the org, from Build computer, a saved repository change, or
  the daily refresh, runs on the cloud computer and on each own computer:
  at once on a connected computer, or at the next connection of an offline
  one. A refresh after a push runs on each own computer too, as on the
  cloud computer.
- Reason: one setup of the org then reaches every computer. So a
  repository that an admin adds reaches each computer before a workspace
  there uses it.
- Build computer and Try again on the page of an own computer build that
  computer alone.
- Until its first good build, no workspace can start on an own computer.
- The org image of an own computer lives on that server. A removal of the
  computer does not delete it.

## The limit

- An admin sets the number of workspaces of the org that run at once on
  each own computer.
- The default is one workspace for each 4 vCPU and 8 GB that the computer
  reported, and at least one. At the first connection of the computer, its
  limit takes the default.
- Reason: each workspace then gets the size of a cloud computer, and the
  default needs the size of the server.
- The limit section gives that default for the size of the computer. Its
  Save is on only after a change.
- A lower limit stops no running workspace. It applies to the next starts.
  Reason: a change of a setting must not end running work.
- A start on a full own computer waits for a free place, as
  [Starts and stops](own-computers-workspaces.md#starts-and-stops) says.

## Risks

- Risk: each person with root access to the server can read the files,
  the env vars, and the workspace token of each workspace on it. During
  turns, such a person can also read the turn tokens, the GitHub tokens of
  the senders, and the allowed secret values. The access stays at all
  times, also after that person leaves the org.
- So each risk of [Isolation of orgs and sandboxes](isolation.md) that
  names a process in a sandbox also holds for root on the server.
- Risk: root on the server can read the clone token of each repository
  copy of a build there, until that copy ends.
- Risk: with a stolen computer token, a false computer gets the new
  workspaces and builds of that computer, with their tokens and their env
  vars, until an admin removes the computer.
- Risk: agent code runs on the server and in the network of the org. The
  org carries that risk.
- The containers of one server share its kernel, so they keep the
  workspaces apart less than a virtual machine does. Each server serves
  one org, so the harm stays in that org.
