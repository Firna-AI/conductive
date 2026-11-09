# Agent tools doc omits the sender of a created workspace

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, from branch `calummoore/routines-feature-brainstorm`, a new problem of the options check of decision 214 of `plans/routines.md`.
- **Location:** `docs/protocol/agent-tools.md`, "Create and list calls", and `worker/tools/create.ts:34`.
- **Reason:** The routines plan does not change the agent tools, and the doc gap changes no behaviour.

- **Terms:**
  - **Agent tools:** the MCP server and the CLI in each cloud computer that let an agent create and list workspaces of its org.
  - **Sender:** the member who sent the message of a turn. The GitHub token and the Mac requests of a turn belong to its sender.
- **Background:**
  - "Create and list calls" in `docs/protocol/agent-tools.md` says that a new workspace gets the org and the workspace owner of the calling workspace.
  - `worker/tools/create.ts:34` also makes the sender of the calling turn the sender of the first message of the new workspace. So that member's GitHub token and Mac serve the first turn of the new workspace.
- **Problem:** The protocol doc does not state who sends the first message of a created workspace.
- **Impact if no action:** A reader cannot tell whose GitHub access and whose Mac the first turn of a created workspace uses.
- **Root question:** Who sends the first message of a workspace that the agent tools create?
- **Options:**
  - **A.** Add one requirement to "Create and list calls": the sender of the calling turn sends the first message of the new workspace. Effort: Small.
  - **B.** As A, and say in "Mac commands" that the Mac of that sender serves the first turn of the new workspace. Effort: Small.
- **Left out:** A change of the sender, such as the workspace owner. It changes behaviour that decision 62 and the code already settle, and no problem asks for it.
- **Wider fix:** None, because the `documentation` skill already keeps docs aligned with the code.
- **Previous examples:** None found.
- **Recommendation:** B. A reader then sees both effects of the sender.
- **Action:** fix after merge, apply B, because the routines plan does not change the agent tools.
