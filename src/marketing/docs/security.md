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
The agent login's share setting controls whose messages spend that login.
It does not hide credentials available to code or terminal users on the same computer.
It does not stop them from using those credentials.

GitHub sign-in and app access come before ordinary product access.
A workspace link or invite code does not grant membership of an org.
An accepted org invitation grants that membership.

- [Manage orgs and members](/docs/orgs-and-members)

## Know whose account an action uses

A session is one conversation in a workspace.
Its starter is the member who began it.
A turn is one period of work by its agent.
Its sender is the person whose message started that turn.

| Action | Account or person it uses |
| --- | --- |
| Agent model use | The session starter's agent login, including a chosen endpoint |
| Git and GitHub CLI in a turn | The turn sender's GitHub account |
| GitHub commands in the shared Terminal | The workspace owner's GitHub account |
| GitHub CLI outside a turn | The workspace owner's GitHub account |
| Merge from the pull request bar | The GitHub account of the member who selects Merge |
| Continue's repository fetch | The GitHub account of the member who selects Continue |
| Commit in an agent turn | The turn sender, as author and committer |
| Commit outside a turn, including Terminal and scripts | The workspace owner by default, as author and committer |
| A request to run a Mac command | The turn sender's connected Mac |
| Session created through agent tools | The calling turn's sender, as the session starter |
| Message sent through agent tools | The calling turn's sender, under the receiving session's login rules |

In a workspace with older cloud computer software, agent commits name the workspace owner.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) says how to get newer software.

Other members' messages can spend a session starter's login while that person shares it.
Without sharing, another member's message starts a new session on their own login.
The agent can identify the member who sent each message.
Another member's message during a turn does not change its GitHub account, commit author, or receiving Mac.

Every member using a workspace's Terminal uses the same owner identity for GitHub commands.
GitHub access can include repositories outside the Conductive org.
It reaches repositories that both the GitHub account and the GitHub App can reach.

GitHub checks the clicking member's access and branch rules for a merge.
Every org member can Continue after a merge, but their GitHub account needs repository read access for its fetch.

## Understand what agents can reach

Agents powered by Claude and Codex work on the workspace's cloud computer.
They can read files, change code, run commands, and use credentials available there.
Sessions in that workspace share its files and branch.

An agent can create another workspace in the org during its work.
That action has no separate approval screen.
Review the work and resulting workspaces as part of the task you give it.

The workspace tools can list workspaces and usable repositories, sections, and models.
They can also create and list sessions, send messages, and read transcripts in every workspace of the org.
This includes workspaces that members created themselves.
Agents can read archived workspaces and closed sessions, but cannot send messages to them.
The tools reach only the org of the calling workspace.

A workspace token is a credential that lets programs use these tools.
Any program with that token can list sessions and read their chats without a running turn.
A copied token can keep that access after the person who copied it leaves the org.
This access lasts while the token remains valid and the org remains active.

Creating a session or sending a message also needs a running turn in the calling workspace.
The action uses that turn's sender, who must still belong to the org.
Tool messages follow the receiving session's login-sharing rules.
They need no separate approval screen.

A routine can start agent work from a pull request.
Comments and reviews on that pull request can steer the agent into other chats and workspaces.
Conductive sets no limit on the number of sessions or messages that agents create.
Agents that keep replying to each other can spend logins and keep computers running.
Use **Stop** in each affected session to end its turn.

