---
title: Terminal and previews
description: Run commands on a workspace's cloud computer and open a running web app by its port.
group: Work
order: 40
---

## Before you use the tools

Open a workspace in an org you belong to.
Its cloud computer must start before the tools can connect.
Select **Resume** if the computer is stopped.

For an archived workspace, use **Restore** first if it is available.
Restore leaves the computer stopped.
Resume it before opening **Terminal** or **Preview**.

Commands in **Terminal** run on that cloud computer.
A preview shows a web server that runs there too.

## Open Terminal

1. Open **Terminal** in the workspace.
2. Select the terminal area to give it focus.
3. Enter the command you want to run.

The shell starts in the workspace's repository folder.
After a repository change, a new shell starts in the folder of the new repository.
A shell that already runs stays in its folder.
Its prompt shows the current folder name.
Use `pwd` to see the full path.
For a quick check, you can run:

```bash
pwd
git status
```

Use your repository's instructions for dependency installation, tests, and development commands.
The phone terminal adds a row of keys that a phone keyboard lacks.

Web addresses in the terminal output are links.
On a Mac, hold Cmd and click a link to open it.
On Windows and Linux, hold Ctrl and click it.
On a touch screen, tap the link.
A local address, such as `http://localhost:3000`, opens **Preview** at its port.
Other links open in a new browser tab.
When a program shows a link with a label, its hint names the website that it opens.

The shell keeps running when its connection drops.
Reconnect to return to the same shell and running commands.
**Restart** in the workspace header also drops the connection until the agents are back.
A stop of the cloud computer ends those commands.
After a resume, start any needed server again.

The commands that you typed stay in the shell's command history after a stop.
After a resume, press the Up arrow or Ctrl-R to find them.
A command that still runs at the stop, such as a server, is not kept.
A workspace with older cloud computer software gets this with an automatic software update at a later start.

## Copy output

1. Drag over the output to select it.
2. Drag past the top or bottom edge to scroll and select more of the earlier output.
3. Copy the selection, for example with Cmd+C on a Mac.

The wheel scrolls the earlier output.
A new connection shows up to 2,000 lines of earlier output.
Every key goes to the shell, also Ctrl-b.

Every member who opens the same terminal sees it at one shared size.
The panel where someone last typed, pasted, or resized sets that size.
Another panel can show smaller text, or empty space after the terminal.
Type in a panel to give the terminal its size.

A workspace with older cloud computer software shows only the visible screen when you drag.
An automatic software update brings the newer terminal at a later start.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) explains when updates apply.

## Know which GitHub account a command uses

Git and the GitHub CLI, `gh`, get GitHub access through Conductive.
The CLI is ready to use without a separate login step.

| Where the command runs | GitHub account |
| --- | --- |
| In an agent turn | The person whose message started the turn |
| In the shared Terminal | The workspace owner |
| GitHub CLI outside an agent turn | The workspace owner |

Commits name the person in the table as both author and committer.
Commits that a script makes outside an agent turn name the workspace owner.
An `author` or `committer` setting in the repository or in the global Git settings takes priority over the workspace owner's author.
In a workspace with older cloud computer software, agent commits name the workspace owner.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) says how to get newer software.
Conductive uses their GitHub display name, or their login when the display name is missing or unusable.
Each commit uses their private GitHub no-reply address, `<id>+<login>@users.noreply.github.com`.
Here, `<id>` is their GitHub user ID and `<login>` is their GitHub login.
GitHub links the commit to their account without showing their private email.

Every member connected to that Terminal uses the same owner identity.
An explicit `GH_TOKEN` or `GITHUB_TOKEN` value can replace the supplied CLI login.

The token can reach repositories that both that person and the GitHub App can access.
This can include repositories outside the Conductive org.

**Merge** and **Continue** in the pull request bar use the GitHub account of the member who selects them.
A repository change fetches with the GitHub account of the member who changes the repository.
The shared Terminal still uses the workspace owner's account.

- [Use pull request actions](/docs/pull-requests)

## Preview a running app

1. Start your web server with the agent or **Terminal**.
2. Open **Preview**.
3. Select your server in the list.

Each row shows a port and can also show a short program name and repository folder.
The list updates as servers start and stop.
Servers that already have an open preview appear in their tabs.
When the list is empty, the form asks you to start a server in **Terminal** or ask the agent.

When the terminal shows the local address of your server, open it from there.

To open a server by its port:

1. Note the port that the server reports.
2. Enter it in **Other port** below the list, or **Port** when only the field appears.
3. Select **Open preview**.

For example, enter `3000` if your server reports port 3000.
Use the port of your server when it reports a different one.

An older cloud computer can show only the **Port** field.
Use the manual steps there.
If Preview says it needs newer cloud computer software, an automatic update brings the required preview support at a later start.
An existing workspace also gets the server list with an automatic software update.

- [Understand cloud computer software updates](/docs/cloud-computer#apply-setup-changes)

The preview opens inside the workspace.
Use **Open** to show the app in a new browser tab when it works better there.
This can help when its cookies or sign-in do not work inside the frame.

## Manage previews

Each preview tab shows its port and a program name when available.
The program name uses at most 10 characters, including **…** when shortened.
Its tooltip and screen reader label give the full name and folder.
Use **+**, named **Preview another port**, to choose another server or enter its port.
Use **Reload** to load the selected preview again.
Use the **×** after the name of a preview tab to close that preview.
It shows on the selected tab, and on another tab when you point to it.

A preview expires after 24 hours.
Stopping the workspace's computer also closes its previews.
Open a new preview after the computer resumes.

Preview access follows your sign-in and workspace access.
A copied preview address grants no access by itself.

Ask an agent to list, open, or close previews.
To open a preview, give the agent your server's port.
It can do this in any workspace of the same org.
Previews that agents open need sign-in and workspace access.

## Recover from a connection error

If Terminal cannot connect, check the workspace's start state.
Use **Resume** or **Try again** when the workspace offers it.
Then open **Terminal** again.

If a preview does not open, check that its server is running.
Check the port number.
Try **Reload**, or close the preview before opening it again.
Use **Open** if only the framed view fails.

## Understand access to the computer

The terminal is shared with members of the org.
Its output does not hide secrets.
Members with terminal access can also obtain GitHub credentials available to the workspace.

Conductive offers **Terminal** and **Preview** as workspace tools.
The Mac app provides a window for Conductive and optional Mac command requests.

- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)
- [Change startup commands](/docs/cloud-computer#run-commands-at-startup)
- [Read the security guide](/docs/security)
- [Use the Mac app](/docs/mac-app)
