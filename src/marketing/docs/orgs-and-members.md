---
title: Orgs and members
description: Group repositories and workspaces, invite your team, manage roles, and understand what members can share.
group: Manage
order: 20
---

## Choose an org

An org holds repositories, workspaces, members, and shared computer settings in Conductive.
It can be just you or a team.
It does not need to match one GitHub organization.

Your account needs access to Conductive before you can create an org.
An accepted org invitation can give you that access and membership together.

If you join an existing org, its admin manages repository access and the shared setup.
You need installation permission for the GitHub App when you set up your own org.

- [Get access and complete setup](/docs/get-started)

## Reorder your orgs

The org list at the far left has your own order.
Conductive saves that order with your account.
It stays the same after a reload, on other devices, and in the Mac app.
Other members keep their own order.

On a computer, move an org in one of these ways:

- Drag its tile up or down.
  Press **Escape** to cancel a drag.
- Right-click its tile.
  Then choose **Move up** or **Move down**.
- Focus its tile and press **Shift+F10** or the **Menu** key to open the same menu.
  Then choose **Move up** or **Move down**.
- Focus its tile and press **Alt+Up** or **Alt+Down** to move it one place.
  On a Mac, use **Option** in place of **Alt**.

On a phone, select the org name at the top of the list to open the org switcher.
Then long-press an org and move it to its new place.

A new org goes at the end.
Suspended orgs move in the same way.
Deleted orgs appear in Account settings.
The command palette lists orgs in your order.

## Switch between orgs

