---
title: Security
description: Understand who can reach your work and credentials, how account identity follows each action, and what secret masking covers.
group: Manage
order: 40
---

## Choose people you trust

Every member of an org can see its workspaces and chats.
Members can use the files and tools of workspaces that are not archived.
Their terminal access can reach credentials available on a workspace's cloud computer.

Work in an org with people you trust with your code, agent logins, and GitHub access.
A personal agent login's share setting controls whose messages spend that login.
It does not hide credentials available to code or terminal users on the same computer.
It does not stop them from using those credentials.
Each member can spend the org login in sessions on it.

GitHub sign-in and app access come before ordinary product access.
A workspace link or invite code does not grant membership of an org.
An accepted org invitation grants that membership.

- [Manage orgs and members](/docs/orgs-and-members)

## Know whose account an action uses

A session is one conversation in a workspace.
Its starter is the member who began it.
A turn is one period of work by its agent.
Its sender is the person whose message started that turn.
A turn that a late answer to a secret request starts keeps the sender of the turn that asked.

A watch can wake the session that set it when a chosen turn ends.
When a wake starts a new turn, that turn acts for the sender of the turn that set the watch.
A wake that joins a running turn keeps that turn's sender.

| Action | Account or person it uses |
| --- | --- |
| Agent model use | The session's personal or org login, including a chosen endpoint |
| Git and GitHub CLI in a turn | The turn sender's GitHub account |
| GitHub commands in any workspace terminal | The workspace owner's GitHub account |
| GitHub CLI outside a turn | The workspace owner's GitHub account |
| Merge from the pull request bar | The GitHub account of the member who selects Merge |
| Ready for review from the pull request bar | The GitHub account of the member who selects Ready for review |
| GitHub reads and pull request updates when an agent changes a workspace's base branch | The turn sender's GitHub account |
| Continue's repository fetch | The GitHub account of the member who selects Continue |
| A repository change's fetch | The GitHub account of the member who changes the repository |
| Base branch fetch after an agent changes the target or the workspace follows a change on GitHub | The workspace owner's GitHub account |
| Commit in an agent turn | The turn sender, as author and committer |
| Commit outside a turn, including Terminal and scripts | The workspace owner by default, as author and committer |
| A request to run a Mac command | The turn sender's connected Mac |
| An answer to a request for a secret | Any member who sees the session |
| Session created through agent tools | The calling turn's sender, as the session starter |
| Message sent through agent tools | The calling turn's sender, under the receiving session's login rules |
| Other changes through workspace tools | The calling turn's sender, under that member's app rights |

In a workspace with older cloud computer software, agent commits name the workspace owner.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) says how to get newer software.

Each session keeps its starter's personal login or the org login.
Other members' messages use a personal login while its owner shares it.
Each member can send messages on a session's org login.

If you cannot use the session's login, your message starts a new session when another usable login serves you.
This happens when its login is unavailable or another member does not share their personal login.
It uses your usable personal login, or else the org login.
An admin can give the org login priority for new sessions with **Use for every member**.
Older sessions keep their login when that switch changes.

Automation runs follow the same rule for their owner, with that owner's GitHub account.
Any member who can send in a session can still change its model, effort, and **Fast** setting.
That choice applies to every member's messages on the session's login.
The agent can identify the member who sent each message.
Another member's message during a turn does not change its GitHub account, commit author, or receiving Mac.

Every member using a workspace terminal uses the same owner identity for GitHub commands.
GitHub access can include repositories outside the Conductive org.
It reaches repositories that both the GitHub account and the GitHub App can reach.

GitHub checks the clicking member's access and branch rules for a merge.
GitHub also checks the clicking member's access for Ready for review.
Every org member can Continue after a merge, but their GitHub account needs repository read access for its fetch.
Every org member can also change a workspace's repository, and their GitHub account needs read access to the new repository for its fetch.
Every org member can ask an agent to change a workspace's base branch.
If the workspace has an open pull request, GitHub checks the turn sender's write access for that change.

