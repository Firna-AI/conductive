# Agents on E2B have no computer tools

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, decision 216 of `plans/sandbox-provider-groundwork.md`, branch `calummoore/vercel-sandbox-provider`. Changed on 2026-11-10 by the user's answer to that decision, on branch `calummoore/e2b-backup-sandbox-provider`.
- **Location:** "Computer tools" in `docs/protocol/agent-tools.md`, `runner/src/providers/computer-mcp.ts:31`, and the E2B template under `image/e2b/`, which the E2B provider change adds.
- **Reason:** On 10 November 2026, the user chose to start E2B with no computer tools, and to add them in a later change.

- **Terms:**
  - **Computer tools:** the MCP server `computer` that gives the agents browser and desktop actions in the sandbox.
  - **Cua Driver:** an open-source computer-use driver, from the `trycua/cua` project under the MIT license, that runs as such an MCP server.
- **Background:**
  - On 10 November 2026, the user chose E2B as the second sandbox provider. Each org runs on one provider account. A new org gets its account from weights that the operator sets, and an operator can choose the account when the operator creates an org.
  - Boat writes the `computer` entry into `/home/user/.claude.json` at each start. `runner/src/providers/computer-mcp.ts` reads that entry and only passes it on.
  - When the entry is missing, the runner warns "Computer tools are unavailable. The sandbox computer server settings could not be read." Then it runs the agents without computer tools. This is what an E2B sandbox does under the user's choice.
  - On Boat, the Cua Driver runs as the systemd user service `cua-driver.service`. It acts on the Xorg display `:0`, at 1920 by 1080, with Chrome.
  - The user chose option A of the computer tools decision on 10 November 2026: start without computer tools on the second provider, and add option B later. The agent recommended B. The recorded options were:
    - **A.** Start without computer tools on the second provider, and add B later. It changes "Computer tools" in the agent tools protocol.
    - **B.** Install a screen, Chrome, and the Cua Driver in the image of the second provider, registered as `computer`.
    - **C.** Ship a headless browser MCP server, such as Playwright MCP, with the runner, for a sandbox with no `computer` entry.
    - **D.** Install our own screen, Chrome, and Cua Driver on every provider, also on Boat. It best protects the codebase.
    - **E.** The Worker calls a provider's computer-use API. Superserve's MCP server needs its API key, so it cannot run inside the app's sandboxes.
  - The app hides the Desktop tool for now. `plans/follow-ups/desktop-stream-on-own-domain.md` holds the desktop stream, which shows the screen where the computer tools act.
- **Task:**
  1. Add a screen on display `:0`, Chrome, and the Cua Driver as a service to the E2B template.
  2. Register the driver as the MCP server `computer` in `/home/user/.claude.json` and in the Codex settings, as Boat does.
  3. Change "Computer tools" in `docs/protocol/agent-tools.md` back to tools on every sandbox.
  4. In a live E2B sandbox, check that an agent takes a screenshot of `:0` and opens a page in Chrome.
- **Impact if no action:** Agents in E2B workspaces cannot open or test a web page in a browser.
- **Needs:** The E2B provider on main, with its template. An E2B key for the live check.
- **Done when:** An agent in an E2B workspace uses the `computer` tools, and the agent tools protocol gives the tools to every sandbox. Then delete this item.
