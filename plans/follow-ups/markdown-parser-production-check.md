# Check the Markdown parser in production

- **Kind:** Post-merge task.
- **Added:** 2026-11-20, from branch `calummoore/output-summary-f7sm`, the post-merge follow-up of the plan "One Markdown parser for the chat and the file preview".
- **Location:** the chat and the Markdown file preview at `conductive.build`.
- **Reason:** the check needs the deployed change.

- **Background:** the chat and the Markdown file preview read Markdown with one `markdown-it` parser. The mockups `app/chat/formatting`, `app/chat/tables`, `app/chat/lists/tasks`, and `app/files/markdown` show the look.
- **Task:** open a long agent answer with a table, a quote, a task list, and a `<br>` in a table cell in production, in the light and the dark scheme. Open a Markdown file with the same parts in the file preview. Check that each shows as the mockups show.
- **Impact if no action:** a difference between the app and the mockups that the tests do not catch stays unseen.
- **Needs:** the merge and the deploy of the change.
- **Done when:** both views show each part as the mockups show, or each difference has its own follow-up item.
