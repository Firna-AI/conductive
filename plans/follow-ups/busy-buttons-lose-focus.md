# Busy buttons lose keyboard focus

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-12, from `calummoore/riga-88hp`, review finding 5.
- **Location:** `src/chat/ui/actions.tsx`, `src/shell/settings/EnvVarsSection.tsx:76`, `src/shell/account/shortcuts/RowButtons.tsx:90`.
- **Reason:** The wider fix changes a shared button outside the diff of the branch, and the shell buttons need their own check.

- **Terms:**
  - **Busy button:** a Firna button with `busy`. It shows a spinner, sets `aria-busy`, and blocks presses, but stays focusable.
  - **Chat `ActionButton`:** the compact button in `src/chat/ui/actions.tsx`. It passes `busy` and `disabled` to the Firna `Button`.
- **Background:** A browser moves the focus away from a button that gets the native `disabled` attribute. The shell `ActionButton` in `src/shell/ui/actions.tsx` has `keepFocus` for this reason. The chat `ActionButton` passes `disabled` straight through. So a caller that sets both `busy` and `disabled` on the pressed button takes the focus away from it. The branch `calummoore/riga-88hp` fixed this for the Keep and Stop buttons of `src/chat/device/AllowAllBar.tsx`: only the other button is disabled.
- **Problem:** Any caller of the chat `ActionButton` can still set `busy` and `disabled` together. `src/shell/settings/EnvVarsSection.tsx:76-77` and `src/shell/account/shortcuts/RowButtons.tsx:90-91` do the same with their busy buttons.
- **Impact if no action:** A keyboard or screen-reader user who presses such a button loses the focus and does not hear the busy state.
- **Root question:** How does a pressed button keep the focus while it waits, in every place?
- **Options:**
  - **A.** Fix each caller: disable only the buttons that the user did not press. Effort: Small.
  - **B.** The chat `ActionButton` never natively disables a busy button: `disabled={props.disabled && !props.busy}`. Firna `busy` already blocks presses. Then check the two shell callers. Effort: Small.
  - **C.** Port `keepFocus` of the shell `ActionButton` to the chat one. Effort: Medium.
- **Left out:** Remove `disabled` from busy buttons in every caller by hand with no shared rule. A, with no structure that stops a new case.
- **Wider fix:** B. A default in the shared button removes the case for every chat caller.
- **Previous examples:** `keepFocus` in `src/shell/ui/actions.tsx`. The bar fix in `src/chat/device/AllowAllBar.tsx` on `calummoore/riga-88hp`.
- **Recommendation:** B. One default protects every chat caller, and the two shell callers get a direct fix.
- **Action:** fix after merge, apply B, because it changes shared buttons outside that branch.
