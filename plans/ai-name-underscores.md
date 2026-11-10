# No underscores in names that a model writes

Status: Active. On branch `calummoore/workspace-name-underscores`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

The user approved all milestones and tasks on 10 November 2026.

The title model is the small Workers AI model that names a new workspace
from its first message. The workspace and its first session take that
name. The model writes names such as `add_conductive_app`, so the workspace
list and the session tab show a name that looks like a code identifier. Its
prompt already asks for plain words separated by spaces, but the model does
not always follow it. An agent can also name a new workspace with the
`create_workspace` tool or the `conductive workspaces create` command.

The change adds one shared rule for a title that a model writes: each
underscore becomes a space, then the session title rule applies. The answer
of the title model goes through this rule, and its prompt asks for no
underscores. The create call tells the agent to avoid underscores unless
the user tells it to add them. The Worker keeps the name of a create call
as the agent sends it. The change does not touch a name that a member
types, a session title from a member's message, or an existing name.

Contract owners:

- [Messages](../docs/protocol/messages-and-attachments.md#messages).
- [Create and list calls](../docs/protocol/agent-tools.md#create-and-list-calls).
- The [workspace and session names guide](../worker/chat/workspace-titles.md).
- The [agent workspace tools README](../worker/tools/README.md).
- The [workspace tools README](../tools/README.md).

## Decisions

### Decision 255. One rule for names that a model writes

Item 1 of the brainstorm of 10 November 2026.

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium.
- **Source:** Design.
- **Category:** Product bug.
- **Location:** `worker/chat/title-text.ts:16`, `worker/tools/create.ts:60`, and `tools/mcp-tools.ts:45`.
- **Background:** `cleanTitle` cleans the answer of the title model. It removes underscores only at the start and the end, as Markdown marks. The create call cleans a name only with the session title rule, which keeps underscores. The description of the create call gives no format for the name.
- **Problem:** The title model writes names such as `add_conductive_app`, although its prompt asks for spaces. On 10 November 2026, two of the three newest workspaces of the user had such names.
- **Impact if no action:** The workspace list and the first session tabs keep names that look like code identifiers.
- **Root question:** How does the app keep underscores out of every name that an AI writes?
- **Options:**
  - **A.** The Worker changes each underscore in the answer of the title model to a space. The prompt also asks for no underscores. A create call keeps its name as the agent sends it. Effort: Small.
  - **B.** Option A, plus one sentence in the description of the create call that asks for plain words with spaces. The Worker keeps the name as the agent sends it. Existing org images keep the old description until their next full image build. Effort: Small.
  - **C.** One shared rule for AI names in `src/shared/`. The title model and the create call both use it. The description of the create call gets the sentence of option B. The name rule of the create call in `docs/protocol/agent-tools.md` gets a new step. Risk: a member who asks an agent for a name with underscores gets spaces, and must rename the workspace. Effort: Medium.
  - **D.** Option B, with the sentence of the note on this decision. The rule of the title model also splits a one-word answer at each hyphen, dot, and slash, so `add-conductive-app` gives "add conductive app". Hyphens inside a longer title stay. Risk: a one-word answer such as `Node.js` gives "Node js". Effort: Small. The options check added this option.
- **Left out:**
  - Prompt only: the prompt already asks for "plain words separated by spaces", and the model still writes underscores.
  - A larger title model: no model guarantees the format, and each title then costs more and takes longer.
  - Spaces on the screen only: names that members typed change on the screen, and the stored names keep the underscores.
  - One rule for every name, also for session titles from member messages: a member can write `user_id` on purpose, and the goal covers only AI names.
  - Refuse a title with underscores: the workspace then stays "Untitled", and option A is better on every point.
  - Ask the model for a JSON list of words: a word can still hold underscores, so this needs the cleanup of option A anyway.
  - Keep a word with underscores when the first message holds it: the name then holds underscores that no member asked for.
  - Split a one-word answer before each capital: this damages names such as "GitHub".
  - Ask the model again after a one-word answer: the second answer can also be one word, so this needs the split of option D anyway, and the title waits longer.
  - Use the first words of the message after a one-word answer: the protocol rejects such names as weaker.
- **Wider fix:** C. One helper serves every AI name, so a later naming path cannot miss the rule.
- **Previous examples:** Commit `54a5b2e3` (#101) added "Use plain words separated by spaces" to the prompt. Commit `e7aa8641` (#87) added `cleanTitle`.
- **Recommendation:** C. It makes the rule certain for every AI name, also for agents in older org images. The options check recommended D and asked this root question: "How does every name that an AI writes read as plain words, not as a code identifier?" C stays, because the task names only underscores, no other shape has shown up, and D changes names such as `Node.js`.
- **Action:** ask the user, because option C changes the name rule of create calls in a protocol doc, and options B and C trade a certain rule against names that a member asks an agent to use.
- **Answer:** C, on 10 November 2026, with a note: tell the agent to avoid underscores unless the user tells it to add them. Decision 256 settles how the create call follows the note.

### Decision 256. Underscores that a member asks for

Item 2 of the brainstorm of 10 November 2026. The note on decision 255 raised it.

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `worker/tools/create.ts:60` and `tools/mcp-tools.ts:45`.
- **Background:** In option C of decision 255, one shared rule changes each underscore to a space, and the create call uses it too. The note of the user adds a sentence for the agent: "Avoid underscores unless the user tells you to add them." Options A, B, and D assume that the agent knows when the member asked, as the note says.
- **Problem:** The create call does not tell the Worker whether the member asked for underscores. With option C as written, the Worker removes them, and the agent cannot follow the note.
- **Impact if no action:** A member who asks an agent for a workspace called `api_v2` gets "api v2".
- **Root question:** How does a name from a create call hold underscores only when a member asked for them? The options check wrote this root question in place of one that assumed a cleanup in the Worker.
- **Options:**
  - **A.** Trust the agent. The description of the create call gets the sentence of the note. The Worker keeps the name as the agent sends it. Only the title model uses the shared rule. Risk: an agent that ignores the description still adds underscores. Agents in existing org images see the new description only after a full image build. Effort: Small.
  - **B.** Add a flag. The create call gets a new true-or-false field, such as `nameFromUser`. The Worker removes underscores unless the agent sets it. The description gets the sentence of the note and says when to set the flag. Older tools send no flag, so the rule protects their names at once. Cost: a new field in the tool, the command line, the Worker, and the agent tools protocol doc. Effort: Medium.
  - **C.** The description gets the sentence of the note. The Worker keeps each word with underscores, such as `api_v2`, when a member message of the calling session holds it. It changes every other underscore to a space. The check reads the calling workspace, so it covers older tools at once. Cost: a request in other words, such as "use snake case", loses its underscores. Each create call also reads the messages of the session, and the protocol gets a new step. Effort: Medium. The options check added this option.
  - **D.** Option A, and the description also tells the agent to give a name only when a member names the workspace. In all other cases, the title model names the workspace and its first session, with the certain rule. Cost: agents name fewer workspaces, although the user asked for the name of the create call in #88. Older images keep the old description until a full image build. Effort: Small. The options check added this option.
- **Left out:**
  - The Worker always removes underscores, as option C of decision 255 says: this breaks the note.
- **Wider fix:** B. Its default protects every create call, also from older tools.
- **Previous examples:** None found.
- **Recommendation:** A. The first recommendation was B. The options check changed it, because B adds a field to the tools, the Worker, and the protocol for a risk that no agent name has shown, and B still needs the agent to set the flag.
- **Action:** ask the user, because option A drops part of option C, which the user chose, and option B adds a field that no requirement asks for.
- **Answer:** A, on 10 November 2026.

## Design

`modelTitleFrom` in `src/shared/session-title.ts` holds the shared rule,
beside `sessionTitleFrom`. It changes each underscore to a space, then
applies `sessionTitleFrom`. `cleanTitle` in `worker/chat/title-text.ts`
first removes title labels, quotes, and Markdown marks, as now. It then
applies `modelTitleFrom` in place of `sessionTitleFrom`. The title prompt
adds "with no underscores". The `name` description of `create_workspace`
and the `--name` help of the CLI ask for plain words separated by spaces,
as option C of decision 255 says. They add the sentence of the note:
"Avoid underscores unless the user tells you to add them." The create
handler keeps `sessionTitleFrom`.

My design calls, of 10 November 2026:

- Only underscores change. Hyphens and capitals inside words stay, because words such as "sign-in" and "GitHub" use them, and the task names only underscores.
- The letter case of the model stays. A forced capital damages names such as "iOS".
- Existing names stay. The app is not in production, and a member can rename an affected workspace with Rename.
- A session title from a member's message keeps its underscores, because the member wrote that text.
- The title model gets no exception for underscores that a member asks for. It reads the member's message as data, not as instructions, and a member names a workspace with Rename.
- The CLI help gets the same sentences as the `create_workspace` description, because an agent can create a workspace through either.
- The descriptions keep the sentence of option B, "plain words separated by spaces", beside the sentence of the note. Option C, which the user chose, includes the sentence of option B, and the note adds the exception for underscores.
- `modelTitleFrom` stays in `src/shared/`, also with one caller. The user chose a shared rule in decision 255, and option A of decision 256 says that only the title model uses it.
- The comment of `sessionTitleFrom` says that the runner shares the rule, but no runner file imports it. Milestone 2 corrects the comment, because the change edits that file.
- The new rule gets one case in the existing test of `cleanTitle`, the entry point of the title cleanup. The descriptions get no test, because a test of a copied text protects nothing.
- Decisions 255 and 256 take the next free numbers, as recent changes do. Open branches use 242 to 254. The follow-up `plans/follow-ups/decision-numbers-across-plans.md` owns the rule for decision numbers.
- A name from a create call leaves the first session "Untitled". This is outside the scope. The follow-up `plans/follow-ups/agent-named-workspace-first-session.md` records it.
- The post-merge checks go into two existing follow-up items, because the follow-up rules update an item of the same task instead of adding a second one.

My design call, of 10 November 2026, during implementation:

- The latest `main` makes the message requirements page exceed the documentation length target. Move the attachment requirements to `docs/protocol/message-attachments.md`. Keep the existing `Attachments` heading as a link, so each existing citation still resolves. This changes no requirement.

## Milestone 1: Documentation and protocol

Depends on: none

The protocol docs state the two new requirements and their decisions.

- [x] In [Messages](../docs/protocol/messages-and-attachments.md#messages), state that the title request asks for no underscores, and that the app changes each underscore of the title to a space (decision 255). Give the rejected alternatives and the reason.
- [x] In [Create and list calls](../docs/protocol/agent-tools.md#create-and-list-calls), state that the create call asks the agent for plain words separated by spaces, and tells it to avoid underscores unless the member asks for them. State that the Worker keeps the underscores of the name (decision 256). Give the rejected alternatives and the reason.
- [x] Read `src/marketing/terms.ts`, `src/marketing/privacy.ts`, and each guide in `src/marketing/docs/` in full. Update each sentence that restates a changed fact.
- [x] Read the "Automatic names" row in `src/marketing/from-conductor/areas/workspaces-and-branches.ts`. The change does not ship, start, or drop the feature, so its status stays.
- [x] Check each relative link of each changed Markdown file.

Completed on 10 November 2026. Evidence: `.context/ai-name-underscores/docs-report.md`.

## Milestone 2: Model titles without underscores

Depends on: 1

The answer of the title model loses its underscores.

- [x] Add a case to the test of `cleanTitle` in `worker/chat/title-text.test.ts`. The answer `add_conductive_app` gives `add conductive app`, and an underscore beside a space leaves one space. See the case fail.
- [x] Add `modelTitleFrom` to `src/shared/session-title.ts`, and end `cleanTitle` with it.
- [x] Remove the runner from the comment of `sessionTitleFrom`, because no runner file imports the rule.
- [x] Add "with no underscores" to the title prompt in `worker/chat/title-text.ts`.
- [x] Update `worker/chat/workspace-titles.md`.
- [x] Run `npm run test -- worker/chat/title-text.test.ts worker/chat/title-model.test.ts src/shared/session-title.test.ts`.

Completed on 10 November 2026. Evidence: `.context/ai-name-underscores/implementation-report.md`.

## Milestone 3: Guidance for agents

Depends on: 1

The create call tells the agent to avoid underscores unless the user tells it to add them.

- [x] Add "Use plain words separated by spaces. Avoid underscores unless the user tells you to add them." to the `name` description of `create_workspace` in `tools/mcp-tools.ts`.
- [x] Add the same guidance for `--name` to `CLI_HELP` in `tools/cli.ts`.
- [x] Update `tools/README.md` and `worker/tools/README.md`: the tools ask the agent to avoid underscores, and the Worker keeps them.
- [x] Run `npm run test -- worker/tools worker/software-image/version.test.ts`.

Completed on 10 November 2026. Evidence: `.context/ai-name-underscores/implementation-report.md`.

## Milestone 4: Verification, commit, review, and pull request

Depends on: 1, 2, 3

- [x] Add the new guidance to `plans/follow-ups/full-image-build-for-agent-tools.md`, because an org image gets new tool descriptions only from a full build.
- [x] Add a check for spaces in place of underscores to the done line of `plans/follow-ups/workspace-title-smoke-test.md`.
- [x] Run `npm run format:check`, `npm run lint`, and `npm run file-length:check`. Run `npm --prefix desktop ci` and `npm ci --prefix runner`, then the complete gate, `npm run check`.

Verification evidence: `.context/ai-name-underscores/evidence/complete-gate.log`. The final pull request CI also verifies the tree with the latest `main` changes.
- [x] Commit with Conventional Commits and push the branch.
- [x] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.

The independent review found no findings. Evidence: `.context/reviews/calummoore/workspace-name-underscores/round-1-review.md`. The post-merge targeted checks and current documentation checks are in `.context/ai-name-underscores/evidence/merged-target-tests.log` and `.context/ai-name-underscores/docs-integration-report.md`.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this plan,
      and the follow-up items that the change adds or updates. It names
      `plans/follow-ups/agent-named-workspace-first-session.md`.

## Post-merge follow-up (non-blocking)

This change adds no post-merge task of its own. Milestone 4 adds its
checks to the two existing follow-up items that the design names.
