---
title: Cloud computer
description: Prepare the repositories, software, startup commands, and environment values that new workspaces use.
group: Manage
order: 10
---

## Understand the shared setup

A build prepares your org's setup with its chosen repositories and installed software.
Each new workspace starts its own cloud computer from that setup.
Workspaces then have their own files and branches.

Only an org admin can change repositories, scripts, and environment variables.
Other members can read the settings without changing them.
If you joined an org, its admin handles this setup for you.
Add scripts and environment values when your repository needs them.

## Follow the first build

Creating an org starts its first build automatically.
The org must have at least one repository.
You can connect your agent login while the build runs.
You can also open the org before the build finishes.

The org step in **Get started** shows the result:

| State | What to do |
| --- | --- |
| Preparing | Continue agent setup while the build runs. |
| Ready | Create a workspace. |
| Failed | Read **Open the log** before using **Try again**. |
| No build yet | Select **Build computer**. |

Only an admin gets the build actions.
**New workspace** keeps **Send** off until the org has a successful build.
You can keep a draft there while you wait.

## Choose repositories

After the first successful build, use these steps to change its repositories:

1. Open the org's **Settings**.
2. Select **Repositories**.
3. Add or remove the repositories you want in its setup.

The repository list has **Manage access** for the GitHub App's access on GitHub.
Your account and the app must both be able to reach a repository to select it.

Adding a repository starts a build automatically.
If a build or refresh is running, one more build usually starts after it succeeds.
When the repository notice offers **Try again**, the last build failed, and the repository waits for it.
Select **Try again** to build it.
A newly added repository becomes usable after a successful build includes it.
Until then, **New workspace** shows it as unavailable, with a note that says when it will be ready.

A removed repository stays in the setup until the next build.
To apply a removal, select **Build computer** under **Cloud computer**.
Existing workspaces keep the repositories and folders from the setup they started with.

## Install software

1. Open **Cloud computer** in the org's **Settings**.
2. Enter an install script under **Install software**.
3. Select **Save script**.
4. Select **Build computer**.

Bash runs the install script during each build and each refresh.
A build or a refresh copies the repositories before it runs that script.
Use the install script for dependencies and shared software.

For an npm repository in `~/code/storefront` with a committed `package-lock.json`, a script can use:

```bash
set -e
cd ~/code/storefront
npm ci
```

Use the folder of your own repository in the script.
Folders normally use `~/code/<repo>`.
Repeated repository names get an owner prefix, such as `~/code/acme-storefront`.
A remaining folder-name collision adds a numeric suffix.

The page lists the software included before your install script runs.
Builds and refreshes do not get your org's environment variable values.
Use startup commands for work that needs those values.

## Run commands at startup

Use **Startup script** for commands needed when you start or resume a workspace.
Bash runs it in the workspace's selected repository folder.

1. Enter the commands under **Startup script**.
2. Select **Save script**.

The changed script applies when a workspace next starts or resumes.
It does not rerun just because you saved it while a computer was running.
Archive and Restore do not run this script.

## Set environment variables

1. Find **Environment variables** under **Cloud computer**.
2. Select **Add variable**.
3. Enter its **Name** and **Value**.
4. Set its **Secret** mark.
5. Select **Save variable**.

A new variable starts with **Secret** on.
Use a row's change action to replace its value.
Saved values stay hidden in settings, including values without the **Secret** mark.

Values and marks apply at the next start of each workspace's computer.
Every workspace receives the org's environment values, except values with a name that Conductive sets itself.
Agents and members with terminal access can read the values that the computer receives.

Conductive sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL` for commit authors and committers.
An org variable with one of these names has no effect.
These values also take priority over an author that a script or an agent writes into Git settings.
A Git command can still set its own author, for example with `--author`.
The author of a commit does not prove who made it.

The **Secret** mark hides exact copies of a value in displayed agent output, start logs, and program names and folders in **Preview**.
It does not hide values in file content, diffs, or Terminal.

## Apply setup changes

A successful build or refresh updates the starting setup for new workspaces.
A failed build or refresh keeps the last successful setup.
Existing workspaces keep their files.

Adding a repository starts a build automatically.
Each build and refresh also installs the newest Conductive cloud computer software.
An existing workspace gets that software when its computer next starts or resumes.
That start shows the step **Updating the agent and terminal software**.
If the update fails, the workspace starts with its earlier software.
A warning then stays until the next start, which tries the update again.
The newer software also gives the workspace the server list in **Preview**.

After the first successful build, removed repositories and saved install-script changes need **Build computer**.
New workspaces can keep using the last successful setup while a later build or a refresh runs.

Changes during the first successful build get one extra build automatically.
If that first build fails, **Try again** uses the saved settings.
The build action stays unavailable while a build or a refresh is running.

## Recover from a failed build

Open **Cloud computer** to read the log and the error of a failed build or refresh.
Check the install script and repository access when the error names them.
Correct the cause before you select **Try again**.
After a failed refresh, **Try again** starts a build with the saved settings.

A build or refresh has a 60-minute limit.
A failed later build or a failed refresh leaves the last successful setup available.
If no build has succeeded, workspaces must wait for one that does.

The **History** list shows earlier builds and refreshes, with their results.
Other members must ask an admin to change the setup or retry a build.

## Keep repository copies current

Conductive refreshes the setup after default-branch pushes and with a daily timer.
Push refreshes run at most once per 30 minutes.
A refresh starts on a clean computer and copies the repositories at their newest commits.
It then runs the install script of the last successful build.
So the install script also runs on the newest code, such as a changed lock file.

A refresh keeps the install script and the repositories of the last successful build.
Saved install-script changes and removed repositories still need **Build computer**.
Existing workspaces keep their own files and branch.

- [Create and manage workspaces](/docs/workspaces)
- [Understand environment value access](/docs/security#understand-environment-values)
