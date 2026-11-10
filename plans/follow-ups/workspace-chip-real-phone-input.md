# Workspace chips on real phone keyboards

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from `calummoore/workspace-link-widget-brainstorm`.
- **Location:** `src/chat/components/Composer.tsx`, `src/shell/new-workspace/Composer.tsx`, `src/shell/new-workspace/NewWorkspaceDialog.tsx`.
- **Reason:** The check needs the deployed editor and real iPhone and Android keyboards.

**Terms:** A workspace chip is the inline label that shows a workspace
number, name, and state in a message box.

**Background:** Conductive turns a pasted workspace link into a chip in
chat and in New workspace. Drafts and messages keep the plain link with
the workspace ID. The user approved this editor on 9 November 2026.
Desktop browser checks cannot prove how each real phone keyboard handles
selection and input methods.

**Task:** On the deployed app, use a real iPhone and a real Android phone.
Copy a workspace link from its number button. Paste it into chat and into
New workspace. Type before and after the chip. Move the caret across it.
Delete the chip with Backspace and Delete where the keyboard provides it.
Try undo and redo. Use an input method that composes text when available.
Check that Enter adds a line on a phone. Send the message and check that
the chip opens the correct workspace. Repeat with a returned draft after
a failed send. Reopen the New workspace form and check its saved draft.

**Impact if no action:** A keyboard or input-method defect can remain
undetected until people use the editor on a phone.

**Needs:** The deployed workspace-chip feature, access to two visible
workspaces in one org, a real iPhone, and a real Android phone.

**Done when:** Both phones pass the actions above. Record the devices,
browser versions, input methods, and results. File a separate defect for
each failed action.
