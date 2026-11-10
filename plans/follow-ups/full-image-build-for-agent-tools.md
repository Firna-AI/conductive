# Rebuild org images to install the new agent tools

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge section of the plan for branch `calummoore/mcps-for-agents`, which adds agent tool lists and workspace names. Updated on 2026-11-10 by branch `calummoore/workspace-name-underscores`, which adds guidance against underscores to the name of a create call.
- **Location:** `worker/tools/image.ts`, `worker/lifecycle/image-build-steps.ts:97`, and the name guidance in `tools/mcp-tools.ts` and `tools/cli.ts`.
- **Reason:** The task needs the merged and deployed Worker.

- **Terms:**
  - **Workspace tools:** the `conductive` CLI and MCP server in each cloud computer, under `tools/`. Agents use them to create and list workspaces.
  - **Org image:** the saved image that each new cloud computer of an org starts from. Each build starts from the ready software image of the current app software version, which holds the current workspace tools. Without that image, the build installs the tools itself. A refresh keeps the tools of its image.
- **Background:**
  - The branch `calummoore/mcps-for-agents` adds the tool calls `list_repositories`, `list_sections`, and `list_models`, and an optional `name` for `create_workspace`.
  - The branch `calummoore/workspace-name-underscores` adds two sentences to the `name` description of `create_workspace` in `tools/mcp-tools.ts`, and to the `--name` help of `conductive --help` in `tools/cli.ts`: "Use plain words separated by spaces. Avoid underscores unless the user tells you to add them."
  - The user chose on 10 November 2026 that the Worker keeps the underscores of a name that an agent gives. So this text is the only guidance that keeps underscores out of such a name.
  - The Worker serves the new routes at once after the deploy.
  - A cloud computer gets the new tool code and the new tool text only from an org image that a full build made after the deploy. In `worker/lifecycle/image-build-steps.ts`, a refresh goes from the source step to the snapshot step and skips the software step that installs the tools.
  - A build after the deploy gets the tools of the deployed version. It starts from the ready software image of that version, or installs the tools itself when no such image is ready.
  - Older tools keep working. They do not show the new calls, and they drop a `name`.
  - Tools from a full build between the deploys of the two branches send a `name`. They give the agent the old text, with no guidance against underscores.
  - The CLI and the MCP server come from the same tool sources and the same install step. So a check of the CLI help also shows that the MCP description is new.
- **Task:** After the deploy, start a full image build for each org that uses agents. Then start a new workspace and run `conductive repositories list`, `conductive sections list`, and `conductive models list` in its terminal. Also run `conductive --help`, and check that the `--name` help gives the two sentences above.
- **Impact if no action:** Agents in existing orgs keep the old tools until the next full build, so they still cannot find repository IDs. Agents with tools from between the two deploys also get no guidance against underscores. So a name that such an agent gives can look like `add_conductive_app`.
- **Needs:** The deployed Worker, and an admin of each org, or the operator.
- **Done when:** A new workspace of each org that uses agents lists its repositories, sections, and models with the CLI. Its `conductive --help` gives "Use plain words separated by spaces. Avoid underscores unless the user tells you to add them." for `--name`.
