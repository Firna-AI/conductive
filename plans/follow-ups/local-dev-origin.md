# Local development and preview reject their own origin

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from PR #1, branch `conductor/boat-native-remote-workspaces-milestone-15e`, finding 2, wider fix F, and two problems of its check outside the scope.
- **Location:** `worker/hosts.ts`, `worker/security/gate.ts:19`, the content policy generator, and `README.md:98`.
- **Reason:** the fix edits files outside the branch that found it, and the 403 also exists on the base branch.

- **Terms:**
  - **App origin:** the scheme, host, and port of the web app, which the Worker reads from `APP_ORIGIN` to check the `Origin` header and to build the content policy.
- **Background:** The host routing, the `Origin` check of the gate, and the content policy each read the app origin on their own. In development, `npm run dev` serves port 5173, and `npm run preview` serves port 5174, but `.dev.vars` sets one `APP_ORIGIN`. Vite and its React plugin also add inline scripts to the development page, which the content policy of decision 67 blocks.
- **Problem:**
  - Without `.dev.vars`, every gated API route on the local host answers 403 `origin_forbidden`, not 401 `sign_in_required`.
  - The README sets `APP_ORIGIN` to port 5173, and the Cloudflare plugin copies `.dev.vars` into the preview build, so every request of `npm run preview` gets 403.
  - Each new inline script of the development page breaks the page again under the content policy.
- **Impact if no action:** Developers get 403 answers in local development and in the preview, and each tool upgrade can break the development page again.
- **Root question:** How does each local command give the Worker one correct app origin, and a development page that the content policy allows?
- **Options:**
  - **A.** Fix the README so that each command sets its own `APP_ORIGIN`. Effort: Small.
  - **B.** Share one origin value for host routing, the `Origin` check, and the content policy, with a local fallback to the request's own origin in development. Effort: Medium.
  - **C.** B, and a Vite hook that runs only on the dev server and moves every inline script of the development page into an external module. Effort: Medium.
- **Left out:** turning off the content policy in development, because the development page would then hide policy breaks that production meets.
- **Wider fix:** C.
- **Previous examples:** finding 2 of PR #1.
- **Recommendation:** C.
- **Action:** fix after merge, apply C, because it edits files outside the branch that found it.
