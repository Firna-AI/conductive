# Some Claude tool lines hide which tool ran

- **Severity:** Low. **Likelihood:** Common. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-23, from branch `calummoore/missing-skill-information-gkaf`, a new problem of the finding check of review round 1.
- **Location:** `runner/sdk-helper/src/providers/tool.ts`, the function `mapTool`, and `docs/protocol/chat-and-events.md`, the section on tool call lines.
- **Reason:** The same lines show on `main`, and a fix changes the lines of tools that no requirement covers yet, which the user decides.

- **Terms:**
  - **Tool call line:** one line in the chat for one tool call of an agent. It gives a verb, a target, and a detail, such as "Ran `npm test`".
  - **Tool mapper:** `mapTool` in `runner/sdk-helper/src/providers/tool.ts`. The agent runner calls it for each tool call of Claude and Codex.
- **Background:**
  - The tool mapper picks a kind from the tool name, such as read, edit, or run. Each kind has a verb. Tools of no known kind get the kind `other` and the verb "Used".
  - For most tools, the target is the first string argument among `file_path`, `path`, `command`, `pattern`, `query`, and `url`. With none of them, the target is the tool name. The detail is the `description` argument.
  - Two groups of tools keep their name as the target. A tool of an MCP server shows its name without the server, with its subject as the detail. The Claude `Skill` tool shows `Skill`, with the skill name as the detail, such as "Used `Skill` brainstorming". The branch above added the `Skill` rule on 2026-11-23, in a table `NAMED_TOOLS` in the tool mapper.
  - `docs/protocol/chat-and-events.md` gives the reason for both rules: "a subject alone, such as `menu`, does not say which tool ran".
- **Problem:** Built-in Claude tools of the kind `other` that have a subject argument show only that subject. For example, a `WebFetch` call shows "Used `https://example.com`". The line does not say which tool ran.
- **Impact if no action:** A user reads "Used" and an address or a query, and must guess which tool ran. The lines stay as they are on `main`.
- **Root question:** How does each "Used" line say which tool ran?
- **Options:**
  - **A.** Add each such Claude tool to `NAMED_TOOLS` with the argument that gives its detail, such as `WebFetch` with `url`. Add a protocol rule and a test for each. It covers only the tools in the table. Effort: Small.
  - **B.** Make the tool name the target of each line of the kind `other`, with its subject as the detail. Keep `NAMED_TOOLS` for the tools whose detail is not a subject argument. It changes the lines of each tool of that kind, also unknown ones, and needs a protocol rule. Effort: Medium.
- **Left out:** Words of the app for each tool, such as "Fetched", because they need a list of tool names that the provider can change. The protocol doc rejected this for the computer tools for the same reason.
- **Wider fix:** B. It removes the case for every tool of the kind `other`, also future tools.
- **Previous examples:** The rule for MCP tool lines in `docs/protocol/chat-and-events.md`, and the `Skill` rule of branch `calummoore/missing-skill-information-gkaf`.
- **Recommendation:** B. One rule covers each "Used" line, and no tool list must follow the provider.
- **Action:** ask the user, because each option changes the lines of tools whose lines no requirement or user decision covers yet.
