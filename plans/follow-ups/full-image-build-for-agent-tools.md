# Rebuild org images to install the new agent tools

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge section of the plan for branch `calummoore/mcps-for-agents`, which adds agent tool lists and workspace names.
- **Location:** `worker/tools/image.ts` and `worker/lifecycle/image-build-steps.ts:97`.
- **Reason:** The task needs the merged and deployed Worker.

- **Terms:**
  - **Workspace tools:** the `conductive` CLI and MCP server in each cloud computer, under `tools/`. Agents use them to create and list workspaces.
  - **Org image:** the saved image that each new cloud computer of an org starts from. Each build starts from the ready software image of the current app software version, which holds the current workspace tools. Without that image, the build installs the tools itself. A refresh keeps the tools of its image.
- **Background:**
  - The branch `calummoore/mcps-for-agents` adds the tool calls `list_repositories`, `list_sections`, and `list_models`, and an optional `name` for `create_workspace`.
  - The Worker serves the new routes at once after the deploy.
  - A cloud computer gets the new tool code only from an org image that a full build made after the deploy. In `worker/lifecycle/image-build-steps.ts`, a refresh goes from the source step to the snapshot step and skips the software step that installs the tools.
  - A build after the deploy gets the tools of the deployed version. It starts from the ready software image of that version, or installs the tools itself when no such image is ready.
  - Older tools keep working. They do not show the new calls, and they drop a `name`.
- **Task:** After the deploy, start a full image build for each org that uses agents. Then start a new workspace and run `conductive repositories list`, `conductive sections list`, and `conductive models list` in its terminal.
- **Impact if no action:** Agents in existing orgs keep the old tools until the next full build, so they still cannot find repository IDs.
- **Needs:** The deployed Worker, and an admin of each org, or the operator.
- **Done when:** A new workspace of each org that uses agents lists its repositories, sections, and models with the CLI.
