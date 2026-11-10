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
It does not hide a turn's credential from code or terminal users on the same computer.

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
| Agent model use | The session starter's connected agent account |
| Git and GitHub CLI in a turn | The turn sender's GitHub account |
| GitHub commands in the shared Terminal | The workspace owner's GitHub account |
| Commit in an agent turn | The turn sender, as author and committer |
| Commit outside a turn, including Terminal and scripts | The workspace owner, as author and committer |
| A request to run a Mac command | The turn sender's connected Mac |

In a workspace with older cloud computer software, agent commits name the workspace owner.
[Apply setup changes](/docs/cloud-computer#apply-setup-changes) says how to get newer software.

Other members' messages can spend a session starter's account while that person shares the login.
Without sharing, another member's message starts a new session on their own login.
The agent can identify the member who sent each message.
Another member's message during a turn does not change its GitHub account, commit author, or receiving Mac.

Every member using a workspace's Terminal uses the same owner identity for GitHub commands.
GitHub access can include repositories outside the Conductive org.
It reaches repositories that both the GitHub account and the GitHub App can reach.

## Understand what agents can reach

Agents powered by Claude and Codex work on the workspace's cloud computer.
They can read files, change code, run commands, and use credentials available there.
Sessions in that workspace share its files and branch.

An agent can create another workspace in the org during its work.
That action has no separate approval screen.
Review the work and resulting workspaces as part of the task you give it.

The agent's built-in workspace tools can list workspaces and usable repositories, sections, and models.
They do not offer a call to read or message another workspace's chat.

## Protect agent and GitHub logins

Conductive stores your connected agent login encrypted.
Account shows its status and kind without returning the stored value.

A newer cloud computer starts from a shared setup that requires Conductive to keep agent logins outside the computer.
Each turn there gets a credential that uses the session starter's login through Conductive.
A program or member with terminal access can read or copy that credential.
It works through Conductive while that turn runs, also from outside the computer.
After **Stop**, it can start no new request.
A request that still runs ends within 30 seconds after the turn ends.

An older cloud computer starts from an earlier setup that still permits software to receive the agent login itself.
A program or member with terminal access can read or copy that login during a turn.
A copied login can remain usable after the turn ends.
Removing a login from Account does not revoke a copy held elsewhere.
Installing newer software on that computer does not remove this risk.
A new build gives the protection to new cloud computers created from its setup.

Agent settings in the repository can send model requests and their credentials to another address.

Code on the computer can also obtain the GitHub credential available to that workspace.
This includes the workspace owner's GitHub credential outside a running agent turn.

Removing a member ends their ordinary access to the org.
It does not guarantee that credentials they copied stop working.
A copied credential for a workspace connection can still expose credentials of later turns.

If you suspect exposure, stop the agent's turn.
Use the provider's controls to revoke exposed logins or tokens.
Archive stops its cloud computer and ends that workspace's connection access.
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

Conductive sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL` for commit authors and committers.
An org variable with one of these names has no effect.
These values also take priority over an author that a script or an agent writes into Git settings.
A Git command can still set its own author, for example with `--author`.
The author of a commit does not prove who made it.

The **Secret** mark hides exact copies of a value in displayed agent output and start logs.
It starts on for a new variable.
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
