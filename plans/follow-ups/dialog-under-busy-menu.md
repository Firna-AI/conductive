# A dialog opens under a busy owner menu

- **Severity:** Medium. **Likelihood:** Rare. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, from branch `calummoore/command-palette-mockups`, review round 1, a new problem of the check of finding 2.
- **Location:** `src/shell/ui/Dialog.tsx:33`, and the owner menu of `src/members/OwnerPicker.tsx:117`.
- **Reason:** `origin/main` already has the problem, and the command palette branch did not change it.

- **Terms:**
  - **Owner menu:** the menu of the workspace header where an admin reassigns the workspace to another member.
  - **Busy menu:** a members menu while its change runs. It stays open, and Escape, a press outside, and Tab do nothing, as `src/members/README.md` says.
- **Background:** The owner menu opens in the browser's top layer, above every box of the page. While its change runs, it stays open, so the person sees how the change ends. A shell dialog drawn with `src/shell/ui/Dialog.tsx` opens in the overlay of the frame and makes the rest of the frame take no input.
- **Problem:** When a person opens a shell dialog while the owner change runs, the dialog draws under the busy owner menu. The menu sits in the frame, so it also takes no input. The person then sees two layers, and neither works fully.
- **Impact if no action:** In this rare case the person can not finish or read the owner change until the dialog closes.
- **Root question:** What happens to the page while a busy menu shows the end of its change?
- **Options:**
  - **A.** A busy menu holds the page while its change runs, as a busy question does. It counts as a modal layer, so no press outside opens a dialog, another page, or the command palette. It changes how the page behaves during the change. Effort: Medium.
  - **B.** Shell dialogs open in the top layer, for example with `showModal()`, above the busy menu. The menu stays inert under the dialog until the dialog closes. Effort: Medium.
  - **C.** The owner menu closes at once after a choice, as the role menu does. The owner button shows its spinner until the change ends, and a failed change shows a notice next to the button. It overrides the busy rule of `src/members/README.md`, and it needs a mockup state. Effort: Medium.
- **Left out:** Change nothing, because the two layers then stay in conflict.
- **Wider fix:** A. One rule then keeps every layer, also a later one, from opening over a busy menu.
- **Previous examples:** Commit `c6e038c` made busy menus stay open. The command palette branch stops its own key and Search row while a menu refuses to close.
- **Recommendation:** A. It extends the rule that the palette now follows to every layer.
- **Action:** ask the user, because A changes how the page behaves while a change runs.
