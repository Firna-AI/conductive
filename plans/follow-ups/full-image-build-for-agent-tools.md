# Check the new agent tools in each org after the deploy

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge section of the plan for branch `calummoore/mcps-for-agents`, which adds agent tool lists and workspace names. Updated on 2026-11-10 by branch `calummoore/workspace-name-underscores`, which adds guidance against underscores to the name of a create call. Updated on 2026-11-11 by branch `calummoore/conductive-mcp-chat-access`, which adds session calls and instructions. Updated on 2026-11-11 by branch `calummoore/build-image-install-order`: a workspace start now installs the current tools, so no org needs a rebuild.
- **Location:** `worker/tools/image.ts`, `worker/software-image/version.ts`, and the name guidance in `tools/mcp-tools.ts` and `tools/cli.ts`.
- **Reason:** The task needs the merged and deployed Worker.

- **Terms:**
  - **Workspace tools:** the `conductive` CLI and MCP server in each cloud computer, under `tools/`. Agents use them to create and list workspaces, create and list sessions, send messages, and read chats.
  - **Org image:** the saved image that each new cloud computer of an org starts from. Each build and each refresh starts from the ready software image of the current app software version, which holds the current workspace tools. Without that image, the build or the refresh installs the tools itself.
  - **App software version:** the digest of the commands that install the app's own software. The tool sources are part of it, so a change of the tools changes the version.
- **Background:**
  - The branch `calummoore/mcps-for-agents` adds the tool calls `list_repositories`, `list_sections`, and `list_models`, and an optional `name` for `create_workspace`.
  - The branch `calummoore/workspace-name-underscores` adds two sentences to the `name` description of `create_workspace` in `tools/mcp-tools.ts`, and to the `--name` help of `conductive --help` in `tools/cli.ts`: "Use plain words separated by spaces. Avoid underscores unless the user tells you to add them."
  - The session calls are `list_sessions`, `read_session`, `create_session`, and `send_message`. The CLI commands are `conductive sessions list`, `read`, `create`, and `send`. Session writes need an active agent turn. Session reads need only the workspace token.
  - Tool messages end with `Sent by:` and the sending session link. New runner instructions explain that line and tell agents not to reply only to confirm it.
  - The user chose on 10 November 2026 that the Worker keeps the underscores of a name that an agent gives. So this text is the only guidance that keeps underscores out of such a name.
  - The Worker serves the new routes at once after the deploy.
  - A new cloud computer gets the new tool code and the new tool text from an org image that a build or a refresh made after the deploy.
  - Since 11 November 2026, each workspace start gives an older workspace the current workspace tools, as [Old workspaces](../../docs/protocol/workspace-life.md#old-workspaces) says. So no org needs a build to get the new tools.
  - Older tools keep working. They do not show the new calls, and they drop a `name`.
  - Tools from a full build between the deploys of the two branches send a `name`. They give the agent the old text, with no guidance against underscores.
  - The CLI and the MCP server come from the same tool sources and the same install step. So a check of the CLI help also shows that the MCP description is new.
- **Task:** After the deploy, open a workspace of each org that uses agents. Its workspace start installs the current tools. Then run `conductive repositories list`, `conductive sections list`, and `conductive models list` in its terminal. Also run `conductive --help`, and check that the `--name` help gives the two sentences above. Run `conductive sessions list` and `conductive sessions read` for a session. During an active agent turn, use `conductive sessions create` in another workspace, then `conductive sessions send` and `conductive sessions read` for that session. Check that MCP exposes and runs the same four calls. Press the link of the `Sent by:` line and check that the sending session opens.
- **Impact if no action:** Nobody confirms in the deployed app that a workspace start gives agents the new tools. If it does not, agents cannot find repository IDs or use the session calls. Agents with tools from between the deploys also get no guidance against underscores or confirmation loops. So a name that such an agent gives can look like `add_conductive_app`.
- **Needs:** The deployed Worker, and a member of each org that uses agents, or the operator.
- **Done when:** A workspace of each org that uses agents lists its repositories, sections, and models with the CLI. Its `conductive --help` gives "Use plain words separated by spaces. Avoid underscores unless the user tells you to add them." for `--name`. CLI and MCP can list, create, message, and read sessions. A tool message links to its sending session, and that link opens the session in the app.
