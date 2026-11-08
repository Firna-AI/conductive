# Private workspaces

Status: Active. On branch `calummoore/private-workspace-support`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today every member of an org sees each workspace of the org and can send
messages in it. So a member cannot keep a draft, an experiment, or
sensitive work to themselves. This change adds a choice on each workspace:
"Everyone at <org>" or "Private", as the picker of Conductor does. Only the
workspace owner can see and use a private workspace. The org's admins
cannot see it either. The brainstorm notes and the options check are in
`.context/private-workspaces/`.

The change does not hide the branch, the commits, or the pull request on
GitHub. It adds no share list for chosen members, and no org setting that
turns private workspaces off. Decisions 3 and 4 are open. Decision 3
decides whether a shared workspace can become private. Decision 4 decides
whose login a session uses after its starter can no longer open the
workspace. Two TODOs of Milestone 1, and Milestones 6 to 8, wait for them.

Contract owners:

- [Orgs and members](../docs/protocol/orgs-and-members.md): the choice,
  who can reach a private workspace, and the moves of an owner's
  workspaces.
- [Access and security](../docs/protocol/access-and-security.md): the
  access rule, the logins, and the risks.
- [Chat and events](../docs/protocol/chat-and-events.md): who can send
  messages.
- [Agent tools](../docs/protocol/agent-tools.md): the create and list
  calls.
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md):
  the picker of New workspace.
- [Operator actions](../docs/protocol/operator-actions.md): suspended
  owners and their workspaces.
- The [architecture doc](../docs/architecture.md): the term and the trust
  boundary.
- The [Worker README](../worker/README.md), the
  [security README](../worker/security/README.md), and the
  [app API README](../worker/app-api/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md).

Replaced ways:

- A separate check of org membership in each path of a workspace → one
  shared access check. Consumers: the members gate with
  `requireWorkspaceOrg` and the lifecycle routes, the chat routes and the
  feature routes that reach the workspace object before the members gate
  (files, terminal, desktop, and previews), the workspace list, the
  rename, move, archive, and reassign writes, the Mac app routes of a
  workspace, the socket and preview checks, and the GitHub banner reads.
  Moved in Milestone 3. Deleted in Milestone 3. The login and sender
  checks of a turn wait for decision 4.

## Decisions

### 1. Members cannot keep a workspace to themselves

Added on 8 November 2026 from the brainstorm. The options check of the
same day changed the reasons under Left out and the wider fix.

- **Severity:** Medium. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/orgs-and-members.md:92` and
  `worker/app-api/shell-data.ts:71`.
- **Background:** Every member sees all workspaces of the org, and can send
  messages in each one. The workspaces table has no visibility column. Many
  paths check membership in separate queries: the list, the terminal and
  previews, the Mac app, archive, the agent tools, GitHub, and others. A
  pushed branch stays visible to everyone who can read the GitHub
  repository. Inside an org, admins can run code in every cloud computer
  through the startup script, the env vars, and the install script.
- **Problem:** A member cannot keep a draft, an experiment, or sensitive
  work away from the other members.
- **Impact if no action:** A member who wants privacy must create and set
  up a second org. Otherwise, other members can read the work and spend the
  owner's login in the owner's sessions.
- **Root question:** How can a member keep a piece of work to themselves,
  so that other members of the org cannot see or use it?
- **Options:**
  - **A.** Change nothing. The member creates an org with only themselves
    in it. That org does not have the team's env vars, the member must
    repeat the setup, and a workspace cannot move between orgs. Effort:
    Small.
  - **B.** Add an Everyone or Private choice on each workspace, in New
    workspace and in the workspace header. The Worker hides a private
    workspace from other members and refuses their requests to it. The
    work needs a new database column and one shared access check for all
    paths. It also needs a mockup, protocol changes, and tests. Effort:
    Large.
  - **C.** As B, and the owner can also give access to chosen members, so
    that two people can work on it together in private. It adds a member
    picker, a table, and more rules for removals and logins. Effort: Large.
- **Left out:** A personal org that the app creates for each user, because
  the team's env vars still do not come along. A mark that only hides the
  workspace from lists, because other members can still open it. Private
  sections, because a deleted section moves its workspaces to General and
  a drag moves a row, so either would make a workspace shared. Teams inside
  an org, because for one person B is better on every point, and for
  several people a team is C with saved groups. A private copy of the
  repository for each member, because it does not hide the workspace in the
  app.
- **Wider fix:** B, with one shared access check at the app entry for each
  path under the path of a workspace. A new route under that path then
  gets the rule without its own call. The sockets, the preview domain, the
  Mac routes, the list, and the agent tools use the same rule.
- **Previous examples:** None found. No plan, follow-up item, pull
  request, or earlier workspace covers private workspaces.
- **Related:** Decisions 2, 3, and 4 apply only to B and C.
- **Recommendation:** B. It keeps a workspace just for its owner, with the
  team's repositories, scripts, and env vars, at a lower cost than C. A
  share list can come later.
- **Action:** ask the user, because B changes the rule that every member
  sees every workspace.
- **Chosen:** B, by the user on 8 November 2026, as recommended.

### 2. Decide whether admins can open private workspaces

Added on 8 November 2026 from the brainstorm. The options check of the
same day added options D, E, and F, and moved the recommendation from A to
B.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/orgs-and-members.md:83` and
  `docs/protocol/orgs-and-members.md:98`.
