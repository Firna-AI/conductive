# Parts of an inline form cannot claim the first focus

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-410`, review round 1, the wider fix E of finding 1, split off the fix.
- **Location:** `useInlineFormFocus` in `src/shell/ui/inline-form.ts`, `AgentConnectForm` in `src/shell/account/AgentConnectForm.tsx`, `ChatGptSignIn` in `src/shell/account/ChatGptSignIn.tsx`, and `useStepFocus` in `src/shell/account/step-focus.ts`.
- **Reason:** Only one part, the ChatGPT sign-in, needs it today, so the fix waits until a second part does or until a branch touches these files.

- **Terms:**
  - **Inline form:** a form that takes the place of the button that opens it, such as the Connect form of an agent on the account page.
  - **First focus:** the place of the keyboard focus when a press of its button opens an inline form. `useInlineFormFocus` places it, as its one owner.
- **Background:**
  - On 11 November 2026 the user chose one shared helper for each inline form. `useInlineFormFocus` gives the form the focus only after a press of its button. A form that opens with its page takes no focus.
  - The ChatGPT sign-in, a part of the Connect form, wants the first focus on its first line. Its own hook, `useStepFocus`, used to move the focus there as it showed, also when the form opened with its page. Review finding 1 of that branch found this.
  - The fix made the helper the one owner: `AgentConnectForm` makes the ref of the first line, passes it to `ChatGptSignIn`, and passes it to the helper as `initial`. `useStepFocus` skips the start step.
- **Problem:** A part that wants the first focus needs its parent form to know it and pass its ref. A new part that moves the focus by itself as it shows brings the bug of finding 1 back.
- **Impact if no action:** Each new part of an inline form needs a change in its parent, and a part that skips that rule takes the focus on a page open.
- **Root question:** How does a part of an inline form claim the first focus without its parent knowing the part?
- **Options:**
  - **A.** Change nothing. Each parent passes the ref of the part. Effort: Small.
  - **E.** The form gives its parts a context. A part registers its wanted first target through the context in a layout effect. The helper focuses that target after a press, and otherwise does what it does now. Effort: Medium.
- **Left out:** A guard in the helper that takes the focus back after a part moved it: React runs the effect of the part first, so a screen reader can already read the moved focus. Each part keeps its own copy of the rule: the effect order then still decides.
- **Wider fix:** E.
- **Previous examples:** `useStepFocus` before the fix of finding 1, on the branch of pull request #177.
- **Recommendation:** E. One owner reaches each part that registers, and the parent does not need to know the part.
- **Action:** fix after merge, apply E, because it adds a shared interface that only one part uses today, and the direct fix already gives the helper the one ownership.
