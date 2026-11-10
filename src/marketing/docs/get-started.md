---
title: Get started
description: Get access, connect GitHub and an agent, and create your first workspace from a message.
group: Start
order: 20
---

## Before you start

Have these ready:

- A GitHub account.
- GitHub read access to the repository where you will create a workspace.
- Permission to install a GitHub App if you will set up your own org.
- A Claude subscription token, an Anthropic API key, an OpenAI API key, or a ChatGPT plan.

If you cannot install the GitHub App, ask a GitHub organization owner to help.
If you join an existing org, its admin manages repository access.
Your GitHub permissions still govern repository reads and pushes made with your account.
Conductive runs the agents and repositories on cloud computers.
You can use the browser without a local copy of your repository.

## Sign in

1. Select **Sign in** in the site header.
2. Read the agreement above **Continue with GitHub**.
3. Select **Continue with GitHub** to accept the current Terms and continue.
4. Complete the authorization on GitHub.

Your first sign-in creates your Conductive account.
A new account waits for access before it can use **Get started**.

- [Read the Terms](/terms)
- [Read the Privacy notice](/privacy)

## Get access

The waitlist screen shows your GitHub account and the available ways to get access.
Use one of these ways:

- **Approval:** Return to Conductive after your account is approved.
  The waitlist screen shows the address for your approval email when one is available.
  If it shows no email address, return to the app to check for access.
- **Invite code:** Enter the code in **Invite code**.
  Then select **Use code**.
  An invite link applies its code when you sign in or open the link.
- **Org invitation:** Select **Accept invitation** beside the org you want to join.
  Use a GitHub account with the invitation's address as a verified email.

After approval or a successful code, **Get started** opens for your account.
It guides you through the GitHub App, your first org, and an agent login.