- **Background:** Only admins reassign a workspace. The owner and the
  admins can archive it. When a member leaves, their workspaces move to an
  admin. Admins also change the startup script, the env vars, and the
  install script, which reach every cloud computer of the org.
- **Problem:** No rule says whether a private workspace is also private
  from the org's admins.
- **Impact if no action:** The implementation must guess. A wrong guess
  misleads members about their privacy, or stops admins from doing their
  work.
- **Root question:** Who other than the owner may see and act on a private
  workspace?
- **Options:**
  - **A.** Admins can see and open every private workspace. The picker
    says "Only you and the org's admins". Archive, reassign, and
    departures work as today. Effort: Small.
  - **B.** Only the owner. Admins do not see it, so they cannot archive or
    reassign it. An admin gets it only when its owner leaves or is
    removed. Effort: Small.
  - **C.** Admins see its row and can archive or reassign it. They cannot
    open its chat, files, terminal, or previews. If an admin reassigns it
    to themselves, they can open it. Effort: Medium.
  - **D.** Admins keep the rights of A, but their list hides other members'
    private workspaces until they turn on a filter. The picker says "Only
    you and the org's admins". Members get no privacy from admins in the
    app. It adds a filter and a mockup. Effort: Medium.
  - **E.** As B, but admins see each member's private workspaces in the
    Members tab and can archive them there. They cannot open or reassign
    them. Admins see the names, and can delete unpushed private work
    without seeing it. Effort: Medium.
  - **F.** As B, but when a member leaves, the app archives their private
    workspaces instead of moving them. The leave and remove dialogs say so.
    A removal then loses unpushed private work. Effort: Medium.
- **Left out:** An open by an admin that records the visit and tells the
  owner, because it is a detail that D can add.
- **Wider fix:** None. The rule goes in the shared access check of
  decision 1.
- **Previous examples:** Decision 42 of `boat-native-remote-workspaces.md`
  chose that each member controls their own work, and that admins can
  still act on every workspace.
- **Related:** Decision 1, because this applies only to its options B and
  C.
- **Recommendation:** B, after the options check. The first recommendation
  was A. B answers the user's reason and keeps "Private" true inside the
  app. D fits only if admins must keep archive and reassign.
- **Action:** ask the user, because the options trade the members' privacy
  against the admins' duties, and no option is clearly best.
- **Chosen:** B, by the user on 8 November 2026. The user's reason: "it
  would be annoying as an admin to see all of them". The risk stays: an
  admin can still reach a private cloud computer through the startup
  script, the env vars, and the install script. So the protocol says that
  "Private" is not a wall against admins.

### 3. Decide whether a shared workspace can become private

