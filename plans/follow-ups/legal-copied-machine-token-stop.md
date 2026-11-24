# Legal text omits the token stop at a stop

- **Severity:** Low. **Effort:** Small. **Confidence:** High. **Harder later:** No.
- **Kind:** Needs decision.
- **Added:** 2026-11-24, from branch `calummoore/own-computers-milestone-8-builds-over-ef32`, in the full read of the legal pages for Milestone 8 of the own computers plan.
- **Location:** `src/marketing/terms-org.ts:213-216`, `src/marketing/privacy-recipients.ts:165-168`, and `src/marketing/docs/security.md:233`
- **Reason:** Cal approves each change of legal text, and a change of the Terms text makes a new Terms revision.

- **Source:** Implementation.
- **Category:** Docs or spec.
- **Terms:**
  - **Machine token:** the secret that each cloud computer or workspace container uses to open its host connection to the Worker. Programs in the workspace can read it.
- **Background:**
  - `docs/protocol/host-connection.md`, in "The machine token", says that a machine token stops working when its machine gets a new token, and at each stop of its machine.
  - Cal chose that rule on 23 November 2026, as own computer decision 11 B: a copy of the token works only during one run of its machine.
  - The Terms in `src/marketing/terms-org.ts:213-216` say: "A copied machine token stops working when the computer or container gets a new one at its next start."
  - The Privacy page in `src/marketing/privacy-recipients.ts:165-168` says the same words. The public guide `src/marketing/docs/security.md:233` says the same too.
  - These sentences came from commit `b77a52baa` of 22 November 2026, one day before decision 11 B. Cal approved the legal text of that commit on 23 November 2026, as own computer decision 13 A.
- **Problem:** The legal pages and the guide say that a copied token works until the next start. Decision 11 B stops it earlier, at the stop of its machine.
- **Impact if no action:** The legal pages describe a weaker protection than the product gives. The token never works longer than the text says, so no reader gets a false promise.
- **Root question:** What do the legal pages and the security guide say about when a copied machine token stops working?
- **Options:**
  - **A.** Change nothing. The text stays true as an upper limit. Effort: Small.
  - **B.** Add the stop in all three places: "A copied machine token stops working when the computer or container stops, and when it gets a new one at its next start." A change of the Terms text makes a new Terms revision, so the same change sets the effective date at the top of `src/marketing/terms.ts`. Effort: Small.
- **Left out:** None. The text either keeps its words or names the rule in force.
- **Wider fix:** None. `CLAUDE.md` already asks each change of a protocol fact to read both legal pages in full.
- **Previous examples:** None found.
- **Recommendation:** B. The legal pages and the guide then state the rule in force.
- **Action:** ask the user, because Cal approves each change of legal text.
