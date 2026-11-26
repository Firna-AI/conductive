# The phone Workspaces way back can open a chat

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/sync-user-and-org-settings-r8nj`, the wider fix of a review finding, and a problem outside its scope.
- **Location:** `src/shell/operator/OperatorPage.tsx:39`, `src/shell/settings/settings-view.tsx`, the `back` of the Settings list, `src/shell/new-workspace/NewWorkspaceScreen.tsx:122`, and the phone pages of `src/shell/automations/`.
- **Reason:** One shared helper changes New workspace, Automations, and the operator section, outside the files of the Settings branch.

- **Terms:**
  - **Way back:** the back button at the top left of a phone page, from the `back` prop of `Page` in `src/shell/layout/Page.tsx`.
  - **Start page:** the page that `/` opens, from `startPage` in `src/app/last-workspaces.ts`: Get started in the first run, else the last workspace that the person opened, else the first org.
- **Background:** Several phone pages have a way back with the label Workspaces. The Settings list now goes to the workspace list of its org, `routes.org(org.id)`, as New workspace does. The operator section still goes to `/`.
- **Problem:** `/` opens the start page, which is the last workspace when one exists. So the Workspaces way back of the operator section opens a chat, not a workspace list. Each page picks its own target, so the label and the target can disagree again.
- **Impact if no action:** An operator on a phone who leaves the operator section lands in a chat and must go back once more.
- **Root question:** Where does the Workspaces way back of every phone page lead?
- **Options:**
  - **A.** Point the way back of the operator section at the workspace list of the org that the palette works on, from `paletteOrg` in `src/app/palette/palette-org.ts`, or at `/` without an org. Add a phone test with a saved last workspace. Effort: Small.
  - **B.** Add one helper beside `Page` for the Workspaces way back of phone pages. It gives the label and the target: the workspace list of the org of the page, else of the palette org, else `/`. The Settings list, New workspace, Automations, and the operator page use it. Effort: Small.
- **Left out:** Keep `/` and change the label to Back. It changes the mockups and `docs/protocol/settings.md`, so it needs the user, and A and B meet the requirement without that.
- **Wider fix:** B. One helper keeps the label and the target of every Workspaces way back together.
- **Previous examples:** Before Settings, the Account page also went back to `/`, and the org settings went back to `routes.org(org.id)`.
- **Recommendation:** B. It fixes the operator section and stops the class.
- **Action:** fix after merge, apply B, because it changes pages outside the files of the Settings branch.