An accepted org invitation opens that org instead.
Its admin manages its repositories and cloud computer.
Connect an agent in **Account** if needed.
Then continue with [Create your first workspace](/docs/get-started#create-your-first-workspace).

If a code is not found, check its text.
Then try again.
If a code no longer works or is used up, ask for another code.
If **Sign-ups are paused** appears, try again later.
The pause keeps your code unused and your org invitation available.

- [Join or manage an org](/docs/orgs-and-members)

## Install the GitHub App

1. Select **Install the GitHub App** in **Get started**.
2. Choose the GitHub account that owns your repository.
3. Review the requested permissions on GitHub.
4. Give the app access to the repositories you want to use.
5. Finish the installation.
6. Return to Conductive.

The step shows **Installed** and the GitHub accounts connected to the app.
Use **Add another account** if your repositories belong to more than one GitHub account.

GitHub can require an organization owner to approve an installation request.
If GitHub shows a request instead of an installation, ask that owner to complete it.
Then return to Conductive.

## Create your first org

An org holds your workspaces, chosen repositories, and shared setup.
You can create one for yourself or for a team.

1. Select **Create org** in **Get started**.
2. Enter a **Name** for the org.
3. Set **Initials** if you want different initials in the org list.
4. Find a repository in **Repositories**.
5. Select **Add** beside each repository you want to use.
6. Select **Create org**.

Choose at least one repository to enable **Create org**.
The list contains repositories that both your GitHub account and the GitHub App can reach.
If a repository is missing, open **Manage access** to check the app's access on GitHub.
Then return to Conductive.

You become the org's first admin.
Conductive starts its first cloud computer build automatically.
The build prepares copies of the chosen repositories for new workspaces.
The org step shows **Preparing** while it runs.

Continue to the agent login while the build runs.
You can also open the org before the build finishes.
**New workspace** lets you write a message, but keeps **Send** off until the first build succeeds.

If the build fails, select **Open the log** to read its cause.
Correct the problem.
Then select **Try again**.
If the org shows **No build yet**, select **Build computer**.
These build actions are available to org admins.
You can also find the build in **Settings**, under **Cloud computer**.

## Connect an agent

Connect at least one login in **Connect Claude or Codex**.
Choose the login you want to use:

| Agent | Login | What to enter |
| --- | --- | --- |
| Claude | Subscription token | Select **Subscription token**. Paste a token from `claude setup-token`. |
| Claude | Anthropic API key | Select **API key**. Paste your Anthropic API key. |
| Codex | OpenAI API key | Select **API key**. Paste your OpenAI API key. |
| Codex | ChatGPT plan | Select **ChatGPT plan**. Select **Get a code**. Complete the ChatGPT sign-in. |

For a subscription token, run this command on a computer where the `claude` command is installed:

```bash
claude setup-token
```

Complete the browser authorization that the command opens.
Paste the token it prints into Conductive's **Subscription token** field.
If the command is unavailable, you can use the Anthropic API key option.

For an API key, the form provides a link to create one with the provider.
Paste the key into its field.
Select **Connect**.
The agent row then shows **Connected**.

For a ChatGPT plan, first turn on device code sign-in in your ChatGPT security settings.
Ask your ChatGPT admin if you cannot change that setting.
ChatGPT sign-in also works with Plus and Pro.
Follow [Connect Codex](/docs/agent-logins#connect-codex) for the sign-in steps.

Never share the code.
Enter only a code that the Conductive page shows.
The code expires in 15 minutes.

One connected agent is enough to finish setup.
You can connect the other later in **Account**.

If your first agent request reports a login error, open **Account**.
Remove that agent's login.
Then connect the correct account.
If the Codex row shows **Signed out**, select **Sign in again** instead.

- [Manage logins and sharing](/docs/agent-logins)

## Create your first workspace

At the end of **Get started**, select **Open** followed by your org's name.
If you accepted an org invitation, your org is already open.

1. Select **New workspace**.
2. Choose the repository for your task.
3. Choose a model for the agent you connected.
4. Choose the effort in the same model menu.
5. Describe your task in the message box.
6. Select **Send**.

For a first task, you can use this message:

```text
Explain how to run the tests in this repository.
```

On a computer, **Enter** sends and **Shift+Enter** adds a line.
On a phone, **Enter** adds a line.
Use **Send** to send from either layout.
If you chose the dialog in your account preferences, its send button is **Create**.

The first message creates the workspace, its branch, and its first session.
Conductive shows the start steps as it starts the workspace's cloud computer.
Your accepted message waits until the agent can begin.
You can send more messages while that computer starts.
The workspace keeps them for the agent.

This wait happens after the org has a successful build.
Before that first build succeeds, keep your message in **New workspace** until **Send** becomes available.

If the workspace's computer cannot start, read the error.
Select **Try again** in the same workspace.
The workspace keeps its accepted messages after a failed start.
If the create request itself fails, **New workspace** keeps your draft with **Try again**.

Read the agent's answer in chat.
Ask a follow-up in the same session when you need more detail.
Open **Changes** to inspect any edits the agent makes.

- [Continue in sessions and chat](/docs/sessions-and-chat)
- [Review files and changes](/docs/files-and-changes)
- [Use Terminal and previews](/docs/terminal-and-previews)

## Optional setup

You can create your first workspace without writing an install script or a startup script.
Add a script when your repository needs extra software or commands.
Only an org admin can change these settings.

For example, an npm repository with a committed `package-lock.json` can install its dependencies during a build.
This example assumes its folder is `~/code/storefront`:

```bash
set -e
cd ~/code/storefront
npm ci
```

Repository folders normally use `~/code/<repo>`.
When repository names repeat, folder names include their GitHub owner, such as `~/code/acme-storefront`.
Use your repository's folder name in the script.

1. Open the org's **Settings**.
2. Select **Cloud computer**.
3. Enter your install script under **Install software**.
4. Select **Save script**.
5. Select **Build computer** after any current build finishes.

New workspaces use the changed setup after its build succeeds.
A failed build keeps the last successful setup.
Existing workspaces keep their files.

Use **Startup script** for commands needed when you start or resume a workspace.
It starts in the workspace's repository folder.
Use **Environment variables** for values your application needs.
Changed values apply at the next start of each workspace's cloud computer.

- [Read the Overview](/docs)
- [Configure the cloud computer](/docs/cloud-computer)
- [Understand credential access](/docs/security)
