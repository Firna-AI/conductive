# A failed read hides the chosen secrets

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-18, from branch `calummoore/add-capabilities-to-routines-2bld`, finding 2 of its second review.
- **Location:** `src/shell/automations/RunSecrets.tsx:17` (`useChosenSecretNames`) and `src/shell/automations/RunSecrets.tsx:44` (`RunSecrets`).
- **Reason:** The case needs the page's own first read of the org secrets list to fail, and the fix rule defers a rare product bug that is not High.

- **Terms:**
  - **Automation:** a saved prompt that starts an agent in a new run workspace on each trigger, with no person present.
  - **Chosen secrets:** the org secrets that the owner of an automation checks in its Capabilities. Each run workspace starts with them pre-approved.
  - **Secrets list:** the list of the org's secrets, without values, that `useOrgModel(orgId).secrets` reads from the Worker.
- **Background:**
  - The automation reply holds only the IDs of the chosen secrets, in `capabilities.preapprovedSecretIds`.
  - The page reads the secrets list to show their names. `useChosenSecretNames` reads it when a chosen ID has no name in the list.
  - Under the prompt, every member reads a line that names the chosen secrets. While the automation has a pull request trigger, a hint follows it. The hint says that text in a pull request can steer the agent to use these secrets. `docs/protocol/automations.md` ("The automation pages") requires both.
  - A list that loaded once keeps its value after a later failed read.
- **Problem:** When the page's first read of the secrets list fails, the hook gives an empty list. The line and the hint then hide, with no error and no Try again. The IDs stay missing, so the effect does not read again.
- **Impact if no action:** After a temporary failure, members do not see which secrets the runs use or the pull request warning, until they reload or leave the page.
- **Root question:** How does every member who opens an automation see its chosen secrets and the pull request hint, also after a request of the page fails?
- **Options:**
  - **A.** Keep the `Loadable` state of the list through the hook. After a failed read, show the shared `LoadFailure` notice with Try again under the prompt. Add a mockup state and a screen test that fails the first read, retries, and checks the names and the hint. Effort: Medium.
  - **C.** Put the names of the chosen secrets in the automation reply, beside `runLogin`, from the Worker's join with `org_secrets`. The line and the hint then need no second read. In the owner's form, a newly checked secret takes its name from the list that the open control has loaded. It changes the shared response type, the Worker reply, the app reader, the dev fake, and their tests. Effort: Medium.
  - **D.** Read the secrets list as a watched part of the org, as the page reads its repositories and members, with the notice of A while a failure stays. The page then reads the list at each focus, also when every name shows. Effort: Medium.
  - **E.** A, and keep the pull request hint under the failure notice while the automation has a chosen secret and a pull request trigger. Effort: Medium.
- **Left out:** Change nothing, because it fails the goal. Automatic retries alone, because they give no notice while a failure lasts. A new Worker route that returns only the names, because it is one more request that can fail, so C is better on every point.
- **Wider fix:** None. The `product-ui` rule for explicit error states is already in force, and no option prevents the class when the detail changes shape.
- **Previous examples:** `plans/follow-ups/automation-page-repository-list-failure.md`, the same failed first read of the repository list on this page.
- **Recommendation:** C. It removes the failed state for every member instead of drawing it, and it needs no new UI state or mockup.
- **Action:** fix after merge, apply C, because the case needs a rare failed first read and the fix is not High or harder after the merge.
