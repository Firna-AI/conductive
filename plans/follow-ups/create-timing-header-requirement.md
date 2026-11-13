# The create timing header has no requirement

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-13, from the branch `calummoore/milan-ofz5`, review item 2.
- **Location:** `worker/lifecycle/browser.ts:76`, `docs/protocol/create-a-workspace.md:226`, `docs/protocol/access-and-security.md`, `docs/protocol/terminal-previews-and-desktop.md:155`.
- **Reason:** The fix adds a requirement at the HTTP boundary, and the user reviews each new requirement.

- **Source:** Review. **Category:** Docs or spec.
- **Terms:**
  - **`Server-Timing`:** a standard HTTP reply header with step names and durations. The developer tools of a browser show it for each request.
  - **`ServerTiming`:** the helper in `worker/server-timing.ts` that writes this header. The preview proxy and the create route use it.
- **Background:**
  - The 201 reply of the create route, `POST /api/orgs/<org>/workspaces`, carries `Server-Timing: create;dur=…, message;dur=…, project;dur=…`. The branch `calummoore/milan-ofz5` added it, so that a slow create can be measured from the browser.
  - The user chose "add timing" as part of option A of create-speed decision 1, on 13 November 2026. The header itself was a design call of the agent.
  - The header holds fixed step names and whole milliseconds, and no ID. A refused create gets no header.
  - Each preview reply carries the same kind of header. `docs/protocol/terminal-previews-and-desktop.md` states it as a requirement (preview timing decision 1), with its reason, its limits, and its risk.
  - For the create, only `worker/lifecycle/routes.md`, `worker/README.md`, and a code comment state the header.
- **Problem:** The create reply has new behaviour at the HTTP boundary, but no protocol doc states it or its limits.
- **Impact if no action:** A later change can add an ID to the header, or send it with a refusal, and no requirement shows that this is wrong.
- **Root question:** How do the requirements record what the create reply tells the browser about its timing?
- **Options:**
  - **A.** Remove the header from the create reply, and write the step durations to the Worker log. Then no requirement is needed. A measurement then needs access to the Worker logs. Effort: Small.
  - **B.** Add the requirement to "The create" in `docs/protocol/create-a-workspace.md`, with the steps, the limits, and the reason. That doc has 297 lines, over the target, so it needs a split into linked pages. Read both legal pages and each public guide in full, as the repository rules ask. Effort: Medium.
  - **C.** Add one rule for each `Server-Timing` header of the app to `docs/protocol/access-and-security.md`. The rule states the limits once, and names the two replies that carry the header, with their steps. The preview requirement then links to it. Read the legal pages and the guides. Effort: Medium.
- **Left out:** Keep the header and record it only in the README. A requirement belongs in a protocol doc.
- **Wider fix:** C. One rule covers each route that uses `ServerTiming`.
- **Previous examples:** `72b85ec8f` "feat(previews): show the Worker's step times in Server-Timing (#301)".
- **Recommendation:** C. It states the limits once for the shared helper.
- **Action:** ask the user, because the recommended option adds a requirement for a new header at the HTTP boundary.
