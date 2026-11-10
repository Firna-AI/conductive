---
title: Workspaces
description: Start a task on its own branch and cloud computer, follow its progress, and keep the work you need.
group: Work
order: 10
---

## Before you create a workspace

A workspace gives one task its own branch and cloud computer.
Use separate workspaces for tasks that need separate files and branches.

You need access to Conductive and membership of an org.
The org needs a successful cloud computer build that includes your repository.
You also need a login for the agent you choose.
Your GitHub account needs read access to the repository for the new workspace's start.

If you joined an org, its admin manages the repositories and shared setup.

- [Connect an agent login](/docs/agent-logins)
- [Prepare the org's cloud computer](/docs/cloud-computer)

## Create a workspace from a message

1. Open your org.
2. Select **New workspace**.
3. Choose the repository for the task.
4. Choose a model and effort.
5. Describe the task in the message box.
6. Select **Send**.

For example:

```text
Find the cause of the failing checkout test.
Explain the fix before changing files.
```

Conductive creates the workspace and its first session when it accepts the message.
It then starts the workspace's cloud computer.
The start steps show its progress.
Your message waits until the agent can begin.

You can send more messages while that computer starts.
The workspace keeps its accepted messages after a failed first start.

Before the org's first successful build, **Send** stays off.
You can keep a draft in **New workspace** while that build runs.

## Choose the page or dialog

1. Open **Account**.
2. Open **Preferences**.
3. Find **New workspaces**.
4. Set **Open New workspace in** to **Page** or **Dialog**.

The setting saves at once.
The dialog uses **Create** for its send button.
A phone always opens the page.

The page and dialog share the draft for the same org and section.
Closing the dialog keeps that draft.

## Follow the task

The header shows the repository, owner, and state.
The workspace can show **Untitled** before it receives an automatic name.
The name comes from the first message.

The branch name uses a GitHub login, a city, and a short suffix.
It stays the same when the workspace receives a name.
To see the checked-out branch, run this command in **Terminal**:

```bash
git branch --show-current
```

Keep the workspace's branch name when you push.
Renaming it can stop the pull request bar from following the work.

Open another workspace while an agent works.
The list shows when a workspace needs input or has unread output.

Sessions in one workspace share its files and branch.
Use **+** for a new conversation on that same task.

- [Use sessions and chat](/docs/sessions-and-chat)

## Copy a workspace link

1. Open the workspace.
2. Select its number in the header, such as `W-12`.
3. Paste the copied link into a message in the same org.

**Link copied** confirms the copy.
The pasted link shows the workspace's number, name, and state in a small box.
Its name and state follow the workspace as they change.

The link opens the workspace for a person who has access.
It grants no org membership.
Typing `W-12` alone leaves plain text in the message.

## Organize work with sections

Use a section's menu to create a workspace in that section.
The **New workspace** action at the top of the list uses **General**.

The section menu also offers **Rename section**, **New section**, and **Delete section**.
Deleting a section moves its workspaces to **General**.
The default section stays available.

Drag a workspace to move it between sections.
On a phone, use a long press to lift its row.

## Resume a stopped computer

The computer stops after 30 minutes without user activity and without a running agent turn.
An open tab alone does not keep it running.
A normal stop keeps its files, sessions, and chat history.

Open a stopped workspace to start its computer again.
If it stops while the workspace is open, select **Resume**, or open a file or a change.
The history remains readable while the computer starts.
An open file or change waits for the computer, then opens.

**Stop** in chat interrupts an agent turn.
It is separate from the computer's automatic stop.

## Recover from a failed start

A computer start has a 20-minute limit.
If it fails, read the cause shown in the workspace.
Select **Try again** in that same workspace.

A failed first start keeps the workspace and its accepted messages.
If the create request itself fails, **New workspace** keeps the draft with **Try again**.

If the org has no successful build, ask an admin to check **Cloud computer** in **Settings**.
A newly added repository needs a build that includes it before a workspace can use it.

For a repository with no branches or tags, Conductive creates an empty first commit at the first start.
Your GitHub account needs permission to push that commit.

## Archive a workspace

Only the workspace owner and org admins can archive it.
On a computer, point to the workspace's row in the org's workspace list.
Select **Archive workspace** when its icon appears over the time.

Conductive checks for uncommitted files and unpushed commits.
If it finds work, the question lists it.
Cancel the archive to keep that work.
Choose **Archive anyway** only when you want to discard it.

Archive deletes the cloud computer and its files.
Its chat stays read-only in **Archived**.
Push important work to GitHub before you archive.

- [Review files and changes](/docs/files-and-changes)
- [Work with pull requests](/docs/pull-requests)