## Understand what agents can reach

Agents powered by Claude and Codex work on the workspace's cloud computer.
They can read files, change code, run commands, and use credentials available there.
Sessions in that workspace share its files and branch.

Agents can start, list, stop, restart, and read logs of services on their own cloud computer.
These service commands cannot control another workspace.

An agent can create another workspace in the org during its work.
That action has no separate approval screen.
Review the work and resulting workspaces as part of the task you give it.

The workspace tools can list workspaces and usable repositories, sections, and models.
They list repositories in the org's order.
They can also list sessions and previews.
They can read details of a workspace, session, or message, and read transcripts across the org.
This includes workspaces that members created themselves.
They can also list each org secret's name, description, and environment variable name, without its value.
Agents can read archived and removed workspaces by ID.
Workspace lists leave out removed workspaces unless the agent asks for them.
Agents can also read closed sessions.
They cannot send messages to archived or removed workspaces or closed sessions.
The tools reach only the org of the calling workspace.

A workspace token is a credential that lets programs use these tools.
Any program with that token can make these reads without a running turn.
A copied token can keep that access after the person who copied it leaves the org.
This access lasts while the token remains valid and the org remains active.

Changing work through these tools needs a running turn in the calling workspace.
The action uses that turn's sender, who must still belong to the org.
Each action follows that member's rights in the app.
The tools can:

- Create, rename, and move workspaces.
- Change the base branch of a workspace in the org.
- Archive workspaces that the sender owns, or any workspace when the sender is an org admin.
- Create, rename, stop, and close sessions.
- Send messages to sessions.
- Watch one turn of a session and wake the session that set the watch when it ends.
- Create and delete sections.
- Open and close private previews.
- Run a command with a secret that the session may use, or ask members to allow it.

An agent can archive the workspace where it runs, which ends its turn.
Tool messages follow the receiving session's login rules.
These workspace actions need no separate approval screen.
Previews that agents open need sign-in and workspace access.

A wake follows current membership and session login rules.

An automation can start agent work from a pull request.
Comments and reviews on that pull request can steer these reads and changes across the org, with the automation owner's rights.
This includes changing a workspace's base and, with GitHub write access, the base of its open pull request.
Conductive sets no limit on the number of sessions or messages that agents create.
Agents that keep replying to each other can spend logins and keep computers running.
Use **Stop** in each affected session to end its turn.

