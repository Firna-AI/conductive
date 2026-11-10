---
title: Sessions and chat
description: Send tasks and follow-up messages, choose models, and manage conversations that share a workspace's files and branch.
group: Work
order: 20
---

## Start a conversation

A session is one agent conversation in a workspace.
The first message of a new workspace creates its first session.
Select **+**, named **New session**, to start another conversation.

Sessions in the same workspace share its cloud computer, files, and branch.
Use a separate workspace when a task needs a separate copy of the files.

You need a connected login for the agent you choose.
Other members can also send messages under the session's login-sharing rules.

- [Create a workspace](/docs/workspaces#create-a-workspace-from-a-message)
- [Connect an agent login](/docs/agent-logins)

## Send a message

1. Open the session's tab.
2. Choose a model and effort in the message box.
3. Write your message.
4. Use **Attach files** if the agent needs a file or picture.
5. Select **Send**.

On a computer, **Enter** sends the message.
Use **Shift+Enter** to add a line.
On a phone, **Enter** adds a line.

Attached files arrive in `.context/attachments/` in the workspace's repository folder.
New workspaces from a new computer build also get a `.context/` folder for agent notes, screenshots, and files for other sessions.
Git ignores the folder's files unless your repository already tracks them.
Use **Terminal** to find the ignored files.
**All files** and **Changes** do not list them.

You can send a message while the workspace's computer starts.
The chat shows that the message waits.
The workspace keeps accepted messages for the agent.

The org must have a successful build before you create a new workspace.
That first build is separate from the start of an existing workspace's computer.

## Choose a model

Each session has its own model and effort picker.
A different model of the same agent keeps the conversation in that session.

A model of the other agent opens a new session.
Your draft moves to it.
The earlier conversation stays in its original session.
The new session starts without a copy of that conversation.

If the chosen agent has no usable login, the message box offers **Connect** for that agent.
Connect the login in **Account** before you send.

## Guide or stop a running agent

Send another message to guide the agent while it works.
When your message uses the session's available login, it joins the running turn.
A turn is one period of work by the agent.

Select **Stop** to interrupt that turn.
The chat records the stop.
You can send another message to continue the conversation.

The agent's earlier work folds into a line when a turn ends.
Select that line to inspect its messages and tool calls.
The answer stays visible beside it.

## Read replies and tables

Agent replies can contain paragraphs, lists, code, and tables.
A wide table scrolls sideways inside the message.
The text around it keeps the width of the chat.

While a reply arrives, the chat shows its text and table rows as they arrive.
In the folded work of a turn, open a message line to read its table.

## Manage session tabs

Use a tab's menu to rename or move it.
Open the menu with a right click on a computer.
You can also use **Shift+F10** while the tab has focus.
On a phone, use a long press.

- **Rename session** changes the tab's title.
- **Move left** and **Move right** move it one place.
- Drag a tab to place it elsewhere in the row.

File and diff tabs share the row on a computer.
A phone shows the session tabs there.

Closing a session keeps its conversation in **Session history**.
If its agent is working, closing asks first because it stops the turn.
Open **Session history** to reopen the conversation.

## Know whose account a session uses

The member who starts a session supplies its agent login.
Model use in that session goes to that member's connected account.

If that member shares the login, other members' messages use it too.
The message box names that member's login when you use it.

If the login is private or unavailable, your message starts a new session on your own login.
That session links back to the earlier conversation.
It has no copy of the earlier history.

GitHub operations follow the person whose message started the running turn.
Commits name that person as both author and committer.
In a workspace with older cloud computer software, agent commits name the workspace owner.
Mac command requests go to that same person's connected Mac.
They can differ from the member whose agent login the session uses.
The agent can identify the member who sent each message.
Another member's message during a turn does not change its GitHub account, commit author, or receiving Mac.

- [Choose who can use an agent login](/docs/agent-logins#choose-who-can-use-your-login)
- [Understand account and credential access](/docs/security)

## Recover from an error

If the chat or session history does not load, use its **Try again** action.
If a turn fails, read its error before retrying.
**Try again** retries the newest failed request of that session.

A login or membership change can stop a waiting message from running.
Reconnect the needed login or send a new message under your own login.
Another member's retry can start a new linked session when the earlier login is unavailable.

If a turn says **Changed files unavailable**, inspect **Changes**.
That notice means its changed-file summary is missing.
It does not mean the agent changed no files.

- [Inspect files and changes](/docs/files-and-changes)
