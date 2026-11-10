# Build log copy step differs from the mockup

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-10, from branch `calummoore/build-image-install-order`, a new problem of the second options check of the software image plan.
- **Location:** `docs/mockups/src/fixtures/terminal.ts:60`, `docs/mockups/src/fixtures/terminal.ts:104`, and `worker/lifecycle/image-sources/materialize.ts:84`.
- **Reason:** the problem is outside the software image plan, and the user decides which side of a mockup and product mismatch is right.

- **Terms:**
  - **Build log:** the live output of a build of the org image, on the Cloud computer tab of the org settings.
  - **Copy step:** the first step of a build, which copies each chosen repository into its folder under `~/code`.
- **Background:**
  - The mockups are the visual spec of the product.
  - The build log mockups in `docs/mockups/src/fixtures/terminal.ts` start with "Cloning 3 repositories into ~/code" or "Cloning 2 repositories into ~/code". One line follows for each repository, such as "✓ acme/storefront at 4f2c9a1".
  - The Worker writes only "Updating the repositories." for the copy step, in `worker/lifecycle/image-sources/materialize.ts`. It writes no line for each repository.
- **Problem:** The build log of the product does not match its visual spec for the copy step.
- **Impact if no action:** An admin sees fewer facts than the design promises: no count, no folder, and no commit for each repository.
- **Root question:** What should the build log show for the copy step?
- **Options:**
  - **A.** Change the Worker to match the mockups: the count, the folder, and one line with the commit for each repository. Effort: Small.
  - **B.** Change the mockups to match the Worker: one line, "Updating the repositories." Effort: Small.
- **Left out:** Change nothing, because the spec and the product keep disagreeing. Only the two sides can change, so there is no third approach.
- **Wider fix:** None. This is one step of one log.
- **Previous examples:** None found.
- **Recommendation:** A. The mockup gives the admin useful facts, and the Worker knows each repository and commit after the copy.
- **Action:** ask the user, because the user decides which side of a mockup and product mismatch is right.
