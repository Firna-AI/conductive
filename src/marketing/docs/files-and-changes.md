---
title: Files and changes
description: Read repository files, preview HTML pages, inspect branch changes, copy paths or content, and add files to chat.
group: Work
order: 30
---

## Open the files of a workspace

Open a workspace that belongs to one of your orgs.
Its file tools use the workspace's selected repository.
If its computer is stopped or starts again, the file lists show their last saved copy.
Opening a file or a change starts the computer again.

On a computer, the file lists sit beside the chat.
On a phone, open the workspace's **Files** view.

- **All files** shows the repository as a tree. With current cloud computer software, the tree can include files in `.context/`.
- **Changes** lists changes against the workspace's base branch.
- **Checks** shows the pull request's GitHub checks.

An [automatic software update](/docs/cloud-computer#apply-setup-changes) brings `.context/` support to an older workspace at a later start or when it is idle.

Workspaces in a suspended org have no file lists.
An archived workspace keeps read-only chat, with no file lists or tools.
Its computer and files can stay available for Restore for 14 days after Archive.
Restore the workspace while **Restore** is available.
Then select **Resume** before you use the file tools.

After 14 days, the workspace leaves **Archived** and the command palette.
A direct link or a chat link still opens its read-only chat.
Conductive keeps its chat history until the org is deleted.
File tools stay unavailable after removal.

- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)

## Find files outside the lists

With current cloud computer software, **All files** lists up to 50,000 files and folders in total.
**Changes** lists up to 1,000 changed files.
A notice about a limited list gives the number of files or folders left out.

The **Changes** tab and the summary above the list show the number of changed files.
The summary also shows totals for lines added and removed.
These numbers cover all changed files when **Changes** has a notice about files left out.
When that notice is absent, the numbers cover only the files in the list.

