# Share route declarations with error reporting

- **Severity:** Low. **Effort:** Large. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-11, from review finding 4 of `calummoore/betterstack-implementation-brainstorm`.
- **Location:** `worker/error-reporting/routes.ts`, `worker/routes.ts`, `worker/application.ts`, `worker/chat/backend.ts`, `src/shared/`, and `src/app/router.ts`.
- **Reason:** A shared source needs changes across about 25 Worker handlers and the workspace object. The direct reporting fix needs two files only.

- **Source:** Review. **Category:** Code structure.
- **Terms:**
  - **Worker:** The server that handles Conductive requests.
  - **Route declaration:** The fixed path names and parameter positions that identify a supported request.
  - **Route template:** The `http.route` tag of an error report. It keeps code-owned names and replaces other values with `:param`.
  - **Dispatch:** The code that selects the handler for a request.
  - **Workspace object:** The Durable Object that owns a workspace and handles its chat routes.
- **Background:**
  - `docs/protocol/error-reporting.md` requires templates to keep names from the app's own route lists. Reports exclude private path values.
  - A template also belongs to the repeat-limit key, with the classification, error type, and first Conductive frame. The key has no HTTP method.
  - `worker/error-reporting/routes.ts` builds a name set from a separate list of shared builders, web page builders, and fixed Worker templates.
  - The direct fix adds the missing known routes and extends `routes.test.ts`. It preserves normal request behavior and the existing redaction.
  - Dispatch still owns another description of each path. A future route can enter dispatch without entering the reporting list.
  - Keep path ownership in each feature area, as `src/shared/README.md` requires. One declaration source need not mean one large file.
- **Problem:** Separate dispatch and reporting lists can drift. A hand-written reporting list cannot force a new supported route to supply its fixed names.
- **Impact if no action:** Later routes can again get generic labels. Different failures can share a repeat-limit key when their class and first frame also match.
- **Root question:** How does each Worker report keep fixed names from every served route, including future routes, while excluding private path values?
- **Options:**
  - **A.** Keep the corrected manual catalog. Update it with each route and add focused regression cases. Future omissions remain possible. Effort: Small per change.
  - **B.** Share authoritative route declarations between dispatch and reporting. Derive the safe name set from those declarations. Cover Worker handlers, web page paths, and workspace-object routes. Preserve each route's owner, matching, access gate, and response. Effort: Large.
  - **C.** Let each matching handler supply trusted report metadata. Keep the current redaction for unmatched requests. A workspace object needs a checked return path to the Worker. The metadata can still drift from a separate match. Effort: Large.
  - **D.** Define shared builders and Worker constants from one template helper. Derive the name set without import-order dependence. About 70 exports across 25 modules need identical output. Matcher-only paths stay uncovered unless migrated too. Effort: Medium.
  - **E.** Use one matcher whose pattern supplies the report template. Move Worker and workspace-object handlers to it. Return workspace metadata through a checked private boundary. Unmatched paths keep redaction. Effort: Large.
  - **F.** Add a test that enumerates route builders and constants. Matcher-only paths still need coverage. This test for the class needs user approval. Effort: Small.
- **Left out:**
  - Raw paths expose private values.
  - Masking every segment removes the required fixed names.
  - Guessing IDs by their shape can expose invite codes or paths in a user's app.
  - F stays an option because it costs less than B. It is blocked and is not recommended.
- **Wider fix:** B. One declaration source removes the separate list. D can be its first phase if later phases cover private matchers and workspace routes.
- **Previous examples:**
  - The first reporting catalog missed join links and preview authorization.
  - Five later main integrations added gateway, software-image, GitHub-install, routine/transcript, and feedback/sign-up routes without updating the catalog.
  - Nine route families lost names: feedback, waitlist switch, routines, transcripts, GitHub install, join links, software-image deploy, model gateway suffixes, and preview authorization.
  - Four page names were absent too: `preferences`, `new`, `cloud-computer`, and `codes`.
  - For example, `/api/feedback` became `/api/:param`. A Codex gateway report lost `responses`.
  - Routine `runs` and `run-now` requests shared one generic template. One report could suppress another for 60 seconds when their other key fields matched.
  - The browser reporter already gets its screen tag from its router's own match in `src/app/error-reporting-event.ts`.
- **Related:** `plans/follow-ups/gateway-stream-failure-reports.md` adds late gateway reports to the same request capture. Whichever change ships second must preserve the same route template. Neither waits for the other.
- **Recommendation:** B. A shared declaration source prevents missing names without depending on every handler repeating metadata. D is a possible first phase.
- **Action:** fix after merge, apply B, because the direct fix is complete and the wider change reaches routing code outside the reporting diff.

Keep these requirements during the work:

- Every current URL builder gives the same path and query as before.
- Every method, route match, access check, response, retry, and request lifetime stays the same.
- Worker and workspace-object routes share the same reporting contract.
- Claude's messages and token-count routes have explicit declarations. They do not depend on another route contributing the same names.
- A private path value never enters the name set or a report.
- The name set works before the first request and does not depend on import order.
- Keep the existing report fields, event filters, and repeat-limit behavior.
- Use focused regression tests at the lowest level. Add no gate or test for the class without the user's approval.
