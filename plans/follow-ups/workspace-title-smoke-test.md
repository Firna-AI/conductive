# Check the workspace title on the deployed app

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge follow-up of the workspace title change on the branch `calummoore/chat-title-rename`. Updated on 2026-11-10 by branch `calummoore/workspace-name-underscores`, which changes each underscore of a title from the title model to a space.
- **Location:** `wrangler.jsonc` (the `AI` binding), the Worker variable `CONDUCTIVE_TITLE_MODEL`, `worker/chat/title-model.ts`, and `worker/chat/title-text.ts`.
- **Reason:** The check needs the updated Worker to be deployed and a signed-in member with both agent logins.

- **Terms:**
  - **Workers AI:** the model service of Cloudflare. The Worker calls it through the `AI` binding, on the Cloudflare account that hosts the app.
  - **Title model:** the Workers AI model that `CONDUCTIVE_TITLE_MODEL` names. It writes the name of each new workspace from its first message.
- **Background:** The user chose on 8 November 2026 that the Worker asks a small Workers AI model for the name of each new workspace when it accepts the first message, and on 9 November 2026 that a new workspace and each new session start with no name and show "Untitled" until an automatic name fills them. `wrangler.jsonc` now supplies the `AI` binding and `CONDUCTIVE_TITLE_MODEL`. The title reader accepts both a direct text response and a chat completion response. A real binding check with synthetic text returned a title from the configured model. The remaining check must verify the full path from a first message to the workspace list and the first session tab. The model wrote names such as `add_conductive_app`, although its prompt asked for plain words separated by spaces. So the user chose on 10 November 2026 that the title request asks for no underscores, and that the Worker changes each underscore of the answer to a space.
- **Task:** Deploy the Worker. Then create one workspace with Claude and one with Codex, each with a clear first message.
- **Impact if no action:** A deployment fault could leave new workspaces "Untitled" without being detected.
- **Needs:** The deployed change, a signed-in app member with both agent logins, and access to the Worker logs.
- **Done when:** Each new workspace shows "Untitled" for about a second, then a name of three to five words from its first message, while its sandbox still starts. The name has spaces between its words and no underscores. The first session tab shows the same name. The Worker log shows no title warning.
