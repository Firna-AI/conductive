# The tools dev page cannot frame its fixtures

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-08, found in the smoke test of the Desktop tab fix on branch `calummoore/desktop-view-crash`.
- **Location:** `src/terminal/dev/devServer.ts:38` (`fixtureUrl`), `src/terminal/dev/fixtures/desktop.html`, `src/terminal/dev/fixtures/preview.html`, `worker/application.ts:82-90` (the asset policy), `worker/security/content-security.ts:17` (`frame-ancestors 'none'`), and `vite.config.ts`.
- **Reason:** the Desktop tab fix does not change the dev page, and the fix touches the local setup of the Worker.

- **Terms:**
  - **Tools dev page:** the local page at `/src/terminal/dev/tools.html` under `npm run dev`. It shows the terminal, preview, and desktop tools with fake data.
  - **Fixture page:** a local page in place of a previewed app or a desktop stream. The dev page frames it from its own origin.
- **Background:**
  - `npm run dev` serves the app through the local Worker, because `wrangler.jsonc` sets `run_worker_first`. The Worker gives each asset response the content security policy of the app, which has `frame-ancestors 'none'`.
  - The fixture pages are such assets. On 8 November 2026, `curl -sI http://127.0.0.1:5173/src/terminal/dev/fixtures/desktop` and `.../fixtures/preview` both returned that policy with `frame-ancestors 'none'`.
  - Headless Chrome then showed the broken-page icon in the Preview and Desktop tools of the dev page, at `?tool=preview` and `?tool=desktop`.
- **Problem:** Each fixture page refuses to be framed, so the dev page shows a broken frame in place of the fake preview and the fake desktop.
- **Impact if no action:** A developer cannot check the look of a framed tool on the dev page. Its frame always looks broken, which hides real defects of the frame.
- **Root question:** How does the tools dev page show its fixture pages in a frame under `npm run dev`?
- **Options:**
  - **A.** Change nothing, and say in `src/terminal/README.md` that the dev page cannot frame its fixtures. Effort: Small.
  - **B.** Serve the fixture pages from a Vite development middleware in `vite.config.ts` that runs before the Worker, without `frame-ancestors 'none'`. Only the dev server has the middleware, so production keeps its policy. Effort: Small.
  - **C.** Let the Worker leave out `frame-ancestors 'none'` for the fixture paths when it runs locally. It puts a development case into the production security code. Effort: Small.
- **Left out:** A `run_worker_first` exception for the fixture paths in `wrangler.jsonc`, because production would then serve the single-page fallback at those paths without the policy of the Worker.
- **Wider fix:** None. The problem is one local setup.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps production code unchanged and makes the dev page show its fixtures again.
- **Action:** fix after merge, apply B, because the problem is outside the scope of the Desktop tab fix.
