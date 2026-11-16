# A signed-out app link loses its page after sign-in

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-16, from the finding check of review finding 1 on branch `calummoore/oslo-nocm`.
- **Location:** `src/shell/auth/SignInScreen.tsx:56`, `worker/security/auth.ts`, and `worker/security/sign-in-access.ts`.
- **Reason:** `origin/main` behaves the same. Option D of review finding 1 on that branch would fix it, and that finding waits for the user.

- **Terms:**
  - **App link:** an address of a page of the web app, such as a workspace or a session link that an agent gives.
  - **Signed sign-in state:** the signed cookie that carries sign-in data through GitHub authorization.
- **Background:**
  - Agents give workspace and session links in their answers. The chat shows them as chips.
  - A signed-out browser that opens such a link sees the sign-in screen of the app at that address.
  - The sign-in button sends only the Terms revision and an invite code. The callback then opens the app root.
- **Problem:** After sign-in, the person lands on the start page, not on the linked page.
- **Impact if no action:** A person who opens a shared link while signed out must find the link again after sign-in.
- **Root question:** How does a sign-in return a person to the app page that they opened?
- **Options:**
  - **A.** Keep the page in browser session storage before GitHub, and restore it once after sign-in. Effort: Medium.
  - **B.** Carry the page through the signed sign-in state, checked with the app screen reader that the GitHub App return already uses. Effort: Medium.
  - **C.** Keep the page in a separate return cookie, as the GitHub App return does. Effort: Medium.
- **Left out:** A Worker redirect of each signed-out page load, because it replaces the sign-in screen that the mockups specify.
- **Wider fix:** B, because one checked return address then serves every app link.
- **Previous examples:** Commit `16b6c5f7d`, PR #169, kept the screen across the GitHub App install.
- **Recommendation:** B. It reuses the signed state and the existing app screen reader.
- **Action:** ask the user, because it changes the sign-in rule in `docs/protocol/access-and-security.md`.
