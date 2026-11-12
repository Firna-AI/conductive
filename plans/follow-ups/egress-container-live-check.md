# Check ChatGPT turns through the egress container

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from branch `calummoore/untitled-v6`.
- **Location:** the deployed Workers `conductive` and `conductive-chatgpt-egress`, and the proxy log on Cal's Mac at `~/.conductive-egress/proxy.log`.
- **Reason:** the check needs the merged main Worker with its `CHATGPT_EGRESS` service binding.

- **Terms:**
  - **Egress container:** the Cloudflare container of the Worker `conductive-chatgpt-egress`. It sends the ChatGPT requests of the model gateway to OpenAI, because OpenAI refuses them from a Worker.
  - **Mac proxy:** the earlier egress proxy on Cal's Mac, behind the named Cloudflare Tunnel `chatgpt-egress.conducting.build`. The main Worker uses it only without the binding.
- **Background:** Before the merge, a temporary Worker with the same binding got OpenAI's normal 401 JSON reply through the container for a fake token, and a request for another origin got HTTP 400. No real Codex turn has run through the container yet.
- **Task:**
  1. After the deploy of the merge, start a Codex turn on a ChatGPT plan in a workspace.
  2. Run `npx wrangler tail conductive-chatgpt-egress` during the turn, or read the Workers logs of that Worker.
  3. Check that the turn answers, and that the requests reach the egress Worker.
  4. Check that `~/.conductive-egress/proxy.log` on Cal's Mac shows no new request.
- **Impact if no action:** A fault of the container path shows only when a user's ChatGPT-plan turn fails.
- **Needs:** The merged and deployed change, and a connected ChatGPT plan.
- **Done when:** A Codex turn on a ChatGPT plan answers, the egress Worker logs its requests, and the Mac proxy logs none.
- **Related:** `plans/follow-ups/retire-mac-egress-proxy.md` waits for this check.
