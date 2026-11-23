# Smoke-test chosen secrets of automation runs

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from branch `calummoore/add-capabilities-to-routines-2bld`, the post-merge follow-up of its plan.
- **Location:** None.
- **Reason:** A run needs a real cloud computer, and the dev fake shows no chat or Capabilities for a workspace that it makes.

- **Terms:**
  - **Automation:** a saved prompt that starts an agent in a new run workspace on each trigger, with no person present.
  - **Chosen secrets:** the org secrets that the owner of an automation checks in the Capabilities icon of its prompt box.
  - **Pre-approval:** a grant of one workspace. Each session there uses the secret with no request.
- **Background:** The owner of an automation can choose org secrets on the automation page. Each run copies them into its new workspace as pre-approvals, with the owner recorded as the member who approved them. A run workspace starts with no grant on any Mac. Before the merge, `worker/automations/run-capabilities.test.ts` checked the copy against local D1, and a browser check on the dev fake checked the automation page.
- **Task:** On `conductive.build`, in an org with at least one secret, open an automation that you own. Check one secret in Capabilities, save, and reload the page. Use Run now. Open the run workspace, and open its Capabilities.
- **Impact if no action:** A fault between the automation page, the Worker, and a real run workspace stays unseen until a member relies on it.
- **Needs:** The deployed change, an org with a secret, and a connected agent login and GitHub access for the owner.
- **Done when:** After the reload, the secret is still checked, and the line under the prompt names it. The Capabilities of the run workspace show the secret as pre-approved by the owner. In the Mac app, its Mac access switch is off.
