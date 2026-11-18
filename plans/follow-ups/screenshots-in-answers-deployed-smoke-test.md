# Check deployed screenshots in agent answers

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-18, from the post-merge follow-up of the plan `plans/screenshots-in-answers.md`, branch `calummoore/screenshots-prompts-imnj`.
- **Location:** the screenshot line in `crates/cnd-runner/src/engine/instructions.rs`, the picture in `src/chat/links/FilePicture.tsx`, the reader in `src/files/page/picture-reads.ts`, and the rules in `docs/protocol/agent-instructions.md` and `docs/protocol/file-mentions-answers.md`.
- **Reason:** This check needs a new runner in a real cloud computer, so that a new session gets the new instructions, and the deployed app.

- **Terms:**
  - **Context folder:** `.context/` at the top of the workspace repository. Git ignores it, and agents keep notes and screenshots there.
  - **Picture in an answer:** a Markdown image `![label](path)` of a PNG, JPEG, GIF, or WebP file of the workspace, which the chat shows as a small picture.
- **Background:** The agent instructions of each new session say: "When you design or check an interface in a browser, save a screenshot of the result as a PNG file in the context folder. Show it in your reply as a Markdown image." The chat shows such an image as a picture, up to the width of the answer and 240 CSS px high. It reads the file through the file read route of the file tab, only while the cloud computer runs, and never starts or resumes it for a picture. Until the read ends, a box with the label shows. Without a running cloud computer, after a failed read, or for bytes that the browser cannot draw, the image shows as a link. A press on the picture opens the file tab. Headings, table cells, and closed message lines in the work of a turn keep the link. Existing sessions keep their saved instructions. The tests use a fake reader and the development page, so no check before the merge ran a real agent.
- **Task:**
  1. In the deployed app, open a workspace whose cloud computer runs the new runner. Start a new session.
  2. Ask the agent to start the app of the repository and check one page in the browser.
  3. Confirm that the answer shows a screenshot from `.context/` as a picture, after a short loading box.
  4. Press the picture. Confirm that the file tab opens the picture.
  5. Stop the cloud computer. Confirm that the picture becomes a link and that no resume starts.
  6. Repeat steps 3 and 4 at a phone width.
  7. Save the results and screenshots under the git-ignored `.context/` folder of the workspace that runs this check. Record each needed fix in its own follow-up item.
- **Impact if no action:** A fault in the real agent or the deployed reader stays hidden until a member reports it.
- **Needs:** The merged change on the deployment at `app.conductive.build`, and a cloud computer with the new runner.
- **Done when:** A new session's answer shows its screenshot as a picture, a press opens the file tab, and a stopped cloud computer shows the link with no resume.