Added on 8 November 2026 from the brainstorm. The options check of the
same day added options D and E, moved the login question to decision 4,
and moved the recommendation from A to D. Open.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/access-and-security.md:226` and
  `docs/protocol/operator-actions.md:58`.
- **Terms:**
  - **Workspace token:** a secret in each cloud computer that its programs
    use to reach the app. A member with a terminal can copy it.
- **Background:** When a member loses access, an open tab closes within 30
  seconds (decision 70). Some things that the member started keep working:
  an open desktop stream until the cloud computer stops (decision 117), a
  copied workspace token (decision 124), and a program or a file that the
  member left in the cloud computer. A revoked workspace token stops a
  running cloud computer, and its next start gets a new token. A
  suspension uses this path today.
- **Problem:** No rule says whether the owner can make a shared workspace
  private, or what must stop for the other members when that happens.
- **Impact if no action:** Members could trust a privacy that a copied
  token or a leftover program breaks. A copied token can connect a false
  runner, and get the owner's later messages, logins, and list of private
  workspaces.
- **Root question:** What must stop for the other members when a workspace
  becomes private, and can the app stop enough of it to offer the switch?
- **Options:**
  - **A.** The owner can switch both ways at any time. Other members lose
    access within 30 seconds. Their open desktop streams, copied tokens,
    programs, and files keep working, and the protocol states this risk.
    Effort: Small.
  - **B.** The switch goes one way only, from Private to Everyone. If the
    owner makes the wrong choice at create, they need a new workspace.
    Effort: Small.
  - **C.** As A, but Private is available only while no other member has
    started a session, sent a message, opened a terminal or the desktop,
    or launched a preview there. Then nobody else can have left anything.
    The picker says why Private is not available. Effort: Medium.
  - **D.** As A, and the switch also revokes the workspace token and stops
    the cloud computer. Its next start gets a new token. This ends copied
    tokens, running programs, and open desktop streams. Files on the disk
    stay, such as git hooks. Each switch ends a running turn, and the next
    message waits for a resume. Effort: Medium.
  - **E.** As B, plus "Continue privately". It creates a private workspace
    on a new cloud computer, from the pushed branch of the shared one.
    Nothing from the old disk comes along, and the new chat starts empty.
    The owner must push first. It needs a new way to create a workspace, a
    mockup, and protocol text. Effort: Large.
- **Left out:** Keeping access for the members who already used the
  workspace, because it needs the share list of decision 1 C, which the
  user did not choose. A warning in place of the refusal of C, because it
  is a variant of C.
- **Wider fix:** E, for what stays in the cloud computer. E never keeps the
  old cloud computer, so nothing that another member left there can
  outlast the switch. Decision 4 holds the wider fix for logins.
- **Previous examples:** Decisions 117 and 124 accepted that a desktop
  stream and a copied token keep working after a member loses access. A
  suspension revokes workspace tokens and stops the cloud computers.
- **Related:** Decision 4: options A and D also need its rule for the
  logins of the other members. Under B, a wrong default cannot be undone,
  so design call 1 then goes to the user. Every option lets a private
  workspace become shared, so Milestones 4 and 5 build that part.
- **Recommendation:** D, after the options check. The first recommendation
  was A. D ends copied tokens, programs, and desktop streams with the
  existing revoke path, for the cost of one restart. C is the safe choice
  when a restart at each switch is not acceptable. E protects best, at a
  Large cost.
- **Action:** ask the user, because D changes the access rules of the
  protocol, and the options trade safety against a restart and the build
  cost.

### 4. Decide whose login serves a session after its starter loses access

Added on 8 November 2026 from the options check of decision 3. The options
check of decision 4, the same day, added options D and E, and made the
recommendation depend on decision 3. Open.

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `docs/protocol/access-and-security.md:202` and
  `worker/chat/queries.ts:106`.
- **Terms:**
  - **Linked session:** a new, empty session on the sender's own login. It
    opens when the first session's login cannot be used (decision 115).
- **Background:** Each session runs on the login of its starter. The
  workspace gives that login to the runner while the starter is a member
  of the org. It checks the login only when it sends a turn or a message
  to the runner, so a turn that runs keeps its login until it ends. The
  GitHub token and the Mac requests of a turn follow its sender, also
  while the sender is a member. Private workspaces add a new case: a
  member who stays in the org but can no longer open the workspace. An
  admin who reassigns their own private workspace is such a member.
  Options A and D of decision 3 add other members.
- **Problem:** The new owner's messages then spend the old owner's login,
  in a workspace that the old owner cannot see. A running turn of a sender
  who lost access can also keep getting the sender's GitHub token.
- **Impact if no action:** A member's Claude or Codex login serves work
  that the member cannot see or stop.
- **Root question:** Whose login and credentials may a turn use after its
  starter or its sender can no longer open the workspace?
- **Options:**
  - **A.** Keep today's rule: a login and a sender's credentials serve
    while the person is a member of the org. The protocol states the new
    case as a risk. Effort: Small.
  - **B.** A login serves a session only while its starter can open the
    workspace. A sender's GitHub token and Mac requests work only while the
    sender can open it. Another member's message then opens a linked
    session on their own login. These checks use the shared access check.
    Effort: Small.
  - **C.** Prevent the case: refuse the reassign of a private workspace,
    and allow a switch to private only when no other member has a session
    there. It adds two refusals. Effort: Small.
  - **D.** As B, and the model proxy of decision 120 also checks the
    starter and the sender at each model request. A turn that runs keeps
    its login until that proxy exists. Nobody has checked that a proxy may
    carry a Claude subscription. Effort: Small, once the proxy exists.
  - **E.** As B, and the workspace also stops each running turn whose
    starter or sender can no longer open the workspace. The runner
    connection already checks its access before each message and every 15
    seconds. E adds the shared access check of those two people, and the
    chat names the cause. It also ends the running turn of a starter who
    leaves the org or is suspended. Effort: Medium.
- **Left out:** A move of the session to the login of the new owner,
  because decision 115 rejected it. The starter's consent through the
  re-use setting of PR #63, because a login that allows re-use would still
  serve work that its starter cannot see, and the setting covers no GitHub
  token and no Mac command.
- **Wider fix:** E. B applies each way to lose access only at the next
  use. E also stops a turn that already runs. D gets the same result at
  each model request, once the proxy exists.
- **Previous examples:** Decision 115 opens a linked session when the
  starter's login cannot be used, for example after the starter leaves the
  org. Draft PR #63 does the same for a login that refuses re-use.
- **Related:** Decision 3: its options A and D need this rule, and its
  option C adds no starter or sender who loses access. Design call 6 waits
  for this answer.
- **Recommendation:** B, and E when decision 3 is A, after the options
  check. The first recommendation was B in every case. Under decision 3 A,
  a turn that runs on another member's login keeps that login after the
  switch, and only an interrupt ends it. Under decision 3 D, the switch
  stops the cloud computer, which ends each running turn.
- **Action:** ask the user, because B changes the login rule in the access
  protocol.

## Design calls

Agent calls of 8 November 2026. The user can override each one.

1. New workspaces start as Everyone. Reason: it keeps today's behaviour.
2. Only the owner changes the choice. Reason: nobody else may make private
   work visible to others.
3. A workspace that an agent creates gets the choice of the calling
   workspace, as it gets that workspace's owner. Reason: private context
   does not become shared by itself.
4. An agent's list call returns only the workspaces that every person who
   can open the calling workspace may also open. So a shared workspace
   lists only shared ones, and a private one adds its owner's private
   ones. Reason: each of those people can read the agent's output.
5. A private workspace that moves to a new owner stays private, now to that
   owner. This holds for a departure, a removal, and a reassign. Reason:
   privacy follows the owner.
6. An admin can reassign a private workspace only when the admin owns it.
   Reason: decision 2 hides other members' private workspaces from admins.
   Decision 4 decides whose login its sessions then use.
7. A request for a private workspace from anyone but its owner gets the
   same reply as a missing workspace. Reason: the reply does not show that
   the workspace exists.
8. A private workspace of a suspended owner stays closed to everyone until
   the suspension ends, or until an admin removes the owner. Reason: it
   follows from decision 2, and a removal already moves the workspaces to
   an admin.
9. Sections stay shared. A private workspace shows in its section only to
   its owner. A move counts only the rows that the mover sees, and hidden
   rows keep their order. Reason: sections are the org's groups.
10. The Members tab counts only the workspaces that the viewer can open.
    The remove member and leave org dialogs say that private workspaces
    move too. Reason: a count must not show other members' private work,
    and the person who confirms must know what moves.
11. The picker says that the branch and the pull request stay visible on
    GitHub. Reason: the app cannot hide them.
12. No org setting turns private workspaces off. Reason: no requirement
    asks for it.
13. Operator actions treat private workspaces like the others. Reason: an
    operator acts on a cloud computer or a preview address, not on a
    person.
14. The machine routes of a cloud computer ignore the choice: the runner
    connection and the git and image credential routes. Reason: they
    belong to the cloud computer, not to a person. Decision 4 decides the
    sender checks of a turn.
15. The stored values are `org` and `private`, and existing workspaces get
    `org`. Reason: every existing workspace keeps today's behaviour.
16. Protocol text from this plan cites no decision number. Reason: the plan
    `boat-native-remote-workspaces.md` numbers its decisions in parallel,
    and PR #66 did the same.
17. This plan does not split the long protocol docs. Reason: the follow-up
    item `protocol-docs-split.md` splits them in one change after the open
    branches merge.
18. A copy of the workspace token that an old owner made keeps working
    after a reassign of a private workspace. The protocol states this risk.
    Reason: decision 124 accepts the same risk after a removal, and option
    B of `workspace-token-after-access-loss.md` would close both cases.

## Design

Terms:

- **Shared workspace:** a workspace with the choice "Everyone at <org>".
  Every member of the org can see and use it.
- **Private workspace:** a workspace with the choice "Private". Only its
  workspace owner can see and use it.
- **Shared access check:** the one rule in the Worker that says whether a
  person may reach a workspace.

The access rule. A person may reach a workspace when they are an active
member of its active org, and the workspace is shared or they own it. The
app entry runs the shared access check once for each path under the path
of a workspace, before the chat and feature routes. The sockets, the
preview domain, the Mac routes, the list, and the GitHub reads use the
same rule. A refusal gets the reply of a missing workspace.

Data. A new column `workspaces.visibility` holds `org` or `private`. It is
not null, and its default is `org`. The contracts in
`src/shared/workspaces.ts` add `WorkspaceVisibility`, the field
`Workspace.visibility`, and an optional `visibility` in the create and
update requests.

Changes of the choice. The owner can change a private workspace to shared
at any time. Other members then see it at their next list refresh. The
change from shared to private waits for decision 3.

UI. New workspace gets a picker beside the repository picker, with
"Everyone at <org>" and "Private". The header of a private workspace shows
the same picker to its owner. A private workspace shows a lock on its row
and in its header. A link to another member's private workspace shows the
page of a missing workspace.

Other work:

- Open PR #59 changes the moves of workspaces and sections. Merge `main`
  after it lands, before Milestone 4.
- Draft PR #63 adds a login re-use setting. It uses the same linked
  session as option B of decision 4.
- The plan `boat-native-remote-workspaces.md` changes the same protocol
  docs and Worker code on its own branch. Merge `main` before each
  milestone.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the picker of New workspace, a private workspace with its lock and
its header picker, the member dialogs, and a user flow, in both viewports.

- [ ] Add the catalogue page `app/private`, with at most five screens:
  - [ ] New workspace with the picker open: "Everyone at Acme", checked,
        and "Private".
  - [ ] A private workspace: the lock on its row and in its header, and the
        header picker set to Private.
  - [ ] The header picker of a private workspace, open on "Everyone at
        Acme".
- [ ] Give the viewer a private workspace in the workspace fixtures, so that
      `app/shell` shows its lock.
- [ ] Add the line about private workspaces to the remove member dialog and
      the leave org dialog.
- [ ] After decision 3, draw what the header of a shared workspace offers.
      Under A and D, add the Private entry, and under D its warning about
      the restart. Under C, also draw its unavailable state with the
      reason. Under E, draw "Continue privately" and its new workspace.
      Under B, draw no entry.
- [ ] After decision 4, under C, draw its refusals in the owner picker and
      the header picker. Under E, draw the stopped turn and its cause in
      the chat.
- [ ] Add the user flow "Create a private workspace, then share it" from
      existing screens.
- [ ] Update `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the rules of private workspaces in the protocol docs. Milestones 6
and 7 state the rules of decisions 3 and 4.

