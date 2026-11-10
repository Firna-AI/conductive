---
title: Pull requests
description: Push a workspace's changes, open its pull request on GitHub, and follow reviews and checks in Conductive.
group: Work
order: 50
---

## Before you open a pull request

Use a workspace whose repository the GitHub App can reach.
Your GitHub account also needs permission for the work you want to push.
Joining a Conductive org does not add GitHub permissions to your account.

The workspace branch needs commits on GitHub before the bar can offer **Create pull request**.
Review the edits before you push them.

- [Inspect files and changes](/docs/files-and-changes#inspect-changes)

## Open the pull request on GitHub

1. Open **Changes** to review the branch's edits.
2. Ask the agent to commit and push the work you want to include.
3. Select **Create pull request** in the workspace's pull request bar.
4. Complete the pull request on GitHub.

The action opens GitHub.
You can also ask the agent to create a pull request with the GitHub CLI.
Conductive then shows the pull request's state for that branch.

If the action is missing, check whether the branch has commits pushed to GitHub.
The bar can show **No commits yet** or **No pull request yet** before creation is available.

GitHub operations in an agent turn use the person whose message started that turn.
Commands in the shared Terminal use the workspace owner's GitHub account.

Commits in each place name that same person as both author and committer.
In a workspace with older cloud computer software, agent commits name the workspace owner.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) says how to get newer software.
Conductive uses their GitHub display name, or their login when the display name is missing or unusable.
Each commit uses their private GitHub no-reply address, `<id>+<login>@users.noreply.github.com`.
Here, `<id>` is their GitHub user ID and `<login>` is their GitHub login.
GitHub links the commit to their account without showing their private email.

## Read the pull request state

On a computer, the bar sits above the file lists.
On a phone, the compact pull request row opens the checks.

| State | Useful next action |
| --- | --- |
| Checks running | Wait for the checks to finish. |
| Checks failed | Inspect the failures before retrying the checks or changing the code. |
| Merge conflict | Open GitHub to inspect the conflict. |
| Changes requested | Read the review on GitHub. |
| Draft | Open GitHub when you want to change its draft state. |
| Blocked | Open GitHub for the reason it blocks the merge. |
| Ready to merge | Open GitHub to complete the merge. |
| Merged | Decide whether to archive the workspace. |
| Closed without a merge | Open GitHub to review what happened. |

Use **Open on GitHub** for the pull request's reviews and merge controls.
Conductive shows their state without merging the pull request itself.

## Inspect checks

Open **Checks** to see the results that GitHub reports.
Each row shows the check's state.
A finished check also shows its duration.

Before a pull request exists, the view explains when its checks will appear.
Use GitHub to inspect the detailed output of a failed check.

## Recover from missing GitHub state

If the bar says **GitHub state did not load**, select **Try again**.
GitHub can also need time to update a pull request's merge state.
Follow the error's retry action when that happens.

If GitHub refuses a push or pull request, check your repository permissions.
Ask the org admin to check the GitHub App's repository access when needed.

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
