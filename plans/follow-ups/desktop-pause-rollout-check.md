# Verify the Desktop pause after rollout

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the Desktop panel pause on branch `calummoore/desktop-panel-disable`.
- **Location:** `src/shell/workspace/tools/tool-address.ts`, `src/shell/workspace/tools/tool-navigation.ts`, `src/shell/workspace/WorkspaceColumns.tsx`, and `desktop/renderer/main.tsx`.
- **Reason:** this check needs the deployed web change and a Mac build that contains the change.

- **Terms:**
  - **Desktop:** the tool that shows the live screen of a workspace's cloud computer.
- **Background:** On 9 November 2026, the user chose to hide Desktop for every user and keep its implementation for later use. The interface shows Terminal for an old Desktop address or a saved Desktop choice. It preserves that saved choice. The server keeps its Desktop route and existing access rules. The Mac app bundles the interface, so an installed build keeps its old Desktop tab until it updates.
- **Task:**
  - Open a workspace in the deployed web app and in the next Mac build that contains the change.
  - Check that the tools panel offers Terminal and Preview, and the command palette offers no Go to Desktop.
  - Check the phone layout of the web app. Its tab bar must show Chat, Files, Terminal, and Preview. The four tabs must fill the bar.
  - Open an old Desktop address in the same workspace. Check that Terminal shows and no Desktop frame opens.
  - If an existing saved Desktop choice is available, check that it shows Terminal and keeps its saved Desktop value.
  - Record the deployment and Mac build versions with the results. State if the saved-choice check could not run.
- **Impact if no action:** local tests can pass while a deployed client still runs an older interface.
- **Needs:** the deployed change, a Mac build that contains it, and a signed-in account with access to a workspace.
- **Done when:** the web app and the new Mac build hide Desktop and show Terminal for an old Desktop address. The record names the checked versions and the result of each check.
