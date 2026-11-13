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

On a phone, the org switcher opens the org's workspace list.

Your browser and the Mac app each remember your last workspaces.
They stay after a reload and a restart, but not on other devices.

When Conductive opens without a chosen org, it opens the last workspace that you opened.
If its org is deleted, or you have no last workspace, it opens the first org in your list that is not deleted.

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

Admins can later change the selection in **Settings**, under **Repositories**.
A build applies that changed selection to new workspaces.
Adding a repository starts a build automatically.

- [Manage the shared cloud computer setup](/docs/cloud-computer)

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
| Merge from the pull request bar | With GitHub write access or more | With GitHub write access or more |
| Manage members and org settings | Yes | Read-only |
| Reassign a workspace | Yes | No |
| Archive a workspace | Any workspace | Their own workspaces |
| Restore a workspace within its 14 days | Any workspace | Any workspace |

Use a person's role control in **Members** to change their role.
An org can have several admins.
Every member of an active org can restore another member's archived workspace within 14 days of Archive while its computer is kept.
Restore ends after 14 days, even while Conductive retries deleting the computer.
Archived chats stay read-only until Restore.

- [Restore an archived workspace](/docs/workspaces#restore-an-archived-workspace)

Continue uses the GitHub account of the member who selects it for its branch fetch.
That account needs read access to the repository.
Merge uses the clicking member's GitHub account, and GitHub checks its branch rules.
An org role does not add GitHub access.

- [Continue after a merge](/docs/workspaces#continue-after-a-merge)
- [Merge a pull request](/docs/pull-requests#merge-the-pull-request)

To reassign a workspace, select its owner in the workspace header.
Choose the member who will take responsibility for it.
Changing the owner keeps its computer running.
It does not move an existing session to the new owner's agent login.

## Share work with trusted members

Every member can see every workspace and chat in the org.
Sessions share the files and branch of their workspace.
Each session uses its starter's agent login under that login's share setting.

Members with terminal access can read credentials available on the computer.
Work with people you trust with your agent and GitHub logins.

- [Set agent login sharing](/docs/agent-logins#choose-who-can-use-your-login)
- [Read the security guide](/docs/security)

## Remove a member

An admin can remove another member from **Members**.
That member loses ordinary access to the org.
Their workspaces stay in the org and move to the admin who removed them.

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
Deleting the org does not extend a workspace's 14 days of Restore.
Other stopped workspaces start their computers when you open them.

After the org's restore window, deletion removes its remaining data and computers.
An archived workspace's computer can be deleted earlier when its own Restore window ends.

Keep important work in GitHub before you delete an org.

- [Understand workspace archives](/docs/workspaces#archive-a-workspace)