- [Follow work sent by another agent](/docs/sessions-and-chat#delegate-work-to-another-session)

## Protect agent and GitHub logins

Conductive stores your connected agent login encrypted.
Account shows its status and kind without returning the stored value.
For an own endpoint, Conductive encrypts the address and key and keeps the host in plain text.
Account shows the host, including any non-default port.
Your browser gets neither the saved key nor the full saved address back.

A newer cloud computer starts from a shared setup that requires Conductive to keep agent logins outside the computer.
Its model requests and answers pass through Conductive on Cloudflare.
Conductive adds the session starter's login before sending each request to Anthropic, OpenAI, or the chosen endpoint.

A chosen endpoint gets the messages, files, and command results of each turn on its login, whoever sent the message.
It processes them where its owner runs it.
An own endpoint login starts with sharing on.
Its owner can turn sharing off in **Account**.

Each turn there gets a temporary credential called a turn token.
It gives no copy of the stored login.
A program or member with terminal access can read or copy it.

That token can use the session starter's login through Conductive while the turn runs.
It also works from outside the cloud computer during that turn.

After **Stop**, the token can start no new request.
Any request that still runs ends within 30 seconds after the turn ends.
Changing or removing the session starter's login ends the turn at its next model request.
The same happens if that member loses org access.
A program that keeps running can read or copy the tokens of later turns, including turns in other members' sessions.
Agent settings in the repository can send model requests, with their content and their turn token, to another address.

Review those settings in repositories you use.
Conductive keeps no copy of a model request or answer as it passes them on.
It writes no body or header value from those requests or answers to its logs.
The normal chat history and Mac command records still stay on the service.

An own endpoint's address and key never reach a cloud computer, including an older computer.
Its turn needs agent software that supports temporary credentials.
If the software cannot use them, the turn cannot start.

For subscription tokens and provider API keys, an older cloud computer still permits software to receive the session starter's agent login itself.
A program or member with terminal access can read or copy that login during a turn.
A copied login can remain usable after the turn ends.
Agent settings in the repository can also send that login to another address.
Removing a login from Account does not revoke a copy held elsewhere.

Installing newer software on that computer does not remove this risk.
A new build gives the protection to new cloud computers created from its setup.
Ask an admin to run **Build computer**.
Then create a new workspace from that build for the new protection.

Agent settings in the repository can send an older computer's model requests and agent login to another address.

Code on the computer can also obtain the GitHub credential available to that workspace.
This includes the workspace owner's GitHub credential outside a running agent turn.
Continue also brings the clicking member's GitHub token into the cloud computer while it fetches the latest default branch.
Code or members with terminal access can read that token during the fetch.

Removing a member ends their ordinary access to the org.
It does not guarantee that credentials they copied stop working.
The computer also uses a credential for its connection to Conductive.
A copy of that credential can still expose later turn credentials in another member's workspace.

If you suspect exposure, stop the agent's turn.
Use the provider's controls to revoke exposed logins or tokens.
Archive stops its cloud computer and ends that workspace's connection access.
It also revokes that workspace's token, including copies used to read other chats.
Conductive keeps its files for 14 days.
Those files can still hold copied credentials during that window.

- [Replace an agent login](/docs/agent-logins#replace-or-remove-a-login)
- [Archive a workspace](/docs/workspaces#archive-a-workspace)

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

The **Secret** mark hides exact copies of a value in displayed agent output, start logs, and program names and folders in **Preview**.
It starts on for a new variable.
Conductive hides these values in program names and folders before shortening them for display.
Values and marks changed in settings apply at the computer's next start.
Earlier chat and logs keep their text.

Changed or encoded values can still appear.
File content, diff content, downloaded files, and Terminal do not hide secret values.
Some displayed path labels hide values, but the browser still receives real file paths.

- [Set environment variables](/docs/cloud-computer#set-environment-variables)

## Understand previews and Mac commands

Preview apps run on a separate domain from Conductive.
Opening a preview needs your sign-in and workspace access.
Its address alone does not grant access to another person.
Closing a preview or stopping the computer ends that preview's access.
Your browser can still keep the preview files that it loaded, as the preview app's cache rules allow.

Mac commands run locally with the Mac user's permissions.
Only the connected Mac that receives a request can approve it.
**Always allow** covers the exact command text in any requested folder on that Mac.
Timed permission covers every command from one workspace for 15 minutes.

Use **Remove** or **Stop** in **This Mac** to change those saved permissions.
Keep the app open and retry if a permission change takes effect but cannot save.

- [Control Mac command permissions](/docs/mac-app#change-saved-permissions)
- [Use port previews](/docs/terminal-and-previews#preview-a-running-app)

## Keep the work you need

A normal computer stop keeps its files and sessions.
The chat stays readable while the computer is stopped.

Archive stops the computer and keeps it and its files for 14 days.
Its chat stays read-only, with no file lists or tools.
Every member of an active org can restore it during that window while its computer is kept.
Restore returns the workspace stopped.

Restore ends after 14 days.
Conductive then deletes the computer and its files.
Its chat remains read-only after deletion.

Deleting an org stops its computers and starts a seven-day restore window.
After that window, deletion removes its data and computers.
Keep important work in GitHub if you need it after a Restore window ends.

The Terms and Privacy notice give the service's data and retention information.

- [Read the Terms](/terms)
- [Read the Privacy notice](/privacy)
