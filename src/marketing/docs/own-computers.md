---
title: Own computers
description: Connect a Linux server to your org and choose it for workspaces and automations.
group: Manage
order: 15
---

## Use your org's server

An own computer is a Linux server that an admin adds to an org.
Each workspace on the server runs in its own container, with its own files and branch.
Your org provides the server and covers its costs.
Work on an own computer uses no cloud hours.

Open the org's **Settings**, then **Own computers** after **Cloud computer**.
Every member can see the list, build results, and how many workspaces are running on each server.
Only an admin can add a computer, set its workspace limit, or remove it.
Each own computer is available to the whole org.

## Add a computer

Use an x86_64 Linux server with systemd and Podman.
Podman must run without root.
The server needs internet access, and you need an account on it that can use `sudo`.

1. In **Own computers**, select **Add computer**.
2. Enter a name that members can recognize.
3. Copy the install command that Conductive shows.
4. Run the command on the server.
5. Wait for the first connection and the first successful build.

The command has a one-time code that expires after one hour.
If you close the dialog, use **Show command** in the computer list to see it again.
If the code expired, select **New code** to get a new command.

The installer sets up Conductive as a user service on the server.
The software updates itself and checks each release's signature before installing it.
It checks each container base image's signature before using it.

## Manage builds and the workspace limit

Each own computer builds the repositories and install script from **Cloud computer**.
Its workspaces also use the startup script and environment values from that tab.
Open the computer's page under **Own computers** to see its build log and history.
Use **Build computer** or **Try again** there to build only that computer.

The workspace limit controls how many workspaces can run at once on that server.
The default allows one workspace for each 4 vCPUs and 8 GB of memory, with a minimum of one workspace.
To change it, open the computer's page, set the limit, and select **Save**.
A lower limit applies to later starts and leaves running workspaces in place.

- [Configure the shared setup](/docs/cloud-computer)

## Choose a computer for your work

When your org has an own computer, **New workspace** shows a computer choice after the branch control.
**Cloud computer** is the default.
Choose an own computer after its first successful build.
The selected repository must be ready on that computer.

A workspace keeps its computer for later starts.
An agent that creates a workspace uses the same computer choice as the workspace it runs in.
This applies to sub-workspaces and top-level workspaces.

When your org has an own computer, the automation form shows a computer choice after **Section**.
**Cloud computer** is the default.
The owner can choose an own computer for its runs.
Every run starts on the computer selected for that automation.

The workspace's state menu shows where it runs.
Use **Terminal** and **Preview** to work in the container.
Desktop access is unavailable on own computers.

## Start, stop, and archive a workspace

If the selected own computer is offline, a workspace start waits for it to connect.
The start fails at the 20-minute limit.
If it fails, check that the server is on and can reach the internet.
Then select **Try again** in the workspace.

When a workspace stops, its container stops and keeps its files.
A stopped container on an own computer needs no restart near day 14 to keep those files.

After Archive, the container stays available for Restore for up to 14 days.
Conductive then deletes it and its files.
If the server is offline, the files can stay on it until its next connection.

- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)

## Remove a computer

Open the computer's page under **Own computers**.
Select **Remove computer** and confirm.
This stops the org's running workspaces on that computer and revokes its connection token.
The workspaces keep their chats, and their files and images stay on the server.
To start new work, create a workspace on another computer.

An automation that uses the removed computer turns off.
Its owner can choose another computer and turn it back on.

## Understand who can access your work

People with root access to the server can read workspace files, environment values, workspace tokens, and machine tokens.
During a turn, they can also read turn tokens, GitHub tokens, and allowed secret values.
They keep this access while they have root access, including after they leave the org in Conductive.

Agent code runs on your org's server and network.
Your org is responsible for the server and for the code that agents run there.
Data stored on the server stays where your org keeps it.
Conductive still handles chat history and model requests as described in the Privacy notice.

- [Understand credential access](/docs/security)
- [Read the Privacy notice](/privacy)
