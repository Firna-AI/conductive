# The read-only text of a routine does not show Fast

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Open decision.
- **Added:** 2026-11-13, from Milestone 5 of the fast mode plan on branch `calummoore/bern-mapm`. It was item 2 of the report to the user on 2026-11-12 and had no answer at the merge.
- **Location:** `src/shell/routines/PromptBox.tsx:78` (`PromptFacts`).
- **Reason:** The recommended option adds visible text that no requirement or mockup covers, so it waits for the user.

- **Terms:**
  - **Routine:** saved work that runs on a schedule or on demand, on the login of its owner.
  - **Fast mode:** the faster, pricier serving mode of a provider, chosen with the Fast switch of the model menu.
- **Background:**
  - The owner of a routine edits its choice in the model picker, which reads "Opus 5.5 High Fast" when fast mode is on.
  - Every other member sees the choice only as text, such as "Opus 5.5 High".
  - The naming rule in `docs/protocol/agents-and-sessions.md#names-in-the-product` covers only the picker.
  - A tested patch for option B exists in the workspace of the fast mode branch, at `.context/fast-mode/m5/held/`, outside Git.
- **Problem:** A member who reads a fast routine sees no sign that its runs use fast mode.
- **Impact if no action:** Members can think that the runs use standard speed. The runs use the owner's login, so the reader pays nothing.
- **Root question:** What does a member who cannot edit a routine see of its fast mode?
- **Options:**
  - **A.** Change nothing. Effort: Small.
  - **B.** Show "Fast" after the effort, in the same muted colour, as the trigger does. Add one sentence to `docs/protocol/routines.md`. Effort: Small.
  - **C.** Do B, and first draw a fast routine in the mockups at `app/routines`. Effort: Medium.
- **Left out:** A separate badge or line for fast mode. B is better on every point: it uses the words of the picker, and the user asked on 2026-11-11 for no extra text about fast mode.
- **Wider fix:** None. This is one view.
- **Previous examples:** None found.
- **Recommendation:** B. The reader sees the same words as the owner. C also keeps the mockups complete.
- **Action:** ask the user, because B adds visible text that no requirement or mockup covers.
