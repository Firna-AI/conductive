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

You can use a personal or org login for the agent you choose.
You need no personal login when the org login serves you.
Other members can also send messages under the session's login rules.

An archived workspace offers read-only chat instead of a message box.
Restore the workspace before starting a session or sending another message.
Restore is available for 14 days after Archive while its computer is kept.
Select **Resume** if the restored workspace is already open.

After 14 days, the workspace leaves **Archived** and the command palette.
A direct link or a chat link still opens its read-only chat.
The bar says **Removed on** followed by the removal date.
Conductive keeps its chat history until the org is deleted.

- [Create a workspace](/docs/workspaces#create-a-workspace-from-a-message)
- [Connect an agent login](/docs/agent-logins)
- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)

## Send a message

1. Open the session's tab.
2. Choose a favourite or another model in the message box.
   Adjust the effort and **Fast** if needed.
3. Write your message.
4. Use **Attach files** if the agent needs a file or picture.
5. Select **Send**.

On a computer, **Enter** sends the message.
Use **Shift+Enter** to add a line.
On a phone, **Enter** adds a line.
Your message appears in the chat at once.
The chat scrolls down to it, also when you read an earlier part of the chat.
When you read an earlier part of the chat, a round arrow button shows above the right end of the message box.
Select it to go to the newest messages.
If it cannot send, it goes back to the message box, and the chat shows the cause.
If the message arrives later, the chat removes the cause and clears the message box, unless you changed the text.

You can send a message while the workspace's computer starts.
The chat shows the steps of that start.
The workspace keeps accepted messages for the agent.

The org must have a successful build before you create a new workspace.
That first build is separate from the start of an existing workspace's computer.

## Mention a repository file

Use a mention for a file or folder that **All files** lists.

1. Type `@` at the start of your message, or after a space or line break.
2. Type part of the file or folder name.
3. Select its entry from the list.

The entry becomes a chip, a small box with its name, in the message field.
Your message gives the agent its path, such as `@src/app.ts` or `@src/lib/`.
Use **Attach files** for a file from your own computer.

When **All files** has a notice about files or folders left out, `@` says some files are outside the list if it finds no match.
Type the path in your message or ask the agent to find it.

A row's menu in **All files** or **Changes** offers **Add to chat** only if you can mention its path.

