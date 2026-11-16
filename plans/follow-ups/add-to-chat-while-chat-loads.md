# Protocol lacks the Add to chat rule while loading

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-16, from branch `calummoore/perth-6s0l`, an implementation question of the file row menu.
- **Location:** `docs/protocol/file-row-menu.md` (section "Add to chat"), `src/shell/workspace/files/add-to-chat.ts`.
- **Reason:** The rule adds a requirement to a protocol doc, and the user reviews each new requirement.

- **Terms:**
  - **Row menu:** the menu of a row of All files or Changes in the Files panel, with Add to chat, a line, and Copy path.
  - **Add to chat:** the row menu item that puts the chip of a file or a folder into the message field of the session that the member saw last, or of a new session.
- **Background:**
  - The file lists of a workspace can show before its chat loads. Until the chat loads, the app does not know the session tabs, and it shows no message field.
  - `useAddToChat` in `src/shell/workspace/files/add-to-chat.ts` leaves Add to chat out of the row menu until the chat snapshot reports `load.state === 'ready'`. After a failed load, the item also stays out. Copy path stays.
  - `docs/protocol/file-row-menu.md` names only one reason to leave the item out of every row: a bar of the cloud computer that takes the place of the message field.
- **Problem:** The code leaves Add to chat out while the chat loads and after a failed load, but no protocol doc states this rule.
- **Impact if no action:** The protocol does not explain a short gap in the menu when a workspace opens.
- **Root question:** What does the row menu offer before the chat knows its session tabs?
- **Options:**
  - **A.** Add one sentence to "Add to chat" in `docs/protocol/file-row-menu.md`: the item shows only after the chat loads. Keep the code. Effort: Small.
  - **B.** Change nothing. The code keeps the rule without a protocol sentence. Effort: Small.
  - **C.** Show the item while the chat loads, and make a press wait for the load. A failed load then needs its own rule. Effort: Medium.
- **Left out:** A press that runs at once while the chat loads, because it can start an extra session when session tabs exist.
- **Wider fix:** None. The rule follows the existing rule for the bar of the cloud computer.
- **Previous examples:** The rule for the bar of the cloud computer in `docs/protocol/file-row-menu.md`, section "Add to chat".
- **Recommendation:** A. The protocol docs hold the requirements in force, and the code already follows this rule.
- **Action:** ask the user, because option A adds a requirement to a protocol doc, and no recorded user decision covers it.
