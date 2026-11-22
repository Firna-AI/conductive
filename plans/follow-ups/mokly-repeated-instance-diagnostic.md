# Mokly does not say where a name repeats

- **Severity:** Medium. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-16, from branch `calummoore/riga-skgh`, Milestone 1 of the registered mockup parts.
- **Location:** None. The fix is in the Mokly repository, `mokly-ai/mokly`.
- **Reason:** The fix is in another repository, and the mockups of this repository build once their names are unique.

- **Terms:**
  - **Instance name:** the `moklyInstance` value of one use of a part that is registered with Mokly's `defineComponent`. Mokly needs it unique in its scope.
  - **Scope:** content that a screen supplies keeps the scope of its outermost slot, also inside the slots of other registered parts. Only the own render of a registered part starts a new scope.
- **Background:** The mockup catalogue in `docs/mockups/` registers many of its shared React parts with Mokly 0.19.0, so that the Changes view lists an edit under the part, not under each screen. Each use of a registered part has an instance name.
- **Problem:** The React wrapper of Mokly checks names only within one slot render. A name that repeats across nested slots reaches the Rust core, which fails with `conflicting fragment input <key>`. The message names no entry, no instance, and no call site.
- **Impact if no action:** Each repeated name costs a long search. Milestone 1 of the registered mockup parts met 29 of them, and found them only with a temporary log in `node_modules`.
- **Root question:** How does a Mokly author find a repeated instance name at once?
- **Options:**
  - **A.** Keep the message, and document the scope rule in `docs/mockups/README.md`. Effort: Small.
  - **B.** Change Mokly: check names by input scope in the wrapper, and name the entry, the view, the instance, and both call sites in the error. Effort: Small.
- **Left out:** A script in this repository that finds repeated names. It adds a new check, which needs the user's approval, and option B is better on every point.
- **Wider fix:** B. It helps every Mokly catalogue.
- **Previous examples:** The marketing pictures repeated `sidebar-email-dark-mode` before each picture had its own scope.
- **Recommendation:** B. The diagnostic removes the cost where it starts.
- **Action:** fix after merge, apply B, because the change is in the Mokly repository.
