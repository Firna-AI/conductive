# Check the section order on the deployment

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-13, from the plan of branch `calummoore/oslo-tq4m`.
- **Location:** None.
- **Reason:** The check needs the merged change on the test deployment.

- **Terms:**
  - **Section:** a named group of workspaces in the workspace list of an org. General is the default section.
- **Background:** A member moves a section by a drag of its name, by a long press on a phone, or by Move section up and Move section down in its menu. The Worker keeps one order for the whole org. The tests and a browser check with the fake API of `npm run dev` checked the drag and the menu. That fake keeps no state across a reload, so no check read the order back from the real Worker.
- **Task:** On `conductive.build`, open an org with three sections. Drag the last section to the top, then use Move section down on General. Reload the page. Open the same org as a second member, or on a phone.
- **Impact if no action:** A fault of the real write or read of the order, such as an order that the Worker does not keep, stays unseen until a user meets it.
- **Needs:** The merged change on the test deployment, which each push to `main` deploys.
- **Done when:** After the reload, and for the second member, the sections show in the order that the moves made.
