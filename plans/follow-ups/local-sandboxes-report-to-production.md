# Local cloud computers report to the production Worker

- **Severity:** Low. **Effort:** Small. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Outside the scope.
- **Added:** 2026-11-12, from branch `calummoore/untitled-v6`, a new problem of review round 1.
- **Location:** `README.md` (the get-started section that says Boat keys in `.dev.vars` start real cloud computers), `wrangler.jsonc` (the var `MACHINE_ORIGIN`).
- **Reason:** the branch changes the ChatGPT egress, not the local setup docs.

- **Terms:**
  - **`MACHINE_ORIGIN`:** the address that the Worker gives each cloud computer for its runner, agent tools, and model gateway. `wrangler.jsonc` sets `https://api.conductive.build`.
  - **`.dev.vars`:** the file of local Worker settings that the root README describes.
- **Background:** The root README says that Boat keys in `.dev.vars` let a local Worker start real cloud computers. Each such computer gets the `MACHINE_ORIGIN` of `wrangler.jsonc` unless `.dev.vars` sets another value.
- **Problem:** The README does not say that a local cloud computer then reports to the production Worker, not to the local one.
- **Impact if no action:** A developer can expect a local Worker to serve the runner and the model gateway of a local cloud computer, and then see production traffic instead.
- **Root question:** Where does a developer learn which Worker a local cloud computer reports to?
- **Options:**
  - **A.** Add one sentence to the root README: set `MACHINE_ORIGIN` in `.dev.vars` to an address that reaches the local Worker, or the cloud computer reports to production. Effort: Small.
  - **B.** Make the local Worker refuse to start a cloud computer while `MACHINE_ORIGIN` points to production. Cost: a new rejection, which needs the user. Effort: Small.
- **Left out:** A third approach is not real: the address either reaches the local Worker or it does not, and the docs or the code are the only places to say so.
- **Wider fix:** None, because this is one missing sentence.
- **Previous examples:** None found.
- **Recommendation:** A. It needs no new rule and tells the developer the one setting to change.
- **Action:** fix after merge, apply A.
