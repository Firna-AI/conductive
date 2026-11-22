# The dev server watches the context folder

- **Severity:** Medium. **Likelihood:** Common. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-20, from the branch `calummoore/delft-39rk` (workspace starts from another branch), Milestone 16.
- **Location:** `vite.config.ts`.
- **Reason:** The branch that found it changed no part of the dev server.

- **Source:** Implementation.
- **Category:** Process.
- **Terms:**
  - **Context folder:** `.context/` in the repository. Git ignores it. Agents keep notes, screenshots, and logs there.
- **Background:**
  - `npm run dev` builds the marketing site, then starts Vite with a file watcher.
  - In a workspace cloud computer on 20 November 2026, Vite stopped at once with the error ENOSPC: it reached the limit of file watchers.
  - The repository then held about 30,700 files under `.context/`. The sandbox runner already held about 17,300 of the 65,536 file watchers that the machine allows.
  - The same Vite configuration with its file watcher off ran.
- **Problem:** Vite watches every file of the repository, also the context folder, so a workspace with many agent notes cannot start the dev server.
- **Impact if no action:** Members and agents cannot run `npm run dev` in a busy workspace, and they cannot check UI work in the browser.
- **Root question:** How does the dev server watch only the files that it serves?
- **Options:**
  - **A.** Add `**/.context/**` to `server.watch.ignored` in `vite.config.ts`. Effort: Small.
  - **B.** A, and also ignore the other output folders that Vite never serves, such as `mokly-static/` and `.wrangler/`. Effort: Small.
  - **C.** Raise the limit of file watchers in the image of the cloud computer. Cost: a change of the image, and the next large folder hits the limit again. Effort: Medium.
- **Left out:** A dev server without a file watcher, because members need the reload on each change.
- **Wider fix:** B. It covers each folder that Vite does not serve.
- **Previous examples:** None found.
- **Recommendation:** B. It keeps the reload and stays far below the limit.
- **Action:** fix after merge, apply B, because the change is in the dev setup, outside this branch.
