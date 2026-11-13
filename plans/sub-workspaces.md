# Sub-workspaces

Status: Active. On branch `calummoore/perth-5m3h`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Agents that delegate make new workspaces with `create_workspace`. Each new
workspace shows as a loose row at the top of its section. So a member
cannot see which workspaces belong to one job. The Worker saves the
calling workspace in `workspaces.created_by_workspace_id`, but nothing
reads that column, and the agent cannot choose a parent.

The user chose the approach in a message of 13 November 2026, in workspace
W-178. `create_workspace` takes an optional parent workspace ID, usually
the ID of the calling workspace. The new workspace then shows nested under
its parent in the sidebar, as a sub-workspace. Nesting goes up to three
levels deep. A create past that depth fails with an error. The error tells
the agent to create a sibling instead: it passes its own parent ID, and it
can start the name with a prefix that shows the group. Sub-workspaces
always show, and a tree has no collapse control. In every other way a
sub-workspace acts like a normal workspace. The agent of each workspace
learns where its workspace sits, and the workspace tools let it find its
parent and its sub-workspaces.

Earlier work: workspace W-117, "nested workspace creation", ran a brainstorm
on 13 November 2026 and asked five items. Nobody answered them, and W-117
is archived. The message above answers items 1 to 3. Items 4 and 5 stay
open below, and item 6 is new.

This change does not cover nesting from the app, a change of the parent of
an existing workspace, a collapse control, a parent label in the command
palette or in the workspace header, or nesting in the Archived group.

Contract owners:

- A new protocol doc, `docs/protocol/sub-workspaces.md`, made in
  Milestone 2.
