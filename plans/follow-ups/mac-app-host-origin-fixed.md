# The Mac app names one fixed app host

- **Severity:** Low. **Likelihood:** Rare. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-13, from `calummoore/riga-m3j3`, the implementation of links in chat text.
- **Location:** `src/app/live-services.ts`, `appHostOrigin`.
- **Reason:** Default Mac builds use the brand host, so only a Mac build for another app host meets the problem.

- **Terms:**
  - **App origin:** the scheme, the host, and the port of the web app, such as `https://app.conductive.build`.
  - **Link opener:** `src/shell/ui/text-links.tsx`, which opens a link of chat text or of the file preview: an app page in the app, any other link in a new tab.
- **Background:**
  - The Mac app loads the web app from its own origin, `conductive-app://desktop`.
  - `appHostOrigin` gives the page origin in a browser. In the Mac app it always gives `https://` and the brand domain from `docs/mockups/src/brand.ts`.
  - The link opener uses this origin to tell an app page from another site.
  - The Mac app opens a new-tab link of an app page nowhere, because `navigationTarget` in `desktop/src/navigation.ts` drops a new window for the app.
- **Problem:** A Mac build that talks to another app host, such as a test host, reads a link to that host as another site. A press opens a new tab, which the Mac app drops.
- **Impact if no action:** In such a build, a link to an app page in chat text or a file does nothing.
- **Root question:** How does the Mac app know the origin of the app host that it serves?
- **Options:**
  - **A.** Change nothing. Default builds work. Effort: Small.
  - **B.** Give the app host to the page from the Mac app build, as the Mac app already knows the host that it loads its API from, and read it in `appHostOrigin`. Effort: Small.
  - **C.** Read the origin of the links of the workspace, which the Worker writes with its own host. Cost: in `npm run dev`, the dev fake writes links with another origin. Effort: Small.
- **Left out:** None.
- **Wider fix:** B. One source then names the app host for each build.
- **Previous examples:** None found.
- **Recommendation:** B. The Mac app then names the host that it really serves.
- **Action:** fix after merge, apply B, because only a Mac build for another host meets it.
