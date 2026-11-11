# Delete of a variable drops the focus

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-410`, while the focus of the inline forms was fixed.
- **Location:** `EditableEnvVarRow` and `EnvVarsEditor` in `src/shell/settings/EnvVarsSection.tsx`, and `InviteRow` in `src/members/MemberList.tsx`.
- **Reason:** Delete opens no form, so the user's choice for inline forms does not cover it, and no requirement says where the focus goes after a delete.

- **Terms:**
  - **Env var editor:** the Environment variables section of the Cloud computer tab of the org settings, where an admin adds, changes, marks, and deletes variables.
  - **Inline form:** a form that takes the place of the button that opens it. `useInlineForms` in `src/shell/ui/inline-form.ts` gives the form the focus and gives the focus back to the button.
- **Background:**
  - Each row of the env var editor has a Delete button, named "Delete" and the name of the variable. A press deletes the variable at once, and its row leaves the list.
  - On 11 November 2026 the user chose one shared helper for each inline form that replaces its button. Delete opens no form, so that helper does not place the focus after a delete.
  - A check in Chrome against `npm run dev` showed the problem: on `/orgs/acme/settings/cloud-computer`, Enter on "Delete DATABASE_URL" left the focus on the page.
  - The Remove button of an agent login does not have the problem. React keeps its button, which then shows Connect, so the focus stays on it.
  - The cancel button of an open invite in `InviteRow` also leaves the page with its row. Nobody checked where the focus goes after it.
- **Problem:** The pressed Delete button leaves the page with its row, so the focus falls to the page.
- **Impact if no action:** Keyboard and screen reader users lose their place after each Delete of a variable, and must start again from the top of the page.
- **Root question:** Where does a keyboard user continue when a press removes the row that held the focus?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** After a Delete of a variable, give the focus to the Delete button of the next row. Without a next row, give it to the row before, and without rows, to Add variable. Effort: Small.
  - **C.** After a Delete of a variable, give the focus to the heading of the Environment variables section, which takes the focus as a part that is no control. Effort: Small.
  - **D.** Build one shared helper for each press that removes its own row, as B behaves. Use it first for Delete of a variable, then for the cancel of an invite. Effort: Medium.
- **Left out:** A question before each Delete, whose dialog gives the focus back to its trigger: Delete acts at once in the mockups, and the question adds a step.
- **Wider fix:** D.
- **Previous examples:** `useInlineForms` in `src/shell/ui/inline-form.ts` for the inline forms, and `useRowFocus` in `src/shell/list/useRowFocus.ts`, which keeps the focus on a workspace row that a render replaced.
- **Recommendation:** D. It fixes Delete of a variable at about the cost of B, and the cancel of an invite can use it too.
- **Action:** ask the user, because no requirement says where the focus goes after a delete, and the user's choice of 11 November 2026 covers only inline forms.