- [Follow work sent by another agent](/docs/sessions-and-chat#delegate-work-to-another-session)

## Protect agent and GitHub logins

Conductive stores personal and org agent logins encrypted.
**Account** shows personal logins.
The org's **Agents** tab in **Settings** shows org logins.
Only an admin can connect, replace, or remove an org login.
Other members see its kind and settings read-only.
Neither page returns a saved key or login.
For an own endpoint, Conductive encrypts the address and key and keeps the host in plain text.
The login's page shows the host, including any non-default port.
Your browser gets neither the saved key nor the full saved address back.

Conductive keeps agent logins outside cloud computers.
Model requests and answers pass through Conductive on Cloudflare.
Conductive adds the session's personal or org login before sending each request to Anthropic, OpenAI, or the chosen endpoint.

A chosen endpoint gets the messages, files, and command results of each turn on its login, whoever sent the message.
It processes them where its owner runs it.
An admin who connects an org endpoint chooses that server for the members whose sessions use it.
This includes automation runs that no person watches.
A personal own endpoint login starts with sharing on.
Its owner can turn sharing off in **Account**.

Each turn gets a temporary credential called a turn token.
It gives no copy of the stored login.
A program or member with terminal access can read or copy it.

That token can use the session's personal or org login through Conductive while the turn runs.
It also works from outside the cloud computer during that turn.

After **Stop**, the token can start no new request.
A request that still runs ends at the first turn check that answers after the turn ends.
Conductive checks the turn every 15 seconds.
While no check answers, the request can run to the end of its answer.
Changing or removing the session's login ends the turn at its next model request.
A turn on a personal login also ends there if its owner loses org access.
A session on the org login can continue after its starter leaves the org.
A program that keeps running can read or copy the tokens of later turns, including turns in other members' sessions.
Agent settings in the repository can send model requests, with their content and their turn token, to another address.

Review those settings in repositories you use.
Conductive keeps no copy of a model request or answer as it passes them on.
It writes no body or header value from those requests or answers to its logs.
The normal chat history and Mac command records still stay on the service.

An own endpoint's address and key never reach a cloud computer.
Each turn needs supported agent software.
If Conductive reports unsupported agent software, ask an admin to run **Build computer**.
After it succeeds, create a new workspace.

Your ChatGPT sign-in stays outside the cloud computer.
Conductive renews that sign-in for you.
Your ChatGPT email, account ID, and ChatGPT workspace name can reach the cloud computer.
ChatGPT sign-in needs agent software that supports its temporary credentials.
If its turn cannot start, follow the [ChatGPT recovery steps](/docs/agent-logins#recover-from-a-login-error).

Older agent software could expose the saved login itself.
Updating or resuming that computer does not revoke a login that someone copied earlier.
If a login was exposed, revoke it with its provider.
Removing a login from Account does not revoke a copy held elsewhere.

Code on the computer can also obtain the GitHub credential available to that workspace.
This includes the workspace owner's GitHub credential outside a running agent turn.
Continue and a repository change also bring the member's GitHub token into the cloud computer during their branch fetch.
When an agent changes the base, the fetch brings the workspace owner's GitHub token into the cloud computer.
The same token serves a fetch when the workspace follows an open pull request's base or a change to the default branch it targets.
If GitHub deletes the base while no pull request is open, the default branch fetch also uses the owner's token.
Automatic retries and resumes use the same token.
Code or members with terminal access can read these GitHub tokens while their fetches run.

Removing a member ends their ordinary access to the org.
It does not guarantee that credentials they copied stop working.
The computer also uses its workspace token for its connection to Conductive.
Programs and members with terminal access can read or copy it.
A copy can still expose later turn credentials and GitHub tokens in another member's workspace.
This remains possible after removal or suspension.

If you suspect exposure, stop the agent's turn.
Use the provider's controls to revoke exposed logins or tokens.
Archive stops its cloud computer and ends that workspace's connection access.
It also revokes that workspace's token, including copies used to read other chats.
The cloud computer keeps its disk files for 14 days.
Those files can still hold copied credentials during that window.
Restore leaves the computer stopped.
Its next resume gives it a new workspace token.
Archive and Restore do not revoke logins or GitHub tokens already copied elsewhere.

- [Replace an agent login](/docs/agent-logins#replace-or-remove-a-login)
- [Manage an org login](/docs/agent-logins#use-an-org-login)
- [Archive a workspace](/docs/workspaces#archive-a-workspace)
- [Build the current computer setup](/docs/cloud-computer#apply-setup-changes)

## Understand environment values

Only an org admin can change environment variables.
Conductive stores their values encrypted.
Settings show their names and **Secret** marks without returning stored values.

Every workspace receives the org's environment values at start, except values with a name that Conductive sets itself.
Its agents, programs, and terminal users can read the values that the computer receives.
Builds and repository refreshes do not receive the org's environment values.

In an agent turn, Conductive sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL` for the agent's commands.
These values name the turn sender.
They take priority over every Git setting.
An org variable with one of these names has no effect.
Outside an agent turn, Git takes the workspace owner's author from the computer's system Git settings.
Conductive writes these settings at each start.
The owner's author takes priority over a `user.name` or `user.email` setting.
An `author` or `committer` setting in the repository or in the global Git settings takes priority over the owner's author.
A Git command can still set its own author, for example with `--author`.
The author of a commit does not prove who made it.

The **Secret** mark hides exact copies of a value in displayed agent output and start logs.
It also hides them in server and service details and service logs in **Preview**.
The same rule covers skill names and descriptions in the message box.
It starts on for a new variable.
Conductive hides these values before shortening program names, folders, and service details for display.
Values and marks changed in settings apply at the computer's next start.
Earlier chat and logs keep their text.

Changed or encoded values can still appear.
File content, pictures in agent replies, diff content, downloaded files, and Terminal do not hide secret values.
Some displayed path labels hide values, but the browser still receives real file paths.

- [Set environment variables](/docs/cloud-computer#set-environment-variables)

## Understand services

A service is a named program that runs outside an agent turn.
It uses the org environment values installed at this computer start, plus values supplied for that service.
It does not inherit the agent's credentials, turn context, or secrets added to an approved command.
Services run as the same computer user as the other programs.
Their code can still read available files and credentials, including those of later turns.
Use only service commands and code that you trust.

The service list shows filtered names, program labels, folders, state details, ports, and start context.
The saved full command and environment values stay on the cloud computer.
Conductive filters a service's log before each app read.
Changed or encoded secret values can still appear.
Every member who can read the workspace can read its service list and logs.
Stop and Restart follow the access rule of **Restart** in the workspace header.

A service can link to its originating session, or show **Local command**.
This context does not prove which person started it and gives no control rights.

- [Run and manage services](/docs/terminal-and-previews#run-a-server-as-a-service)
- [Understand Restart access](/docs/workspaces#restart-the-software)

## Understand secrets

Conductive stores the value of each secret encrypted.
Every member sees each secret's name and description, and who added it.
Values show as dots.
An admin can reveal one value at a time, also of a secret that another member added.
Every member sees who revealed a value last, and when.

An agent can ask to run one command with a secret.
The command gets the value.
The agent gets the secret's name and environment variable name, without the value.
Each session needs a member's approval, unless the secret is for **All agents** or pre-approved in the workspace's **Capabilities**.
Any member who sees the session can allow the request.
The approval lasts for that session.
Every member can remove an approval under **This session** in **Capabilities**, beside the message box of that session.
**Capabilities** lists only the approvals of the session where you open it.
To see the approvals of another session, open that session.
**Capabilities** hides an approval while the secret is for **All agents** or pre-approved.
The approval stays, and it shows again when that ends.

A request waits 90 seconds for an answer.
After that, it stays in the chat, and a later **Allow** tells the agent in a new turn.
An **Allow** also allows each other open request of the same secrets that its approval covers, so you answer once.

While a command runs with a secret, its value is on the cloud computer.
Programs and members with terminal access can read it then.
A command can also write it to a file.
During a turn, a program on the computer can run its own command with each secret that the session may use.
Conductive hides exact copies of a value in the command's output and in the text of the chat.
Pictures in agent replies do not hide values.
Changed or encoded values can still appear, also to the agent and its model provider.

- [Add secrets for agents](/docs/cloud-computer#add-secrets-for-agents)

## Choose secrets for automation runs

The owner of an automation can choose org secrets in **Capabilities** on the automation page, beside the model picker.
Every member sees the chosen secret names under the prompt.
Only the owner changes the selection.
Each run workspace starts with those secrets pre-approved.
Conductive records the owner as the member who approved them.

Agents in every session of that workspace can use them without a new request.
The same selection serves schedules, pull request triggers, and **Run now**.
Requests for other secrets still wait for a member, unless another approval allows them.

These pre-approvals stay in a run workspace that you keep.
Every member can remove them in that workspace's **Capabilities**.
Changing the automation's selection affects only later run workspaces.
It does not remove pre-approvals from earlier runs.
A workspace that the run's agent creates gets no copied pre-approvals.

Text in a pull request, such as a comment or review, can steer the agent to use these secrets.
The automation page warns every member about this risk when the automation has a pull request trigger and a chosen secret.
The member who added a chosen secret, or an admin, can replace its value.
Later runs then use the new value.
Text in a pull request can also steer the agent to ask for a command on the owner's Mac, from the first turn of a run.
A command that the owner always allowed then runs without asking.

## Understand previews and Mac commands

Preview apps and the pages of HTML files run on a separate domain from Conductive.
Opening a preview needs your sign-in and workspace access.
Its address alone does not grant access to another person.
Closing a preview or stopping the computer ends that preview's access.
Your browser can still keep the preview files that it loaded, as the preview app's cache rules allow.

The page of an HTML file can load the files of the workspace's repository.
It cannot load files whose names start with a dot, such as `.env`, or files in `.git`.
Outside the repository folder, the preview serves only font files under `/usr/share/fonts` and `/usr/local/share/fonts` on the cloud computer.
The page's scripts can read the files and the list of system fonts that the preview serves.
They can send them to another site.
This includes any licensed fonts that the preview serves.
A secret in a file with another name, such as `key.pem`, stays readable to those scripts.
Preview only HTML files whose scripts you trust.

Mac commands run locally with the Mac user's permissions.
Only the connected Mac that receives a request can approve it.
Agents can ask for Mac commands in every workspace, from its first turn.
This includes a new workspace and one that an agent or an automation creates.
The Mac app asks first, unless you already allowed the command or all commands from that workspace.

In the Mac app, the **Mac access** switch in **Capabilities** acts only on your own Mac.
Turning it on allows every command from that workspace on your Mac until you stop.
Turning it off stops that permission.
Other members' Macs still ask, unless their users already allowed the commands.
If permission cannot start, the switch stays off, and the control shows the cause.
In **New workspace** in the Mac app, permission starts after creation if the switch is on.

A browser shows no **Mac access** switch, and it cannot start this permission.
An older Mac app shows an earlier **Mac access** switch that every member shares.
That switch no longer stops agents from asking.
Install an update when one is available.

Use **Stop** in **This Mac** or in the workspace bar, or turn the switch off, to end a workspace's permission on that Mac at once.

**Always allow** covers the exact command text in any requested folder on that Mac.
Workspace permission covers every command from one workspace for 15 minutes, or until you stop it.
Permission until you stop also ends when you quit the Mac app or sign out.
While the 15 minutes run, the workspace bar offers **Extend**, **Keep until I stop**, and **Stop**.
**Extend** resets their time left to 15 minutes from now.

While workspace permission runs, every command from that workspace runs on your Mac without asking.
Text read by the agent can steer it to request such a command.

Use **Remove** or **Stop** in **This Mac** to change those saved permissions.
Keep the app open and retry if a permission change takes effect but cannot save.

- [Control Mac command permissions](/docs/mac-app#change-saved-permissions)
- [Use port previews](/docs/terminal-and-previews#preview-a-running-app)
- [Preview an HTML file](/docs/files-and-changes#preview-an-html-file)

## Keep the work you need

A normal computer stop keeps its files and sessions.
The chat stays readable while the computer is stopped.
The stop ends all services and discards their saved commands, settings, and logs.
Services do not restart themselves after a resume.

Archive stops the computer and keeps it and its files for 14 days.
Its chat stays read-only, with no file lists or tools.
Every member of an active org can restore it during that window while its computer is kept.
Restore returns the workspace stopped.

Restore ends after 14 days.
Conductive then deletes the computer and its files.
The workspace leaves **Archived**, the command palette, and the workspace counts of the org.
A direct link or a chat link still opens its read-only chat.
The bar says **Removed on** followed by the removal date.
Conductive keeps its chat history until the org is deleted.

Deleting an org stops its computers and starts a seven-day restore window.
After that window, deletion removes its data and computers.
Keep important work in GitHub if you need it after a Restore window ends.

The Terms and Privacy notice give the service's data and retention information.

- [Read the Terms](/terms)
- [Read the Privacy notice](/privacy)
