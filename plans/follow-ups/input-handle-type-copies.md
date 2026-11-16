# The ref type of a Firna text input has five copies

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Wider fix.
- **Added:** 2026-11-16, from finding 3 of the review of branch `calummoore/milan-nf3e`, which added the New section dialog.
- **Location:** `src/shell/list/NewSectionDialog.tsx:12`, `src/shell/routines/LoginField.tsx:24`, `src/shell/palette/PaletteControls.tsx:31`, `src/shell/waitlist/CodeField.tsx:13`, and `src/members/InviteSection.tsx:17`.
- **Reason:** The fix changes files outside the New section change, and it does not serve its purpose.

- **Terms:**
  - **`InputHandle`:** the type of the ref that the `inputRef` prop of a `@firna/ui` input takes. A form uses it to focus a field.
- **Background:**
  - `@firna/ui` does not export the handle type of its text input.
  - Each file in **Location** derives it with the same conditional type: `NonNullable<InputFrameProps['inputRef']> extends Ref<infer Handle> ? Handle : never`.
  - `src/shell/palette/PaletteControls.tsx` already exports its copy as `FieldHandle`, but only the palette imports it.
  - `ButtonHandle` in `src/members/ui/actions.tsx` looks the same, but it is the ref type of a Firna button. It is not a copy, so the fix leaves it.
- **Problem:** The same four-line type has five copies, and each new form that focuses a field copies it again.
- **Impact if no action:** A change of the `inputRef` type of `@firna/ui` needs five edits, and the copies can drift apart.
- **Root question:** How does app code get the ref type of a `@firna/ui` text input?
- **Options:**
  - **A.** Change nothing. The type is small and correct. Effort: Small.
  - **B.** Export one `InputHandle` from a shared module in `src/shell/ui/`, beside `Focusable`. Import it in each file and delete the copies. Effort: Small.
  - **C.** Ask `@firna/ui` to export the handle type, and use it in each file. This needs a release of a published package. Effort: Medium.
- **Left out:** None.
- **Wider fix:** B. One shared type that every caller imports removes the copies.
- **Previous examples:** The copies in **Location**.
- **Recommendation:** B. It removes the copies now, with no dependency change.
- **Action:** fix after merge, apply B.
