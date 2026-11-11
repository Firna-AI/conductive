# Preview replies forbid all browser caching

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-11, from branch `calummoore/npm-run-dev-preview-issue`, item 2.
- **Location:** `worker/previews/headers.ts:145`.
- **Reason:** the recommended option overrides the `no-store` header of every preview reply on `main`, so the user decides.

- **Source:** Implementation. **Category:** Performance.
- **Terms:**
  - **Preview proxy:** the Worker code in `worker/previews/` that serves each `*.conductive.page` hostname from a port in the sandbox, after an access check in D1.
  - **Pre-bundled dependency file:** a file that Vite's dev server builds from a package, such as `/node_modules/.vite/deps/react-dom_client.js?v=84430999`. The `v` value changes when the file changes.
- **Background:**
  - `portResponseHeaders` in `worker/previews/headers.ts` replaces the `Cache-Control` header of each preview reply with `no-store`.
  - Vite's dev server sends `Cache-Control: max-age=31536000,immutable` for each pre-bundled dependency file. It sends `no-cache` with an `ETag` for each other module.
  - The proxy already forwards `If-None-Match` and `ETag`, so a browser could revalidate a `no-cache` module and get a 304 reply.
  - On 10 November 2026, a cold load of the Conductive dev server, `npm run dev`, made 998 requests for 24 MB. The eight largest pre-bundled dependency files held 13.3 MB of it. The largest was `lucide-react.js`, at 3.9 MB.
  - No protocol doc or plan gives a reason for `no-store`. The header came with the first preview backend on 6 November 2026.
- **Problem:** The browser keeps no preview file between loads. Each reload of a dev server preview fetches every file again through the proxy, with its access checks.
- **Impact if no action:** Each reload repeats a full cold load. In a local workerd copy of the proxy, with 50 ms for each D1 read, that load took 15 seconds after the read-size fix of the same branch.
- **Root question:** Should the browser keep preview files between loads, and which files?
- **Options:**
  - **A.** Keep `no-store`. Each reload stays a full load. Effort: Small.
  - **B.** Pass the server's `Cache-Control` through only when it holds `immutable`, and add `private`. Keep `no-store` for every other reply. Reloads skip the pre-bundled dependency files, but other modules still load in full. Effort: Small.
  - **C.** Pass the server's `Cache-Control` through for every reply, and add `private`. Reloads skip the immutable files and revalidate the others with 304 replies. A revoked viewer's browser keeps the files that it already received. A page that the server marks cacheable can then load from the cache without an access check. Effort: Small.
- **Left out:** A cache in the Worker or in the workspace object was left out, because it costs server memory, and the browser cache gives the same gain to the one viewer who loaded the files.
- **Wider fix:** None, because one function sets the header for every preview reply.
- **Previous examples:** None found.
- **Recommendation:** C. It gives the largest gain, and a revoked viewer keeps only files that the same browser already received. Dev servers mark their pages `no-cache`, so the page itself still needs the access check.
- **Action:** ask the user, because the recommended option overrides the `no-store` behaviour on `main` and changes what a revoked viewer's browser keeps.
