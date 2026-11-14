# Measure the workspace create on the deployment

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-13, from the branch `calummoore/milan-ofz5`.
- **Location:** `worker/lifecycle/browser.ts:76`.
- **Reason:** The measurement needs the merged change on `conductive.build`.

- **Terms:**
  - **`Server-Timing`:** an HTTP reply header with step names and durations. The network panel of the browser developer tools shows it.
- **Background:** The user said that the busy Create button of New workspace made the app feel slow. On 13 November 2026, the user chose option A of create-speed decision 1: make the server answer faster, with the same screens. The branch `calummoore/milan-ofz5` removed a wait of about 1 s before the first start step. It also removed repeated database checks of the create route, and it ran the independent checks together. The 201 reply of `POST /api/orgs/<org>/workspaces` now carries `Server-Timing: create;dur=…, message;dur=…, project;dur=…`. Nobody measured the times before the change. The guess was about 1.5 s near Europe and 2.5–4 s far from it. Two options were not chosen. Option B filled the workspace screen from the create reply, so that the screen does not load the workspace again. Option C opened a temporary workspace at once, before the reply. It changes the rule of `docs/protocol/create-a-workspace.md` that the workspace opens when the server accepts the create.
- **Task:** Create a workspace on `conductive.build` from a place near Europe and from a place far from it. Read the total time of the create request and its `Server-Timing` steps in the network panel. Then tell the user the times. If the wait still feels slow, offer options B and C again.
- **Impact if no action:** Nobody knows if the change made the create fast enough.
- **Needs:** The merged change on `conductive.build`, and a signed-in account in an org with a good cloud computer build.
- **Done when:** The user has the measured times, and has said whether more work is needed.