- [ ] `docs/protocol/orgs-and-members.md`: add a section "Private
      workspaces" with the choice, its default, who changes it, the change
      to shared, what a private workspace hides, and the rejected options
      of decisions 1 and 2. In "Members and roles" and "When a member
      leaves", say that only its owner reaches a private workspace, that
      admins cannot archive or reassign it, and that it moves with its
      owner's other workspaces and stays private.
- [ ] `docs/protocol/access-and-security.md`: in "Orgs and workspaces",
      state the access rule and the reply of a refusal. Add the risk that
      an admin can still reach a private cloud computer through the startup
      script, the env vars, and the install script. Add the risk of design
      call 18.
- [ ] `docs/protocol/chat-and-events.md`: in "Agents", members send
      messages only in the workspaces that they can open.
- [ ] `docs/protocol/agent-tools.md`: the create call copies the choice,
      and the list call follows design call 4.
- [ ] `docs/protocol/workspaces-and-sandboxes.md`: in "Create a
      workspace", add the picker and its default.
- [ ] `docs/protocol/operator-actions.md`: limit the rules that let other
      members open, and an admin assign, a suspended owner's workspace to
      shared workspaces. State design call 8 for a private one.
- [ ] `docs/architecture.md`: add the term "Private workspace", and the
      boundary inside an org under "Trust boundaries".
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: One shared access check

