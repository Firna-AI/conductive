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
You also need a usable personal or org login for the agent you choose.
You need no personal login when the org login serves you.
Your GitHub account needs read access to the repository for the new workspace's start.

If you joined an org, its admin manages the repositories and shared setup.

- [Connect an agent login](/docs/agent-logins)
- [Prepare the org's cloud computer](/docs/cloud-computer)

## Create a workspace from a message

1. Open your org.
2. Select **New workspace**.
3. Choose the repository for the task.
   **New workspace** starts with the org's default repository.
4. Keep the default branch, or choose another starting branch.
5. If you choose another branch, open the branch control again and choose its target under **Target**.
6. Choose a favourite or a model in **All models**.
7. Adjust the effort and **Fast** if needed.
8. Describe the task in the message box.
9. Select **Send** on the page, or **Create** in the dialog.

A favourite sets the model, effort, and **Fast** together.
With no favourites to show, choose a model in **All models**.

- [Choose models and set favourites](/docs/sessions-and-chat#choose-a-model)

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

Before the org's first successful build, the send button stays off.
You can keep a draft in **New workspace** while that build runs.

The repository menu lists the org's repositories in the order that admins set.
[Order repositories](/docs/cloud-computer#order-repositories) says how.
A newly added repository shows as unavailable in the repository menu until its build succeeds.
Its note says when it will be ready.
The send button stays off while the selected repository waits for its build.

## Start from another branch

**New workspace** selects the repository's default branch at first.
The branch control sits beside the repository on the page and in the dialog.
In the dialog, it shows only a branch icon while the default branch is selected.
Open it to search the branches that your GitHub account can read.
The default branch appears first.
Conductive creates its own branch from the latest commit of the branch you select.

If you select another branch, open the branch control again.
Under **Target**, choose where your work will merge:

- Target the selected branch to include only your new work in the pull request.
- Target the default branch to include the selected branch's commits too.

The selected branch is the target until you choose otherwise.
When the default branch is the target, the branch control adds an arrow and the default branch's name, such as `→ main`.
Choosing another branch that is not the default keeps your target choice.
Changing repositories clears your branch and target choices.
**Changes**, diffs, and **Create PR** use this target as the workspace's base branch.

If the list shows **Try again**, select it to reload.
The default branch stays available while the list loads or cannot load.
If the selected branch is missing on GitHub, **New workspace** keeps your message.
Select **Start from** followed by the default branch's name, or choose another branch.

## Choose the page or dialog

**New workspace** opens as a page or as a dialog over the current screen.
On a computer, a new account opens the dialog.
Older accounts keep the page.

1. Open **Settings**.
2. Select **Preferences** under **Account**.
3. Find **New workspaces**.
4. Set **Open New workspace in** to **Page** or **Dialog**.

The setting saves at once.
The dialog uses **Create** for its send button.
A phone always opens the page.

The dialog shows the section at the top right.
Select it to put the new workspace in another section.
The page and dialog share the draft for the same org and section.
Closing the dialog keeps that draft and its section.

## Follow the task

The header shows the repository, owner, and state of the agent or cloud computer.
The workspace can show **Untitled** before it receives an automatic name.
The name comes from the first message.

The branch name uses a GitHub login, a city, and a short suffix.
When the workspace receives its name before the cloud computer creates the branch, the city changes to the name.
After that, the branch name stays the same, also when you rename the workspace.
To see the checked-out branch, run this command in **Terminal**:

```bash
git branch --show-current
```

Keep the workspace's branch name when you push.
Renaming it can stop the pull request bar from following the work.
Use **Continue** after a merge to start a new branch that the bar follows.

Open another workspace while an agent works.
The list mark shows the state of the pull request bar, in the colour of the bar:

| Colour | Meaning |
| --- | --- |
| Red | Checks failed. |
| Green | Ready to merge. |
| Purple | The pull request merged. |
| Amber | A merge conflict, requested changes, or a block. |
| Grey | Checks are running, or the pull request is a draft. |
| Dim grey | No pull request, or closed without a merge. |

Archived workspaces keep a faint grey mark.

A light runs around the mark while the agent works, the workspace starts, or the checks run.
The moving light means that you do not need to act.
The mark turns blue and pulses when the agent needs input.
The pull request bar still shows the state of the pull request.
With reduced motion, a still ring means the agent works or the workspace starts.
A still blue middle column means it needs input.
Bold workspace names mark unread output.

The command palette and workspace links use the same marks.

Sessions in one workspace share its files and branch.
Use **+** for a new conversation on that same task.

- [Use sessions and chat](/docs/sessions-and-chat)

## Copy a workspace link

1. Open the workspace.
2. Select its number in the header, such as `W-12`.
3. Paste the copied link into a message in the same org.

**Link copied** confirms the copy.

You can also copy the link from the workspace's menu.
Right-click the workspace's row, or press **Shift+F10** while the row has focus.
You can also select the workspace's name in the header of the open workspace.
Then select **Copy link**.
This works for archived workspaces too.

The pasted link shows the workspace's number, name, and list mark in a small box.
Its name and mark follow the workspace as they change.

The link opens the workspace for a person who has access.
It grants no org membership.
A direct link or a chat link still opens a removed workspace's read-only chat.
Typing `W-12` alone leaves plain text in the message.

## Organize work with sections

Use a section's menu to create a workspace in that section.
The **New workspace** action at the top of the list uses **General**.
In the **New workspace** dialog, you can select another section.

The section menu also offers **Rename section**, **Move section up**, **Move section down**, **New section**, and **Delete section**.
**New section** asks for a name in a dialog, and adds the new section directly below this one.
Deleting a section moves its workspaces to **General**.
The default section stays available.

A sub-workspace is a workspace nested under another workspace, its parent.
A tree contains a top-level workspace and all sub-workspaces nested under it.
Sub-workspaces that are in sections follow their parent when it moves between sections.
Each tree stays open in the list.
Collapsing a section hides the workspaces in it, except the workspace that you have open.

Drag a top-level workspace to move its whole tree between sections.
Drag the header of a section to move the section to another place in the list.
On a phone, use a long press to lift a top-level row or a section header.
With a keyboard, focus a top-level row and press **Alt+Up** or **Alt+Down**.
On a Mac, use **Option** in place of **Alt**.
The workspace that you have open in a collapsed section does not move this way. Use **Move to section** in its menu, or open the section first.
Every member of the org sees the same order of sections.

You can also select **Move to section** in the top-level row's menu.
This moves the whole tree to the top of the section you choose.
Between sections, a nested row moves with its top-level workspace.
Its menu has no **Move to section**.
To move a workspace under another parent, or out of its tree, ask an agent.

Queued workspaces leave their sections and show in **Merge queue** at the top of the list.
A queued sub-workspace has its own row in this group.
When a parent joins, its sub-workspaces in sections show under the nearest workspace above them that is in a section.
If none is in a section, they show at the top level.
They return under their parent when it returns to its section.

- [Use the merge queue](/docs/pull-requests#merge-queue)

## Let an agent manage workspaces

Ask an agent to create, inspect, or rename a workspace.
It can also move a top-level workspace and its whole tree to the top of a section.
If it moves a nested workspace only to another section, nothing moves.
The reply names the top-level workspace to move instead.
It can find workspaces by owner, state, repository, name, parent, recent activity, and archive state.
Workspace lists leave out removed workspaces unless the agent asks for them.
An agent can still read a removed workspace and its sessions by ID.
Ask for your workspaces, or give another member's name or GitHub login.

Workspace and session lists can return a smaller page of results.
When an agent creates a workspace, it can set the workspace name and its first session's title.
It can also choose a starting branch and a base branch for the new workspace.
With only one branch choice, it uses that branch for both.
With neither choice, it uses the repository's default branch for both.

An agent puts related work in a sub-workspace of the current workspace:

- A part of a large task that runs in parallel.
- Follow-up work that the task starts.
- Work in another repository for the same task.
- Each change that needs its own pull request.

Unrelated work goes in a top-level workspace.
You can tell the agent where to put a new workspace.

The agent can name a parent workspace in the same org when it creates the workspace.
Without a parent, the new workspace shows at the top level.
If the agent also names another section, the sub-workspace still follows its parent.

An agent can also move a workspace under another parent, or out of its tree to the top level.
Every sub-workspace under the workspace moves with it.
Under the new parent, the workspace and its sub-workspaces join the parent's section.
At the top level, they go to the top of their section, or of a section that the agent names.
A workspace cannot move under itself or under a workspace nested under it.

Each sub-workspace has its own cloud computer, branch, sessions, and pull request.
It also has its own Archive and Restore.
The agent learns its workspace's parent and nesting level when its session starts.
After a move, a new session gets the new ones only after the cloud computer starts again.
A session that started before the move keeps the old ones.
Ask the agent to look up its workspace for the current ones.
It can find a workspace's parent and its direct sub-workspaces.

Sub-workspaces can nest three levels below a top-level workspace.
Archived workspaces still count toward this limit.
A deeper create fails with advice to create a sibling of the deepest workspace.
A sibling shares the same parent.
The advice asks for a one-word name prefix that shows the group, such as `Limits: `.
A move that goes deeper fails, and nothing moves.

Agents can also create and delete sections.
Deleting a section moves its workspaces to **General**.
The default section stays available.

Each change uses the rights of the member whose message started the agent's turn.
Only a workspace owner or org admin can archive it through an agent.
An agent can archive the workspace where it runs, which ends its turn.
The same Archive and Restore rules below apply.

Older cloud computers get sub-workspace tools when an automatic software update applies at a later start.

- [Understand what agents can reach](/docs/security#understand-what-agents-can-reach)
- [Get the current workspace tools](/docs/cloud-computer#apply-setup-changes)

## Resume a stopped computer

The computer stops after a set time without user activity and without a running agent turn.
An open tab alone does not keep it running.
Using a port preview or the preview of an HTML file does not keep it running either.
A normal stop keeps its files, sessions, and chat history.
Services do not count as activity and never keep the computer running.
The stop ends every service and discards its saved command, settings, and logs.
Start needed services again after **Resume**.

Open a stopped workspace to start its computer again.
If it stops while the workspace is open, select **Resume**, or open a file, a change, or a skill.
The history remains readable while the computer starts.
A file, change, or skill that you open then waits for the computer, then opens.
One that already shows stays.

A message from an agent tool also starts a stopped workspace's computer.
This includes the first message of a session that an agent creates.
The start follows the same checks as opening the workspace.
It can also retry a failed later start.
A failed first start still waits for **Try again**.
Creating a session without a message starts no computer.

A late answer to a secret request can also start the computer.
This happens when you allow the secret or supply a value after the agent stopped waiting.
The agent receives a message in the session that asked.
The start follows the same checks as opening the workspace.

An accepted watch wake can also start the computer.
It returns to the session that set the watch.
The start follows the same checks as opening the workspace.

The merge queue can start the computer for an agent turn that resolves a rebase conflict.

**Stop** in chat interrupts an agent turn.
Services keep running after this Stop.
It is separate from the computer's automatic stop.
It also drops that session's earlier pending watch wakes.
An automatic idle stop keeps those watches.

## Restart the software

Select the state in the workspace header, such as **Ready**, then **Restart**.
Restart restarts Conductive's agent software, terminal software, and port previews in the running computer.
After a software update, Restart also brings terminal tabs to a workspace that had only one terminal.
Use it when an agent or a preview stops responding, or to apply a software update now.
Any member of an active org can restart a workspace while it is ready, working, needs input, or has unread output.
Its owner must not be suspended.

Restart first downloads the newest software, for up to 60 seconds.
If that download fails, a message says so, and the restart uses the installed software.
The header shows **Starting** until the agents are back.

Restart stops each running agent turn, so it asks first while an agent works.
Services keep running.
The shells and commands in your terminals keep running.
An open terminal tab disconnects until the agents are back. Then select **Reconnect**.
Files, sessions, and chat history stay.
If the restart fails, the workspace shows an error with **Try again**.

Conductive can restart the software automatically when the cloud computer is running and the agent has been disconnected for at least 3 minutes.
A message must have waited for at least 1 minute.
The header shows **Starting** until the agent is ready to receive the message.
The automatic restart stops each running agent turn without asking first.
The shells and commands in your terminals keep running.
An open terminal tab disconnects until the agents are back, as with **Restart**.

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
Your GitHub account needs read access to fetch the branch for the next task.

1. Open the merged workspace.
2. Wait for every running agent turn in that workspace to finish.
3. Select **Continue** in the pull request bar.
4. Read the question if it lists work that is not pushed.
5. Select **Continue anyway** to keep going, or **Cancel** to keep the current branch.

On a phone, open **Checks** from the pull request row to find **Continue**.
The computer starts first if it is stopped.
The new branch starts from the latest commit of the branch that the pull request merged into.
If that branch no longer exists, Continue uses the repository's default branch.
The starting branch becomes the workspace's base branch for its new task.
The new branch name uses the workspace name, a version such as `v2`, and a new short suffix.
A workspace without a name uses a city in place of the name.

Continue keeps the same cloud computer, files, running servers and services, sessions, and workspace name.
It also keeps the software installed by the org's install script.
Conductive's own software still updates itself.
Changed files move to the new branch.
Commits that are not pushed stay on their local branches.
The question counts those commits across all local branches, including earlier tasks.

The earlier branch stays on GitHub with its merged pull request.
Each session shows who continued and the new branch.
The pull request bar then follows that branch without a pull request.

If changed files clash with the new base branch, Continue stops and keeps the earlier branch.
Review the files with the agent or **Terminal** before trying again.
For another failure, follow the reason shown under the bar.

- [Use pull request actions](/docs/pull-requests)
- [Apply updated cloud computer software](/docs/cloud-computer#apply-setup-changes)

## Change the repository

Every org member can move a workspace to another repository of the org.
The workspace keeps its cloud computer, number, link, name, sessions, and chat.
It gets a new branch in the folder of the new repository.

1. Open the workspace.
2. Wait for every running agent turn, **Continue**, and **Restart** in that workspace to finish.
3. Select the repository in the workspace header.
   On a phone, it is in the line under the workspace name.
4. Select the new repository in the menu.
5. Read the question if it lists work.
6. Select **Change repository** to keep going, or **Cancel** to keep the current repository.

The menu lists only the org's repositories that the workspace's cloud computer holds.
When no other repository can show, the header shows the repository as text, with no menu.
A repository that the org added after the workspace started does not show.
Create a new workspace to use it.

The question lists the work that the workspace stops following.
This work can be files not committed, commits not pushed, an open pull request, and pushed commits of the branch.
That work stays with the old repository.
The question also lists the changed files in the folder of the new repository.
These files move to the new branch.
Without such work, the change starts at once.

If the message says "Restart the software, then try again.", the computer needs newer software first.
Use **Restart**, as [Restart the software](/docs/workspaces#restart-the-software) says, then change the repository again.

The computer starts first if it is stopped.
The new branch starts from the latest default branch of the new repository.
That default branch becomes the workspace's base branch.
The base follows a later rename of that default branch.
Conductive fetches the new default before the cloud computer targets it.
A stopped computer completes this move when it resumes.
Your GitHub account needs read access to fetch it.
The new branch name uses the owner's GitHub login, the workspace name, a version such as `v2`, and a new short suffix.
The change copies the `.context/` folder into the folder of the new repository.
A file that already exists there stays.
If the copy fails, the change stops before the new branch, and a message names the reason.
While the change runs, new agent turns wait, and **Continue**, **Restart**, and **Archive** are not available.

Each session shows who changed the repository, the new repository, and the new branch.
The agents keep their conversations and work in the new folder.
Programs that already run, such as development servers, keep running in the old folder.
Their previews show the old repository until you start them again in the new folder.
For a service, stop it and start it from the new folder.
Its **Restart** action uses its saved folder.
The pull request bar then follows the new branch without a pull request.
Each idle shell in the old folder moves to the new folder, and a line that you typed but did not send is cleared.
A shell that runs a command keeps its folder.
File tabs of the old repository close.
The startup script runs in the new folder at the next start.
The old branch, its pull request, and the files in the old folder stay.
If the pull request was queued, it leaves the merge queue.

If the change fails, the workspace keeps its repository and branch, and a message names the reason.
If changed files in the new folder clash with its latest default branch, commit or discard them, then try again.

- [Continue after a merge](/docs/workspaces#continue-after-a-merge)

## Archive a workspace

In an active org, only the workspace owner and org admins can archive it.
On a computer, point to the workspace's row in the org's workspace list.
Select **Archive workspace** when its icon appears over the time.

You can also open the workspace's menu:

- On a computer, right-click the row.
- With a keyboard, press **Shift+F10** while the row has focus.
- Select the workspace's name in the header of the open workspace.

Then select **Archive**.

After a merge, you can also select **Archive** in the pull request bar.
The command palette offers **Archive workspace** for the workspace you have open.
Open the palette with **⌘K** on Mac or **Ctrl+K** on other computers.

Archive works while the computer is running, stopped, starting, or has an error.
Archive does not check for uncommitted files or unpushed commits.
It asks no confirmation question.
Archive stops the computer and its agent work at once.
Archiving a queued workspace removes its pull request from the merge queue.

Sub-workspaces that are not archived keep working when you archive their parent.
If the parent was in a section, its sub-workspaces in that section take its place.
Sub-workspaces in sections show under the nearest workspace above them that is in a section.
If none remains above them, they show at the top level.

Conductive keeps the computer and its files for 14 days after Archive.
The workspace stays in **Archived** for those 14 days.
Its chat is read-only.
File lists, Terminal, previews, and other workspace tools stay unavailable while it is archived.

The notification after Archive names the workspace and offers **Restore**.
It also gives the day the workspace leaves the list.
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
It also gives the day the workspace leaves the list, even when Restore is unavailable.

Restore brings back the workspace with its files and agent sessions.
A top-level workspace returns to its section and its place in the list.
A restored sub-workspace shows under the nearest workspace above it that is in a section.
It shows at the top level when none remains above it.
Restoring a parent puts its sub-workspaces in sections back under it.

The workspace comes back stopped.
Restore does not start its computer.

If the workspace is already open, select **Resume** to continue.
Opening it later starts the computer as for another stopped workspace.
Restore keeps the workspace's owner.
If that owner is suspended, ask an org admin to reassign the workspace before resuming.

Restore ends after 14 days, even while the computer's deletion is still in progress.
Conductive deletes the cloud computer and the files on it.
The workspace leaves **Archived**, the command palette, and the workspace counts of the org.
A direct link or a chat link still opens its read-only chat.
The bar says **Removed on** followed by the removal date.
Its text says that the cloud computer is deleted or is being deleted.

Conductive keeps the workspace's chat history until the org is deleted.
Keep work in GitHub if you need it after the Restore window ends.

- [Review files and changes](/docs/files-and-changes)
- [Work with pull requests](/docs/pull-requests)
