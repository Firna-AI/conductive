# Retire the Mac egress proxy

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-12, from branch `calummoore/untitled-v6`.
- **Location:** the secrets `CHATGPT_EGRESS_URL` and `CHATGPT_EGRESS_SECRET` of the Worker `conductive`, the LaunchAgents `build.conductive.chatgpt-egress-proxy` and `build.conductive.chatgpt-egress-tunnel` on Cal's Mac, the folder `~/.conductive-egress`, and the Cloudflare Tunnel `conductive-chatgpt-egress` with the DNS name `chatgpt-egress.conducting.build`.
- **Reason:** the user chose on 12 November 2026 to retire the Mac proxy after one day of good container traffic.

- **Terms:**
  - **Mac proxy:** the egress proxy on Cal's Mac that served ChatGPT requests from 11 November 2026, behind a named Cloudflare Tunnel, before the egress container existed.
  - **Address path:** the code in `worker/model-gateway/egress.ts` that sends ChatGPT requests to `CHATGPT_EGRESS_URL` with `CHATGPT_EGRESS_SECRET`, when the main Worker has no `CHATGPT_EGRESS` binding.
- **Background:** The user decided on 12 November 2026: retire the Mac proxy after one day of good container traffic, and keep the address path in the code as a fallback for another host. While the binding exists, the main Worker does not use the Mac proxy. The proxy still sees ChatGPT logins in transit if someone removes the binding.
- **Task:**
  1. Confirm that `plans/follow-ups/egress-container-live-check.md` is done, and that the container served ChatGPT turns for one day.
  2. Run `npx wrangler secret delete CHATGPT_EGRESS_URL --name conductive` and `npx wrangler secret delete CHATGPT_EGRESS_SECRET --name conductive`.
  3. On Cal's Mac, run `launchctl bootout gui/$(id -u)/build.conductive.chatgpt-egress-proxy` and `launchctl bootout gui/$(id -u)/build.conductive.chatgpt-egress-tunnel`, then delete the two plist files in `~/Library/LaunchAgents`.
  4. In the Cloudflare dashboard, delete the DNS record `chatgpt-egress.conducting.build` of the zone `conducting.build`. Then run `cloudflared tunnel delete conductive-chatgpt-egress` on Cal's Mac.
  5. Delete `~/.conductive-egress`, which holds the shared secret and the logs.
- **Impact if no action:** A laptop stays ready to receive ChatGPT logins in transit, and two unused secrets stay on the Worker.
- **Needs:** One day of good container traffic, Wrangler access to the Worker, and Cal's Mac.
- **Done when:** The Worker holds neither secret, the two LaunchAgents and the tunnel no longer exist, and `chatgpt-egress.conducting.build` no longer resolves.
- **Related:** `plans/follow-ups/egress-container-live-check.md` comes first.
