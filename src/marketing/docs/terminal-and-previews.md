---
title: Terminal and previews
description: Run commands and named services on a workspace's cloud computer, then open a running web app by its port.
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
2. Enter the command you want to run.

On a computer, select the **Terminal** tab to give the terminal keyboard focus.
**Go to Terminal** in the command palette does the same.
So does its keyboard shortcut, by default **⌘J** on a Mac or **Ctrl+J** on another computer.
If the terminal is still connecting, it gets focus when it appears.
On a phone, or after you select something else, select the terminal area to give it focus.

A new workspace starts with **Terminal 1**.
Each terminal starts its own shell in the workspace's repository folder.
After a repository change, each new shell starts in the folder of the new repository.
Each idle shell in the old folder also moves to the new folder, and a line that you typed but did not send is cleared.
A shell that runs a command stays in its folder.
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

Each terminal's shell keeps running when its connection drops.
When the connection drops, such as during an update of Conductive, the terminal connects again once by itself.
If that does not work, it shows **Disconnected**, and the terminal keeps its last output so that you can copy it.
Select **Reconnect** to return to the same shell and running commands.
**Restart** in the workspace header drops terminal connections until the agents are back.
It keeps the shells and their commands running.
An [automatic restart of the software](/docs/workspaces#restart-the-software) does the same.
It also stops running agent turns without asking first.
If you end its shell with `exit`, **Reconnect** opens a new shell in the same tab.
Stopping the cloud computer ends every terminal's shell and running commands.
The terminal tabs stay after a resume.
Start any needed server again in its terminal.
After a repository change, a server that already runs keeps the old folder, so start it again in the new folder.

The commands that you typed stay in the shell's command history after a stop.
After a resume, press the Up arrow or Ctrl-R to find them.
A command that still runs at the stop, such as a server, is not kept.
After an automatic software update, an older cloud computer gets the new terminal software when Conductive [restarts its software](/docs/workspaces#restart-the-software), or at a later computer start.

## Use terminal tabs

The row above the terminal shows tabs named **Terminal 1** to **Terminal 10**.
Every member sees the same terminals on each device.
Use one terminal for a development server and another for tests.

1. Select **+**, named **New terminal**, at the end of the row.
2. Run a command in the new terminal.
3. Select another terminal's tab to switch to it.

On a computer, **+**, **New terminal** in the palette, and a click on a terminal tab give the shown terminal keyboard focus.
When you move along the tabs with the keyboard, focus stays on the row.

Switching tabs keeps the other shells and their commands running.
On a phone, the tabs appear at the top of **Terminal**.
Scroll the row sideways if a tab is out of view.
A new terminal takes the lowest free number.

On a computer, you can also use the command palette while the right column shows:

1. Select **Search** above the workspace list.
2. Search for `terminal`.
3. Select **New terminal**.

The palette offers this action only while the right column shows, the cloud computer runs with terminal tabs, and the workspace has fewer than 10 terminals.
A phone does not offer it in the palette, so use **+** there.
**New terminal** has no default keyboard shortcut.

At the workspace limit, **+** turns off.
The line below the tabs says:

> A workspace holds up to 10 terminals. Close one to open another.

## Close a terminal

1. Select the **×** on the terminal's tab.
2. Read the confirmation for that terminal.
3. Select **Close terminal** to confirm.

Closing a terminal ends its shell and running commands for every member of the workspace.
Its tab closes on every device.
The last terminal has no close button.

## Use an older cloud computer

An older cloud computer can show one terminal with no tab row or **+** button.
Its existing terminal still works.
After an automatic software update, select **Restart** in the workspace header to get terminal tabs.
A later start of the cloud computer also brings them.

- [Understand cloud computer software updates](/docs/cloud-computer#apply-setup-changes)


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
After an automatic software update, the newer terminal arrives when Conductive [restarts its software](/docs/workspaces#restart-the-software), or at a later cloud computer start.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) explains when updates apply.

## Know which GitHub account a command uses

Git and the GitHub CLI, `gh`, get GitHub access through Conductive.
The CLI is ready to use without a separate login step.

| Where the command runs | GitHub account |
| --- | --- |
| In an agent turn | The person whose message started the turn |
| In any workspace terminal | The workspace owner |
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

Every member connected to a workspace terminal uses the same owner identity.
An explicit `GH_TOKEN` or `GITHUB_TOKEN` value can replace the supplied CLI login.

The token can reach repositories that both that person and the GitHub App can access.
This can include repositories outside the Conductive org.

**Merge**, **Ready for review**, and **Continue** in the pull request bar use the GitHub account of the member who selects them.
A repository change fetches with the GitHub account of the member who changes the repository.
All workspace terminals still use the workspace owner's account.

Outside the queue, if GitHub deletes the workspace's base branch, Conductive moves its base to the default branch.
Those workspaces also follow changes to the default branch when it is their target.
A move that no member starts fetches with the workspace owner's GitHub account.
This includes moves from GitHub events, automatic retries, and resumes of stopped cloud computers.
The merge queue also uses the workspace owner's GitHub account to fetch a new base.

- [Use pull request actions](/docs/pull-requests)

## Run a server as a service

A service is a named program that runs outside the agent's turn.
Use a service for a server that you need after the agent replies.
Ask the agent to start it as a service, or run this command in your repository's folder:

```bash
conductive services start --name web -- npm run dev
```

Replace `npm run dev` with your server command.
The service uses the folder where you run the command.
Its environment uses the org values from this computer start, the recorded repository folder variables, and values supplied for the service.
It does not inherit the agent's credentials, turn context, or secrets added to an approved command.
[Understand service access](/docs/security#understand-services) explains the remaining credential risks.

Starting returns promptly by default.
You can request a wait of up to 30 seconds for a port that belongs to the service.
A timeout leaves the service running.
Starting an exact name that already runs returns that service unchanged.
For a stopped, ended, or failed service, Start uses the new command and settings that you supply.
The agent can also list, stop, restart, and read logs of services on this cloud computer.

Services keep running after an agent reply.
They survive crashes and updates of the agent software.
**Restart** in the workspace header keeps them running too.
Stop a service when you finish with it.
A computer stop ends every service and discards its saved command, settings, and log.
After **Resume**, start needed services again.
Services never keep the computer running.
Using their previews or reading their logs adds no awake time.

Builds, tests, and waits for checks that must finish stay in the agent's work.
Agents stop temporary check servers before replying.

## Manage services

Open **Preview** to find **Services** above the other servers.
The list includes services with no port and services that stopped, ended, or failed.
Each row shows its name, program, folder, state, start time, and ports.
It also links to the session where it started when Conductive can match that session.
Otherwise, it shows **Local command**.
This source gives context and does not prove which person started the service.

If **Services** is missing, the computer can need newer software.
[Apply a software update](/docs/cloud-computer#apply-setup-changes) to get service support.

Select a port in a service's row to open its preview.
On a phone, use **+**, named **Preview another port**, to return to the list.
Each service stays in the list while its previews are open.

Open a service's menu for these actions:

- **Stop** asks first, then ends the service and its child programs for everyone in the workspace.
- **Restart** runs its saved command and settings again, with no confirmation.
  It also works for a stopped, ended, or failed service.

The menu follows the access rule of [Restart in the workspace header](/docs/workspaces#restart-the-software).
Every member who can read the workspace can read its service list and logs.
A service does not restart itself after an exit or failure.
Its result stays in the list until the computer stops.

If a reply is lost, the action shows **Unconfirmed**, and the list refreshes the actual state.
Check that state before choosing the action again.
A control for a run that already changed does nothing.
Pending controls end when the computer stops.

Closing a preview keeps its service running.
Stopping or restarting a service keeps its preview tabs.
After a restart, select **Reload** in the preview to load the app again.

## Read service logs

Select **Show log** in a service's row.
The log opens as plain text in a dialog on a computer or a sheet on a phone.
Select **Reload** to read the latest output.
If the read fails, use **Try again**.

The computer keeps up to 10 MiB of log output in total per service.
These logs use the computer's memory and end when the computer stops.
Each read shows up to 200 lines and 64 KiB.
A notice says when output was left out.
Conductive hides exact copies of known secret values before showing the text.
Changed or encoded values can still appear.

- [Understand secret masking](/docs/security#understand-environment-values)

## Preview a running app

1. Start your web server as a service, or with **Terminal**.
2. Open **Preview**.
3. Select its port under **Services**, or select it under **Servers**.

On a computer, the preview opens in its own tab beside your sessions and files.
Select another server to open it in another tab.
Select a server that already has a tab to show that tab.

Each row under **Servers** shows a port and can also show a short program name and repository folder.
The list updates as servers start and stop.
The row of the shown preview tab is highlighted.
When no server runs, start one in **Terminal** or ask the agent to start a service.

On a phone, the preview opens on the **Preview** page.
Servers outside a service that already have an open preview appear in its tabs, not in the list.

When the terminal shows the local address of your server, open it from there.
An HTML file of the repository needs no server.
Open it from **All files**, as [Preview an HTML file](/docs/files-and-changes#preview-an-html-file) says.

To open a server by its port:

1. Note the port that the server reports.
2. Enter it in **Other port** below the list, or **Port** when only the field appears.
3. Select **Open preview**.

For example, enter `3000` if your server reports port 3000.
Use the port of your server when it reports a different one.

An older cloud computer can show only the **Port** field.
Use the manual steps there.
If Preview asks for newer software, select **Restart** in the workspace header.
A later computer start also applies the update.
An existing workspace also gets the server list with an automatic software update.

- [Understand cloud computer software updates](/docs/cloud-computer#apply-setup-changes)

The preview opens inside the workspace.
Use **Open** to show the app in a new browser tab when it works better there.
This can help when its cookies or sign-in do not work inside the frame.

## Manage previews

Each preview tab shows a globe, its port, and a program name when available.
The program name uses at most 10 characters, including **…** when shortened.
Its tooltip and screen reader label give the full name and folder.
Drag a preview tab to move it, as with other tabs.
Use **Reload** in the bar above the page to load the page again.
Use **Expand** in the same bar to show the page in a large window over the whole app.
The page keeps its place, so you can go on where you were.
Use **Close** or press **Escape** to go back to the tab.
Use **Open** in the same bar to show the app in a new browser tab.
Use the **×** on a preview tab to close the tab.
The preview stays open, so select its server again to bring the tab back.

On a phone, use **+**, named **Preview another port**, to choose another server or enter its port.
Use the **×** after the name of a phone preview tab to close that preview.

A preview stays open until the workspace's computer stops.
Using a preview does not keep the computer running.
A preview also closes 24 hours after it opens.
When you show a preview tab after its preview closed, Conductive opens a new preview.
The page then loads again, and the app in it can lose its cookies and sign-in.

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
Try **Reload**.
On a phone, you can also close the preview and open it again.
Use **Open** if only the framed view fails.

## Understand access to the computer

Every terminal is shared with members of the org.
Terminal output does not hide secrets.
Members with terminal access can also obtain GitHub credentials available to the workspace.

Conductive offers **Terminal** and **Preview** as workspace tools.
The Mac app provides a window for Conductive and optional Mac command requests.

- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)
- [Change startup commands](/docs/cloud-computer#run-commands-at-startup)
- [Read the security guide](/docs/security)
- [Use the Mac app](/docs/mac-app)
