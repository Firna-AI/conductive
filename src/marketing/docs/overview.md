---
title: Overview
description: Understand workspaces, agent conversations, and cloud computers before you start your first task in Conductive.
group: Start
order: 10
---

## How work is organized

Conductive is a coding tool for GitHub repositories.
It groups your work into orgs, workspaces, and sessions.

| Part | What it does |
| --- | --- |
| Org | Holds your repositories, workspaces, members, and shared setup. An org can be just you or a team. |
| Workspace | Gives one task its own branch and cloud computer. |
| Session | Holds one agent conversation in a workspace. Each session has its own tab. |
| Cloud computer | Holds the files and runs the agents, commands, and tools of a workspace. |

Each workspace uses a selected GitHub repository.
The org's shared setup supplies the starting files and software for each workspace.
Separate workspaces have their own files and branches.
You can work on several tasks at the same time.

Conductive provides the cloud computers.
You follow the work in your browser.

## Work with agents

Describe a task to agents powered by Claude and Codex.
They can read code, change files, and run commands on the cloud computer.
The message box lets you choose a model and its effort.

Connect your own agent login before you start.
Claude accepts a subscription token or an Anthropic API key.
Codex accepts an OpenAI API key.
Each session uses the agent login of the member who starts it.
Model use goes to that member's connected account.

Select **+** to start another session in the same workspace.
The sessions share its files and branch.
Use a separate workspace when a task needs its own files and branch.

- [Connect and share agent logins](/docs/agent-logins)
- [Use sessions and chat](/docs/sessions-and-chat)

## Follow and review the work

The workspace keeps your conversation beside the code and tools.

- Follow the agent's progress and answers in chat.
- Open **All files** to read a file.
- Open **Changes** to inspect edits.
- Use **Terminal** to run commands on the cloud computer.
- Use **Preview** to open a running app on one of its ports.

Send another message to guide an agent while it works.
Select **Stop** to end its current turn.
A later message continues the conversation.

An inactive cloud computer can stop.
Its files and sessions stay.
Your chat history remains available while it starts or stays stopped.
Open a stopped workspace to start its computer again.
If it stops while the workspace is open, select **Resume**.

- [Review files and changes](/docs/files-and-changes)
- [Use Terminal and previews](/docs/terminal-and-previews)
- [Follow a pull request](/docs/pull-requests)

## Work with your team

Every member of an org can see its workspaces and chats.
Every member can send messages in them.
An admin manages the members, repositories, scripts, and environment variables.

Members with terminal access can read credentials available on a workspace's cloud computer.
Work in an org with people you trust with your agent and GitHub logins.

Each workspace has a number, such as `W-12`.
Select the number in its header to copy its link.
Paste the link into a chat in the same org.
The link shows the workspace's number, name, and state in a small box.

- [Manage orgs and members](/docs/orgs-and-members)
- [Understand access to credentials](/docs/security)

## Start your first task

To start with a new org:

1. Select **Sign in** in the site header.
2. If your account waits, get access through approval, an invite code, or an org invitation.
3. Follow **Get started** to install the GitHub App and create your org.
4. Connect at least one agent login while Conductive prepares the org's cloud computer.
5. After the first build succeeds, send a message in **New workspace**.

During open sign-up, sign-in gives access at once.
If you join an existing org, use its repositories and shared setup.

The first message creates your workspace and its first session.
Conductive then starts the workspace's own cloud computer.
The workspace keeps your message until the agent can begin.

- [Get started](/docs/get-started)
- [Create and manage workspaces](/docs/workspaces)
- [Configure the shared cloud computer setup](/docs/cloud-computer)
- [Install the Mac app](/docs/mac-app)
