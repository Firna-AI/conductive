# Check chat headings on the test deployment

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-11, from branch `calummoore/markdown-heading-support`, the post-merge task of its plan.
- **Location:** None.
- **Reason:** the check needs the merged change on the test deployment at `conductive.build`.

- **Background:** The chat now draws the Markdown headings of agent messages at six levels, each with its own size, as `docs/protocol/chat-markdown.md` says in "Headings". The chat answer and the file preview take their heading look from `docs/mockups/src/components/common/MarkdownHeadings.module.css`. The tests and a smoke test on the chat development page passed before the merge. A push to `main` deploys to `conductive.build`, as `docs/automatic-deploys.md` says.
- **Task:** After the deploy, open a workspace on `conductive.build`. Ask an agent for an answer with `##` and `###` headings and bold labels under them, such as a list of decisions. Check that each heading draws at its level, with its own size, and that a message line of the folded work shows a heading in bold. Open a Markdown file with headings in the file preview, and check that its headings have the same look.
- **Impact if no action:** A difference between the deployed chat and the tested build stays unseen until a user meets it.
- **Needs:** the merged change on `conductive.build`, and a workspace with a connected agent login.
- **Done when:** a real agent answer on `conductive.build` shows its headings as the mockup page `app/chat/headings` draws them.
