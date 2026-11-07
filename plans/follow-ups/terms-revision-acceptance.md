# No rule says when a changed Terms revision applies

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-08, a new problem of the check of finding 7 of PR #45, branch `conductor/boat-native-remote-workspaces-milestone-15m`, round 1.
- **Location:** `src/shared/terms.ts:3` (`TERMS_VERSION`), the sign-in check in `worker/security/auth.ts`, and the Sign-in section of `docs/protocol/access-and-security.md`.

- **Terms:**
  - **Revision:** one dated version of the Terms, named by `TERMS_VERSION`. A user accepts it by continuing with GitHub at sign-in, and the app keeps the revision and the time.
- **Background:** Milestone 15m asks each new user to accept the current revision at sign-up. Its fix round also records each acceptance of a later revision at sign-in. A browser or Mac session lasts 7 days.
- **Problem:** No requirement says whether a signed-in user must accept a changed revision before further use. The Terms page leaves "how a change takes effect" as a draft field for the lawyer.
- **Impact if no action:** After a change of the Terms, each signed-in user works under the old revision until the next sign-in, for up to 7 days.
- **Root question:** When must a user accept a changed revision of the Terms?
- **Options:**
  - **A.** At the next sign-in, within 7 days. The sign-in agreement already shows the current revision. Effort: Small.
  - **B.** At once. A consent page blocks the app until the user accepts the new revision. Each change of the Terms then interrupts every user and closes their open chat tabs and terminals. Effort: Medium.
  - **C.** At the next sign-in, and the app also emails each user about the change when it ships. Effort: Medium.
- **Left out:** Accepting for the user without any action, because it makes a false record.
- **Wider fix:** None. This is one rule.
- **Previous examples:** None found.
- **Recommendation:** A. Nothing is deployed, and the lawyer can still ask for B or C before the launch.
- **Action:** ask the user, because B adds a new rejection, and the choice is a legal one that no requirement settles.
