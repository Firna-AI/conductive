# Workspaces on own computers

This page belongs to [Own computers](own-computers.md). It holds the
requirements and the decisions in force for the workspaces on own
computers: the computer of each workspace, the computer choice of New
workspace, of sub-workspaces, of the agent tools, and of automations, and
the starts, the stop, Archive, and the removal of a computer. The terms
are those of the [architecture doc](../architecture.md#terms). An own
computer decision number names a decision of the change that adds own
computers and the host connection, as [Host connection](host-connection.md)
says.

## The computer of a workspace

- Each workspace runs on one computer of its org: the cloud computer, or
  one own computer. The app records the computer of each workspace, and of
  each org image on an own computer.
- A workspace never moves between computers. It keeps its computer for
  each action on its sandbox, as it keeps its provider account. Reason: no
  sandbox moves between accounts, as
  [The account of a workspace](provider-accounts.md#the-account-of-a-workspace)
  says.
- Try again after a failed first start on an own computer makes a new
  container on the same own computer.
- A new workspace on an own computer starts from the newest good org image
  of that computer.

## The computer choice

- New workspace has a computer choice, with the cloud computer as the
  default (own computer decision 3 A). Reason: it gives the most control,
  and it keeps the cloud computer as the default.
- An org setting that sends all new work to an own computer was rejected
  (own computer decision 3). A setting for each repository was rejected
  too.
- The choice shows only while the org has an own computer. It follows the
  branch control, on the page and in the header of the dialog. Reason: a
  choice of one computer adds nothing, and most orgs have none.
- Its menu holds Cloud computer first, as the default. Each own computer
  of the org follows, with the detail of its state. A phone opens the menu
  as a sheet.
- An own computer without a good build keeps its place in the menu, off,
  with a note of when it is ready. This also holds for a computer that
  never connected. Reason: a computer without an image cannot start a
  workspace, as a repository that waits for its build cannot.
- An offline own computer stays on in the menu. A notice over the composer
  says that the workspace starts when the computer connects, and Send
  stays on. Reason: a start on an offline computer waits for it.
- Open: what a start does when its own computer is full. The own computers
  plan holds it.
- While an own computer is chosen, the note under the pickers names it and
  its newest build.
- A removed computer is not in the menu.
- A repository that waits for its build follows the builds of the chosen
  computer. So [Waiting repositories](new-workspace-notices.md#waiting-repositories)
  holds for the org image of that computer.

## Sub-workspaces and the agent tools

- A create call of the workspace tools makes its workspace on the computer
  of the calling workspace (own computer decision 3 A). This holds for a
  sub-workspace and for a top-level workspace.

## Automations

- Each automation has its own computer choice, with the cloud computer as
  the default (own computer decision 3 A). Each run workspace of the
  automation starts on that computer.
- The automation form shows the choice after Section, while the org has an
  own computer. The hint under the fields names the computer. Each other
  member reads the computer in the facts of the automation.
- Only the owner changes the computer, as for each field of the
  automation.
- When an admin removes the own computer of an automation, the automation
  turns off, as after the removal of its repository. Its page asks the
  owner to choose another computer.
- Its runs never move to the cloud computer by themselves. Reason: a move
  would run the work in another place than its owner chose.

## Starts and stops

- A start on an own computer that is offline waits for the computer to
  connect. Its start step says that it waits for that computer, with its
  time.
- Such a start fails at the 20-minute limit of a start, with Try again, as
  [Time limits of builds and starts](workspace-life.md#time-limits-of-builds-and-starts)
  says. Its saved message names the computer and the limit.
- Open: what the running workspaces of an own computer show, and what
  happens to their turns, when that computer loses its connection. The own
  computers plan holds it.
- A workspace on an own computer stops after the stop time, as each
  workspace does, as [The stop](stop-and-resume.md#the-stop) says. Reason:
  the stop frees the server.
- A workspace on an own computer gets no restart near day 14 of a stop.
  Reason: the server keeps the disk of a stopped container.
- In a workspace on an own computer, each text that names the cloud
  computer of the workspace names its own computer in its place. Examples
  are the first step of a start, the saved message of a failed start, and
  the messages of a failed attachment transfer.
- The first line of the menu of the header state says on which own
  computer the workspace runs. A screen reader names the menu after the
  computer.
- Reason: a member needs to know where the work runs when a start waits or
  fails.

## Archive

- Archive keeps the container of a workspace for 14 days, as
  [Archive](workspace-life.md#archive) says. The app then deletes the
  container: at once when the computer is connected, or at its next
  connection.

## Removal of a computer

- Only an admin removes an own computer, with Remove computer on its page.
  Remove computer asks first.
- The question says that each workspace of the org on the computer stops,
  and that the computer can no longer connect. It says that its workspaces
  keep their chats but cannot start again, and that their files stay on
  the server.
- The removal stops each running workspace of the org on the computer. It
  then revokes the computer token.
- Each workspace on a removed computer keeps its chat. The app refuses each
  start of such a workspace, and the refusal names the computer.
- Reason: no workspace keeps running where the app cannot reach it, and a
  refused start keeps the chat.
- The app deletes no file and no org image on the server.
- An automation on the removed computer turns off, as
  [Automations](#automations) says.
