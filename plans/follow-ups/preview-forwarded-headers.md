# Check the forwarded headers Boat sends previews

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open check of the deleted Boat-native remote workspaces plan (deployment and live smoke test).
- **Location:** `docs/protocol/port-previews.md`, `docs/protocol/terminal-previews-and-desktop.md`, section "Proxies and ports".
- **Reason:** Only a real Boat sandbox shows which headers Boat adds on the way to a preview app.

- **Terms:**
  - **Port preview:** a page on the preview domain `conductive.page` that shows a web server of the sandbox, through the proxy of the Worker.
- **Background:** The user chose option C of the Boat plan decision on preview credentials on 6 November 2026. It moved the preview credential out of the random host name and into a cookie of the preview domain. It also asked the live smoke test to check the forwarded headers that Boat sends to a preview app, such as `X-Forwarded-Proto`. The proxies of the Worker forward only an allowlist of headers and cookies. Boat can add its own headers after the Worker.
- **Task:**
  1. In a test workspace, start a small server that prints every request header, for example `npx http-echo-server` or a short Node script, on a port.
  2. Open its port preview.
  3. Record each header that reaches the server, such as `X-Forwarded-Proto`, `X-Forwarded-For`, `X-Forwarded-Host`, and `Host`.
  4. Check that no app session cookie and no preview credential reaches the server, and that `X-Forwarded-Proto` says `https`.
- **Impact if no action:** A preview app can build wrong redirects from a wrong scheme or host. A header that carries a credential could reach sandbox code.
- **Needs:** A real workspace on the deployed release.
- **Done when:** The headers are recorded. Each header that is wrong, or that leaks a credential, gets a new item with the kind Fix after merge.
