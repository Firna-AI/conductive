---
title: Pull requests
description: Create and merge pull requests, ask agents to fix checks and conflicts, and continue on a new branch after a merge.
group: Work
order: 50
---

## Before you open a pull request

Use a workspace whose repository the GitHub App can reach.
Your GitHub account also needs permission for the work you want to push.
Joining a Conductive org does not add GitHub permissions to your account.

Review the edits before you push them.
The bar can ask the agent to create a pull request with files not committed or commits not yet pushed.

- [Inspect files and changes](/docs/files-and-changes#inspect-changes)

## Create a pull request with the agent

1. Open **Changes** to review the branch's edits.
2. Open the chat session you want the agent to use.
3. Select **Create PR** in the pull request bar.
4. Read the agent's result in that session.

The action asks the agent to commit the changes, push this branch, and open a pull request.
It targets the workspace's base branch, which is the branch this work will merge into.
A workspace you create uses the repository's default branch.
For a pull request run, its first message names the initial target under **Your work goes to**.
The pull request bar names the current target.
After **Continue**, the workspace targets the latest default branch of its repository.
Your draft and its attached files stay unchanged.
Conductive then shows the pull request's state for that branch.

If the bar shows **No commits yet**, make a change or ask the agent to start the task.
GitHub write access enables the agent actions.
An archived workspace or suspended org keeps only its GitHub links.

## Open the pull request on GitHub

Select the number of the pull request in the bar to open it on GitHub.
On a phone, use **Open on GitHub** at the top of **Checks**.

You can also create the pull request on GitHub yourself:

1. Review the edits in **Changes**.
2. Ask the agent to commit and push the work you want to include.
3. Open the branch on GitHub and complete the pull request there.

You can also ask the agent to create a pull request with the GitHub CLI.
The CLI is authenticated on computers with the current software.

GitHub operations in an agent turn use the person whose message started that turn.
Commands in the shared Terminal use the workspace owner's GitHub account.

Commits in each place name that same person as both author and committer.
An `author` or `committer` setting in the repository or in the global Git settings takes priority over the workspace owner's author.
In a workspace with older cloud computer software, agent commits name the workspace owner.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) says how to get newer software.
Conductive uses their GitHub display name, or their login when the display name is missing or unusable.
Each commit uses their private GitHub no-reply address, `<id>+<login>@users.noreply.github.com`.
Here, `<id>` is their GitHub user ID and `<login>` is their GitHub login.
GitHub links the commit to their account without showing their private email.

## Read the pull request state

On a computer, the bar sits above the file lists.
Select the pull request number in the bar to open the pull request on GitHub.
On a phone, the compact pull request row opens **Checks**.
The actions and GitHub links sit at the top of that view.

| State | Useful next action |
| --- | --- |
| No pull request, with local work or commits on GitHub that its base branch does not have | **Create PR** asks the agent to prepare it. |
| Checks running | Wait for the checks to finish. |
| Checks failed | **Fix checks** asks the agent to investigate, fix, commit, and push. |
| Merge conflict | **Resolve conflicts** asks the agent to merge the latest target branch, fix conflicts, test, commit, and push. |
| Changes requested | **Address review** asks the agent to read the comments, change code, commit, and push. |
| Draft | Open GitHub when you want to change its draft state. |
| Blocked | Open GitHub for the reason it blocks the merge. |
| Ready to merge | Select the displayed merge action when available. |
| Merged | Choose **Continue**, or **Archive** when you own the workspace or are an admin. |
| Closed without a merge | Open GitHub to review what happened. |

On an open pull request, local work gives **Commit and push** or **Push** priority over Merge and the fix actions.
Local work means files not committed or commits that have not been pushed.
When any file is not committed, **Commit and push** asks the agent to commit and push that work.
When only commits are left, **Push** asks the agent to push the branch.

Each agent action sends a fixed message to the chat session you viewed last.
It uses that session's model, effort, and normal send rules.
It preserves your draft and uploads.

**Address review** asks the agent to change code without replying on GitHub.
Select the pull request number to read, reply to, or resolve review comment threads on GitHub.
On a phone, use **Open on GitHub** at the top of **Checks**.
GitHub also has the other pull request controls.

- [Use actions in a chat session](/docs/sessions-and-chat#use-pull-request-actions-in-chat)

## Merge the pull request

Review the changes before selecting the merge action.
Its label names the method: **Merge**, **Squash and merge**, or **Rebase and merge**.
One selection starts the merge without a confirmation question.

The merge uses your GitHub account.
You need GitHub write access or more to see the action.
GitHub also needs to allow a merge method.
If Conductive cannot read that access, it hides Merge.
Local work on an open pull request shows **Commit and push** or **Push** instead.

GitHub checks your access and the branch's rules before completing the merge.
The bar shows **Merging** until the result arrives.
The merge alone does not archive the workspace.

If the branch has new commits, review them before merging again.
If the error says your GitHub access does not allow the merge, ask a GitHub repository admin for access.
For another refusal, use **Open on GitHub** to inspect the cause.

## Inspect checks

Open **Checks** to see the results that GitHub reports.
Each row shows the check's state.
A finished check also shows its duration.

Before a pull request exists, the view explains when its checks will appear.
**Fix checks** asks the agent to read failed check results and available failure logs.
For checks from other services, the agent can inspect their details or run them locally.
Use GitHub to browse detailed job output or rerun a check yourself.

## Recover from missing GitHub state

If the bar says **GitHub state did not load**, select **Try again**.
GitHub can also need time to update a pull request's merge state.
Follow the error's retry action when that happens.

If an agent action cannot send, the chat opens with the cause.
Open a session or connect its required login before trying again.
The action follows the same login and sharing rules as a message you write.

A computer with older software can lack the GitHub CLI.
If it is missing or fails, Create PR still asks the agent to push the branch.
After that push, create the pull request on GitHub.
Fix checks asks the agent to run the checks locally instead.
Address review asks the agent to stop and report the GitHub CLI failure.

If GitHub refuses a push or pull request, check your repository permissions.
Ask the org admin to check the GitHub App's repository access when needed.

- [Use updated computer software](/docs/cloud-computer#apply-setup-changes)

## Continue after a merge

Every org member can select **Continue** after the workspace's pull request merges.
It starts a branch from the latest default branch in the same workspace.
That default branch becomes the workspace's new base branch.
It keeps the computer, files, sessions, and workspace name.
Your GitHub account supplies the repository access for that fetch.
Continue waits while an agent turn runs in any session of the workspace.

- [Continue with local work or recover from a failed move](/docs/workspaces#continue-after-a-merge)

## Archive after a merge

After a merge, the workspace owner and org admins can select **Archive** in the bar.
Archive stops its cloud computer at once, without checking the work or asking a question.
It keeps the computer and its files for 14 days.
The chat stays read-only in **Archived**, with no file lists or tools.

The notification after Archive offers **Restore**.
Every member of an active org can restore the workspace while its computer and Restore window remain available.
Restore returns it to its section and place in the list, stopped.
Select **Resume** if the restored workspace is already open.
The archived bar and the command palette also offer Restore during that window.
On a computer, point to its row in **Archived** to find **Restore**.

Restore ends after 14 days.
Conductive then deletes the computer and its files.
The merge alone does not archive the workspace.

- [Archive a workspace](/docs/workspaces#archive-a-workspace)
- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)
- [Understand Terminal's GitHub identity](/docs/terminal-and-previews#know-which-github-account-a-command-uses)
