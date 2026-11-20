# Orgs and members

This doc holds the requirements and the decisions in force for orgs, their
sections, and their members. Linked pages cover
[the order of the org rail](org-rail-order.md), the first run in
[Get started](get-started.md), and the end of an org in
[Delete org](delete-org.md). The sections and the rows of the workspace
list are in [Sections](sections.md). The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. A secrets decision number names a decision of the change that adds
[secrets](secrets.md), as that doc says. An org login decision number
names a decision of the change that adds the org logins, as
[Tokens and secrets](tokens-and-secrets.md) says. An e2b decision number
names a decision of the change that adds E2B as the second
[sandbox provider](workspaces-and-sandboxes.md#the-provider), as that doc
says.

## Orgs

- An org owns its workspaces, its sections, its repositories, and the
  settings of its org image (decision 21).
- An org also owns the org logins that its admins connect, at most one for
  each agent, as [Org logins](org-logins.md) says (org login decision
  1 B).
- An org also has members and [automations](automations.md).
- All orgs share the app's GitHub App. The personal logins of a user serve
  all of that user's orgs (decision 21). An org login serves only the
  members of its own org.
- Each org runs in one provider account of the app for its whole life,
  and shares its plan limits with the other orgs of that account, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says
  (decision 80, and e2b decision 222). No org has a provider key.
- Orgs that mirror GitHub accounts were rejected, because a new org would
  then need the GitHub App on another GitHub account.
- The org rail lists the orgs of the user that are not deleted, and the
  user can create orgs.
- Create org accepts a name, custom initials, and chosen repositories.
- For an operator, Create org also shows the provider account of the new
  org: "By weights", or one configured account by its ID, such as `boat`
  or `e2b` (e2b decisions 221 and 222). "By weights" is the default. It draws
  the account from the weights, as
  [The account of an org](workspaces-and-sandboxes.md#the-account-of-an-org)
  says.
- Reason: an operator can then put a test org on each provider. The
  choice lists only configured accounts.
- The create of the first org of an operator, from Get started, shows the
  choice too. Nobody else sees the choice.
- The Worker reads the choice only from an operator. From anyone else, it
  ignores the choice and draws the account from the weights. Reason: a
  person who is not an operator must not pick a provider, and an ignored
  choice adds no new refusal.
- Create org requires at least one repository (decision 151 of PR #92). The create
  screen says so, and Create org stays off until the person chooses one.
  The app refuses a create of an org with no repository.
- Reason: every new org then starts its first build at create, with the
  whole choice of repositories, as
  [The first build](org-image.md#the-first-build) says. A
  first build at the first save on the Repositories tab was rejected,
  because that tab saves each repository on its own. That build could
  start with only part of the choice.
- Before the org exists, the create screen lists repositories that the
  signed-in user and the shared GitHub App can both reach.
- When that list has no repository, Create org stays off. The list then
  asks the person to give the GitHub App access, with its Manage access
  link.
- Each list of the repositories that the GitHub App reaches has a Manage
  access link. The link opens the page of the GitHub App on GitHub. That
  page lists the GitHub accounts of the person, personal and org. There
  the person changes the repositories that the app reaches on an account,
  or installs the app on another account.
- After a save on GitHub, the return opens the screen of the list again,
  as [The GitHub App](github-banner.md#the-github-app) says.
- A link to the settings page of each installation was rejected, because
  it gives no link when no account has the app, and it cannot install the
  app on another account.
- The org rail and General settings show the saved initials.
- Each org has a colour, which an admin picks on the General tab of its
  settings (org colour decision 1 A of 17 November 2026). The choice is one
  of eight presets: Blue, Teal, Green, Yellow, Orange, Red, Pink, and
  Purple. A choice saves at once.
- Only the tile of the open org shows the colour, in its initials and its
  outline (org colour decision 2 A). The tiles of the other orgs stay
  grey, so the colour also marks the open org.
- An org without a chosen colour shows Blue (org colour decision 3 A). A
  new org starts with Blue.
- Each preset keeps its initials at a contrast of 4.5:1 or more on the
  tile, in the light and the dark scheme.
- Reason: a person in several orgs could miss which org was open, because
  every open org showed the same blue. A colour that each person picks was
  rejected, because teammates would then see different colours for one
  org. A colour for the whole app was rejected, because red, amber, and
  green already mean danger, warning, and success.
- Use of the product is free until billing starts, as
  [Before billing starts](pricing.md#before-billing-starts) says. Until
  then, the app has no billing, and no limits of its own on workspaces,
  hours, or members.
- When billing starts, each org has a plan, and the org pays for its
  members and its cloud hours (decision 250).
  [The plans](pricing.md#the-plans) give the price, the hours, and the
  limits of each plan.
- A waitlist stands in front of the app (decision 160). Except during
  [open sign-up](sign-ups.md#open-sign-up), a new account waits for app
  access, as [Waitlist](waitlist.md) says (decision 230).

## Org rail order

- [Org rail order](org-rail-order.md) holds the requirements of the order
  of the orgs in the rail that each person keeps: the drag, the tile menu,
  the keys, and the long press on a phone. It also says which page opens
  when the person opens an org.

## Repository order

A repository-order decision number names a decision of the change that
adds this order. The pull request of that change keeps its record.

- The chosen repositories of an org have one order, the same for each
  member. The user asked for it on 18 November 2026.
- The first repository of the order is the default repository of the org.
  New workspace picks it, as
  [Waiting repositories](new-workspace-notices.md#waiting-repositories)
  says. A new automation gets it, as [Automations](automations.md) says.
- The Repositories tab lists the chosen repositories in the order. The
  first row shows Default, for every person. The tab says that new
  workspaces and automations start in the first one, and that new
  workspaces start in the next ready one while it waits for a build.
- The New workspace repository menu, the repository menu of an
  automation, and each other list of the chosen repositories follow the
  order. The agent tool list follows it too, as
  [Repositories](create-call-lists.md#repositories) says.
- Only an admin changes the order (decision 57). Other members see it
  read-only. Reason: the order sets the default of the whole org.
- An admin moves a chosen repository in three ways
  (repository-order decision 1 F):
  - A drag of its row. Its handle shows where it lifts. On a phone, a long
    press lifts the row. A press on the row menu starts no drag. The lifted row, its faint copy, and the line where it lands look
    like the drag of an org tile. Escape ends the drag, and the order
    stays as it was.
  - The row menu: Make default, Move up, and Move down. Make default moves
    the row to the top. On the first row, Make default and Move up are
    off. On the last row, Move down is off. A phone opens the menu as a
    sheet.
  - Alt and Up or Down, with no other modifier key, on a focused row. The
    focus stays on the row.
- After a move, a screen reader hears the name and the new place, such as
  "acme/web moves to place 1 of 3".
- Each move saves at once. A move starts no build, and the cloud computer
  does not change. Reason: the order is a setting of the app lists, not of
  the cloud computer.
- The moves show outside Edit only. Edit lists every repository that the
  GitHub App reaches, by name.
- A newly chosen repository goes to the end of the order. A repository
  that the org removes and adds again also goes to the end. So an add
  never changes the default.
- Create org saves its chosen repositories in the order of their names.
- A member sees an order that an admin changed at the next read of the
  list, as for a section move.

## Get started

- [Get started](get-started.md) holds the requirements of the first run:
  its steps, the agent step, the state of the first build in its org step,
  and its finish.

## Sections

- [Sections](sections.md) holds the requirements of the sections of an
  org and the rows of its workspace list: the menu and the order of the
  sections, the moves of workspaces, the Archived group and its counts,
  and the Archive, Restore, and open of a row.

## Members and roles

- Orgs have members, so that a workspace can move from one member to
  another.
- The roles are admin and member, as in Conductor (decision 54). An org
  can have several admins.
- A separate owner role above the admins was rejected, because several
  admins already give an org more than one manager.
- An admin invites a person by email, and the app sends the invitation to
  that address (decision 78).
- The person joins with a GitHub account that has that address as a
  verified email. The app reads the verified emails at sign-in, and the
  person accepts each matching invitation.
- Reason: a GitHub login can be renamed and taken by another account. A
  verified email proves the inbox.
- An accepted invitation also gives app access to a person who waits, with
  no count (decision 163).
  [Org invitations](waitlist.md#org-invitations) states the rule.
- Only an admin invites and removes members, changes a role, reassigns a
  workspace, and deletes the org.
- Only an admin changes the repositories, the install script, the startup
  script, and the env vars (decision 57). Other members see them
  read-only.
- Only an admin changes the org's name, initials, and colour. Other
  members see them read-only.
- Only an admin connects, replaces, or removes an org login, and changes
  its switch "Use for every member" (org login decision 1 B). Other
  members see the Agents tab read-only, as
  [The Agents tab](org-logins.md#the-agents-tab) says.
- Changes by every member were rejected, because a changed script reaches
  every new sandbox of the org and runs during other members' turns.
- Every member adds [secrets](secrets.md) and uses each secret of the org.
  A member replaces or deletes only the secrets that the member added
  (secrets decision 3 B).
- An admin replaces and deletes each secret. Only an admin sets the mark
  for all agents and reveals a value (secrets decisions 2 A and 3 B).
  [Rights](secrets.md#rights) gives the reasons.
- Every member can see and change the Capabilities of each workspace: its
  pre-approved secrets, its Mac access, and its other grants
  (secrets decision 8 B).
- Every member who sees a session can answer its secret requests
  (secrets decision 4 B).
- Every member of the org sees all of its workspaces (decision 39).
- Every member also sees all of the automations of the org and their runs.
  Only the owner of an automation changes it, as [Access](automations.md#access)
  says (decision 502 B).
- Every member can send messages in every workspace of the org. Each
  session runs on its login: the personal login of its starter, or the
  org login, as [Agents and sessions](agents-and-sessions.md#agents) says.
- Every member can move a workspace to another section and rename it,
  while the workspace is not archived.
- Every member of an org that is not suspended can restart the software of
  a running workspace, as
  [Restart the software](workspace-life.md#restart-the-software) says.
- Every member can move a section to another place in the list, as each
  member can create, rename, and delete a section.
- A member who is not an admin sees the Members tab and the owner of each
  workspace, without the actions of an admin.
- Only the workspace owner and the admins can archive a workspace
  (decision 42).
- Archive by every member was rejected, because the app deletes the
  sandbox 14 days after an Archive. A member could then start the delete
  of the unpushed work of another member.
- Every member of an org that is not suspended can restore an archived
  workspace (decision 2 of PR #138).
- Reason: Restore deletes nothing. It gives a member only the access that
  a resume gave before the Archive.
- Restore only by the owner and the admins, as for Archive, was rejected
  for that reason. So a member can restore a workspace that its owner
  archived. Only the owner or an admin can archive it again.
- Restore keeps the owner of the workspace. A new owner for the member who
  restores was rejected, because only an admin reassigns a workspace.
- Every member can continue each workspace of the org after its merge
  (decision 224). [Who may continue](continue.md#who-may-continue) gives
  the reason.
- The role does not decide Merge or the agent actions of the pull request
  bar. The GitHub access of each member decides them, as
  [GitHub banner](github-banner.md#merge) says.

## Workspace owners

- The workspace owner is the person who is responsible for the workspace
  (decision 24).
- Each workspace belongs to the person who created it, until an admin
  reassigns it. A move to a suspended member fails, as
  [Owners and admins](operator-actions.md#owners-and-admins) says.
- An admin reassigns a workspace with the owner picker of its header, or
  with Reassign to in the
  [menu of its row](workspace-menu.md#reassign-to).
- The header of a workspace names its workspace owner.
- A reassign changes no login. Each session keeps its login.
- Model use on an account of the app was rejected. Each session runs on a
  login that its starter or an admin of the org connected, as
  [Agents and sessions](agents-and-sessions.md#agents) says.

## When a member leaves

- When a member leaves, or an admin removes them, their workspaces stay in
  the org (decision 39).
- The workspaces move to the admin who removed the member. When the member
  left alone, they move to the earliest admin of the org who is not
  suspended. [Owners and admins](operator-actions.md#owners-and-admins)
  states the choice when no such admin exists (decision 123).
- Reason: each workspace keeps a person in the org who is responsible for
  it.
- The [removed workspaces](workspace-life.md#removed-workspaces) of the
  member move too, because the app keeps their data.
- Their automations in the org move to the member who gets the workspaces,
  turned off, as [When the owner leaves](automations.md#when-the-owner-leaves)
  says (decision 508 E).
- The last admin can leave only after they make another member an admin,
  or by deleting the org (decision 55). This also holds when the last
  admin deletes their account. For a leave and a change of role, only
  admins who are not suspended count (decision 123).
- Reason: the org always keeps someone who can manage it. The person who
  leaves chooses the next admin, so nobody gets the role by surprise.
- An automatic admin role for the earliest member was rejected for that
  reason.

## Delete org

- [Delete org](delete-org.md) holds the requirements of Delete org, the
  restore of a deleted org within 7 days, and the end of its data.
