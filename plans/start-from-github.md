# Start a workspace from a GitHub branch, pull request, or issue

Status: Active. On branch `calummoore/new-chat-start-from-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Today every new workspace makes a new branch from the default branch of its
repository. A member who wants to continue a branch or a pull request, or to
work on an issue, must tell the agent by hand. Then the pull request bar and
the Changes list do not follow that work. This change adds "Start from" to
New workspace, on the page and in the dialog, for GitHub branches, pull
requests, and issues. It also gives each workspace a target branch that
follows the base of its pull request, and an agent tool that changes it.

The change does not cover other sources, such as Linear issues. It does not
add a start point to the create calls of agents, or a control in the app
that changes the target branch. The user asked for the feature on 9 November
2026, with a screenshot of the Conductor picker, and chose its approach in a
brainstorm on 10 November 2026. The brainstorm notes are in
`.context/start-from/brainstorm.md`.

Contract owners:

- [Create a workspace](../docs/protocol/create-a-workspace.md).
- [Agent instructions](../docs/protocol/agent-instructions.md).
- [Agent tools](../docs/protocol/agent-tools.md) and
  [The workspace token](../docs/protocol/tokens-and-secrets.md#the-workspace-token).
- [GitHub banner](../docs/protocol/github-banner.md) and
  [Workspace tools](../docs/protocol/workspace-tools.md).
- [Chat and events](../docs/protocol/chat-and-events.md) and
  [Messages and attachments](../docs/protocol/messages-and-attachments.md).
- [Conductor Cloud comparison](../docs/protocol/conductor-cloud-comparison.md#statuses),
  for the rows in `src/marketing/from-conductor/areas/`.
- The Terms page in `src/marketing/terms.ts`, and the Privacy page in
  `src/marketing/privacy.ts` with its data uses in
  `src/marketing/privacy-uses.ts`.

## Terms

- **Start point:** the branch, pull request, or issue that a member picks in
  the new picker.
- **Workspace branch:** the one branch that the app records for a workspace.
  The pull request bar, Checks, and GitHub events find it by name.
- **Target branch:** the branch that the Changes list, the diffs, and the
  pull request bar compare with. Today it is always the default branch.
- **Fork pull request:** a pull request from another GitHub copy of the
  repository. The app cannot push to that copy.
- **Milestone 8p:** the milestone "Chat attachments" of
  `plans/boat-native-remote-workspaces.md`. It merged on 10 November 2026.
  The Worker stores each attached file in R2 and copies it into the cloud
  computer when the turn of its message starts.

## Decisions

Decisions 213 to 216 hold the answers of the brainstorm. Decisions 217 to
220 are open. Each number is the next free one on 10 November 2026. The
first options check added options to decisions 217, 218, and 219, changed
the recommendations of 217 and 218, and found decision 220. Its report is in
`.context/start-from-github/options-check.md`. Milestone 8p merged later
that day, so decisions 217 and 220 changed. A second options check added
options to both. Its report is in
`.context/start-from-github/options-check-2.md`.

### Decision 213: what a picked branch or pull request does

Chosen by the user on 10 November 2026: A, continue it. The workspace checks
out the picked branch, or the branch of the picked pull request, and pushes
to it. The pull request bar shows the existing pull request at once. The
branch keeps its own name, so the login rule of decision 53 holds only for
new branches. Fork pull requests show but cannot be picked. The Branches list
leaves out the default branch. An issue gets a new branch with today's name
rule.

- Rejected: B, a new branch built on the start point, because the existing
  pull request does not get the work. C, both actions in each row, because
  it doubles the actions and the start paths.
- Left out: an agent-only checkout, because the app follows only the
  workspace branch. A pasted GitHub link with no picker, because the
  screenshot asks for search and tabs. It can come later on top. A switch of
  the branch after the create, because the user asked for the choice on New
  workspace.

### Decision 214: how the agent learns the picked issue

Chosen by the user on 10 November 2026: C, attach. The issue shows as a chip
on the message. The agent gets the title, the body, and the comments with the
first message, and the workspace records the issue.

- Rejected: A, a link in the message, because the agent then reads the issue
  only when it chooses. B, a prefilled message, because it makes a long first
  message without the comments.
- The user asked whether the issue would be a Markdown file. Decision 217
  holds that question.

### Decision 215: an active workspace already uses the picked branch

Chosen by the user on 10 November 2026: B, show it. Each branch and pull
request row shows the chip of each active workspace on that branch. After the
pick, a note over the composer names that workspace and links to it. The
member can still send.

- Rejected: A, no notice, because two agents can then push to one branch
  without knowing. C, open the existing workspace, because it allows no
  second agent on a branch and adds a refusal.

### Decision 216: the target branch of a workspace

Chosen by the user on 10 November 2026: D, follow the live base. The user
added that the base of a workspace can change, and that an agent tool
changes it. The target branch is the base of the open pull request of the
workspace branch. The Changes list, the diffs, and the pull request bar use
it, and the agent learns it.

- Rejected: A, keep the default branch, because a stacked pull request then
  shows the changes of the lower pull requests. B, leave stacked pull
  requests out, because it refuses them. C, store the base at the create,
  because it goes stale when GitHub changes the base.

### Decision 217: how the issue text reaches the agent

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/chat/attachments.md`, `src/app/draft-files.ts:10`, `worker/chat/runner-delivery.ts:194`, and `runner/src/providers/attachment-description.ts`.
- **Background:** Decision 214 gives the agent the title, the body, and the comments of a picked issue with the first message. The user asked whether this would be a Markdown file. Milestone 8p merged on 10 November 2026, so attached files now work in production. The Worker stores each file in R2 and copies it into the cloud computer when the first turn starts. With the message, the agent gets the name, the media type, and the path of each file, not its text. Each draft file keeps its browser `File`, so Try again can upload it again. A change to the runner reaches an org only with its next image build.
- **Problem:** No rule says in which form the issue text reaches the agent.
- **Impact if no action:** The implementer picks a form, and the agent of an older image can get no issue text while the chip shows the issue.
- **Root question:** How does the agent get the title, the body, and the comments of a picked issue with the first message?
- **Options:**
  - **A.** A Markdown file. At the pick, the browser gets the issue as Markdown from a Worker route, which reads it with the member's GitHub token. The browser uploads it as an attached file of the first message, as for any file. The first turn copies it into the cloud computer. Cost: the agent gets a path, so it reads the issue only when it opens the file. The text is from the time of the pick, and the Privacy sentence about attached files must name a picked issue. Effort: Medium.
  - **B.** The Worker stores the issue text with the first message, and the runner adds it under the sender line. Cost: a stored copy, and only a new runner adds the text. Effort: Medium.
  - **D.** The runner reads the issue with the GitHub CLI at the first turn. Cost: the first turn depends on a GitHub call, and only a new runner reads it. Effort: Medium.
  - **E.** The Worker reads the issue in the GitHub read that checks the start point at the create. It stores the capped text beside the first message, and joins it to the member's text in the copy that it sends to the runner. Every runner, also an older one, gives it to the agent. Cost: a stored copy, which the Privacy page must list, and the Worker then builds text for the agent. Effort: Medium.
  - **F.** The start command reads the issue with the GitHub CLI and writes a file outside the repository, which the Worker names as an attachment of the first turn. Cost: the agent gets only a path, the start depends on a GitHub read, and only images built after 9 November 2026 have the CLI. Effort: Medium.
  - **G.** As E, but the Worker reads the issue each time it sends the first turn, and it stores no copy. Cost: the read must move out of the serial queue of the workspace chat. Effort: Large.
  - **H.** As A, and a new runner also gives the agent the text of the issue file after its path line. The Worker marks each file that the app makes with a new optional field of the runner attachment. An older runner drops that field and gives only the path. Cost: only a new image gives the text at once, and the runner command gets a new field. Effort: Large.