- [Workspace calls](../docs/protocol/workspace-calls.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Sections](../docs/protocol/orgs-and-members.md#sections).
- [Workspace menu](../docs/protocol/workspace-menu.md#who-sees-each-action).
- [Archive](../docs/protocol/workspace-life.md#archive) and
  [Restore](../docs/protocol/workspace-life.md#restore).
- [Fixed keys](../docs/protocol/keyboard-shortcuts-fixed-keys.md).
- The [agent tools README](../worker/tools/README.md) and its
  [workspace calls page](../worker/tools/workspaces.md).
- The [sandbox tools README](../tools/README.md) and its
  [calls page](../tools/calls.md).
- The runner's [agent input](../runner/agent-input.md) and
  [configuration](../runner/configuration.md) pages.
- The [image README](../image/README.md#start-in-a-workspace).
- The [migrations README](../migrations/README.md).
- The [mockup catalogue](../docs/mockups/catalogue.md), at the new page
  `app/sub-workspaces`.
- The public guide [Workspaces](../src/marketing/docs/workspaces.md).

## Terms

- **Sub-workspace:** a workspace that a create call nested under another
  workspace.
- **Parent:** the workspace that a sub-workspace is nested under.
- **Top-level workspace:** a workspace without a parent.
- **Tree:** a top-level workspace with every workspace nested under it.
- **Depth:** the number of parent links above a workspace. A top-level
  workspace has depth 0, and its sub-workspace has depth 1.
- **Nested row:** a row that the list shows under the row of another
  workspace.

## Decisions

This plan names its decisions after the change, as sub-workspace decision
4, as [Decision numbers](../docs/architecture.md#decision-numbers) says.
Items 1 to 5 keep the numbers of the brainstorm in W-117. Item 6 is new.

### 1. How related workspaces show together

- **Source:** Design. Item 1 of the brainstorm in W-117.
- **Root question:** How does a member see that some workspaces belong to
  one job?
- **Options:**
  - **A.** Sections only. The agent creates a section for each job.
    Effort: Small.
  - **B.** A link only. The workspace header shows the parent, and the
    parent lists its children. The sidebar does not change. Effort:
    Medium.
  - **C.** Nested rows. `create_workspace` takes an optional parent, and
    the sidebar shows each child indented under its parent, with a
    collapse control. Effort: Large.
- **Left out:** Tags, because they make a second way to group workspaces
  beside sections.
- **Chosen:** C without the collapse control, by the user's message of
  13 November 2026. The message says that sub-workspaces always show.

### 2. Nesting when the create call names no parent

- **Source:** Design. Item 2 of the brainstorm in W-117.
- **Root question:** Does a workspace nest when the create call names no
  parent?
- **Options:**
  - **A.** No. It shows at the top level. `created_by_workspace_id` stays
    as the record of the creator. Effort: Small.
  - **B.** Yes. It nests under the calling workspace, and the agent sends a
    flag to opt out. Effort: Small.
- **Chosen:** A, by the user's message of 13 November 2026, which asks to
  support passing a parent ID.

### 3. Children of children

- **Source:** Design. Item 3 of the brainstorm in W-117.
- **Root question:** How does the sidebar show a child of a child?
- **Options:**
  - **A.** One level. A grandchild nests under the top ancestor. Effort:
    Small.
  - **B.** The full tree, indented up to a fixed depth. Effort: Medium.
  - **C.** A refusal of each parent that has a parent. Effort: Small.
- **Chosen:** B with a fixed depth of three levels, by the user's message
  of 13 November 2026. A create past that depth fails, and its error asks
  the agent for a sibling. Item 6 asks how to count the three levels.

### 4. Sections and moves of a sub-workspace

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design. Item 4 of the brainstorm in W-117, "Section of a
  child". This plan adds the moves to the item, because the section rule
  also decides how a sub-workspace moves.
- **Category:** Docs or spec.
- **Location:** `src/app/sections.ts:42`,
  `worker/app-api/feature-workspaces-data.ts:14`,
  `worker/tools/create.ts:57`, `docs/protocol/orgs-and-members.md:112`.
- **Terms:**
  - **Move to section:** the action of the workspace row menu that moves
    a workspace to the top of another section.
- **Background:**
  - A section holds a flat list of rows today.
  - A member moves a row by drag and drop, by a long press on a phone, by
    Alt with Up or Down on a focused row, or with Move to section.
  - An agent moves a workspace with `move_workspace`, and a create call can
    name a section.
  - Each move puts one workspace at one place of a section. No rule ties
    two workspaces together.
  - Each row stores one section today, and the list groups the rows by
    that section alone.
- **Problem:** No rule says which section holds a sub-workspace. No rule
  says what a move of a sub-workspace, or of its parent, does.
- **Impact if no action:** A sub-workspace can end in another section than
  its parent, so its tree splits. A move of a parent can leave its
  sub-workspaces behind.
- **Root question:** Where does each workspace of a tree show when members
  and agents create and move workspaces? The options check wrote this
  question again, because the first question took as given that a
  sub-workspace stays under its parent.
- **Options:**
  - **A.** A tree stays together. A sub-workspace always joins the section
    of its parent. A move of a top-level row moves its whole tree, by
    drag, by keys, by Move to section, or by `move_workspace`. A nested row
    has no drag, no move by keys, and no Move to section.
    `move_workspace` refuses a workspace that the list shows as a nested
    row, with HTTP 409 and the error code `workspace_nested`. Its message
    names the top-level workspace to move. A `sectionId` beside a
    `parentId` has no effect, and the reply says so. This adds one
    refusal. Effort: Medium.
  - **B.** A sub-workspace keeps its own section. A create puts it in the
    section of its parent, unless the call names another section. It
    shows under its parent only while both are in the same section. In
    another section it shows at the top level. It moves alone like any row
    and keeps its parent link. A move of a parent moves the rows nested
    under it. A drag of a nested row inside its own section changes
    nothing, and members can find that odd. Effort: Medium.
  - **C.** A move takes a sub-workspace out of its tree. It becomes a
    top-level row at the drop place, or at the top of the chosen section,
    and its parent link ends. Its own sub-workspaces move with it. A move
    of a parent moves its tree. A member can then undo a wrong nesting.
    But the agent instructions of the moved workspace still name its old
    parent and depth. Effort: Medium.
  - **D.** Each move of a row of a tree moves the whole tree, also a move
    that starts from a sub-workspace. An agent that moves its own
    workspace then moves the work of other agents. Effort: Medium.
  - **E.** Added by the options check. As A, but `move_workspace` on a
    nested row moves nothing and refuses nothing. Its reply gives the
    workspace in its section, and a `notice` that names the top-level
    workspace to move. A move to the current section already changes
    nothing today. Risk: an agent that reads only the section can miss
    that nothing moved. Effort: Medium.
  - **F.** Added by the options check. The parent link alone decides the
    nesting. A live sub-workspace shows under its parent wherever the list
    shows the parent, whatever section its own record names. Item 5
    decides where it shows when the list shows no row of its parent. A
    move of a top-level row also writes the section of each workspace
    under it, live or archived, as a section delete already does.
    `get_workspace` gives the section where the list shows the workspace.
    Moves of a nested row work as in E. Cost: the list and the Worker must
    share one rule for the place of a row. A move of a row whose parent is
    archived is undone when the parent comes back. Effort: Medium.
  - **G.** Added by the options check. As F, but a nested row can still be
    dragged, and moved with Alt and Up or Down, among the rows under its
    own parent. Cost: a second order under each parent in the moves of the
    Worker and in the drop target, a changed design call, and one more
    mockup screen. Effort: Large.
- **Left out:** A refusal of a create that names a parent and a section.
  It breaks the always-on rule to warn and continue on input that can be
  recovered. A, B, E, and F handle the case without it. Different rules
  for members and for agents stay out too, because each write of the tools
  follows the rule of the app (decision 277).
- **Wider fix:** F. The class is one tree that shows in two sections. A
  must close each path that causes it, but F also prevents the class on a
  new path.
- **Previous examples:** Item 4 of W-117 recommended A, without moves and
  without a refusal. A design call of W-117 said that a dragged child
  becomes a top-level row, which is C.
- **Related:** Item 5. Under A and B, a sub-workspace can show at the top
  level while its parent shows in another section. Item 5 then decides
  its place. F removes that case.
- **Recommendation:** F. The first recommendation was A. F keeps the one
  place of each tree that A gives, with no refusal, and the parent link
  keeps the tree whole on every path. E is the smaller change when the
  section rule of A stays.
- **Action:** ask the user, because no requirement covers how a tree
  moves, and A adds a refusal.

### 5. Sub-workspaces of an archived parent

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design. Item 5 of the brainstorm in W-117, "Children of an
  archived parent". This plan raises its severity from Low, because a live
  workspace that the list hides is a visible defect. Options C and D are
  new.
- **Category:** Docs or spec.
- **Location:** `src/app/sections.ts:42`, `src/shell/list/ArchivedGroup.tsx`.
- **Background:**
  - Archive moves a workspace to the Archived group at the end of the
    list. For 14 days, Restore puts it back at its place.
  - The Archived group lists its rows flat, the last archived first.
  - A sub-workspace acts like a normal workspace. So its parent can be
    archived while the sub-workspace still works.
- **Problem:** When a parent leaves its section for the Archived group,
  its live sub-workspaces have no row to show under. Under item 4 A and B,
  a parent that shows in another section leaves the same gap.
- **Impact if no action:** Live sub-workspaces disappear from their
  section, or show under a row that is not there.
- **Root question:** Where does a live sub-workspace show when the list
  shows no row of its parent? The options check wrote this question again,
  so that it also covers a parent in another section.
- **Options:**
  - **A.** At the top level of their section, with their own
    sub-workspaces under them. They go back under the parent after its
    Restore. Effort: Small.
  - **B.** An Archive of a parent also archives each workspace nested under
    it. This stops their cloud computers and can stop running work. The
    sub-workspaces then do not act like normal workspaces. Effort: Medium.
  - **C.** Under the nearest live workspace above them in their tree, or at
    the top level when none is left. A Restore puts them back under the
    parent. So an archived middle row does not break the rest of its tree.
    Effort: Small.
  - **D.** The archived parent keeps a faint row in its section while it
    has live sub-workspaces. That row opens its read-only chat, and it
    counts as a row for Open workspace 1 to 9 and for Previous and Next
    workspace. The workspace then shows twice: in its section and in the
    Archived group. Effort: Medium.
- **Left out:**
  - The live sub-workspaces inside the Archived group. They are not
    archived, so members would not look for them there. The group also
    stays collapsed until a member opens it, so the rows would not always
    show, as the task message requires.
  - A refusal to archive a parent that has live sub-workspaces. A
    sub-workspace must act like a normal workspace, and Archive works in
    each state of a workspace.
  - Added by the options check: a new link to the grandparent at the
    Archive. It breaks the design call that the parent link never changes,
    and C shows the same rows without it.
- **Wider fix:** None. This is a new feature, not a class of defect. Item
  4 F removes the other cause, a parent in another section.
- **Previous examples:** Item 5 of W-117 recommended A.
- **Related:** Item 4. Under its option F, this item decides the place of
  a sub-workspace only for an archived parent. Under A and B, it also
  decides it for a parent in another section.
- **Recommendation:** C. It stops no work, and each tree stays as whole as
  its live rows allow. The options check kept this recommendation. A is
  the simpler option when the tree shape counts less.
- **Action:** ask the user, because the options show different lists, and
  no requirement covers this case.

### 6. How deep a tree can go

- **Severity:** Low. **Effort:** Small.
- **Source:** Design. A new item of this plan.
- **Category:** Docs or spec.
- **Location:** None.
- **Background:** The user's message allows nesting "up to 3 levels deep".
  A create past that depth gets an error that asks the agent for a
  sibling. A top-level workspace has no parent, so its depth is 0.
- **Problem:** "3 levels deep" can count the levels under a top-level
  workspace. It can also count every level, with the top-level workspace as
  the first.
- **Impact if no action:** The limit can be one level away from what the
  user meant.
- **Root question:** Which depth is the deepest that a sub-workspace can
  have?
- **Options:**
  - **A.** Depth 3. A tree shows four levels: the top-level row and three
    nested levels. A create under a workspace of depth 3 fails. Effort:
    Small.
  - **B.** Depth 2. A tree shows three levels: the top-level row and two
    nested levels. A create under a workspace of depth 2 fails. Effort:
    Small.
- **Left out:** No limit, and a limit that each org sets. The message fixes
  the limit at three levels, so only its two readings are real.
- **Wider fix:** None. This is a new feature, not a class of defect.
- **Previous examples:** Item 3 of W-117 offered one level, a fixed depth,
  or a refusal of each grandchild. The options check found that the
  WordPress setting for threaded comments, "N levels deep", counts the top
  comment as the first level. That use supports B.
- **Recommendation:** A. "Nested ... up to 3 levels deep" measures the
  nesting, and a top-level workspace is not nested. A is also the looser
  reading, so it blocks no work that the user expects to allow. Either
  reading is one constant, the docs, and the mockup. The options check
  kept this recommendation.
- **Action:** ask the user, because the requirement has two readings, and
  neither is clearly right.

## Design

The mechanics below are the design of this change. The protocol docs get
only the requirements, in Milestone 2. Items 4 to 6 are open, so the
design names the recommended option where it depends on one.

### The parent link

- `workspaces.parent_workspace_id` is a nullable reference to
  `workspaces(id)`, with an index on `(org_id, parent_workspace_id)`.
- The create writes the link with the workspace row. So the first start
  of the cloud computer already knows the parent.
  `workspace_creation_plans.parent_workspace_id` keeps the parent for a
  retry and a replay of the create.
- The org purge clears `parent_workspace_id` before it deletes the rows,
  as it does for `created_by_workspace_id`.
- The depth of a workspace counts every parent link above it, also the
  links to archived parents. The Worker counts them in its own records.

### The create call

- `parentId` is optional. Without it, the new workspace is top-level, as
  item 2 A says.
- The Worker reads the parent in the org of the calling workspace. The
  parent can be of any state, also archived, and of any repository.
- An unknown parent, or a parent of another org, gets HTTP 404 with the
  error code `workspace_not_found`. Its message says that the parent
  workspace is not available.
- A parent at the deepest depth that item 6 allows gets HTTP 409 with the
  error code `nesting_limit`. The message names the parent by its number,
  and says that it is at the deepest level. It tells the agent to create a
  sibling instead: pass the parent's own `parentId`, given in the message,
  and start the name with a short prefix that shows the group.
- The new workspace joins the section of its parent, as item 4 A and F
  say. The insert reads the section of the parent in the same statement,
  so a move of the parent during the create cannot split the tree.
- When the call also names another section, the reply gives a `notice`:
  one sentence that says that the workspace joined the section of its
  parent. An unknown section still gets HTTP 404 `section_not_found`, as
  today.
- A repeat with the same request ID gives the first result, also when the
  repeat names another parent.
- The workspace in the reply gives its `parentId`.

### Reads

- The `Workspace` type of the browser gets `parentId: string | null`.
- `list_workspaces` takes a `parentId` filter, for the direct
  sub-workspaces of one workspace. Each entry gives its `parentId`.
- `get_workspace` gives `parent`, a list entry or `null`, the `depth`, and
  `children`: the direct sub-workspaces, oldest first, archived ones
  included. Under item 4 F, its `section` is the section where the list
  shows the workspace.

### The place of a row

- One shared rule in `src/shared/` gives the place of each workspace in
  the list: its section, and the row that it shows under, or none. The
  app builds the list with it. The Worker uses it for the moves and for
  the section of `get_workspace`. So the list and the Worker never
  disagree about which rows are nested.
- Under item 4 F, a live sub-workspace shows under its parent wherever the
  list shows the parent. Item 5 decides its place when the list shows no
  row of its parent.

### Moves

- A move of a top-level row moves its whole tree: the Worker writes the
  section of each workspace under it, live or archived, as a section
  delete already does. So a Restore of an archived sub-workspace puts it
  back in the section of its tree.
- The places of a section count only the rows that show at the top level.
  A nested row takes no place of its own.
- A nested row has no drag, no move by keys, and no Move to section.
  Under item 4 F, `move_workspace` on a nested row moves nothing. Its
  reply gives the workspace in its section and a `notice` that names the
  top-level workspace to move.

### The list in the app

- The list places each row with the shared rule above.
- Each depth indents the row by one step. A neutral indent guide can show
  the tree, as the `product-ui` skill allows. The mockup decides.
- The tree has no collapse control. A collapsed section still hides its
  whole tree, as today.
- The rows come in tree order: each top-level row, then its
  sub-workspaces, oldest first, each followed by its own sub-workspaces.
  Open workspace 1 to 9, Previous workspace, and Next workspace follow the
  rows that the list shows, as
  [the commands](../docs/protocol/keyboard-shortcuts.md) already say.
- Only a top-level row drags, and its lifted row stands for its tree. The
  drop line goes only between trees.

### Agent context

- At each start of a cloud computer, at the create and at each resume, the
  Worker gives four new variables: `CONDUCTIVE_WORKSPACE_LINK`,
  `CONDUCTIVE_WORKSPACE_DEPTH`, `CONDUCTIVE_PARENT_WORKSPACE_ID`, and
  `CONDUCTIVE_PARENT_WORKSPACE_LINK`. A top-level workspace gets no parent
  variables.
- The runner adds these lines to the agent instructions of each new
  session:
  - The ID and the link of the workspace.
  - That the workspace is top-level, or that it is nested at its depth
    under the parent, with the parent's ID and link.
  - The deepest depth that item 6 allows.
  - How to nest a new workspace: pass this workspace's ID as `parentId`.
  - At the deepest depth: create a sibling instead, with this workspace's
    own `parentId`, and start its name with a prefix that shows the group.
  - That `get_workspace` gives the parent and the sub-workspaces of a
    workspace, and that `list_workspaces` with `parentId` lists the
    sub-workspaces of one workspace.
- A runner without these variables leaves the lines out, and it warns.
- A cloud computer gets the new tools and the new runner only from an org
  image that a full build made after the deploy, as
  [Workspace tools](../docs/protocol/agent-tools.md#workspace-tools) says.

### The workspace tools

- `create_workspace` gets the field `parentId`, and
  `conductive workspaces create` gets `--parent ID`. The description says
  when to use it, the depth limit, the advice for a sibling, and the
  section rule.
- `list_workspaces` gets the filter `parentId`, and
  `conductive workspaces list` gets `--parent ID`.
- The tools read the new fields of each reply: `parentId`, `parent`,
  `depth`, `children`, and `notice`. The CLI writes the `notice` in its
  JSON reply, and the MCP server keeps it in its result.

### Design calls

All design calls are of 13 November 2026, by the agent.

- The parent link never changes after the create, and no call sets it
  later. Reason: the depth and the agent context then stay true for the
  life of the workspace. W-117 made the same call. Item 4 C would end a
  link at a move. This call then gives way to it.
- `parent_workspace_id` is a new column, and `created_by_workspace_id`
  stays the record of the creator. Reason: the two can differ, as for a
  sibling, whose creator is not its parent. W-117 made the same call.
  `saveWorkspaceToolParent` gets the name `saveWorkspaceToolCreator`,
  because it writes the creator.
- A parent can be archived, and it can be of another repository. Reason:
  one job can span repositories, and a refusal for an archived parent
  would add a rejection that no one asked for. W-117 made the call for
  repositories.
- The depth counts the links to archived parents too. Reason: the depth of
  a workspace then never changes.
- The depth error uses HTTP 409 and `nesting_limit`, and its message names
  the ID to pass for a sibling. Reason: the input has the right form, but
  the state of the parent refuses it, and the agent can act on the message
  at once.
- Sub-workspaces show under their parent in the order of their creation,
  oldest first. Reason: the rows then show the order of the work.
- The MCP field is `parentId` and the CLI option is `--parent`. Reason:
  the other ID fields are camel case, such as `workspaceId` and `ownerId`,
  and the other CLI options name the noun, such as `--section`. The user's
  message wrote `parent_id`.
- A collapsed section counts every workspace in it, also each
  sub-workspace. Reason: the count says how many workspaces the section
  holds.
- The Archived group stays flat, the last archived first. Reason: an
  archived workspace does not work, so its tree tells a member little.
- The command palette stays flat, and its rows give no parent. Reason: a
  search finds a workspace by its name or its number.
- The app offers no way to nest a workspace. Reason: the message asks for
  agents. A later change can add a menu action.
- Routine runs make top-level workspaces. An agent in a run workspace can
  nest its own new workspaces under it.
- Continue keeps the parent link. Reason: the parent belongs to the
  workspace, not to its branch.
- The agent context comes from new variables at each start of the cloud
  computer, and the runner puts it in the instructions of each new
  session. Reason: the parent and the depth never change, so they meet the
  rule that the instructions hold no fact that changes during the work.
  The sub-workspaces change, so the instructions name the calls that list
  them. A line in each message, as the branch line, was rejected, because
  no fact of the line can change.
- The comparison page at `conductive.build/from-conductor` stays as it is.
  Reason: no listed Conductor feature changes its status.
- A create that names a parent and an unknown section still gets HTTP 404
  `section_not_found`. Reason: the call keeps the checks that it has
  today, and an unknown ID is a mistake that the agent must see. The
  options check found this gap.
- One shared rule gives the place of each row to the app and to the
  Worker. Reason: a refusal or a notice of a move must name the rows that
  the list shows as nested. The options check found this gap.
- A move of a tree also writes the section of its archived workspaces.
  Reason: a Restore then puts each of them back in its tree. The options
  check found this gap.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

The workspace list with trees, in the sidebar and on the list page of a
phone. Each mockup has a desktop and a phone variant. This milestone starts
after the user answers items 4 to 6, because each of them changes a screen.

- [ ] Give the workspace fixtures a parent link, with one tree at the
      deepest depth of item 6 and a sibling whose name has a prefix.
- [ ] Draw the indent of each depth in the shared list styles of
      `docs/mockups/src/components/workspaces/`, which the app also uses.
- [ ] Add the page `app/sub-workspaces`. Its canonical screen is the list
      with two trees in one section.
- [ ] Add its child pages, each with at most five screens:
  - [ ] The list after the Archive of a parent, as item 5 says.
  - [ ] A drag of a tree to another section, as item 4 says.
  - [ ] The row menu of a nested row, as item 4 says.
- [ ] Update `docs/mockups/catalogue.md` for the new pages.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages, and save
      the screenshots under `.context/sub-workspaces/`.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

The requirements and the decisions of this change, in the protocol docs.

- [ ] Write `docs/protocol/sub-workspaces.md`: the parent link, the depth
      and its limit, the error and its advice, the section and the moves,
      the list and the archived parent, and the agent context. Link it from
      `docs/architecture/protocol-docs.md`.
- [ ] Add the terms sub-workspace and parent to `docs/architecture.md`.
- [ ] Update `docs/protocol/workspace-calls.md`: `parentId` of a create, the
      `parentId` filter and field of the list, the `parent`, `depth`, and
      `children` of a get, and the move of a tree.
- [ ] Update `docs/protocol/agent-instructions.md` with the new facts and
      guidance.
- [ ] Update the Sections of `docs/protocol/orgs-and-members.md`,
      `docs/protocol/workspace-menu.md`, `docs/protocol/workspace-life.md`,
      and `docs/protocol/keyboard-shortcuts-fixed-keys.md` for the trees,
      as items 4 and 5 say.
- [ ] Read both legal pages in full, `src/marketing/terms.ts` and
      `src/marketing/privacy.ts`. Update each sentence that restates a
      changed fact.
- [ ] Read each public guide under `src/marketing/docs/` in full. Update
      each sentence that restates a changed fact. Add sub-workspaces to
      "Let an agent manage workspaces" and "Organize work with sections"
      in `workspaces.md`. Give this TODO to the `external docs implementor`.
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: The parent link, the create, and the reads

Depends on: 2

The stored parent, the create call with its depth check, and the reads of
the app and of the tools.

- [ ] Add a migration with `workspaces.parent_workspace_id`, its index, and
      `workspace_creation_plans.parent_workspace_id`. Reserve its range and
      describe it in `migrations/README.md`.
- [ ] Carry `parentId` through `AgentCreateWorkspaceRequest`, the create of
      the tools, the creation plan, and the insert of the workspace row.
      Keep it through a retry and a replay.
- [ ] Check the parent and its depth before the create. Give the 404 and
      the 409 of the design.
- [ ] Put the sub-workspace in the section of its parent, as item 4 says.
      Read that section in the statement that inserts the row. Give the
      `notice` when the call names another section.
- [ ] Add the shared rule for the place of a row under `src/shared/`, with
      the rule of item 5 for a parent that the list does not show.
- [ ] Clear `parent_workspace_id` in the org purge.
- [ ] Rename `saveWorkspaceToolParent` to `saveWorkspaceToolCreator`.
- [ ] Add `parentId` to the `Workspace` of the browser, and to the list and
      the reads of the app.
- [ ] Add the `parentId` filter and field to the workspace list of the
      tools, and `parent`, `depth`, and `children` to its get. Give the
      section of the get with the shared rule, as item 4 says.
- [ ] Add the tests: a create with a parent, a create past the depth limit
      with its message, an unknown parent, a parent of another org, an
      archived parent, a parent and another section, a replay, the shared
      rule, the list filter, and the get.
- [ ] Update `worker/tools/README.md` and `worker/tools/workspaces.md`.

## Milestone 4: The moves of a tree

Depends on: 3

The moves of the app and of the tools, as item 4 says.

- [ ] Move each workspace of a tree with the move of its top-level row, in
      the metadata write of the app and in `move_workspace`. Write the
      section of the archived workspaces of the tree too.
- [ ] Rank the places of a section among the trees, so that a nested row
      takes no place of its own.
- [ ] Apply the rule of item 4 to the move of a nested row, in the app and
      in `move_workspace`, with the shared rule of Milestone 3.
- [ ] Add the tests: a move of a tree to another section, a move inside a
      section, the move of a nested row, the Restore of an archived
      sub-workspace after a move of its tree, and a section delete with a
      tree.
- [ ] Update the READMEs of the changed areas.

## Milestone 5: Agent context and workspace tools

Depends on: 3

The new variables of the cloud computer, the lines of the agent
instructions, and the new fields of the workspace tools.

- [ ] Give the four new variables at each start of the cloud computer.
      Update the variable table in `image/README.md`.
- [ ] Read the variables in the runner, and add the lines of the design to
      the instructions of each new session. Warn and leave the lines out
      when the variables are missing. Update `runner/agent-input.md` and
      `runner/configuration.md`.
- [ ] Add `parentId` to `create_workspace` and `list_workspaces`, and
      `--parent` to the CLI, with their descriptions and help. Read the new
      reply fields.
- [ ] Update `tools/README.md` and `tools/calls.md`.
- [ ] Add the tests: the instructions of a top-level workspace and of a
      sub-workspace, a runner without the variables, and the new fields of
      the MCP server and the CLI.

## Milestone 6: The nested list

Tags: ui

Depends on: 1, 3, 4

The trees in the sidebar and on the list page, as the mockups draw them.

- [ ] Build the tree of each section with the shared rule of Milestone 3.
- [ ] Indent each nested row with the styles of Milestone 1, in both
      variants of the list.
- [ ] Give the keys of the list the rows in tree order.
- [ ] Apply item 4 to the drag, the long press, the move by keys, and Move
      to section of a nested row.
- [ ] Support `parentId` in the local fake backend under `src/app/dev/`.
- [ ] Add the tests: the tree of a section, an archived parent, the order
      of the keys, and a nested row that does not move.
- [ ] Smoke-test the list in a browser with `npm run dev`, on desktop and
      on a phone size. Save the screenshots under `.context/sub-workspaces/`.

## Milestone 7: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Run the targeted tests and the complete gate, `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Add the checks of this change to
      `plans/follow-ups/full-image-build-for-agent-tools.md`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds. It says that an agent
      gets `parentId` and its context only in a new workspace after the
      next full image build.

## Post-merge follow-up (non-blocking)

- [ ] After the deploy and a full image build, let an agent create a
      sub-workspace, a sub-workspace of that, and so on to the limit.
      Check the nested rows, the error past the limit, a sibling with a
      name prefix, and the instructions of each new agent.
