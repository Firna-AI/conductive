# Terms revision is a manual step

- **Severity:** Medium. **Effort:** Medium. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/quito-q38c`, review finding 1.
- **Location:** `src/shared/terms.ts:4`
- **Reason:** The direct fix, a new revision, went into the branch. The wider fix changes how the app and the Worker get the revision, beyond the archive change.

### 1. Terms revision is a manual step

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Review.
- **Category:** Product bug.
- **Location:** `src/shared/terms.ts:4`
- **Terms:**
  - **`TERMS_VERSION`:** the revision of the Terms that sign-in records for each user, in `src/shared/terms.ts`. The app and the Worker share it.
- **Background:** Each sign-in starts after an agreement to the current revision of the Terms. The Worker records the revision and the time of its first acceptance (`docs/protocol/access-and-security.md`, the sign-in rules). The Terms text lives in `src/marketing/terms.ts` and `src/marketing/terms-org.ts`. A person must set a new `TERMS_VERSION` by hand when the text changes.
- **Problem:** Nothing makes the revision follow the text. Commits 871adcac0, 80401a065, 87dbb9469, c194159bf, and 36c32f325 on `main` changed the Terms text with no new revision. The archive removal branch missed it too, until its review.
- **Impact if no action:** The stored consent cannot say which text a user accepted, and an old consent link passes the revision check.
- **Root question:** How does the stored consent always name the Terms text that a sign-in accepted?
- **Options:**
  - **A.** Add the revision step to the legal-page rule in `AGENTS.md` and `src/marketing/README.md`: a change to the Terms text sets a new `TERMS_VERSION` and a new effective date. Effort: Small. It depends on the reader.
  - **B.** Make `TERMS_VERSION` end with a short digest of the Terms text, and add one test that fails when the digest no longer matches. Effort: Small. It is a detection fix and a new gate check, so it needs the user's approval.
  - **C.** Compute `TERMS_VERSION` in `src/shared/terms.ts` from the `termsDocument` data, for example `terms-` plus a short digest. The app and the Worker both import this module, so no build step is needed. Add one unit test that a changed word gives a new revision. Effort: Medium. About 22 KB of Terms source goes into the app and Worker bundles, and `src/shared` gets its first import from `src/marketing`. The effective date stays a manual step.
  - **D.** Derive the revision from the published Terms during the build, and give it to the browser and the server. Effort: Medium. It changes the legal build and the sign-in wiring.
- **Left out:** The deploy version as the revision resets the first acceptance time on each deploy. A history of acceptances records more of the same revision, so it names no text.
- **Wider fix:** C. It removes the manual step in shared code.
- **Previous examples:** The five commits above. Commit b409ef7f2 set the revision and the date together by hand.
- **Recommendation:** C, with A for the effective date.
- **Action:** fix after merge, apply C, because it changes how the app and the Worker get the revision, beyond the archive change.
