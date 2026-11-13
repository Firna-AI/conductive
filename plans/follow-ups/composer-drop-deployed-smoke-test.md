# Check a dropped file with deployed agents

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-13, from the post-merge task of the plan `plans/composer-file-drops.md`, which pull request #266 merged on 2026-11-11.
- **Location:** `docs/protocol/message-attachments.md`, `docs/protocol/file-mentions.md`, the deployed app at `conductive.build`, and the agents in a workspace with a ready cloud computer.
- **Reason:** This check needs the deployed change, real agents, and a real cloud computer, and the tests run only in Node with fake servers.

- **Terms:**
  - **Composer:** the message box of a chat, of the New workspace page, or of the New workspace dialog.
  - **Attached file chip:** the chip that a dropped or picked file puts into the text of the composer, at the caret. It shows the kind icon and the name of the file.
  - **Copy path:** the path in the cloud computer where the app copies an attached file before the message goes out: `.context/attachments/<digest>/<safe name>`. The digest is 32 lowercase hexadecimal characters from the file ID only. The user chose this rule as decision 262 D.
  - **Mention:** `@` and a path, such as `@.context/attachments/<digest>/a.png`. The sent text holds one mention for each attached file, at the place of its chip.
- **Background:**
  - Pull request #266 merged on 2026-11-11. A member can now drop files on each composer. Each file shows as a chip in the text at the drop point. A file from the paperclip goes there too.
  - The sent message keeps each chip at its place. A press on a sent chip opens the file tab of the copy path, as a press on a file chip does. The user chose this as decision 264 B on 10 November 2026. All files does not list the copy, so the tab shows "File" until its read names the copy.
  - A sent chip opens nothing while its message has not gone out to the agent, because the copy comes with the turn.
  - The local checks ran the development page in Chrome with fake servers. A drop from the real operating system could not run in headless Chrome, so DOM tests stand for it. No check has yet shown that a deployed agent reads the file at the copy path of its mention.
  - `plans/follow-ups/file-mentions-deployed-smoke-test.md` checks mentions of repository files that a member picks from the `@` list. This item checks attached files, which live outside the repository files under `.context/attachments/`.
- **Task:**
  1. On `conductive.build`, open a chat of a workspace whose cloud computer is ready.
  2. From the desktop of your computer, drag a screenshot onto the composer, between two words of a message. Check that the chip shows at the drop point.
  3. Send a message such as "Describe this picture." Check that the sent message shows the chip at the same place.
  4. Check that the agent reads the picture at the path of the mention, with no question about the path.
  5. Press the chip of the sent message. Check that a file tab opens and shows the picture.
  6. Repeat steps 2 to 5 in a session of an agent powered by Claude and in a session of an agent powered by Codex.
  7. Save notes on each mismatch under the ignored `.context/` directory of the verification workspace, with no credentials.
- **Impact if no action:** A deployed agent that cannot read the copy path gives wrong answers about dropped files, and nobody notices.
- **Needs:** The deployed change, a workspace with a ready cloud computer, valid Claude and Codex logins, and a computer with a desktop to drag a file from.
- **Done when:** Both agents read the dropped file from its mention, and a press on each sent chip opens the file.
