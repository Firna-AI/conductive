# Development mode cannot serve built pages

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-09, while merging main into `calummoore/github-installation-redirect`.
- **Location:** `worker/marketing/files.ts`, `worker/marketing/page.ts`, and `vite.config.ts`.
- **Reason:** The failure also occurs on unchanged main and needs a separate fix to local asset serving.

- **Terms:**
  - **Astro:** The builder that writes the marketing pages into `public/_site/`.
  - **Vite:** The development server that serves the app and the local Worker.
  - **Assets binding:** The Worker's `ASSETS` service, which reads built files.
- **Background:** `npm run dev` builds the Astro pages before starting Vite. The Worker reads those pages through its assets binding. `npm run preview` serves a production build through the local Worker.
- **Problem:** In development, the GitHub install return for the Mac app answers `HTTP/1.1 503 Service Unavailable`. The Worker logs `The built marketing site is not available.` The files and their file list exist. The exact failed asset read still needs investigation.
- **Evidence:**
  - On the merged branch, start `npm run dev -- --host 127.0.0.1`. Request `http://127.0.0.1:5173/github/setup?state=mac`. The response is `503`.
  - On unchanged main at `50a4e5e`, start `npm run dev -- --host 127.0.0.1 --port 5175`. Request `http://127.0.0.1:5175/api/auth/github`. The built sign-in agreement also answers `503`.
  - Run `npm run build`, then `npm run preview -- --host 127.0.0.1`. On port 5174, the Mac install and request pages answer `200`. The browser return answers `302` to Get started. The Mac page has its expected text, no script or cookie, and the built style hashes.
- **Impact if no action:** Developers cannot check these pages through `npm run dev`. A production preview provides a workaround.
- **Root question:** How should local development serve built pages through the Worker?
- **Options:**
  - **A.** Find and fix the asset-read failure in the existing Worker path. Keep the shared page reader, headers, and Astro build. Effort: Medium.
  - **B.** Serve these pages through development-only Vite middleware. This adds a separate route and header path. Effort: Medium.
  - **C.** Run a separate Astro server and proxy its pages through the Worker. This adds another server and response path. Effort: Large.
- **Left out:** Use production preview only. It leaves the documented development command broken and requires a rebuild for app edits.
- **Wider fix:** A. The shared asset reader serves both the agreement and the GitHub install return.
- **Previous examples:** The sign-in agreement fails on unchanged main at `50a4e5e`, as the reproduction above shows.
- **Recommendation:** A. It preserves one page-serving path for development and production.
- **Action:** fix after merge, apply A, because the failure already exists on main and does not block the production build.
