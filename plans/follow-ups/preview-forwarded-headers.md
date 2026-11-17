# Check the headers that reach a preview app

- **Severity:** Medium. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Post-merge task.
- **Added:** 2026-11-17, from `calummoore/delete-outstanding-plans-status-f01f`, an open check of the deleted Boat-native remote workspaces plan (deployment and live smoke test).
- **Location:** `docs/protocol/terminal-previews-and-desktop.md`, sections "Port previews" and "Proxies and ports". `crates/cnd-relay/src/headers.rs`. `docs/protocol/port-previews.md`.
- **Reason:** Only a real sandbox shows the headers that reach a preview app after the Worker, Boat, and the preview relay.

- **Terms:**
  - **Port preview:** a page on the preview domain `conductive.page` that shows a web server of the sandbox, through the proxy of the Worker.
  - **Preview relay:** the program `conductive relay` in each sandbox, on port 7682. Each preview request passes through it last, before it reaches the previewed server.
- **Background:**
  - On 6 November 2026 the user chose to move the preview credential out of the random host name and into a cookie of the preview domain. The same choice asked the live smoke test to check the forwarded headers that Boat sends to a preview app, such as `X-Forwarded-Proto`. Nobody ran that check.
  - Later, decision 218 added the preview relay. The protocol now says that a request through the relay reaches the server with `Host: localhost:<port>`, and with `Origin: http://localhost:<port>` when it comes from the preview's own origin.
  - The protocol also says that the request reaches the server with no `Forwarded` or `X-Forwarded-*` header, without Boat's `_port_auth` cookie, and without the app's session cookie. The reason: the server must see one consistent local request. For example, Next.js compares `Origin` with `X-Forwarded-Host`.
  - `crates/cnd-relay/src/headers.rs` builds these headers. Its tests run without Boat, so they cannot show what Boat adds.
- **Task:**
  1. In a test workspace, start a small server that prints every request header and cookie, for example a short Node script with `http.createServer`, on a port such as 3000.
  2. Open its port preview, then send one request from the preview page, for example a `fetch` from the browser console.
  3. Record each header that reaches the server.
  4. Check these results:
     - `Host` is `localhost:<port>`.
     - `Origin`, when present on the same-origin request, is `http://localhost:<port>`.
     - No `Forwarded` header and no `X-Forwarded-*` header is present.
     - No `_port_auth` cookie, no app session cookie, and no preview credential cookie is present.
- **Impact if no action:** A header that Boat adds after the Worker can reach sandbox code. That header can leak a credential, or make a dev server such as Next.js refuse the request.
- **Needs:** A real workspace on the deployed release.
- **Done when:** The headers are recorded and match the four results above. Each mismatch gets a new item with the kind Fix after merge.
