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
| Workspace | Has its own cloud computer and one branch at a time. Continue starts its next task after a merge. |
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
Codex accepts an OpenAI API key or a sign-in to your ChatGPT plan.
Either agent can use an own endpoint: a gateway or proxy that you choose, with its address and key.
Each session uses the agent login of the member who starts it.
A subscription token or provider API key bills model use to that member's connected account.
An own endpoint bills model use where its owner runs it.
That endpoint gets the messages, files, and command results of each turn on its login.

Select **+** to start another session in the same workspace.
The sessions share its files and branch.
Use a separate workspace when a task needs its own files and branch.

Agents can create and manage workspaces and sessions across the org.
They can read results, manage sections, and open private previews.
Messages and stops from agent tools link to the sending session.

- [Connect and share agent logins](/docs/agent-logins)
- [Use sessions and chat](/docs/sessions-and-chat)
- [Understand what agents can reach](/docs/security#understand-what-agents-can-reach)

## Follow and review the work

The workspace keeps your conversation beside the code and tools.

- Follow the agent's progress and answers in chat.
- Open **All files** to read a file.
- Open **Changes** to inspect edits.
- Use **Terminal** to run commands on the cloud computer.
- Use **Preview** to open a running app on one of its ports.

The pull request bar offers actions for the next step.
It can ask the agent to prepare or fix a pull request, and merge it with your GitHub account.
After a merge, **Continue** starts a new branch in the same workspace.
The cloud computer and sessions stay.

Send another message to guide an agent while it works.
Select **Stop** to end its current turn.
A later message continues the conversation.

An inactive cloud computer can stop.
Its files and sessions stay.
Your chat history remains available while it starts or stays stopped.
Open a stopped workspace to start its computer again.
If it stops while the workspace is open, select **Resume**, or open a file or a change.

Archive stops the computer and keeps its files for 14 days.
The chat stays read-only in **Archived**, with no tools.
Use **Restore** during that window to return the workspace to its section.
Restore leaves the computer stopped.

- [Review files and changes](/docs/files-and-changes)
- [Use Terminal and previews](/docs/terminal-and-previews)
- [Follow a pull request](/docs/pull-requests)

## Work with your team

Every member of an org can see its workspaces and chats.
In an active org, every member can send messages in workspaces that are not archived.
An admin manages the members, repositories, scripts, and environment variables.

Members with terminal access can read credentials available on a workspace's cloud computer.
Work in an org with people you trust with your agent and GitHub logins.

Each workspace has a number, such as `W-12`.
Select the number in its header to copy its link.
Paste the link into a chat in the same org.
The link shows the workspace's number and name with the same mark as the workspace list.

- [Manage orgs and members](/docs/orgs-and-members)
- [Understand access to credentials](/docs/security)

## Send feedback

Report a bug, share an idea, or ask the team a question from the command palette.

1. Select **Search** above the workspace list.
2. Search for `feedback`.
3. Select **Send feedback**.
4. Write your message.
5. Select **Send**.

You can also open the palette with **⌘K** on a Mac or **Ctrl+K** on another computer.
Before sending, use **Add screenshots**, paste an image, or drop an image onto the dialog.
It accepts PNG, JPEG, GIF, and WebP images.
Together, the screenshots can be up to 7 MB.

The dialog shows the included context and the email address for a reply.
That address is your primary verified email on GitHub.
Closing the dialog keeps your draft in the open tab.
A failed send keeps the draft so you can try again.

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
