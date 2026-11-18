# Smoke-test temporary file tabs after deploy

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-13, from the post-merge section of the plan for temporary file tabs on branch `calummoore/oslo-k1ce`.
- **Location:** None.
- **Reason:** The test needs the merged change on the deployed app at `conductive.build`, which a push to `main` deploys.

- **Terms:**
  - **Temporary tab:** the one file or diff tab of the tab row of a workspace that the next press on a file replaces. Its title shows in italics. `docs/protocol/temporary-tabs.md` states its rules.
  - **Kept tab:** a file or diff tab that is not temporary. It stays until the user closes it.
- **Background:** The temporary file tabs change makes a press on a file in All files, in Changes, or on a file chip open the file in one temporary tab. The next press replaces it in its place. A double-click on the file row or on the tab keeps it. Keep open in the tab menu of the temporary tab, and a move of that tab to another place, also keep it. The saved view of the member on the Worker marks the temporary tab, so a reload keeps the mark. Tests and a smoke test on the local dev app passed before the merge.
- **Task:** On the deployed app, open a workspace with files. Then check each step:
  1. A press on a file opens it in a tab with an italic title.
  2. A press on a second file replaces that tab in its place.
  3. A double-click on a file row keeps the tab, and its title turns upright.
  4. A double-click on a temporary tab keeps it.
  5. A reload keeps the temporary tab and its italic title.
- **Impact if no action:** A fault that only the deployed Worker or the real saved view shows can stay hidden until a member meets it.
- **Needs:** The merged change on the deployed app, and a sign-in to an org with a workspace that has files.
- **Done when:** Each step above works on the deployed app, or a new follow-up item records each step that fails, with what it showed.
