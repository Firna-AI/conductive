# A blank workspace name breaks the agent list call

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from the options check of the plan for branch `calummoore/mcps-for-agents`, which adds agent tool lists and workspace names.
- **Location:** `worker/tools/store.ts:56`, `worker/chat/other-events.ts:31`, and `tools/responses.ts:83`.
- **Reason:** The change that found the problem adds new list calls and does not touch the runner title path or the workspace list call.

- **Source:** Review. **Category:** Security.
- **Terms:**
  - **`list_workspaces`:** the agent tool that returns the ID, name, branch, and state of every workspace of the org. The Worker serves it at `GET /v1/tools/workspaces`.
  - **`workspace.title`:** the runner event that carries a new workspace name. The Worker stores the name as the workspace name.
- **Background:**
  - The Worker reads the name of a `workspace.title` event with `string` from `worker/chat/inputs.ts`. That reader accepts any text, also an empty one.
  - Any code in the sandbox can read the workspace token and connect as the runner, so it can send such an event.
  - `orgWorkspaces` in `worker/tools/store.ts` reads each workspace name with `text` from `tools/input.ts`. That reader throws for a blank name. The handler then answers HTTP 500 `internal_error`.
  - The tool reads the answer with `listedWorkspaces` in `tools/responses.ts`, which also refuses a blank name.
- **Problem:** One workspace with a blank name makes `list_workspaces` fail for every workspace of the org, also after that workspace is archived.
- **Impact if no action:** Code in one sandbox can stop the agents of the whole org from listing workspaces, until the name changes.
- **Root question:** How does the workspace list stay available when a stored workspace name is blank?
- **Options:**
  - **A.** Read the stored names with a reader that accepts any text, in the Worker query and in the tool's answer reader. The list then shows a blank name as it is. Effort: Small.
  - **B.** Keep the old name when a `workspace.title` event has a blank name, at the title write. A blank name then never reaches the database. Effort: Small.
  - **C.** A and B together. Effort: Small.
- **Left out:** Refuse a blank title as an invalid runner event, because B reaches the same result without a new rejection.
- **Wider fix:** A. A reader that accepts every stored name keeps the list up, whatever writer stored the name.
- **Previous examples:** None found.
- **Related:** Branch `calummoore/chat-title-rename` has the follow-up item `plans/follow-ups/workspace-title-from-sandbox-unchecked.md`, which asks which names the Worker accepts from a sandbox. Its answer can make B unnecessary.
- **Recommendation:** A. The list must not fail for the whole org because of one stored value.
- **Action:** fix after merge, apply A, because the change that found the problem does not touch the list call.
