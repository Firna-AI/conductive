# Focus helpers find package controls by selector

- **Severity:** Low. **Effort:** Medium. **Confidence:** High. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from the branch `calummoore/conductor-internal-tools-410`, review round 1: finding 3, and a problem outside the scope of its check.
- **Location:** the selector fallback of `useInlineFormFocus` in `src/shell/ui/inline-form.ts`, the `initial` fallback of `useLayerFocus` in `src/shell/ui/Overlay.tsx:206`, `focusableSelector` in `src/shell/ui/Overlay.tsx:18`, the switch of `AgentConnectForm` in `src/shell/account/AgentConnectForm.tsx`, and the `futex-ai/ui` repository.
- **Reason:** The switch has no focus handle in `@firna/ui`, so the fix needs a new release of that library.

- **Terms:**
  - **`@firna/ui`:** the user's shared component library, published from the `futex-ai/ui` repository. The app pins 4.0.0. 5.1.0 is the newest release.
  - **Inline form:** a form that takes the place of the button that opens it, such as the Connect form of an agent. `useInlineFormFocus` gives it the focus after a press.
  - **Layer:** a menu, a sheet, or a dialog. `useLayerFocus` moves the focus into it as it opens.
- **Background:**
  - `useInlineFormFocus` takes the target that a form names as `initial`. Without one, it focuses the first element that `focusableSelector` finds in the form. The Change form of a variable, Add variable, and the ChatGPT sign-in name their targets. The Connect form of a secret names none, so the fallback finds the selected segment of the `SegmentedControl` of `@firna/ui`, the switch of the login kind.
  - `useLayerFocus` falls back to `[data-autofocus]` and then to the same selector. So each dialog without `initial`, such as `LeaveOrg` and `DeleteRoutine`, focuses a `@firna/ui` button that it finds in the markup of the package.
  - The `typescript` skill says that product code does not find the elements of another component or package through selectors.
  - `@firna/ui` gives a focus handle for its fields, `inputRef`, and for its buttons, `buttonRef`. `SegmentedControl` has none, also in 5.1.0.
- **Problem:** Both helpers depend on the markup and the order of package controls to place the focus.
- **Impact if no action:** A change of the markup of `@firna/ui` can move the first focus of a form or a dialog with no change in this repository.
- **Root question:** How does a form or a layer name its first focus through the interfaces of its parts?
- **Options:**
  - **A.** Add a focus handle to `SegmentedControl` in `futex-ai/ui`, and release it. Give the switch of the Connect form that handle as `initial`. Give each dialog its first button through `buttonRef`. Remove both selector fallbacks. Effort: Medium.
  - **B.** Use controls that the app owns, with refs, for these targets. Effort: Medium.
  - **C.** Make the Connect form itself its first target, with a tabindex of -1 and a group name, and give each dialog its own target. This moves the first focus off the switch, which option B of the user's choice of 11 November 2026 named. Effort: Small.
- **Left out:** Another selector, such as `[role="radio"][tabindex="0"]`: it keeps the same dependency. A package export that finds the first tab stop: it keeps the order rule.
- **Wider fix:** Already in force: the `typescript` skill rule.
- **Previous examples:** `plans/follow-ups/login-field-keyboard-model.md` records the same dependency on package markup.
- **Recommendation:** A. A public handle keeps the switch as the target and removes the dependency.
- **Action:** fix after merge, apply A, because it needs a new release of `@firna/ui`.
