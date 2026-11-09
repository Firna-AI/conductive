# The Terms do not name the Mac app

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from Milestone 6 of the plan for the Mac app downloads, branch `calummoore/mac-app-downloads-site`.
- **Location:** the lead and the section "The service" of `src/marketing/terms.ts`, and `TERMS_VERSION` in `src/shared/terms.ts`.
- **Reason:** the Terms are final legal text, not drafts, so a change of their scope is a choice for the user and not an agent call.

- **Terms:**
  - **Terms revision:** `TERMS_VERSION` in `src/shared/terms.ts`. Each sign-in accepts the current revision, and a new revision applies at the next sign-in of each user.
  - **Mac command:** a request from an agent to run a shell command on the Mac of the person who sent the turn. It runs only after that person allows it in the Mac app.
- **Background:** The Terms page at `conductive.build/terms` says: "These terms cover your use of Conductive at conductive.build and app.conductive.build." Its section "The service" says: "Conductive is a coding tool in the browser." The Mac app is public: the home page links its notarized download, and the Privacy page names the data of Mac commands. Earlier changes of the Terms text also changed the revision, such as `2026-11-09-legal-github-cli`.
- **Problem:** The Terms name neither the Mac app nor Mac commands, which run on the user's own computer with the user's permission.
- **Impact if no action:** A user of the Mac app can read the Terms as covering only the browser, and the Terms say nothing about who answers for a command that the user allows on their Mac.
- **Root question:** What do the Terms say about the Mac app and the commands that it runs on a user's Mac?
- **Options:**
  - **A.** Name the Mac app in the lead and in "The service", as a fact: "a coding tool in the browser and in the Mac app". Change the revision and the effective date, so that each user accepts the new text at the next sign-in. Effort: Small.
  - **B.** Do A, and add a clause for Mac commands: the user decides which commands run on their Mac, and answers for what they allow. The user or a lawyer writes or approves the clause. Effort: Small.
  - **C.** Change nothing. The Terms already cover the use of the service at `app.conductive.build`, which the Mac app calls. Effort: Small.
- **Left out:** A marked draft field on the live page: the Terms are final, so a visible draft marker reads as unfinished legal text.
- **Wider fix:** None. The rule of `AGENTS.md` already sends each changed protocol fact to the legal pages. This gap is a new product surface, not a changed fact.
- **Previous examples:** Pull request #110 changed the Terms for the GitHub CLI and changed the revision to `2026-11-09-legal-github-cli`.
- **Recommendation:** B. A command that runs on the user's own computer is the main new risk of the Mac app, so the Terms should say who decides and who answers for it.
- **Action:** ask the user, because a change of the Terms changes the contract with each user, and only the user or a lawyer can approve its words.
