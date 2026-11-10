# Check file mentions with deployed agents

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-10, from branch `calummoore/file-selector-list`, the post-merge task of its plan.
- **Location:** `docs/protocol/file-mentions.md`, the deployed app at `conductive.build`, and the agents in a workspace with a ready cloud computer.
- **Reason:** this check needs the merged and deployed change and real agents in a cloud computer.

- **Terms:**
  - **Mention:** `@` and the path of a file or a folder inside the repository, such as `@src/app.ts`. The path of a folder ends with `/`, such as `@src/lib/`. A path with a space goes in double quotes, such as `@"docs/My notes.md"`.
  - **List of `@`:** the list of files and folders that opens above the composer of a workspace chat when the member types `@`. Its rows come from the file tree that the workspace keeps, the files and folders that All files shows.
  - **File chip:** the chip that a pick from the list puts into the message field. It shows the icon and the name of the entry. The sent message shows the same chip.
- **Background:** The user chose on 9 November 2026 that the agent gets the path inside the repository, not an absolute path. The draft, the stored message, and the text that the agent gets hold the same mention, and nothing rewrites it. This works because both agents, powered by Claude and by Codex, start in the repository folder, and their instructions name that folder. `docs/protocol/file-mentions.md` holds these rules. The tests run in Node with fake servers, and the local check ran the development page in Chrome. No check has yet shown that a deployed agent reads a mention as the exact file or folder.
- **Task:**
  1. On `conductive.build`, open a workspace whose cloud computer is ready and whose repository has a folder with files.
  2. In a session of an agent powered by Claude, type `@` and a part of a file name. Pick the file. Type `@` again, and pick a folder. Send a message such as "What is the first line of the file, and which files are in the folder?" with the two chips in it.
  3. Check that the sent message shows a chip for the file and for the folder. Press the file chip and check that the right column shows the file, as a press on the file in All files does. Press the folder chip and check that All files shows the folder open.
  4. Check that the agent reads the picked file and lists the picked folder, with no question about the path.
  5. Repeat steps 2 to 4 in a session of an agent powered by Codex.
  6. On a phone, type `@`, pick a file, and check that the chip in the message field shows its × at the end. Press the ×, and check that the chip goes away.
  7. Save notes on each mismatch under the ignored `.context/` directory of the verification workspace, with no credentials.
- **Impact if no action:** A deployed agent that reads the repository path in another way, such as from another folder, gives wrong answers about the files that members pick, and nobody notices.
- **Needs:** The merged and deployed change, a workspace with a ready cloud computer and a repository, valid Claude and Codex logins, and a phone or a phone emulation of a browser.
- **Done when:** Both agents read the picked file and the picked folder from their mentions. The chips of the sent message open the file and the folder. On a phone, the × at the end of a chip removes it.