Depends on: 1

Move each check of who may reach a workspace to one shared access check.
The behaviour stays: the rule is still the membership of the active org.

- [ ] Add the shared access check to the Worker: one SQL predicate, and one
      function that refuses with the reply of a missing workspace.
- [ ] Run it at the app entry for each path under the path of a workspace,
      before the chat and feature routes.
- [ ] Move each consumer under "Replaced ways" to it, and delete the
      separate checks:
  - [ ] the members gate with `requireWorkspaceOrg`, and the lifecycle
        routes
  - [ ] the chat routes, and the files, terminal, desktop, and preview
        routes in the workspace object
  - [ ] the workspace list of an org
  - [ ] the rename, move, archive, and reassign writes
  - [ ] the Mac app routes of a workspace
  - [ ] the socket and preview checks
  - [ ] the GitHub banner reads
- [ ] Search the Worker for `org_members`, `requireOrgMember`,
      `requireWorkspaceOrg`, `findChatWorkspace`, and
      `activeShellMemberPredicate`. Confirm that no path of a workspace
      keeps its own check. Leave the login and sender checks of a turn as
      they are, because decision 4 decides them. Save the search under
      `.context/private-workspaces/`.
- [ ] Keep every existing test green with no changed assertion. Add no
      test, because the behaviour stays.
