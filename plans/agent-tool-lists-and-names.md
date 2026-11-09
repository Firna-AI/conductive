# Agent tool lists and workspace names

Status: Active. On branch `calummoore/mcps-for-agents`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Each cloud computer has the `conductive` workspace tools: an MCP server and
a CLI. With them, an agent can create and list workspaces, and ask to run a
command on a Mac. A create call needs a repository ID. No tool, prompt, or
environment value gives an agent that ID, so an agent cannot create a
workspace without help. The section ID and the model name have the same
gap. This change adds three read-only calls that list the repositories, the
sections, and the models of the org, with their IDs. It also lets a create
call give the new workspace a name.

The change does not touch the system prompt of the agents. It does not
check the model of a choice: the follow-up item
`plans/follow-ups/unoffered-model-choice.md` records that problem. Branch
`calummoore/chat-title-rename` builds the automatic workspace title, and
its open decision 144 decides which name a workspace keeps when a title
comes. This change adds no title rule.

Contract owners:

- [Agent tools](../docs/protocol/agent-tools.md).
- [The workspace token](../docs/protocol/access-and-security.md#the-workspace-token).
- [Workspaces and sandboxes](../docs/protocol/workspaces-and-sandboxes.md),
  for the first name of a workspace.
- The [deployment doc](../docs/deployment.md#models), for the routes that
  read the model settings.
- The [workspace tools README](../tools/README.md), the
  [Worker tools README](../worker/tools/README.md), and the
  [migrations README](../migrations/README.md).

## User decisions

- **Agents cannot find a repository ID.** On 8 November 2026, the user
  chose option D: add read-only calls that list the org's repositories,
  sections, and models with their IDs. The other options were A, use the
  calling workspace's repository when the call names none; B, accept the
  GitHub name in place of the ID; C, A and B together; and E, put the IDs
  in a prompt. The agent recommended C. D is the wider fix, because it
  gives every ID that the create call takes. With D, the workspace token
  can read more than before.
- **Optional name.** On 8 November 2026, the user asked that
  `create_workspace` also take an optional name.
- **Claude agents run with a minimal system prompt.** On 8 November 2026,
  the user kept this item out of this change. The user handles it in
  another Conductor workspace.

## Design

### The calls

| MCP tool | CLI command | Route |
| --- | --- | --- |
| `list_repositories` | `conductive repositories list` | `GET /v1/tools/repositories` |
| `list_sections` | `conductive sections list` | `GET /v1/tools/sections` |
| `list_models` | `conductive models list` | `GET /v1/tools/models` |

The answers:

```json
{ "repositories": [{ "id": "github-org-1-42", "fullName": "acme/web", "defaultBranch": "main", "current": true }] }
{ "sections": [{ "id": "general-org-1", "name": "General", "default": true }] }
{ "models": [{ "agent": "claude", "model": "model-id", "label": "Model", "efforts": ["low", "high"] }],
  "defaultChoice": { "agent": "claude", "model": "model-id", "effort": "high" } }
```

`create_workspace` takes an optional `name`. The CLI takes it as `--name`.

### Agent calls, 8 November 2026

- Three calls, one for each list, beside `list_workspaces`. Reason: the
  calls match the existing list call and Conductor's own CLI, and each
  answer stays small. One call that returns all three lists was rejected,
  because most create calls need only the repository.
- The repository list returns exactly the repositories that a create call
  accepts now: those of the newest good org image. The list is in the
  order of the GitHub names. `current` marks the repository of the calling
  workspace. Reason: the agent gets only IDs that work, and one call
  covers a create in the same repository. A list of the selected
  repositories was rejected, because a selected repository that no image
  holds yet fails the create.
- When the org has no good image, the repository list fails with the same
  HTTP 409 `image_required` error as a create. Reason: an empty list hides
  why no create can work.
- The section list returns every section of the org in sidebar order.
  `default` marks the section that a create uses when it names none.
- The model list returns the models that the app offers, in the order of
  the app's model setting, as `GET /api/models` does. Reason: the agent
  sees no picker, and the picker only groups the same list by agent.
  `defaultChoice` is the choice that a create uses when it names no model:
  the owner's saved choice, or the app default. It is `null` when neither
  exists. When the app has no model list, the call fails with HTTP 503
  `models_unavailable`, as the app's own model route does.
- The three lists need only the workspace token, as the workspace list
  does. Reason: they read data that every member of the org already sees,
  and they start no work.
- The branch keeps its rule: the GitHub login, a city, and four random
  characters. Reason: decision 53 sets the branch rule, and the user asked
  only for a name.
- The Worker stores the name in a new nullable `name` column of
  `workspace_creation_plans`. The `city` column keeps the city. Reason:
  the column is additive, so a creation that runs during the deploy and a
  start job in storage keep working. The open decision 144 of branch
  `calummoore/chat-title-rename` recommends a title rule that reads the
  city of the creation record. With that rule, a name from the create call
  stays, and this change needs no rule of its own.
- The browser's create request takes no name. Reason: no screen has a
  name field, and the user asked only for the agent tool.
- Each ID field of `create_workspace` names the list tool that gives its
  values. Reason: the agent learns where an ID comes from without a
  prompt.
- An image refresh does not install the workspace tools again. So a cloud
  computer gets the new tools only from the next full image build. The
  Worker serves the new routes to older tools too, and older tools drop the
  name. Reason: the tools are part of the image, and this change does not
  change how an image gets them.

## Decisions of this plan

### 1. Names from sandbox code have no rules

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Security.
- **Location:** `tools/input.ts:65`, where the create input gets its new
  `name` field.
- **Background:**
  - On 8 November 2026, the user asked that `create_workspace` take an
    optional name.
  - Any process in the cloud computer can call the tool, because the
    workspace token is in the environment of the sandbox.
  - The workspace list of each member of the org shows the name.
  - The app's rename route takes any name that is not blank, with no
    length limit. Only a signed-in member can call that route.
  - The request size limit of the tools is 1,000,000 bytes.
  - Branch `calummoore/chat-title-rename` cleans each automatic title with
    one shared rule, `sessionTitleFrom` in `src/shared/session-title.ts`.
    The rule keeps the first line with text, makes each run of white space
    one space, removes one final full stop, and cuts the title at 60
    Unicode code points, at the last whole word.
- **Problem:** No rule says which names a create call accepts. Without
  one, sandbox code can give a new workspace a blank name, a name with
  line breaks, or a name of almost 1 MB.
- **Impact if no action:** Such a name reaches each open tab, each agent
  list call, and each Mac request of every member. The list row and the
  header cut a name to one line, but the archive dialog and the Mac
  request show all of it.
- **Root question:** Which names may sandbox code give a new workspace?
- **Options:**
  - **A.** Accept each name after the Worker trims it. A blank name counts
    as no name, so the city name applies. No length limit. Effort: Small.
  - **B.** Refuse a blank name and a name over 100 characters with HTTP
    400 `invalid_input`. The agent then sends a better name. This adds a
    new rejection. Effort: Small.
  - **C.** Clean the name. Each run of white space, line breaks included,
    becomes one space. The Worker trims the name and cuts it to 100
    characters. A blank name counts as no name. The create answer shows
    the stored name, so the agent sees each change. Effort: Small.
  - **D.** Clean the name in the Worker with `sessionTitleFrom`, the rule
    of the automatic titles. A blank result counts as no name. The create
    answer shows the stored name. This branch copies the helper file
    without change, so that the two branches merge in either order. A
    name with line breaks keeps only its first line. Effort: Small.
  - **E.** Give the create name and the name of each `workspace.title`
    runner event one type, which only the rule of D can make. Each writer
    of a workspace name must then use the rule. This also cleans the
    runner titles on `origin/main`, so it is a stricter check of runner
    input. It also answers the follow-up item
    `plans/follow-ups/workspace-title-from-sandbox-unchecked.md` of the
    title branch. Effort: Medium.
- **Left out:**
  - A name only from a member, because the user asked for a name from the
    agent tool.
  - A cut in the list screen only, because the Worker would still store
    the long name and send it to each tab and each reader.
  - A database check of the name, because a long name would make the
    whole create fail, which is not graceful.
  - A mark that an agent chose the name. Alone, it fails the goal, because
    blank and long names stay.
- **Shared assumptions:**
  - The Worker applies the rule, not the tool. Source: the code. The tool
    runs in the sandbox, so sandbox code can skip it. The reason holds.
    The input reader of the tool must not refuse a blank name, because the
    Worker uses the same reader.
  - A rule limits only the form of a name, not its words. Source: the
    text of the options. The reason holds, because the first message is
    sandbox text too.
  - The limit of B and C is 100 characters. Source: the example in the
    follow-up item of the title branch. It is not a requirement. D drops
    it and uses the limit of the titles.
- **Wider fix:** E. Each writer of a workspace name then uses the rule,
  also a later writer.
- **Previous examples:** The follow-up item of the title branch asks the
  same question for titles that sandbox code sends.
- **Recommendation:** D, in place of C, the first recommendation. Names
  from agents then follow the same rule and limit as each automatic
  title, so you set no new number. E best protects the codebase.
- **Action:** ask the user, because no requirement covers names from
  sandbox code, and each option adds new behaviour at that boundary.
- **Options check:** A fresh check on 9 November 2026 added D and E,
  widened the impact, and changed the recommendation from C to D. Its
  report is in `.context/agent-tool-lists-and-names/`.
- **Chosen:** D, by the user on 9 November 2026.

## Milestone 1: Documentation and protocol

Depends on: none

State the new requirements before the code changes.

- [x] In `docs/protocol/agent-tools.md`, add the three lists with their
      contents, their order, and their errors. Add the optional name with
      the name rule of decision 1, D. Change "only these three calls" to
      the six calls, and give the new routes.
- [x] In `docs/protocol/access-and-security.md`, add the three lists to
      what the workspace token can do.
- [x] In `docs/protocol/workspaces-and-sandboxes.md`, say that the name
      starts as the name of the create call, or else as the city name.
      Branch `calummoore/chat-title-rename` changes the next sentence of
      the same passage, so the later merge joins both.
- [x] In `docs/deployment.md`, name every route that reads the two model
      settings: the app routes, the tool create route, and the new tool
      model list.

Report: `.context/agent-tool-lists-and-names/m1-docs-report.md`.

## Milestone 2: Lists in the Worker

Depends on: 1

- [ ] Add the three paths and the answer types to
      `src/shared/agent-tools.ts`.
- [ ] Serve the three GET routes with the workspace token check of the
      existing tool route, and route them in `worker/application.ts`.
- [ ] Read the repositories of the newest good org image, the sections,
      the configured models, and the owner's default choice. Keep the
      queries apart from the handler.
- [ ] Test each list: only the calling org's data, the `current` and
      `default` marks, the order, `defaultChoice`, and the
      `image_required` and `models_unavailable` errors.
- [ ] Add the new routes to the existing token and method scope tests.
- [ ] Update `worker/tools/README.md`. Also say that production answers
      `503 default_model_unavailable` when no default choice exists: only
      a test service gives `owner_defaults_unavailable`.

## Milestone 3: Lists in the CLI and the MCP server

Depends on: 2

- [ ] Add the three calls to the client, the answer readers, the CLI, and
      the MCP server.
- [ ] Give each ID field of `create_workspace` a description that names
      its list tool.
- [ ] Add the list calls to the existing CLI and MCP tests.
- [ ] Update `tools/README.md`.

## Milestone 4: Workspace name at create

Depends on: 3

- [ ] Reserve a migration range in `migrations/README.md`. Add the
      migration with the nullable `workspace_creation_plans.name`.
      Describe it in the README.
- [ ] Carry the optional name from the tool call through the creation
      plan to the new workspace row. Keep the branch rule and the city.
- [ ] Copy `src/shared/session-title.ts` from branch
      `calummoore/chat-title-rename` without change, with its test, and
      clean the name with `sessionTitleFrom` in the Worker, as decision 1,
      D, says. A blank result counts as no name.
- [ ] Add `name` to the shared request, the input reader, the CLI, and
      the MCP tool.
- [ ] Test: a create with a name gives that name and the normal branch,
      also after a creation retry reads the stored plan. A name with line
      breaks or over 60 code points comes back cleaned, and a blank name
      gives the city name.
- [ ] Update `tools/README.md` and `worker/tools/README.md`.

## Milestone 5: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test the CLI and the MCP server against the local Worker with
      a local workspace token, or record the blocker.
- [ ] Run the targeted tests and the complete gate named in `AGENTS.md`.
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

- [ ] After the deploy, run a full image build for each org, so that its
      cloud computers get the new tools.
