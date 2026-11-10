# Check deployed Preview port detection

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from the Preview port detection work in PR #154.
- **Location:** `runner/src/proc-ports.ts`, `runner/src/socket-table.ts`, `worker/chat/port-reports.ts`, and `src/previews/PreviewTool.tsx`.
- **Reason:** This check needs the deployed feature and an org image built from its new runner.

- **Terms:**
  - **Cloud computer:** The sandbox of one Conductive workspace.
  - **Org image:** The prepared software and repositories that new workspaces use.
  - **Port report:** The runner's complete list of eligible listening servers, sent through workspace events.
- **Background:**
  - Preview lists detected servers with a short program name and an optional repository folder.
  - A row opens the same private preview path as manual port entry.
  - An org image build installs a new runner.
  - Existing workspaces keep their older runner and must retain manual entry when no report exists.
  - A preview also needs the preview relay. A workspace without it refuses previews and asks for a new workspace after Build computer.
  - The list excludes the terminal, preview relay, ascii-agent, and Sunshine services.
  - The runner filters known credentials from complete labels. The workspace filters marked org values before stored or displayed cuts.
- **Task:**
  1. After deployment, keep one test workspace created before a new image build.
  2. Select **Build computer** for a test org. Wait for success, then create a new workspace from that image.
  3. Start a normal web development server in a repository subfolder. Use a known port and record the start signal.
  4. Open **Preview**. Confirm that the server appears with its port, name, and relative folder within five seconds.
  5. Select that row. Confirm that its private preview opens and that its tab has the short program label.
  6. Confirm that the original workspace still shows its manual port field when its older runner supplies no report. With a running preview relay, open a server there by typing its port. Without the relay, confirm that the error asks for a new workspace after Build computer. Confirm that manual opening works in that new workspace.
- **Impact if no action:** Local tests and CI do not prove the deployed runner archive, image build, workspace event connection, and browser flow together. A rollout defect could hide the list or break the manual fallback.
- **Needs:** The deployed port-detection change, a signed-in test account, permission to build a test org image, and one workspace from before that build. No production account or external credential value needs to enter the evidence.
- **Done when:** The new workspace lists and opens the server within five seconds with the expected name and folder. The old workspace retains its manual field. Manual opening works with the relay, and a workspace without it gives the required recovery message. Record the image build, the workspace creation times, and the observed results.

The requirements live in [Port previews](../../docs/protocol/workspace-tools.md#port-previews) and [Listening ports](../../docs/protocol/agent-runner.md#listening-ports).
