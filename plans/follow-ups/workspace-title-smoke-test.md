# Check the workspace title on the deployed app

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-09, from the post-merge follow-up of the workspace title change on the branch `calummoore/chat-title-rename`.
- **Location:** `wrangler.jsonc` (the `AI` binding), the Worker variable `CONDUCTIVE_TITLE_MODEL`, and `worker/chat/title-model.ts`.
- **Reason:** The check needs the deployed Worker with Workers AI on, and the branch had no Cloudflare credentials.

- **Terms:**
  - **Workers AI:** the model service of Cloudflare. The Worker calls it through the `AI` binding, on the Cloudflare account that hosts the app.
  - **Title model:** the Workers AI model that `CONDUCTIVE_TITLE_MODEL` names. It writes the name of each new workspace from its first message.
- **Background:** The user chose on 8 November 2026 that the Worker asks a small Workers AI model for the name of each new workspace when it accepts the first message (decision 184 C), and on 9 November 2026 that a new workspace and each new session have no name and show "Untitled" until an automatic name fills them (decisions 182 G and 185 B). `docs/deployment.md`, under "The title model", says how to set the binding and the variable. Without them, a new workspace keeps no name, and the Worker logs a warning. The tests of the branch used a fake model, so no real Workers AI call ran.
- **Task:** Turn on Workers AI for the Cloudflare account. Choose a small, fast text model from the Workers AI catalogue, and set its ID in `CONDUCTIVE_TITLE_MODEL`. Deploy the Worker. Then create one workspace with Claude and one with Codex, each with a clear first message.
- **Impact if no action:** Every new workspace on the deployed app stays "Untitled".
- **Needs:** The deployed change, and access to the Cloudflare account of the app.
- **Done when:** Each new workspace shows "Untitled" for about a second, then a name of three to five words from its first message, while its sandbox still starts. The first session tab shows the same name. The Worker log shows no title warning.