To find files or review changes outside the lists, use **Terminal** or ask the agent.
Older cloud computer software keeps full lists until its [automatic software update](/docs/cloud-computer#apply-setup-changes).

## Read a file

1. Open **All files**.
2. Open the folders that contain your file.
3. Select the file.

On a computer, a click opens a file in one temporary tab.
Its title shows in italics.
The next click on another file replaces it in the same place.
This applies to **All files**, **Changes**, and file chips in chat.
A skill that you select in a message also opens in that tab, with the text that the agent reads.
If a file or a skill already has a tab, a click shows that tab.
Press **Escape** to close the temporary tab while it shows.
Escape first closes an open menu or dialog, and it does nothing in the message field.

On a phone, each file opens within **Files**.
Use its back action to return to **All files**.

Text shows line numbers and syntax colours.
Markdown offers **Preview** for its rendered content and **Source** for its text.
An HTML file opens as a page, as [Preview an HTML file](#preview-an-html-file) says.
PNG, JPEG, GIF, and WebP files show as pictures up to the 5 MiB read limit.
A picture keeps its proportions and fits the view.
To zoom, use the wheel, pinch, or use the zoom bar under the picture.
Drag a zoomed picture to move it.
Double-click the picture to zoom in, and double-click it again to fit it.
On desktop, select **Expand** to show the picture in a large window.
SVG files show their source as text.

Other binary files offer **Download** so you can open them with another application.
The file view also offers **Download** if the browser cannot draw an image within the read limit.

You can read files, copy content or paths, and add files or folders to chat.
To change a file, ask the agent or use **Terminal**.

You can open a file from its chip in an agent reply.
A chip with a line, such as `app.ts:42`, opens the file as text with that line in view and marked.
The address of the tab keeps the line.

You can also open an attached file from its chip in a sent message.
It opens the copy in the workspace's repository folder after the message reaches the agent.
Restore an archived workspace within 14 days before opening its attached files.

- [Attach files to messages](/docs/sessions-and-chat#attach-files)

## Preview an HTML file

An HTML file opens as a page, with its styles, pictures, and scripts.
For example, an agent can write a report as a web page in `.context/`.

1. Open **All files**.
2. Select a file whose name ends in `.html` or `.htm`.
3. Read the page in **Preview**, or select **Source** to read its text.

The page runs on a separate domain from Conductive, as a port preview does.
Use **Reload** to load the page again.
Use **Expand** to show the page in a large window over the whole app.
Use **Open** to show the page in a new browser tab.
In the Mac app, **Open** uses your default browser.

The page loads again by itself when its own file changes.
After a change to another file, such as its style file, select **Reload**.
A chip with a line, such as `report.html:12`, opens **Source** with that line in view.
A file whose path label hides a secret value shows only **Source**.

The page loads other files of the repository by their addresses, such as `style.css`.
An address that starts with `/` can name a file from the top of the repository.
With current cloud computer software, the page can also load a file by its full path in the repository folder.
The preview changes local `file:` addresses of files in the repository folder or the system font folders to addresses on the preview when it serves HTML, CSS, or SVG.
If a script builds a local file address while the page runs, use a plain path.
The page cannot load files whose names start with a dot, such as `.env`, or files in `.git`.

Outside the repository folder, the preview serves only font files under `/usr/share/fonts` and `/usr/local/share/fonts` on the cloud computer.
It serves `.ttf`, `.otf`, `.woff`, and `.woff2` files there by their full paths.
The preview adds a stylesheet for `.ttf` and `.otf` system fonts to HTML pages only.
An HTML page can use these fonts by family name, such as `Nimbus Sans Narrow` when it is installed on the cloud computer.
Generic families such as `sans-serif` use the browser's usual fonts.

The page's scripts can read the files and the list of system fonts that the preview serves.
They can send them to another site.

The preview has no 5 MiB limit, but **Source** keeps it.
It does not appear in **Preview** or in the previews that agents list.
If the tab asks for newer software, select **Restart** in the workspace header.
An [automatic software update](/docs/cloud-computer#apply-setup-changes) also brings the preview to an older workspace at a later start or when it is idle.

- [Understand previews](/docs/security#understand-previews-and-mac-commands)

## Copy a path or add a file to chat

Use a row's menu in **All files** or **Changes**.
In **All files**, folder rows offer the menu too.

On a computer:

1. Right-click the row.
   With a keyboard, press **Shift+F10** or the **Menu** key while the row has focus.
2. Select **Add to chat** or **Copy path**.

On a phone:

1. Open **Files**.
2. Press and hold a row without moving to open its menu as a sheet.
3. Select **Add to chat** or **Copy path**.

**Copy path** copies the path from the repository root, such as `src/app.ts` or `src/lib`.
It has no starting `./`, final `/`, or quotes.
**Path copied** confirms the copy.
If it fails, the notice says **The path didn't copy. Try again.**
Open the menu again to retry **Copy path**.

For a moved file in **Changes**, the item copies its new path.
For a deleted file, it copies the path that the file had.

**Add to chat** shows the session tab you viewed last.
On a phone, it switches to that chat.
The file or folder appears as a chip, a small box in the message field.
The chip goes at the text cursor, or at the end if the field has no cursor.
With no open session tab, the item starts a new session with the chip.

Write your request beside the chip.
Select **Send** when it is ready.

**Add to chat** is available only for files and folders that the `@` list can mention.
The menu leaves it out for deleted files in **Changes**.
It also leaves it out while a cloud computer status bar replaces the message field, such as while the computer is stopped.
It also leaves it out until the chat of the workspace loads.

A row whose path label hides a secret value offers neither item.
A right click on that row opens the browser's own menu.

- [Mention a repository file in a message](/docs/sessions-and-chat#mention-a-repository-file)

## Keep a file open

On a computer, keep a file in a normal tab so that another file does not replace it.
Double-click its row in **All files** or **Changes**.
You can also double-click the tab.

To use the tab menu:

1. Right-click the temporary tab.
   With a keyboard, press **Shift+F10** or the **Menu** key while the tab has focus.
2. Select **Keep open**.

A file or diff tab also offers **Copy path** in its tab menu.
On a temporary tab, it comes after **Keep open**.
It comes before **Move left** and **Move right**.
A tab whose path label hides a secret value leaves out **Copy path**.

Moving the temporary tab to another place in the row also keeps it.
A normal tab stays open until you close it.
The next file without a tab opens in a new temporary tab.

In an archived workspace or a suspended org, file and diff tab menus offer only **Copy path**.
Use a double-click to keep a temporary tab there.

## Inspect changes

1. Open **Changes**.
2. Select a changed file.
3. Review its diff against the workspace's base branch.

The diff shows syntax colours, as a file does.

The base branch is the branch that the workspace's work targets.
A workspace you create targets the branch you select in **New workspace**.
You can choose the default branch as the target instead.
A run for an opened or pushed pull request uses that pull request's head branch.
A run for a merged pull request uses that pull request's base branch.
After **Continue**, the base is the branch that the pull request merged into, if it still exists.
Otherwise, the base is the repository's default branch.
After a repository change, the base is the latest default branch of the new repository.
A base that follows the default also follows a later rename of that default branch.
While a workspace is queued, its base follows its pull request's target on GitHub.
Outside the queue, if GitHub deletes the base branch, Conductive fetches the default branch into the cloud computer.
The cloud computer uses the new base only after that fetch succeeds.
The comparison starts at the common commit of the workspace branch and its base branch.
Newer commits on the base branch therefore stay out of **Changes**.

The comparison includes the branch's committed changes, uncommitted changes, and untracked files.
It covers the workspace branch's work, including work from other sessions.
It is broader than the changed-file summary of one agent turn.

Use the list to check the agent's result before you commit or open a pull request.
A committed file can remain in **Changes** while the branch differs from its base branch.

On an open pull request, files not committed give **Commit and push** priority in the bar.
Commits not pushed, with no files left to commit, give **Push** priority instead.
It replaces Merge, **Ready for review**, and the fix actions until that work is pushed.
Some uncommitted work can exist without a visible diff in this list.
Use `git status` in **Terminal** to inspect it.

## Copy or download content

Use the copy action in a file header to copy its text.
Use **Download** to save its original bytes on your computer.
The header confirms a copy with **Copied**.
To select only the text of a file or a diff, click in it and press **Cmd+A**, or **Ctrl+A** on Windows and Linux.
A copy of selected file text keeps its blank lines.

If copying or downloading fails, the header asks you to try again.
Read the file successfully before you try its download action.

File reads and downloads have a 5 MiB limit.
Large diffs can also exceed the reader's limit.
Use **Terminal** or ask the agent to inspect a file that is too large.

## Handle unavailable or older data

The file lists update as the workspace reports changes.
If a fresh list is unavailable, a notice can appear beside older saved data.
A notice about files or folders left out stays visible with the saved list.
Before the first successful list, the view can show an unavailable state.

An unavailable list does not prove that the repository is empty.
Use **Try again** when a file read fails.
A file or change that you open while the workspace's computer starts waits for it.
It opens when the computer is ready.
A file or change that already shows stays open.

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
