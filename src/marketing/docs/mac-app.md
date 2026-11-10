---
title: Mac app
description: Install Conductive on your Mac, sign in through GitHub, and control agent requests to run local commands.
group: Manage
order: 30
---

## Get access in your browser first

Complete access to Conductive in your browser before you use the Mac app.
Select **Sign in** in this site's header.
Use your invite code, accept an org invitation, or return after approval.

Complete the waitlist steps in the browser.
Then return to the Mac app after your account has access.

- [Get access to Conductive](/docs/get-started#get-access)

## Download and install

Choose the installer for your Mac's processor.
Use Apple silicon for an Apple M-series chip.
Use Intel for an Intel processor.

- [Download for Apple silicon](https://github.com/Firna-AI/remote-code/releases/latest/download/Conductive-mac-arm64.dmg)
- [Download for Intel](https://github.com/Firna-AI/remote-code/releases/latest/download/Conductive-mac-x64.dmg)
- [See published releases](https://github.com/Firna-AI/remote-code/releases/latest)

1. Open the downloaded DMG.
2. Move Conductive into **Applications**.
3. Open Conductive from **Applications**.

Run the installed copy so it can update itself.
A copy that runs from the mounted DMG cannot install an update in place.

The Mac app shows Conductive in its own window.
Agents continue to run on cloud computers.

## Sign in and open your work

1. Start GitHub sign-in from the Mac app.
2. Complete the agreement and GitHub authorization in your browser.
3. Let the browser return you to Conductive.

The Mac app keeps its own sign-in.
Signing in through the browser for access does not sign in the Mac app for you.
If the return fails, start sign-in again from the app.

If setup asks you to install the GitHub App, finish that step in the browser.
Return to the Mac app after the installation or owner approval.
Its setup state updates when its window becomes active.

Open your org and workspace to continue the same cloud work.
Back and Forward move between pages in the window.
Links to other websites open in your default browser.

## Review a Mac command request

A turn is one period of work by an agent.
An agent can ask to run a command on the Mac of the person who started its current turn.
Your Mac must be awake with Conductive open and signed in.
Its connection must show as available.

The request appears above the session's message box.
It shows the exact command and time limit.
Open **Details** to inspect the folder, reason, workspace, and sender.

The command runs with your Mac user's permissions in the requested folder.
Read those details before you allow it.

| Choice | Permission |
| --- | --- |
| Deny | The command does not run. |
| Allow | The command runs once. |
| Always allow | This exact command can run again on this Mac without asking. |
| Allow all commands for 15 minutes | Every command from this workspace can run on this Mac during that time. |

The arrow beside **Allow** opens the last two choices.
**Always allow** covers the command text in any requested folder.
Only the Mac that received the request can approve it.
A browser or another Mac can show the request without those approval choices.

## Change saved permissions

Open **Account** in the Mac app to find **This Mac**.
It shows the Mac's name and **Available** or **Not available**.

- Under **Always allowed**, use **Remove** to make that command ask again.
- Under **Allowed for 15 minutes**, use **Stop** to end that workspace's permission.
- While timed permission runs, the workspace also shows a bar with **Stop**.

Saved permissions belong to your signed-in account on that Mac.
They do not give an agent general access to every Mac you use.

If a removal or stop takes effect but cannot save, the control explains the failure.
Keep the app open and retry the save before you quit.
A full restart can restore an older permission that the Mac could not replace on disk.

## Handle unavailable commands

The Mac is unavailable when it sleeps, the app closes, or its connection ends.
Wake the Mac and open Conductive before asking for the command again.
Signing in from another Mac can replace the earlier Mac's connection.

A request normally has a 60-second time limit.
A longer request shows its requested limit.
Requests above two minutes must explain why they need more time.
The maximum is 30 minutes.

Conductive stops the command at its time limit or when its agent turn ends.
Large command output can be cut short.
The result tells you and the agent when that happens.

## Update or use the browser

The released app checks for updates at launch and every four hours.
Use **Help → Check for updates** for a manual check.
When an update is ready, choose **Restart now** or **Later**.
**Later** installs it at the next quit.

If a check fails, try again later.
If your copy lacks a feature described in these guides, check for an update.
Use Conductive in your browser for access steps and workspace features while you wait.
Mac command approval still requires the connected Mac app.

If an installer or installed copy is old, use the published releases page for a current download.

- [See published releases](https://github.com/Firna-AI/remote-code/releases/latest)
- [Use Terminal and previews](/docs/terminal-and-previews)
- [Read the security guide](/docs/security)