- [ ] Name the entry point of the shared access check in the security
      README and the app API README.

## Milestone 4: Private workspaces in the Worker

Depends on: 2, 3

Add the choice, the access rule, and the change from private to shared.

- [ ] Add the migration `migrations/<YYYYMMDDHHMM>_workspace_visibility.sql`
      with the column and its default.
- [ ] Add the contracts to `src/shared/workspaces.ts`.
- [ ] Store the choice of a create. An agent's create copies the choice of
      the calling workspace.
- [ ] Add "shared, or owned by the person" to the shared access check.
- [ ] Filter the workspace list, the agent tools list, and the section
      moves, as design calls 4 and 9 say.
- [ ] Let the owner change a private workspace to shared.
- [ ] Add tests, one for each requirement, in the existing test of that
      requirement when one exists:
  - [ ] Another member and an admin get the reply of a missing workspace
        for a private workspace, and the owner gets through.
  - [ ] The workspace list hides another member's private workspace.
  - [ ] An open tab closes within 30 seconds after an admin reassigns
        their own private workspace.
  - [ ] An agent's create copies the choice, and its list follows design
        call 4.
  - [ ] Only the owner can change a private workspace to shared.
  - [ ] A move with hidden rows keeps their order.
- [ ] Update the Worker README.

## Milestone 5: Private workspaces in the app

