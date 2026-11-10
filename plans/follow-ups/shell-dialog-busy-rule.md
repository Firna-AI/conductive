# Shell questions close while their write runs

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-09, the wider fix D of finding 53 of branch `calummoore/admin-section-brainstorm`, round 1, split off by its final call.
- **Location:** `Dialog` in `src/shell/ui/Dialog.tsx`, `src/shell/settings/LeaveOrg.tsx`, and the Suspend and Lift questions in `src/shell/operator/TargetDialogs.tsx`.
- **Reason:** The wider fix changes the shared shell part and Leave org outside the diff of that branch, which fixed only its two operator questions.

- **Terms:**
  - **Shell question:** a confirm step of the app shell, drawn with `Dialog` from `src/shell/ui/Dialog.tsx`, a dialog on desktop and a sheet on a phone.
  - **Dismissal:** Cancel, Escape, or a press outside the question, each of which closes it.
- **Background:**
  - Each shell question runs its own write, with `useAction`. `Dialog` closes on Escape and on a press outside. Each question draws its own Cancel.
  - The Suspend and Lift questions of the operator section refuse every dismissal while their write runs, since finding 53.
  - The Leave org question in `src/shell/settings/LeaveOrg.tsx` has no guard. Commit `c6e038c` fixed the same class in the members screens, with `src/members/ui/ConfirmDialog.tsx`.
- **Problem:** A shell question without its own guard closes during its write. A later failure of the write then shows nowhere, and a late close can close a newer question.
- **Impact if no action:** The Leave org question can hide a failed leave, and each new shell question can repeat the defect.
- **Root question:** How does each shell question keep the result of a write that still runs in front of the user?
- **Options:**
  - **D.** Give `Dialog` a required `busy` prop, and let `Dialog` draw Cancel. While `busy` is true, Cancel, Escape, and a press outside change nothing, on desktop and in the phone sheet. Use it in the operator questions and in `LeaveOrg.tsx`. Add a test that holds the leave request and tries each dismissal, as `DeleteOrgSection.dom.test.tsx` does. The Leave org question then stays open while its leave runs. Effort: Small.
  - **G.** One confirmation component for the shell screens and the members screens, built on `src/members/ui/modal.ts`. Every shell question then moves to the modal layer of the browser, and the two style kits merge. Effort: Large.
- **Left out:** A guard in each question alone, because the next question repeats the gap. A guard in `useAction`, because each caller must still connect it to Cancel and to `Dialog`.
- **Wider fix:** D. Each new shell question must give `busy`, and it cannot draw its own Cancel.
- **Previous examples:** Commit `c6e038c` for member removal and org deletion, finding 53 of branch `calummoore/admin-section-brainstorm` for Suspend and Lift.
- **Recommendation:** D.
- **Action:** fix after merge, apply D, because it reaches shared shell code outside that branch, and the operator questions already guard themselves.
