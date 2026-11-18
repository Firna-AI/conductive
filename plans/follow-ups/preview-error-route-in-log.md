# A failed preview request logs its route words

- **Severity:** Low. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-17, from the re-review of the `unexpected_error` warning on branch `calummoore/investigate-error-m9o4`, finding 1.
- **Location:** `worker/application.ts` (the `catch` of `createApp`, which calls `errorResponse(error, request)`, and the preview branch that calls `routePreview`), `worker/features/router.ts` (`routePreview`), `docs/deployment.md` (the `unexpected_error` bullets).
- **Reason:** the review found it after the last fix round of the branch, and no ID or secret reaches the log.

- **Terms:**
  - **`unexpected_error` warning:** the log line that `errorResponse` in `worker/http.ts` writes for each error that is not an `HttpError`. `worker/unexpected-error.ts` builds its fields. Its `route` keeps each path segment that is in a fixed list of API route words, and writes `*` for every other segment.
  - **Preview request:** a request to the hostname of a port preview under the preview domain, `*.conductive.page`. Its path is a path of the user's own app.
- **Background:**
  - On 17 November 2026, Cal chose that the warning keeps safe fields only, with no error message (option B of item 2 of the investigation of a failed session close).
  - `toolError` in `worker/previews/access.ts` takes an optional request. The preview proxy in `worker/previews/proxy.ts` passes none, so an error of the proxy logs no route.
  - `routePreview` forwards each preview request to the workspace Durable Object and has no `catch`. When it throws, such as when a deploy restarts the workspace object, the `catch` of `createApp` calls `errorResponse(error, request)` with the request of the preview.
- **Problem:** A preview request that fails before the proxy logs the route words of the user's app path. Example: `/api/users/settings/billing` logs as `/api/users/settings/*`, because `api`, `users`, and `settings` are route words.
- **Impact if no action:** Workers Logs keeps a few words of the paths of users' apps after each deploy. No ID, query string, or secret reaches the log.
- **Root question:** How does a failed preview request keep the path of the user's app out of the log?
- **Options:**
  - **A.** In the `catch` of `createApp`, pass the request only when the surface is not `preview`. Move `surface` out of the `try` for that. Add a test that throws from `forwardWorkspaceRequest` on a preview host and checks that `route` is `null`. Effort: Small.
  - **B.** Give `routePreview` its own `catch` that calls `toolError(error)` with no request. Effort: Small.
- **Left out:** A separate word list for previews, because any word of an app path can match.
- **Wider fix:** A, because the one `catch` of `createApp` then covers every preview error.
- **Previous examples:** The preview proxy already passes no request for the same reason.
- **Recommendation:** A. One check covers every preview error that reaches `createApp`.
- **Action:** fix after merge, apply A.