Tags: ui

Depends on: 1, 4

Build the screens that Milestone 1 draws, except the parts of decisions 3
and 4.

- [ ] Add the picker to New workspace.
- [ ] Add the header picker of a private workspace, and the lock on its row
      and in its header.
- [ ] Add the line about private workspaces to the remove member and leave
      org dialogs.
- [ ] Add the cases of the picker to the existing UI tests of New
      workspace and of the workspace header.
- [ ] Smoke-test in the browser: create a private workspace as one member.
      Check that another member's list does not show it, and that its link
      shows the page of a missing workspace. Save the result under
      `.context/private-workspaces/`.
- [ ] Update the README of each changed area.

## Milestone 6: The logins after a loss of access

Depends on: 4, and the answer to decision 4

Apply the option that the user chooses for decision 4.

- [ ] Under A, state the new case as a risk in "Agent logins in a sandbox"
      of `docs/protocol/access-and-security.md`.
- [ ] Under B, D, or E, move the starter and sender checks of a turn to the
      shared access check: the agent login, the login mark of a session,
      the git credential route, the Mac command requests, and the create
      call of the agent tools. A message of another member in a session
      whose starter lost access opens a linked session.
- [ ] Under C, refuse the reassign of a private workspace, with an error
      that says why.
- [ ] Under D, add the check of the starter and the sender to the follow-up
      item `agent-logins-readable-in-sandbox.md`, because its model proxy
      does not exist yet.
- [ ] Under E, add the shared access check of the turn's starter and sender
      to the check of the runner connection, and stop a turn that fails it.
      The chat names the cause.
- [ ] Under B, C, D, or E, state the rule in
      `docs/protocol/access-and-security.md` and
      `docs/protocol/chat-and-events.md`.
- [ ] Add a test for each new requirement.

## Milestone 7: Making a shared workspace private

Depends on: 4, 6, and the answer to decision 3

Apply the option that the user chooses for decision 3.

- [ ] Under A, C, or D, let the owner change a shared workspace to private.
- [ ] Under C, record the first use by another member: a session, a
      message, a terminal, the desktop, or a preview. After that, refuse
      the change to private with an error that says why.
- [ ] Under D, revoke the workspace token and stop the cloud computer at
      the switch, also while a start waits.
- [ ] Under E, add "Continue privately": a new private workspace from the
      pushed branch of a shared one.
- [ ] Under A, C, D, or E, state the rule and its risks in
      `docs/protocol/orgs-and-members.md` and
      `docs/protocol/access-and-security.md`.
- [ ] Under B, state in `docs/protocol/orgs-and-members.md` that a shared
      workspace stays shared.
- [ ] Add a test for each new requirement.

## Milestone 8: Decisions 3 and 4 in the app

Tags: ui

Depends on: 5, 6, 7

Build the parts that Milestone 1 draws for decisions 3 and 4.

- [ ] Show what the header of a shared workspace offers, as decision 3
      chooses.
- [ ] Under decision 3 C, show the unavailable state with its reason.
      Under D, show the warning about the restart. Under E, add "Continue
      privately".
- [ ] Under decision 4 C, show its refusals. Under E, show the cause of a
      stopped turn.
- [ ] Add the cases to the existing UI tests of the workspace header and
      of the owner picker.

## Milestone 9: Verification, commit, review, and pull request

Depends on: 1, 2, 3, 4, 5, 6, 7, 8

Prove the combined work, review it, and open the pull request.

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] On the deployed app, create a private workspace as one member. Check
      that another member and an admin do not see it.