On a computer, select an org in the org list at the far left.
You can also use its keyboard shortcut, or **Switch to** in the command palette.
Conductive opens the last workspace that you opened in that org, with the same session or tab.
If that workspace is stopped, opening it starts its computer.
Without a last workspace, the org's workspace list opens.
While the workspace list is hidden, the current org opens its list instead, as [Hide the workspace list](#hide-the-workspace-list) says.

On a phone, the org switcher opens the org's workspace list.

Your browser and the Mac app each remember your last workspaces.
They stay after a reload and a restart, but not on other devices.

When Conductive opens without a chosen org, it opens the last workspace that you opened.
If its org is deleted, or you have no last workspace, it opens the first org in your list that is not deleted.

## Hide the workspace list

On a computer, select **Hide the sidebar** beside **Settings** at the top of the workspace list.
In the Mac app, the button sits beside the window buttons.
You can also choose **Hide the sidebar** in the command palette.
Or press **⌘B** on a Mac or **Ctrl+B** on another computer.

While the list is hidden, select the current org in the org list.
The workspace list opens beside it, over the page.
Select a workspace to open it.
To show the list again, select **Show the sidebar** in that list in a browser.
In the Mac app, select **Show the sidebar** beside the window buttons.

A narrow window also hides the list.
Select the current org to open the list in the same way.
On the org's own list page, the list shows in the page, so the org opens no second list.

## Create an org

1. Select **Create org** in the org list or **Get started**.
2. Enter a **Name**.
3. Set **Initials** if you want a different label in the org list.
4. Add at least one repository from **Repositories**.
5. Select **Create org**.

The creator becomes the first admin.
Conductive starts the first cloud computer build automatically.
You can connect an agent login while that build runs.

If a repository is missing, use **Manage access** to check the GitHub App's access.
The list needs access from both your GitHub account and the app.

Admins can later change the selection and its order in **Settings**, under **Repositories**.
A build applies that changed selection to new workspaces.
Selecting **Done** after you add repositories starts a build automatically.

- [Manage the shared cloud computer setup](/docs/cloud-computer)

## Connect an org agent login

An admin can connect one API key or own endpoint for each agent on the org's **Agents** tab.
Open **Settings**, then **Agents**, after **Cloud computer**.
Other members can read the login's kind, an endpoint's host, and the **Use for every member** setting.
They cannot change the login or see its saved key or full endpoint address.

Your usable personal login comes first unless an admin turns on **Use for every member**.
Without a usable personal login, new sessions use the org login when available.
You need no personal login when the org login serves you.
Automation runs follow the same rule for their owner.
The org login stays when the admin who connected it leaves.

- [Connect and manage an org login](/docs/agent-logins#use-an-org-login)

## Choose the org colour

The org list shows the open org in its colour.
Give each org its own colour to tell your orgs apart at a glance.
Only an admin can change the colour.

1. Open the org's **Settings**.
2. Open **General**.
3. Select a colour under **Colour**.

The colour saves at once.
An org that has no chosen colour shows blue.

## Invite a member

Only an admin can invite members.

1. Open the org's **Settings**.
2. Open **Members**.
3. Enter the person's email under **Invite a member**.
4. Select **Invite**.

The recipient must sign in with a GitHub account that verifies that email.
They join when they select **Accept invitation**.
They do not need to repeat the org's GitHub App installation.

If an invitation does not appear, check its email against the recipient's verified GitHub addresses.
The recipient should sign in again after adding a verified address.

If **Sign-ups are paused** blocks acceptance, the invitation stays available.
The recipient can accept it later.

## Share access with an invite code

Your **Account** page has an **Invite code** section.
Use **Copy** to share its invite link while it has uses left.
The section shows how many invites remain.

An active code with invites left shows **Anyone can sign up now** during open sign-up.
Its invites stay for later.
An invite link uses no invite during this time.
The pause notice shows instead while sign-ups are paused.

An invite code gives access to Conductive.
An org invitation also gives membership of the org that sent it.
Use an org invitation when you want someone to join your team.

A disabled or used-up code shows its state without a usable share link.
If sign-ups are paused, the code works again after the pause ends.

## Manage roles and ownership

An org has two roles: **Admin** and **Member**.

| Action | Admin | Member |
| --- | --- | --- |
| Read workspaces and chats | All workspaces in the org | All workspaces in the org |
| Send messages | Under the session's login rules | Under the session's login rules |
| Continue after a merge | All workspaces in the org | All workspaces in the org |
| Change the repository of a workspace | All workspaces in the org | All workspaces in the org |
| Change a workspace's target branch through an agent | All workspaces in the org | All workspaces in the org |
| Merge from the pull request bar | With GitHub write access or more | With GitHub write access or more |
| Mark a draft ready for review from the pull request bar | With GitHub write access or more | With GitHub write access or more |
| Manage members and org settings, except secrets | Yes | Read-only |
| Add a secret | Yes | Yes |
| Replace or delete a secret | Any secret | Their own secrets |
| Reveal a secret's value or mark it for all agents | Yes | No |
| Change the secrets in a workspace's **Capabilities** | Any workspace | Any workspace |
| Turn **Mac access** on or off in the Mac app | For their own Mac | For their own Mac |
| Reassign a workspace | Yes | No |
| Archive a workspace | Any workspace | Their own workspaces |
| Restore a workspace within its 14 days | Any workspace | Any workspace |

Use a person's role control in **Members** to change their role.
An org can have several admins.
Every member of an active org can restore another member's archived workspace within 14 days of Archive while its computer is kept.
Restore ends after 14 days, even while Conductive retries deleting the computer.
Archived chats stay read-only until Restore.
After 14 days, the workspace leaves **Archived** and the command palette.
A direct link or a chat link still opens its read-only chat.
Conductive keeps its chat history until the org is deleted.

The workspace counts in **Members** leave out removed workspaces.

- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)

Continue uses the GitHub account of the member who selects it for its branch fetch.
That account needs read access to the repository.
A repository change uses the GitHub account of the member who changes it in the same way, for the new repository.
Merge uses the clicking member's GitHub account, and GitHub checks its branch rules.
**Ready for review** also uses the clicking member's GitHub account.
When an agent changes the base of an open pull request, the member whose message started the turn needs GitHub write access.
An org role does not add GitHub access.

- [Continue after a merge](/docs/workspaces#continue-after-a-merge)
- [Change the repository](/docs/workspaces#change-the-repository)
- [Change the target branch](/docs/workspaces#change-the-target-branch)
- [Merge a pull request](/docs/pull-requests#merge-the-pull-request)

To reassign a workspace, select its owner in the workspace header.
Choose the member who will take responsibility for it.
Changing the owner keeps its computer running.
It does not move an existing session to the new owner's agent login.

## Share work with trusted members

Every member can see every workspace and chat in the org.
Sessions share the files and branch of their workspace.
Each session keeps its starter's personal login or the org login.
The personal login's share setting controls whether other members can use it in that session.
Every member can send messages on a session's org login.

Members with terminal access can read credentials available on the computer.
Work with people you trust with your agent and GitHub logins.

- [Set agent login sharing](/docs/agent-logins#choose-who-can-use-your-login)
- [Read the security guide](/docs/security)

## Remove a member

An admin can remove another member from **Members**.
That member loses ordinary access to the org.
Their workspaces stay in the org and move to the admin who removed them.
This includes removed workspaces, although the member's workspace count leaves them out.

If you need to leave an active org, ask another admin to remove your membership.
The last active admin must arrange another active admin or delete the org.

Removing a member does not revoke every credential they could have copied.
Use the security guide if you suspect a credential was exposed.

## Delete or restore an org

Only an admin can delete the org.

1. Open **General** in the org's **Settings**.
2. Select **Delete org**.
3. Read the deletion date and consequences.
4. Type the org's name to confirm.
5. Select **Delete org**.

Conductive stops its cloud computers and hides the org from members at once.
The org leaves the org list.
Conductive opens your next org, or **Get started** when you have no other org.
Admins can restore it for seven days before deletion completes.

To restore a deleted org:

1. Open your **Account** settings.
2. Find the org under **Deleted orgs** on the **General** tab.
3. Select **Restore** beside the org.

The org returns to the org list.

If all your orgs are deleted, **Get started** opens instead of an org.
It lists each deleted org with **Restore** above its steps.
Restoring brings back its workspaces, chats, and settings.
Archived workspaces stay archived after the org returns.
Their existing Restore deadlines continue to apply.
Workspaces archived at least 14 days ago stay out of **Archived** and the command palette.
Their read-only chat still opens by direct link or chat link.
Deleting the org does not extend a workspace's 14 days of Restore.
Other stopped workspaces start their computers when you open them.

After the org's restore window, deletion removes its remaining data and computers.
This includes its org agent logins.
An archived workspace's computer can be deleted earlier when its own Restore window ends.

Keep important work in GitHub before you delete an org.

- [Understand workspace archives](/docs/workspaces#archive-a-workspace)
