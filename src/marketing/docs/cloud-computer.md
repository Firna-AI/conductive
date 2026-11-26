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

Only an org admin can change repositories, scripts, environment variables, and the skills repository.
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
**New workspace** keeps its send button off until the org has a successful build.
You can keep a draft there while you wait.

## Choose repositories

After the first successful build, use these steps to change its repositories:

1. Open the org's **Settings**.
2. Select **Repositories**.
3. Select **Edit**.
4. Add or remove the repositories you want in its setup.
5. Select **Done**.

The tab lists the repositories in the setup, in the org's order.
**Edit** lists every repository that the GitHub App can reach, by name.
Your changes save when you select **Done**.
If you leave the tab before **Done**, nothing changes.
The full list has **Manage access** for the GitHub App's access on GitHub.
Your account and the app must both be able to reach a repository to select it.

To remove one repository outside **Edit**, open its **More** menu on the **Repositories** tab and choose **Remove**.
A question then says what the removal changes.
**New workspace** no longer offers the repository.
Its automations turn off, and only the owner of each can turn it on again.
If it is the first repository, the next one becomes the default.
Select **Remove** to confirm, or **Cancel** to keep the repository.
The removal saves at once and starts no build.

Selecting **Done** after you add repositories starts one build automatically, so you can add many repositories first.
If a build or refresh is running, one more build usually starts after it succeeds.
When the repository notice offers **Try again**, the last build failed, and the repository waits for it.
Select **Try again** to build it.
A newly added repository goes at the end of the order.
In **New workspace**, it becomes available after a successful build includes it.
Until then, the menu shows it as unavailable and says when it will be ready.

You can change an existing workspace to a repository that is waiting for a build.
If the cloud computer has no copy, Conductive copies the repository from GitHub into a new folder.