- **Left out:** C, a file that the runner writes, because A is better on every point: the merged path already copies files, with no runner change. A fact in the agent instructions that only names the issue, because decision 214 gives the agent the whole issue text. The system instructions as the place of the text, because text that any GitHub user can write would then weigh as much as the app's own rules. A separate chat message from the app with the issue text, because decision 214 shows the issue as a chip on the member's message.
- **Wider fix:** A. One path then serves every file, and a later source, such as a Linear issue, becomes one more attached file. H extends that path with the text in the message.
- **Previous examples:** The attached files of Milestone 8p, which reach the agent of every runner by their path.
- **Related:** Decision 219: both decide which data of the start point leaves the stored message. Decision 220: it covers the sessions that this form does not reach.
- **Recommendation:** A. It reuses the attachment path, works with every image, and keeps the issue in the cloud computer for a later read. The plan first recommended D, and the first options check changed it to E. After the merge of Milestone 8p, the plan recommends A. The second options check recommends H, because under A the agent reads the issue only when it opens the file. E best gives the text at once to every image.
- **Action:** ask the user, because the user asked about the file form, and the options trade the text in the message against one path for every file.

### Decision 218: a target branch change while a pull request is open

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/tools/handler.ts` and `worker/github/client.ts:82`.
- **Background:** Decision 216 takes the target branch from the base of the open pull request. The user added an agent tool that changes the target branch. Without an open pull request, the tool sets the branch that the workspace uses. A workspace that starts from a pull request has an open pull request from its first moment. Today the Worker changes nothing in a repository on GitHub. Git and the GitHub CLI in the cloud computer make each change, as the sender of the turn.
- **Problem:** While a pull request is open, its base sets the target branch, so a tool call alone cannot change it.
- **Impact if no action:** The tool can report a change that the workspace does not use.
- **Root question:** What does a change of the target branch do while the workspace branch has an open pull request?
- **Options:**
  - **A.** GitHub leads. The tool changes nothing and tells the agent to run `gh pr edit --base`. The workspace then follows the new base through the GitHub event. Cost: in a workspace that starts from a pull request, the tool never changes the target branch itself. Effort: Small.
  - **B.** The tool changes the base from the cloud computer. It runs `gh pr edit --base` itself, and the workspace follows through the GitHub event. Cost: the tool makes a GitHub change, so its reply must say what changed there. Effort: Small.
  - **C.** The Worker changes the base on GitHub with the GitHub token of the sender of the turn. Cost: the Worker then changes a repository on GitHub for the first time, and a call outside a turn has no sender. Effort: Medium.
  - **D.** The tool works only in the cloud computer and has no Worker route. Without a pull request, it sets `branch.<workspace branch>.gh-merge-base`, and the runner reports that branch to the Worker. With a pull request, it runs `gh pr edit --base`, as in B. The workspace token keeps its five permissions. Cost: a new runner report and a stored field, and the Worker must check the branch that the cloud computer names. Effort: Medium.
- **Left out:** A target branch that the tool sets and that wins over the base of the pull request, because it breaks decision 216.
- **Wider fix:** D. It keeps one store for each state: GitHub while a pull request is open, and the Git setting that `gh pr create` reads while none is open.
- **Previous examples:** None found.
- **Recommendation:** B. A workspace that starts from a pull request has an open pull request at once, so under A the tool that the user asked for never changes its target branch. The plan first recommended A, and the options check changed it to B. D best protects the codebase.
- **Action:** ask the user, because the options trade one tool call against a GitHub change by a tool, and no option is clearly best.

### Decision 219: the name of a workspace with a start point

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/messages-and-attachments.md:131` and `worker/chat/workspace-title.ts:32`.
- **Background:** A small model writes the name of a new workspace from the text of its first message. The title request holds no other data of the workspace. The first session takes that name as its title. With a start point, the message can be short, such as "Fix this" or "Continue".
- **Problem:** A short message gives a poor name, although the title of the issue or the pull request describes the task.
- **Impact if no action:** Such workspaces get names such as "Fix This". No screen can rename a workspace yet, so the poor name stays.
- **Root question:** What names a workspace that starts from an issue, a pull request, or a branch, when its first message alone does not say the task?
- **Options:**
  - **A.** The message text only, as today. Cost: short messages give poor names. Effort: Small.
  - **B.** The title request also gets the title of the picked issue or pull request, or the name of the picked branch. Cost: the request then holds data beyond the message, and the Privacy page sentence about names changes. Effort: Small.
  - **C.** The title of the start point becomes the name, cut to 60 characters, with no title request. Cost: issue titles can be long or unclear. It also changes the title rule and the Privacy sentence, and it must give the first session its title in another way. Effort: Small.
