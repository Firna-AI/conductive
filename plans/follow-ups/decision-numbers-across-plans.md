# Decision numbers collide across parallel plans

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-09, from the options check of a decision of the plan `plans/automatic-first-build.md`, branch `calummoore/box-auto-build-onboarding`.
- **Location:** the section "Decision numbers" of `docs/architecture.md`, and `plans/`.
- **Reason:** the numbering rule is a repository rule for every plan, outside the scope of the change that found the collision.

- **Source:** Review. **Category:** Process.
- **Terms:**
  - **Decision number:** the number of one dated decision record, such as "decision 36". Protocol docs, mockups, and code comments cite it.
- **Background:**
  - `docs/architecture.md` says that a decision number names the dated record of one decision, and that the plan of the change keeps the records while the change is open.
  - Most decisions live in `plans/boat-native-remote-workspaces.md`, which numbers them in order.
  - The plan `plans/automatic-first-build.md` took the next free numbers twice, 142 to 144 and then 147 to 149. Each time, `origin/main` used the same numbers for other decisions within hours, so each citation named two decisions.
- **Problem:** Two plans that run at the same time take the same numbers, because no rule reserves them.
- **Impact if no action:** Citations such as "decision 147" name two decisions, and each branch renumbers by hand before its merge.
- **Root question:** How does each decision get a number that no other plan uses?
- **Options:**
  - **A.** Keep the numbers in order, and renumber a plan's decisions to the next free numbers just before its pull request. Write this rule in "Decision numbers". Effort: Small.
  - **B.** Give each plan its own prefix, such as "decision auto-build-1", and keep the plain numbers of the main plan as they are. Effort: Small.
  - **C.** Reserve a block of numbers for a new plan in the main plan when the plan starts. Effort: Small.
- **Left out:** None.
- **Wider fix:** B. A prefix cannot collide, so no renumbering is needed.
- **Previous examples:** The two renumberings of `plans/automatic-first-build.md` on 9 November 2026.
- **Recommendation:** B. It ends the collisions without a step before each merge.
- **Action:** ask the user, because the numbering is a repository rule.