- [Find files outside the lists](/docs/files-and-changes#find-files-outside-the-lists)
- [Copy a path or add a file to chat](/docs/files-and-changes#copy-a-path-or-add-a-file-to-chat)

## Attach files

Use **Attach files** to pick files, or drop files into the message box.
In a workspace chat, you can drop files anywhere on the chat, also on the transcript or the session tabs.
The chat, **New workspace** page, and **New workspace** dialog all accept files.
Each file appears as a file chip, a small box in the text.
The chip shows the file's name and upload state.

A picked file goes at the text cursor, or at the end if the field has no cursor.
A file dropped on the text goes where you drop it.
A drop elsewhere uses the text cursor or the end.
The text cursor then moves after the new chips.

A paste of a long text, with 2,000 characters or 40 lines, attaches as a text file.
Its chip, such as **Pasted text.txt**, goes in place of the pasted text.
Undo takes the chip off, and the pasted text does not come back.
To keep the text in the message, paste it in smaller parts.

Each file can be up to 1 GB.
Wait for uploads to finish before you send.
If an upload fails, use **Try again** or remove its chip.
Removing a chip takes its file off the draft.
Undo brings back the chip and its file.

To attach a folder, drop it into the message box.
Your browser zips the folder before the upload, so the folder becomes one `.zip` file chip.
The zip holds every file and folder in it, also hidden files.
The zip can be up to 1 GB, as each file can.
If the browser cannot read the folder, use **Attach files** in the notice to pick its files.

Each chip keeps its place in the sent message.
When the message reaches the agent, select its file chip to open the copy.
The copy opens in the workspace's file view even if **All files** leaves out its path.
This can start a stopped cloud computer.
Restore an archived workspace within 14 days before opening its attached files.
After removal, the cloud computer and the attached files in it are deleted.

Attached files arrive in `.context/attachments/` in the workspace's repository folder.
Conductive keeps each attached file until the workspace's cloud computer has it and its first start succeeds.
It then deletes its own copy.
The file stays in the cloud computer.
Conductive deletes an unsent file 7 days after you upload it.

Each file keeps the same path when you retry its message.
A later message or **Try again** uses the file already in the cloud computer.
If a file is missing or its size changed, the turn fails and names it.
Attach that file again in a new message.

With current cloud computer software, workspaces also get a `.context/` folder for agent notes, screenshots, and files for other sessions.
Git ignores the folder's files unless your repository already tracks them.
Look for the files in **All files**.
**Changes** does not list them.
An older workspace gets this folder with an [automatic software update](/docs/cloud-computer#apply-setup-changes) at a later start or when it is idle.

- [Read files and pictures](/docs/files-and-changes#read-a-file)

## Use pull request actions in chat

Open the session you want before selecting an agent action in the pull request bar.
The action sends a fixed message from you to the session you viewed last.
It uses that session's model, effort, **Fast** setting, and login rules.
This also works while you view a file or **Checks**.

Your draft, attached files, and uploads stay as they were.
The action's message appears in chat as your message.
During a turn, it follows the same rules as a message you send from the box.
If it cannot send while you stay in the workspace on the same branch, the chat opens and shows the cause.
If you leave or change the branch before the failure arrives, your chosen page stays open.
The cause waits in that session's message box, also if you return before the failure arrives.

If the merge queue needs an agent to rebase a branch, it waits for all running turns in the workspace to end.
When no turn runs, it sends one message to the newest open session.
The member who added the pull request is the sender.
The session's login rules apply.

- [Choose a pull request action](/docs/pull-requests#read-the-pull-request-state)
- [Use the merge queue](/docs/pull-requests#merge-queue)

## Delegate work to another session

Ask an agent to create or list sessions, send a message, watch a turn, or read a transcript.
It can also inspect one session or message.
Its workspace tools reach every workspace of the same org.
Agents can also rename, stop, and close sessions there.
Closing a running session through the tools can stop its turn.
Use a separate workspace when the delegated task needs separate files and a branch.
The agent usually makes that workspace a [sub-workspace of the current one](/docs/workspaces#let-an-agent-manage-workspaces).

A watch tells the session that set it once when the watched turn finishes, fails, or stops.
The agent can name an exact turn ID, or watch the session's current active turn.
If the session is idle or the exact turn already ended, the call sets no watch.
The agent then reads that session at once.

When only the watched work remains, the agent ends its reply.
Its turn can end, and its computer can stop while the watch waits.
A wake appears as an app line with a link to the watched session.
The agent reads that session after the wake, then chooses its next step.
The line reports one turn's end.
The delegated task can still have work left.

**Stop** in the session that set a watch drops its earlier pending wakes.
Wakes already in the chat history stay there.
An automatic idle stop of the cloud computer keeps the watches.

Messages from agent tools end with a `---` line and **Sent by:** with a link to the sending session.
This also applies to the first message when an agent creates a workspace or session.
The link shows the workspace's state, number, a session icon, and the session title in a small box.
A session without a title shows **Untitled**.

Select the link to open that session.
A closed session reopens, as it does from **Session history**, and its tab shows again for every member.
In an archived or other read-only workspace, the session shows only in your browser and stays closed.
An unknown session opens the workspace page.
If that workspace is already open, its selected tab stays.
The title of a session in another workspace updates when the chat loads.
Session links also show as small boxes in agent answers and pasted message drafts.
A member can type the same **Sent by:** line, so it does not prove who wrote a message.

An agent can read archived and removed workspaces by ID.
It can also read closed sessions.
Workspace lists leave out removed workspaces unless the agent asks for them.
It cannot send messages to an archived or removed workspace or a closed session.
Use **Stop** in each affected session if agents keep replying to each other without useful work.

- [Get the current workspace tools](/docs/cloud-computer#apply-setup-changes)
- [Understand what agents can reach](/docs/security#understand-what-agents-can-reach)

## Choose a model

Each session has its own model menu.
The menu lists your favourites first.
A favourite sets a model, its effort, and **Fast** together.
Each row names those choices, such as **Opus 5.5 Max Fast**.

1. Open the model menu in the message box.
2. Choose a favourite, or open **All models** and choose another model.
3. Open **Effort** to change the effort if needed.
   The **Effort** row shows the current effort.
4. Turn **Fast** on or off if needed.

On a phone, **All models** and **Effort** replace the menu.
Select **Back** to return.
With no favourites to show, the menu starts with **All models**.
A favourite gets a mark only while all three settings match your current choice.
Changing the effort or **Fast** does not change your saved favourite.

A different model of the same agent keeps the conversation in that session.

A model of the other agent opens a new session when the session has messages.
Your draft moves to it.
The earlier conversation stays in its original session.
The new session starts without a copy of that conversation.
In a session with no messages, a model of the other agent stays in that session.

Some models offer **Fast** at the end of the picker's menu.
Turn it on for faster output.
Fast output can cost more on the session's login.
The picker then shows **Fast** after the effort.
Press **⇧⌘E** on a Mac or **Ctrl+Shift+E** on another computer to turn it on or off.
**Fast** stays on for later messages in the session until someone turns it off.
Choosing a model without **Fast** turns it off.

A turn with **Fast** on can still run at standard speed, for example when the agent reaches its fast limit.
The turn then continues, and its end shows **Standard speed** with the cause.
**Fast** stays on, so later turns run fast when the cause ends.

A newly added Codex model can need newer cloud computer software.
Until the cloud computer updates, an OpenAI API key or an own endpoint can run that model at a lower effort and without **Fast**.
The chat shows no note for this.
The cloud computer updates on its own within minutes of being idle.
A ChatGPT sign-in is not affected.

The message box offers **Connect** when neither the session's login nor your personal or org login can serve the chosen agent.
Connect a personal login in **Account**, or ask an admin to connect an org login.

For your own endpoint login, your pickers hide app models that its last successful model list does not name.
They show all app models for the agent before the first successful read, or when the list names none of them.
The session keeps its current model.
Other members' pickers in sessions on your personal endpoint still show all app models.
On an org endpoint, every member's pickers follow the org endpoint's model list in the same way.
This also hides favourites for those models and leaves them out of **All models**.
Hidden favourites stay saved in your account.

- [Refresh an endpoint's model list](/docs/agent-logins#keep-the-model-list-current)

## Set your favourites

Your account keeps up to five favourites, in the order you choose.
Until you change the list, Conductive supplies five starting favourites.
You add, order, and remove favourites only in the **Favourites** section of **Preferences**.

1. Open **Account**.
2. Open **Preferences**.
3. In **Favourites**, select **Add a favourite** and choose a model, or move or remove a favourite.

Use a row's model menu to change its model, effort, and **Fast** setting.
Drag its handle to move it.
Select **×** to remove it.
The model menu follows this order.
If you remove all favourites, the list stays empty, and you choose models in **All models**.

A favourite with an unavailable model appears greyed in **Favourites**, with a reason.
The same applies when your personal endpoint's model list omits it.
Its row still lets you change, move, or remove it.
If a change cannot save, the list keeps its saved values.
Try the change again.

## Guide or stop a running agent

Send another message to guide the agent while it works.
When your message uses the session's available login, it joins the running turn.
A turn is one period of work by the agent.

An agent powered by Claude can leave work running in the background, such as a command that watches pull request checks.
After its reply, the turn stays open while background tasks or scheduled wake-ups remain.
The chat shows **Working**, and **Stop** stays available.
When a task ends or a wake-up arrives, the agent continues in the same turn.
The turn ends when the agent finishes and no background work remains.

The time limit is 30 days from the start of the first wait.
The agent's work after a notification also counts toward that limit.
A message that joins the turn during a wait starts the count again from that message.
If the limit passes during a reply, that reply finishes before the turn ends.
At that limit, the turn ends with **Background work stopped at the time limit** above its duration and changed files.
The cloud computer keeps running while the turn waits.
Ask the agent to stop background work that it does not need, such as a dev server.

For a server that you need after the reply, ask the agent to start a service.
Services run outside the turn and never keep the cloud computer running.
Agents stop temporary check servers before replying.
Builds, tests, and waits for checks that must finish stay in the agent's work.

- [Run a server as a service](/docs/terminal-and-previews#run-a-server-as-a-service)

Select **Stop** to interrupt the turn, including a wait for background work.
Services keep running after this Stop.
The chat records the stop.
You can send another message to continue the conversation.

A stop through an agent's tools shows **Stopped from** and a link to the sending session.
The link uses the same small box as the **Sent by:** line.
A close through the tools that stops a turn uses the same stop line.

The agent's earlier work folds into a line when a turn ends.
Select that line to inspect its messages and tool calls.
The answer stays visible beside it.

## Read replies and tables

Agent replies can contain headings, paragraphs, lists, quotes, code, tables, file chips, and pictures.
A wide table scrolls sideways inside the message.
The text around it keeps the width of the chat.

Agents name the files of your repository as `@` and a path, such as `@src/app.ts`.
An `@` mention shows as a file chip when **All files** lists its path.
Code that holds only a listed file's path also shows as a file chip.
Select a chip to open its file.
A Markdown link or image to a listed file shows as a link with its label.
Select the link to open the file.
While the cloud computer runs, an image of a listed PNG, JPEG, GIF, or WebP file, such as a screenshot that the agent took, shows as a small picture instead.
Select the picture to open the file.
A path can end with a line or a range of lines, such as `@src/app.ts:42` or `src/app.ts:42-50`.
Its chip opens the file as text, with those lines in view and marked.

For paths that **All files** leaves out, `@` mentions and Markdown links show as typed text, and paths in code stay as code.
A Markdown image that points to one of these paths shows only its label.
If the label is blank, chat shows nothing for the image.

To copy a code block, select **Copy code** in its top corner.
With a mouse, the button shows when you point at the block.
**Code copied** confirms the copy.

While a reply arrives, the chat shows its headings, text, and table rows as they arrive.
In the folded work of a turn, open a message line to read its table or see its pictures.

## Explain chat text

Select text inside one agent answer or member message, then select **Explain**.
On a computer, **Explain** shows above the selection.
On a phone, it shows above the message box.
You can also press **⌥⌘E** on a Mac or **Alt+Shift+E** on another computer.
Tool lines, notices, and text that the agent still writes offer no **Explain**.

**Explain** starts a new session.
You write no message.
Its first message gives the agent the text, the text around it, and a link to the session that holds the text.
The agent can read the rest of that session when it needs more.
The message asks for a short answer and no file changes.
The agent still has the tools of any session, so it can change files.
The new session uses your personal or org login, and the **Model and effort** of your **Preferences**.
Its tab opens at the end of the tab row.
The tab that you read stays shown.

The answer shows in a small panel by the text.
On a phone, the panel is a sheet over half the screen.
Drag its handle up to see more.
Ask a follow-up at the foot of the panel.
A follow-up during a turn guides that turn.
**Stop** ends the turn.
Select **Expand** to open the session in its tab.
On a computer, click outside the panel to close it.
Closing the panel leaves the agent working.

The text keeps a mark that every member sees.
The mark shows whether the agent still works, needs input, or failed.
Select the mark to show the panel again, also after its session closes.
A follow-up or **Expand** reopens a closed session.
Where marks overlap, select the overlap to choose one of them.
If Conductive cannot find the text again, the mark covers the whole message.
An archived or other read-only workspace shows the marks and the panel, to read only.

## Manage session tabs

Use a tab's menu to rename or move it, to copy its link, or to close other tabs or the tabs after it.
Open the menu with a right click on a computer.
You can also use **Shift+F10** while the tab has focus.
On a phone, use a long press.

- **Rename session** changes the tab's title.
- **Copy link** copies a link that opens the workspace with that session shown.
- **Move left** and **Move right** move it one place.
- **Close other tabs** closes every other tab in the row.
- **Close tabs to the right** closes every tab after it in the row.
  With either close, if the shown tab closes, this tab shows.
- Drag a tab to place it elsewhere in the row.

File and diff tabs share the row on a computer.
A phone shows the session tabs there.

Each tab in the row keeps your place when you open another tab or another workspace.
A session tab returns to the message you read.
If you were at the end of the chat, it shows the newest messages.
Closing a tab or reloading the page forgets these places.

Closing a session keeps its conversation in **Session history**.
If its agent is working, closing asks first because it stops the turn.
When you close several working sessions at once, one question names them all.
Open **Session history** to reopen the conversation.

After a merge, **Continue** keeps these sessions and their conversation context on the workspace's new branch.
Each session shows a note with the member who continued, the new branch, and its starting branch.
With current agent software, later messages tell the agent the current branch names when they change.

A repository change also keeps these sessions and their conversation context.
Each session shows a note with the member who changed the repository, the new repository, and the new branch.
Later messages tell the agent the folder of the new repository and the new branch.

- [Continue after a merge](/docs/workspaces#continue-after-a-merge)
- [Change the repository](/docs/workspaces#change-the-repository)

## Copy a transcript

Copy a session's whole conversation as Markdown for another agent or a document.

1. Open the session tab's menu with a right click.
   On a phone, use a long press.
2. Select **Copy concise transcript** or **Copy full transcript**.
3. Paste the text where you need it.

**Copy concise transcript** keeps the default folds closed.
While the agent works, its newest run of tool calls stays open.
After a turn ends, a run outside its folded work stays open if one of its calls stopped or failed.
**Copy full transcript** includes the messages and work inside every fold.
The copy uses each attached file's name where its chip appears.

Agents can read the same transcript text through their workspace tools.
The read uses the concise text by default and can request the full text.
A long read returns part of the transcript, with its line range and a way to read earlier lines.
For a stop through an agent's tools, the transcript gives **Stopped from** and the sending session's link.

You can copy another tab's conversation without changing the selected tab.
Both options work in archived and removed workspaces, and in other read-only workspaces.

For a closed session, reopen it from **Session history** before copying.

If the copy fails, open the menu again.
Select the same copy option within one minute to retry.

## Know whose account a session uses

Each session keeps one agent login: its starter's personal login or the org login.
A new session uses the starter's usable personal login, or else the org login.
An admin can give the org login priority for new sessions with **Use for every member**.
Older sessions keep their login when that switch changes.

A subscription token or provider API key bills model use to its connected account.
On an own endpoint login, model use bills where the endpoint's owner runs it.
The endpoint gets the messages, files, and command results of each turn on that login, whoever sent the message.

If the starter shares a personal login, other members' messages use it too.
Each member can send messages on a session's org login.
The message box names another member's login or the org login when you use it.
An org login shows the org's name, such as **Acme's login**.
It uses the same login label for an own endpoint.
The chat does not show the endpoint's host.

If you cannot use the session's login, your message starts a new session when another usable login serves you.
This happens when its login is unavailable or another member does not share their personal login.
It uses the personal or org login that serves you for a new session.
That session links back to the earlier conversation.
It has no copy of the earlier history.

Any member who can send in a session can change its model, effort, and **Fast** setting.
That choice applies to every member's messages on the session's login.

GitHub operations follow the person whose message started the running turn.
After a late answer to a secret request, the new turn follows the person whose message started the turn that asked.
Commits name that person as both author and committer.
In a workspace with older cloud computer software, agent commits name the workspace owner.
Mac command requests go to that same person's connected Mac.
The session can use another member's personal login or the org login.
The agent can identify the member who sent each message.
Another member's message during a turn does not change its GitHub account, commit author, or receiving Mac.

When a watch wake starts a new turn, its GitHub operations and Mac requests follow the person whose turn set the watch.
Its commits name that person.
A wake that joins a running turn keeps that turn's GitHub account, commit author, and receiving Mac.

An agent tool creates a session or sends a message as the sender of its calling turn.
That sender must still belong to the org.
A new session uses that sender's personal or org login under the same rule above.
A message to an existing session follows the same login rules as a message they send themselves.

- [Choose who can use an agent login](/docs/agent-logins#choose-who-can-use-your-login)
- [Understand account and credential access](/docs/security)

## Recover from an error

If the chat or session history does not load, use its **Try again** action.
If a turn fails, read its error before retrying.
**Try again** retries the newest failed request of that session.

A login or membership change can stop a waiting message from running.
Reconnect your personal login, or ask an admin to check the org login.
If a personal or org login serves you, send a new message or use **Try again**.
This can start a new linked session when the earlier login is unavailable.

If a turn says **Changed files unavailable**, inspect **Changes**.
That notice means its changed-file summary is missing.
It does not mean the agent changed no files.

- [Inspect files and changes](/docs/files-and-changes)