- **Left out:** A name that the agent writes in the cloud computer, because decision 184 rejected a title from the sandbox. The name then waits for the sandbox, and each title spends the subscription of the member.
- **Wider fix:** B. It names a workspace with any kind of start point, so a later source needs no new naming rule.
- **Previous examples:** A create call of an agent can name a workspace. See [Create and list calls](../docs/protocol/agent-tools.md#create-and-list-calls).
- **Related:** Decision 217: both decide which data of the start point leaves the stored message.
- **Recommendation:** B. The name then fits the task, and the member's words still shape it.
- **Action:** ask the user, because B changes the rule that the title request holds only the message text.

### Decision 220: how an agent finds the issue without its text

- **Severity:** Low. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/messages-and-attachments.md:30` and `runner/src/instructions.ts:33`.
- **Background:** Decision 214 gives the issue text to the agent with the first message. A workspace can hold later sessions, such as a session of the other agent or a session on the login of another member. Such a session starts with none of the earlier history. A long session can also lose the issue text when the agent summarizes it. Each session keeps its agent instructions, also after a summary. The instructions hold only facts that do not change during the work.
- **Problem:** An agent whose conversation does not hold the issue text knows nothing of the issue.
- **Impact if no action:** That agent works without the task until a member repeats it.
- **Root question:** How does an agent of an issue workspace find the issue when its own conversation does not hold the issue text?
- **Options:**
  - **A.** Nothing. A member tells the agent. Effort: Small.
  - **B.** The agent instructions of each new session name the issue: its number, its title, and its link. Cost: any GitHub user can write and change an issue title, so the instructions then hold text that a GitHub user wrote and a fact that can change. Only a new runner builds it. Effort: Small.
  - **C.** The Worker gives each new session the issue text in the form of decision 217. Cost: a GitHub read and a stored copy for each new session, and under its option A a file on a message that the member did not attach. Effort: Medium.
  - **D.** As B, but the fact gives only the issue number and its link. The agent reads the issue with the GitHub CLI when it needs it. Cost: one call to learn what the issue says, and only a new runner builds the fact. Effort: Small.
  - **E.** The Worker adds a short reference, the issue number and its link, to its copy of the first message of each new session. Every runner gives it to the agent. Cost: a summary can drop it, and the agent instructions doc rejected a block in the first message of each session for that reason. Effort: Medium.
  - **F.** The composer of each new session in an issue workspace starts with the issue attached, in the form of decision 217. The member can remove it before the send. Cost: a GitHub read for each new session, a new composer state with a mockup, and no issue text when the member removes it. Effort: Large.
- **Left out:** A workspace tool that returns the start point, because D is better on every point: the same reference with no new route and no wider workspace token. An issue number in the branch name, or a GitHub link from the branch to the issue, because no fact tells the agent to look there. The issue file of the first message used again, because only the first message of a new workspace can use its upload.
- **Wider fix:** D. When its fact names the start point of each kind, a later source adds one kind and no new path.
- **Previous examples:** The agent instructions already name the workspace branch, a fact that never changes. See [The branches](../docs/protocol/agent-instructions.md#the-branches).
- **Related:** Decision 217: option C here follows the form chosen there.
- **Recommendation:** D. Every session keeps the reference after a summary, and the instructions hold no text that a GitHub user can write or change. The plan first recommended C, then B. The second options check changed it to D. C best gives each session the whole text, and E also reaches an older image.
- **Action:** ask the user, because D adds a fact to the agent instructions, and no requirement covers these sessions.

## Design calls

My calls, made on 10 November 2026:

- The picker is a GitHub button beside the repository picker, on the page
  and in the dialog. It opens search and the tabs Pull requests, Branches,
  and Issues. A phone opens it as a sheet. Reason: the user's screenshot.
  The mockup milestone shows it for review.
- The Worker reads the lists live from GitHub with the member's own GitHub
  user token, for one repository of the org. It stores no list. Reason: the
  browser gets no token, each member sees only what GitHub shows that
  person, and no new table or webhook is needed.
- The lists show open pull requests with drafts, branches, and open issues,
  newest update first. Search matches the name, the title, or the number.
  Reason: members continue open work.
- A change of repository clears the start point. The page and the dialog
  share the start point with the rest of the draft. Reason: a start point
  belongs to one repository.
- The create checks the start point again with the sender's GitHub token
  and binds it to the chosen repository. A branch that is gone when the start
  runs fails the start with Try again, as a failed first start does. Reason:
  the Worker trusts no start point from the browser.
- The start fetches a continued branch into its remote-tracking branch and
  sets it as the upstream. Reason: the Archive check counts the commits that
  no remote-tracking branch holds, so the existing commits must not count
  as unpushed work.
- The first message still needs text, also with an issue. Reason: Send keeps
  the rule of New workspace, and the name comes from the text.
- Agent create calls stay as they are. Reason: the user asked for New
  workspace only.
- The start point is a typed value with a kind: branch, pull request, or
  issue. Reason: a later source, such as Linear, adds one kind.
- An Issues row shows the chip of each active workspace that started from
  that issue. Reason: decision 214 records the issue, and decision 215 shows
  work that already exists.
- The target branch is the base of the open pull request, else the branch
  that the agent tool set, else the default branch. A closed or merged pull
  request does not count. Reason: decision 216, and the tool covers the time
  without a pull request.
- When the branch that the tool set is gone from GitHub, the workspace uses
  the default branch. Reason: graceful handling.
- While the workspace branch has an open pull request or none, the pull
  request bar shows the target branch as the base. A merged or closed pull
  request keeps its own base in the bar, as today. Reason: members then see
  what Changes compares with, and a finished pull request keeps its record.
- The cloud computer keeps `branch.<workspace branch>.gh-merge-base` at the
  target branch, so `gh pr create` without `--base` uses it. Decision 218
  chooses which side writes it. Reason: the GitHub CLI reads this setting as
  its default base.
- The agent instructions say how to find the target branch, not a fixed
  name: the base of the open pull request, else `gh-merge-base`. Reason: the
  rule that the instructions hold no fact that changes during the work. See
  [The same text for the life of a session](../docs/protocol/agent-instructions.md#the-same-text-for-the-life-of-a-session).
- Only the agent tool changes the target branch for now. A member asks the
  agent. Reason: the user named the agent tools.
- The target branch call changes only the calling workspace. The Worker
  checks that a branch exists before it uses it as a target branch. Reason:
  the workspace token reaches only its own workspace, and sandbox code can
  name any branch.
- The issue text has a size cap. Over the cap, it keeps the body and the
  newest comments and says what it left out. It starts with a line that says
  that GitHub users wrote it. Reason: anyone who can comment can write it.
- The issue reference is a new field of the message, not a new attachment
  kind. Reason: an older runner closes its connection on an unknown
  attachment kind, and it ignores an unknown field.
- Under option A or H of decision 217, the issue chip and its file are one
  unit. A removal of either removes both. Reason: a chip must not show an
  issue whose text the agent never gets.
- An org with an older image gets the Worker parts at once: the lists, the
  create, the Changes list, and the pull request bar. The runner and tool
  parts reach it with its next image build. Until then, its agent
  instructions name the default branch as the target branch. Reason: a
  refresh installs no new software.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw "Start from" on New workspace, the states of the picker and of a picked
start point, and the workspace after a start, on desktop and on a phone.

- [ ] Add `app/new-workspace/start-from`, with child pages of five screens
      or fewer:
  - [ ] The page and the dialog with the GitHub button, and the open picker
        with search, tabs, and rows. A fork pull request row shows why it
        cannot be picked.
  - [ ] The list states: loading, no results, an empty repository, a failed
        GitHub read with Try again, and no GitHub access to the repository.
  - [ ] A picked branch, pull request, and issue. The button shows the start
        point with Clear, the Start text names the branch, and an issue shows
        as a chip on the message.
  - [ ] A row with the chip of an active workspace on its branch, and the note
        over the composer after its pick.
  - [ ] The picker as a sheet on a phone.
- [ ] Draw the workspace after a start from a pull request, with its pull
      request bar and its target branch, and the first message of an issue
      start with its chip.
- [ ] Add `user-flows/start-from-pull-request`, from the picker to the new
      workspace, with existing screens only.
- [ ] Update `docs/mockups/catalogue.md`.
- [ ] Run `npm run mockups:check`. Smoke-test the changed pages.
- [ ] Update the design and the TODOs of this plan for each problem that the
      mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the requirements and the decisions in force for the work below.

- [ ] In `docs/protocol/create-a-workspace.md`, add a "Start from" section
      with decisions 213, 214, and 215. Limit the login rule of decision 53
      to new branches.
- [ ] In `docs/protocol/agent-instructions.md`, state the target branch of
      decision 216 and how the agent finds it.
- [ ] In `docs/protocol/agent-tools.md`, add the target branch call. Its
      rule while a pull request is open, and whether the workspace token
      allows a new call in `docs/protocol/tokens-and-secrets.md`, wait for
      decision 218.
- [ ] In `docs/protocol/github-banner.md` and
      `docs/protocol/workspace-tools.md`, compare with the target branch.
- [ ] In `docs/protocol/messages-and-attachments.md`, state what the agent
      gets from an issue, and the issue chip. The form waits for decision 217,
      the name for decision 219, and later sessions for decision 220.
- [ ] Read the Terms and Privacy pages in full. Update each sentence that
      restates a changed fact, such as the branch name and the issue text.
- [x] The comparison rows of issue starts, "GitHub issues", and "Target
      branch" show Planned. Pull request #144 set them on 10 November 2026.
- [ ] Update the features in `README.md`. Check each relative link of each
      changed Markdown file.

## Milestone 3: Start point lists

Depends on: 2

- [ ] Add the shared contract of start points and their lists in
      `src/shared/`.
- [ ] Add a browser route that lists the open pull requests, the branches,
      or the open issues of one repository of the org, with a search. It
      checks the member and the repository, reads with the member's token,
      and stores nothing.
- [ ] Mark fork pull requests, and leave out the default branch.
- [ ] Test the route against the fake GitHub server: org and repository
      isolation, the fork mark, the missing default branch, search, and a
      failed GitHub read.
- [ ] Update `worker/app-api/README.md` and `src/shared/README.md`.
- [ ] Set the comparison row "Start from a branch, PR, or issue" to In
      progress when this code is pushed.

## Milestone 4: Create from a branch or a pull request

Depends on: 3

- [ ] Add an optional start point to the create request. Check it with the
      sender's token, bind it to the repository, and refuse a fork pull
      request. Store the start point with the workspace in a migration.
- [ ] For a branch or pull request start, record the existing branch as the
      workspace branch. The start fetches it and checks it out with its
      upstream, in place of a new branch.
- [ ] Keep Try again and the resume on the same branch.
- [ ] Test the create of each kind, each refusal, the start command, the pull
      request bar of an existing pull request, and Try again.
- [ ] Update `worker/lifecycle/README.md`.

## Milestone 5: Target branch follows the pull request

Depends on: 2

- [ ] Find the target branch in the Worker with the order of the design
      calls. Store the branch that the tool sets where decision 218 says.
      Until then, the order skips that branch.
- [ ] Use it for the Changes list, the diffs, the commit count, and the link
      "Create pull request". Fetch it in the cloud computer when the runner
      needs it.
- [ ] Keep `gh-merge-base` current in the cloud computer, and change the agent
      instructions to say how to find the target branch. Keep the agent
      instructions of an older runner valid, as the design calls say.
- [ ] Test each case of the order, a base change on GitHub, and the fallback.
- [ ] Update `runner/README.md`, `worker/github/README.md`, and
      `worker/files/README.md`.
- [ ] Set the comparison row "Target branch" to In progress when this code is
      pushed.

## Milestone 6: Target branch call for agents

Depends on: 5

Waits for decision 218.

- [ ] Add the call to the CLI and the MCP tool. Apply decision 218 while a
      pull request is open, and for the place that stores the branch.
- [ ] With a Worker route under `/v1/tools/`, add the call to what the
      workspace token allows. With option D of decision 218, add the runner
      report in its place.
- [ ] Test the call through `runToolProcess`, and the route or the report.
- [ ] Update `worker/tools/README.md`.

## Milestone 7: Issue starts

Depends on: 4

Waits for decisions 217, 219, and 220.

- [ ] Record the issue of an issue start with the workspace, as a field of
      the message and of the workspace. The workspace gets a new branch as
      today.
- [ ] Give the agent the issue text, as decision 217 chooses, with the cap
      and the source line.
- [ ] Apply decision 219 to the name of the workspace, and decision 220 to
      later sessions.
- [ ] Test the agent text, the cap, the name, and a later session.
- [ ] Update the README of each changed area.

## Milestone 8: Start from picker

Tags: ui

Depends on: 1, 4

- [ ] Build the button and the picker on the page and in the dialog, with
      search, tabs, and the list states, as the mockups show.
- [ ] Keep the start point in the draft, clear it on a change of repository,
      and send it with the create.
- [ ] Show fork pull requests as unavailable. Show the chips and the note of
      decision 215 from the workspace list of the org.
- [ ] Name the branch in the Start text of a branch or pull request start.
- [ ] Test the picker states, the clear, the create request, and the note.
- [ ] Compare each screen with its mockup on desktop and on a phone. Update
      `src/app/README.md`.

## Milestone 9: Issue chip

Tags: ui

Depends on: 7, 8

- [ ] Show a picked issue as a chip on the message in the composer, and in
      the chat after the send.
- [ ] Show the chips of active workspaces on Issues rows.
- [ ] Test the chips, and compare them with the mockups.

## Milestone 10: Verification, commit, review, and pull request

Depends on: every other milestone

- [ ] Smoke-test a start from a branch, a pull request, and an issue on the
      development page.
- [ ] Set the comparison rows of this change to Available.
- [ ] Renumber decisions 213 to 220 when another change took those numbers.
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

- [ ] On the deployment, start a workspace from a pull request of a test
      repository. Check the pull request bar, a push to its branch, and the
      target branch of the Changes list.
