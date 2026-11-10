---
title: Workspaces
description: Start a task on its own branch and cloud computer, follow its progress, and keep the work you need.
group: Work
order: 10
---

## Before you create a workspace

A workspace has its own cloud computer and one branch at a time.
After a merge, **Continue** starts its next task on a new branch.
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

A newly added repository shows as unavailable in the repository menu until its build succeeds.
Its note says when it will be ready.
**Send** stays off while the selected repository waits for its build.

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
Use **Continue** after a merge to start a new branch that the bar follows.

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

For a repository with no branches or tags, Conductive creates an empty first commit at the first start.
Your GitHub account needs permission to push that commit.

## Continue after a merge

Every org member can continue a workspace after its pull request merges.
Your GitHub account needs read access to fetch the repository's latest default branch.

1. Open the merged workspace.
2. Wait for every running agent turn in that workspace to finish.
3. Select **Continue** in the pull request bar.
4. Read the question if it lists work that is not pushed.
5. Select **Continue anyway** to keep going, or **Cancel** to keep the current branch.

On a phone, open **Checks** from the pull request row to find **Continue**.
The computer starts first if it is stopped.
The new branch starts from the repository's latest default branch.
That default branch becomes the workspace's base branch for its new task.

Continue keeps the same cloud computer, files, installed software, running servers, sessions, and workspace name.
Changed files move to the new branch.
Commits that are not pushed stay on their local branches.
The question counts those commits across all local branches, including earlier tasks.

The earlier branch stays on GitHub with its merged pull request.
Each session shows who continued and the new branch.
The pull request bar then follows that branch without a pull request.

If changed files clash with the latest default branch, Continue stops and keeps the earlier branch.
Review the files with the agent or **Terminal** before trying again.
For another failure, follow the reason shown under the bar.

- [Use pull request actions](/docs/pull-requests)
- [Apply updated cloud computer software](/docs/cloud-computer#apply-setup-changes)

## Archive a workspace

In an active org, only the workspace owner and org admins can archive it.
On a computer, point to the workspace's row in the org's workspace list.
Select **Archive workspace** when its icon appears over the time.

You can also open the row's menu:

- On a computer, right-click the row.
- With a keyboard, press **Shift+F10** while the row has focus.

Then select **Archive**.

After a merge, you can also select **Archive** in the pull request bar.
The command palette offers **Archive workspace** for the workspace you have open.
Open the palette with **⌘K** on Mac or **Ctrl+K** on other computers.

Archive works while the computer is running, stopped, starting, or has an error.
Archive does not check for uncommitted files or unpushed commits.
It asks no confirmation question.
Archive stops the computer and its agent work at once.

Conductive keeps the computer and its files for 14 days after Archive.
The chat stays read-only in **Archived**.
File lists, Terminal, previews, and other workspace tools stay unavailable while it is archived.

The notification after Archive names the workspace and offers **Restore**.
Use that action if you archived the workspace by mistake.

## Restore an archived workspace

Every member of an active org can restore an archived workspace within 14 days of Archive.
Restore is unavailable while the org is suspended or deleted.
Restore is available only while Conductive keeps the workspace's cloud computer.

You can use **Restore** from these places:

- The notification after Archive.
- The bar of the archived workspace.
- Its row in the **Archived** group, when you point to it on a computer.

The command palette offers **Restore workspace** for the archived workspace you have open.
On a phone, open its row.
Then select **Restore** in the workspace bar.
The archived bar gives the Archive date and the last day of Restore.

Restore brings back the workspace with its files and agent sessions.
It returns to its section and its place in the list.
The workspace comes back stopped.
Restore does not start its computer.

If the workspace is already open, select **Resume** to continue.
Opening it later starts the computer as for another stopped workspace.
Restore keeps the workspace's owner.
If that owner is suspended, ask an org admin to reassign the workspace before resuming.

Restore ends after 14 days, even while the computer's deletion is still in progress.
The archived bar shows when Restore ended until deletion completes.
It says the computer is deleted only after that deletion completes.
The chat stays read-only after the computer and its files are deleted.
Keep work in GitHub if you need it after the Restore window ends.

- [Review files and changes](/docs/files-and-changes)
- [Work with pull requests](/docs/pull-requests)