- [Change the repository](/docs/workspaces#change-the-repository)

When a repository gets a new name or default branch on GitHub, Conductive saves it and starts a build automatically.
After that build, the repository's folder uses its new name, such as `~/code/<new-name>`.
Update each install or startup script that names the old folder.
Existing workspaces keep their old folders.
Outside the merge queue, workspaces that target the default branch fetch its new name and then target it.
A stopped computer completes this move when it resumes.
Outside the merge queue, workspaces that target another branch keep that target.
Renaming the default branch keeps the merge queue.
Choosing a different default branch empties the queue.
The pull request bar shows a wait while the queue verifies the change.
If a build is running, the new build starts after it.
If the last build failed, the change waits for **Try again**.
Until then, refreshes still fetch new commits, and the folder keeps its old name.

When a repository moves to another owner on GitHub, Conductive follows the move like a new name.
It does so only when the org already has another repository of the new owner.
Otherwise, builds fail, and its workspaces and automations get no updates from GitHub.
To fix this, an admin removes the repository in **Edit** and selects **Done**.
Then the admin adds it again in **Edit** and selects **Done**.
The removal turns off each automation of the repository.
After the repository is back, the owner of each automation turns it on again.

A removed repository stays in the setup until the next build.
To apply the removal to the starting setup, select **Build computer** under **Cloud computer**.
Removing a repository leaves its files in any workspace that already has a copy.

## Order repositories

The first repository on the **Repositories** tab is the default.
It shows **Default**.
New workspaces and automations start in it.
While it waits for a build, new workspaces start in the next ready repository.
The repository menus of **New workspace** and of automations use the same order.
So does the repository list that agents get from the workspace tools.

Admins set the order for the whole org.
Other members see it read-only.
Each move saves at once and starts no build.

Outside **Edit**, move a repository in one of these ways:

- Drag its row up or down.
  Press **Escape** to cancel a drag.
  On a phone, long-press it and move it.
- Open its **More** menu.
  Then choose **Make default**, **Move up**, or **Move down**.
- Focus its row and press **Alt+Up** or **Alt+Down** to move it one place.
  On a Mac, use **Option** in place of **Alt**.

## Install software

1. Open **Cloud computer** in the org's **Settings**.
2. Enter an install script under **Install software**.
3. Select **Save script**.
4. Select **Build computer**.

Bash runs the install script during a build.
The build copies the chosen repositories before it runs that script.
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
Builds do not get your org's environment variable values.
Use startup commands for work that needs those values.

## Run commands at startup

Use **Startup script** for commands needed when you start or resume a workspace.
Bash runs it in the workspace's selected repository folder.

1. Enter the commands under **Startup script**.
2. Select **Save script**.

The changed script applies when a workspace next starts or resumes.
It does not rerun just because you saved it while a computer was running.
Archive and Restore do not run this script.

Use a [service](/docs/terminal-and-previews#run-a-server-as-a-service) for a server that you need after an agent replies.
Services keep running through software updates and **Restart** in the workspace header.
A computer stop discards their saved commands, settings, and logs.
Services do not restore themselves after **Resume**.

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

Services use the org values installed at this computer start, plus values supplied for the service.
They do not inherit the agent's credentials, turn context, or secrets added to an approved command.
They still share the computer's files and available credentials, as [Understand services](/docs/security#understand-services) says.

In an agent turn, Conductive sets `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL` for the agent's commands.
These values name the person whose message started the turn.
They take priority over every Git setting.
An org variable with one of these names has no effect.
Outside an agent turn, Git takes the workspace owner's author from the computer's system Git settings.
Conductive writes these settings at each start.
The owner's author takes priority over a `user.name` or `user.email` setting.
An `author` or `committer` setting in the repository or in the global Git settings takes priority over the owner's author.
In a workspace with older cloud computer software, agent commits name the workspace owner.
An older workspace gets the turn sender as commit author when an automatic software update applies.
A Git command can still set its own author, for example with `--author`.
The author of a commit does not prove who made it.

The **Secret** mark hides exact copies of a value in displayed agent output and start logs.
It also hides them in server and service details and service logs in **Preview**.
The same rule covers skill names and descriptions in the message box.
It does not hide values in file content, pictures in agent replies, diffs, or Terminal.

## Share agent skills across the org

Agents powered by Claude and Codex use shared skills from one public GitHub repository in every workspace of the org.

An org admin chooses one repository under **Skills** in **Settings**, on the **Cloud computer** tab.
The repository must be public on GitHub.
The **Repository** field accepts `owner/repository` or a link such as `https://github.com/owner/repository`.
**Save repository** saves that choice as `owner/repository`.
Save removes spaces and line breaks at the start and end of the text.
Other members see the saved repository and its skills without being able to change it.
An admin clears the field and saves to remove the repository.

### Prepare the skill folders

Each skill needs its own folder with a `SKILL.md` file.
When the repository has a `skills/` folder, agents use skill folders at any depth inside it.
This includes hidden folders such as `.curated/` and `.system/`.
For example, these layouts load:

```text
skills/review/SKILL.md
skills/.curated/testing/SKILL.md
skills/.system/writing/SKILL.md
```

When the repository has no `skills/` folder, agents use skill folders at its top level instead:

```text
review/SKILL.md
testing/SKILL.md
```

If a repository has no `skills/` folder and has a `SKILL.md` file at its root, the repository itself is one skill.
A skill's subfolders do not load as separate skills.
Agents skip the `.git/` folder.

The setting loads skills only.
It loads no hooks, MCP servers, agents, rules files such as `AGENTS.md`, separate custom slash commands, or settings from that repository.
Keep project instruction files in your workspace's own repository.
A skill in the workspace's own repository takes priority over a shared skill with the same name.

### Get skill updates

A changed repository applies at the next start or resume of each workspace.
The cloud computer copies the repository when it starts.
It follows the repository's default branch and checks for new commits every 5 minutes.
Agent turns do not wait for a copy or an update check.
A turn that starts before the first copy finishes runs without the shared skills.
Updated skills apply at the next turn of each session.
The shared skills also show in the list that `/` opens in the message box, after the first copy finishes.
That list shows updated skills soon after each new copy.
A failed update keeps the last successful copy, including across a stop and resume.

An older cloud computer needs software that supports org skills.

- [Apply updated cloud computer software](/docs/cloud-computer#apply-setup-changes)

### Check the skills list

The section looks up the saved repository on GitHub when an admin saves it and each time the section loads.
It shows the names of the skill folders that it finds.
The list describes the current repository contents on GitHub.
The list does not confirm which skills each workspace has copied.
The list that `/` opens in a workspace shows the skills that its cloud computer copied.

A private repository gives no skills.
Ask an admin to choose a public repository.
If the repository is not found, ask an admin to check its name and save again.
GitHub can also report a private repository as not found.
Text that is neither `owner/repository` nor a GitHub link still saves.
It gives the notice that the repository was not found and supplies no skills.
If no skills are found, check the folder layouts above.

GitHub can cut short the file list of a large repository.
The section then says that its skills list can be incomplete.
Agents still get all skill folders from the full repository copy.
If the list does not load, use **Try again**.
A failed lookup keeps the saved repository.
An expired GitHub sign-in shows a sign-in error instead.
Sign in again to load the list.

## Trust a skills repository

**Trust this skills repository** lets Claude run commands automatically while it reads that repository's skills.
These commands have the workspace's access to files, available credentials, and tools.
Trust covers future updates to the repository too.
Review the repository and who can change it before you trust it.

Each repository starts untrusted.
Only an org admin can change the choice.
Other members see the saved choice without being able to change it.
Everyone sees a read-only choice in a suspended org.

To trust a repository:

1. Open the org's **Settings**.
2. Select **Cloud computer**.
3. Enter or check the repository under **Skills**.
4. Turn on **Trust this skills repository**.
5. Select **Save repository**.

The switch appears when the field names a repository as `owner/repository` or a GitHub link.
Changing or removing the repository clears trust.
To trust a replacement, turn on its switch before saving.
The repository and its trust choice save together.

### Understand the scope

With a valid saved repository name and trust off, Claude runs no automatic commands from any skill or custom slash command.
This includes the workspace's own skills and custom slash commands.
The restriction also applies when the shared repository is private, missing, has no skills, or cannot be copied.
Agents can still choose to run commands through their ordinary shell tool, including commands that a skill suggests.

The choice concerns Claude only.
It does not change Codex's behavior.
With no valid repository name saved, workspace skills keep their usual behavior.
Trust permits automatic commands without forcing them or bypassing other restrictions.
It still loads only skills, as [Prepare the skill folders](#prepare-the-skill-folders) explains.

### Apply or revoke trust

Each cloud computer takes the saved repository and trust choice at its next start or resume.
Saving does not change an active turn.
A running computer can keep its previous trust indefinitely.
It still checks for repository updates every 5 minutes.

To revoke trust:

1. Turn off **Trust this skills repository** under **Skills**.
2. Select **Save repository**.
3. Let each running computer stop, then resume it.

A computer stops after a set time without user activity and without a running agent turn.
Use **Stop** in each session to end any running turn before you wait for the computer to stop.
After it stops, open the workspace, or select **Resume** if it is still open.
To stop it at once, the workspace owner or an org admin can use **Archive**.
Then use **Restore** within 14 days and select **Resume**.
Archive ends its running agent work and programs.

**Restart** restarts software inside a running computer.
It keeps that computer's current repository and trust settings.
Use a stop and resume to apply the saved choice.

This choice needs updated cloud computer software.
Automatic software updates bring that support to existing workspaces.
Software updates and saved settings apply separately.

- [Understand software updates](/docs/cloud-computer#apply-setup-changes)
- [Resume a stopped computer](/docs/workspaces#resume-a-stopped-computer)
- [Archive and restore a workspace](/docs/workspaces#archive-a-workspace)

## Add secrets for agents

Use **Secrets** for a key that an agent should use only with a member's approval.
Use environment variables for values that every computer needs at each start.

1. Open the org's **Settings**.
2. Select **Secrets**.
3. Select **Add secret**.
4. Enter its **Name**, **Description**, and **Value**.
5. Select **Save secret**.

Use only letters `A-Z` and `a-z`, digits `0-9`, and underscores `_` in a new secret's name.
The name can start with a digit.
**Save as secret** on a request uses the same name rule.
For other names, use **15 minutes** or **This workspace**.
Existing secrets keep their names and remain usable.
Replace changes the description or value and keeps the name.

Every member can add a secret.
You can replace or delete the secrets that you added.
An admin can replace or delete each secret.
Only an admin can reveal a saved value, or mark a secret for **All agents**.
Each row shows who revealed its value last.

An agent asks to run one command with a secret.
The command gets the value.
The agent gets the secret's name and environment variable name, without the value.
A member allows each session with **Allow for this session**.
A secret for **All agents**, or one that is pre-approved in the workspace's **Capabilities**, needs no approval.
The owner of an automation can choose secrets in **Capabilities** on its page.
Each run workspace starts with those secrets pre-approved by the owner.

The secret list gives the environment variable name that the command must read.
Use the secret's name to request it.
Use its listed variable name inside the command.
For example, `Cloudflare (read-only)` uses `CLOUDFLARE_READ_ONLY`.
Names that already work as shell variables keep their case.

Different secret names can need the same variable name.
A command that requests those secrets together does not run.
Use those secrets in separate commands.

An older tool can still omit a value if the secret's name cannot be a shell variable.
An [automatic software update](#apply-setup-changes) adds support for these names.

- [Understand secrets](/docs/security#understand-secrets)
- [Choose secrets for automation runs](/docs/security#choose-secrets-for-automation-runs)

## Apply setup changes

A successful build updates the starting setup for new workspaces.
A failed build keeps the last successful setup.
Each successful build shows the free storage that it leaves for new workspaces, such as "31.2 GB free of 50.1 GB".
Use it to check that your repositories and install script leave enough space.
Existing workspaces keep their files.

Selecting **Done** after you add repositories starts a build automatically.
Each build installs the newest release of Conductive's own cloud computer software.
**Continue** keeps that same computer and the software installed by the org's install script for the workspace's next task.
A new build does not replace the existing computer.

Conductive's own software updates itself in existing cloud computers.
Fixes need no new workspace or manual install.
The software checks for a newer release when it starts, including at each cloud computer start, and every 10 minutes while it runs.
It downloads a newer release in the background.
A start never waits for a download of a newer release.
If a software part of the release that starts is missing, the start downloads that part again first.
If that download fails, the start goes on, and the next start tries again.
A downloaded release applies at the software's next start or when the workspace has been idle for 2 minutes.
The workspace is idle when no agent turn runs in any session and no message waits.

The update never interrupts a running turn.
Agents keep their context.
Programs that agents started, including development servers, keep running.
Terminals keep running.
Terminal and preview software update when Conductive [restarts its software](/docs/workspaces#restart-the-software), or at the next cloud computer start.

To apply the newest release now, select the state in the workspace header, then **Restart**.
Restart first downloads the newest release, for up to 60 seconds, as [Restart the software](/docs/workspaces#restart-the-software) says.
Restart stops running turns and their ordinary agent commands.
Services keep running during Restart.
The shells and commands in your terminals keep running too.

A failed check or download leaves the current release in use.
Conductive checks each downloaded file against its expected digest and refuses a broken release.
The previous release stays available.
If a new release fails to start, the previous release starts again.
An older cloud computer without the update program gets it at its next start.

An automatic software update gives an existing workspace the server list in **Preview**.
It also adds services to software that does not yet support them.
The workspace tools update with Conductive's own software.
They manage workspaces, sessions, sections, and private previews across the org.
The tools also read chats and messages there, and run commands with secrets.

Installing updated agent software in an older computer does not change its protection for saved agent logins.
Ask an admin to run **Build computer**.
After it succeeds, create a new workspace for the new protection.

- [Understand agent login protection](/docs/security#protect-agent-and-github-logins)

After the first successful build, removed repositories and saved install-script changes need **Build computer**.
New workspaces can keep using the last successful setup while a later build runs.

Changes during the first successful build get one extra build automatically.
If that first build fails, **Try again** uses the saved settings.
The build action stays unavailable while a build is running.

## Recover from a failed build

Open **Cloud computer** to read the build log and its error.
Check the install script and repository access when the error names them.
Correct the cause before you select **Try again**.

A build or repository refresh has a 60-minute limit.
A failed later build leaves the last successful setup available.
If no build has succeeded, workspaces must wait for one that does.

The **History** list shows earlier build results.
Other members must ask an admin to change the setup or retry a build.

## Keep repository copies current

Conductive refreshes the prepared repositories after default-branch pushes and with a daily timer.
Push refreshes run at most once per 30 minutes.
A refresh fetches repository commits without running the install script.
A refresh also installs the newest release of Conductive's own cloud computer software.

Use a new build when changed dependencies need the install script again.
Existing workspaces keep their own files and branch.

- [Create and manage workspaces](/docs/workspaces)
- [Understand environment value access](/docs/security#understand-environment-values)
