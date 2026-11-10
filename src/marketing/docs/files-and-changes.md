---
title: Files and changes
description: Read repository files, inspect branch changes, and copy or download the content you need to review an agent's work.
group: Work
order: 30
---

## Open the files of a workspace

Open a workspace that belongs to one of your orgs.
Its file tools use the workspace's selected repository.
If its computer is stopped, select **Resume** before you use the tools.

On a computer, the file lists sit beside the chat.
On a phone, open the workspace's **Files** view.

- **All files** shows the repository as a tree.
- **Changes** lists changes against its default branch.
- **Checks** shows the pull request's GitHub checks.

An archived workspace keeps its chat without the computer or file tools.

## Read a file

1. Open **All files**.
2. Open the folders that contain your file.
3. Select the file.

The file opens as a tab on a computer.
On a phone, it opens within **Files**.
Use its back action to return to **All files**.

Text shows line numbers and syntax colours.
Markdown offers **Preview** for its rendered content and **Source** for its text.
Binary files offer **Download** so you can open them with another application.

These views let you read the files.
Ask the agent to change a file, or use **Terminal**.

## Inspect changes

1. Open **Changes**.
2. Select a changed file.
3. Review its diff against the default branch.

The list includes the branch's committed changes, uncommitted changes, and untracked files.
It covers the workspace branch's work, including work from other sessions.
It is broader than the changed-file summary of one agent turn.

Use the list to check the agent's result before you commit or open a pull request.
A committed file can remain in **Changes** while the branch differs from the default branch.

On an open pull request, files not committed or commits not pushed give **Commit and push** priority in the bar.
It replaces Merge and the fix actions until that work is pushed.
Some uncommitted work can exist without a visible diff in this list.
Use `git status` in **Terminal** to inspect it.

## Copy or download content

Use the copy action in a file header to copy its text.
Use **Download** to save its original bytes on your computer.
The header confirms a copy with **Copied**.

If copying or downloading fails, the header asks you to try again.
Read the file successfully before you try its download action.

File reads and downloads have a 5 MiB limit.
Large diffs can also exceed the reader's limit.
Use **Terminal** or ask the agent to inspect a file that is too large.

## Handle unavailable or older data

The file lists update as the workspace reports changes.
If a fresh list is unavailable, a notice can appear beside older saved data.
Before the first successful list, the view can show an unavailable state.

An unavailable list does not prove that the repository is empty.
Use **Try again** when a file read fails.
Check that the workspace's computer has started if the tools still wait.

If a turn says **Changed files unavailable**, open **Changes** to inspect the branch.
That notice describes a missing turn summary.

## Keep secrets out of shared files

Members of your org can open its workspace files.
File content, diff content, and downloads do not hide secret values.
The **Secret** mark on an environment variable does not change this access.

Some file labels can hide an exact secret value on screen.
The browser still receives the real file path.

- [Use Terminal and previews](/docs/terminal-and-previews)
- [Work with pull requests](/docs/pull-requests)
- [Read the security guide](/docs/security)
