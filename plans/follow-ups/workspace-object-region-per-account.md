# Place workspace objects near a non-EU account

- **Severity:** Low. **Effort:** Medium. **Confidence:** Medium. **Harder later:** No.
- **Kind:** Fix after merge.
- **Added:** 2026-11-20, from branch `calummoore/eu-boat-alternatives-5977`, which drops the EU rule for sandbox providers.
- **Location:** Each `getByName(…, { locationHint: 'weur' })` call of the workspace Durable Object namespace, in `worker/lifecycle/runtime.ts`, `worker/app-api/lifecycle.ts`, `worker/app-api/shell.ts`, `worker/app-api/workspace-state.ts`, `worker/members/composition.ts`, and `worker/operator/stop-computers.ts`. The same namespace also opens the org-image object of each org, in `worker/lifecycle/runtime.ts`, and the computer-stop object of each org, in `worker/operator/stop-computers.ts`. Both use the same hint.
- **Reason:** Every provider account runs in Western Europe today, so the fixed hint is right until an account in another region exists.

- **Source:** Design. **Category:** Performance.
- **Terms:**
  - **Workspace object:** The Cloudflare Durable Object of one workspace. It holds the open tabs and the connection of the agent runner in the sandbox.
  - **Location hint:** The Cloudflare option that places a Durable Object in a region when the object is first created. The object stays there after that.
  - **Provider account:** An account of the app with a sandbox provider, such as `boat` or `e2b`. Each org runs on one account for its whole life.
- **Background:**
  - On 20 November 2026, the user chose that a provider account can run in any region. The EU is not a requirement. `docs/protocol/provider-accounts.md`, section "Regions", holds this rule.
  - The app first chose Western Europe only because Boat's machines run there.
  - Every call that opens a workspace object passes the location hint `weur`. The hint is a constant, not a value of the account.
  - `docs/architecture/components.md` says that every workspace object gets the Western Europe hint, whatever its account. Each runner message passes between the object and the sandbox.
  - The D1 database and the attachment bucket stay in Western Europe. Cloudflare fixes their place when it creates them.
- **Problem:** A workspace on an account outside Western Europe would still get a workspace object in Western Europe. Each runner message would then cross the ocean, which adds about 70 to 100 ms to each round trip.
- **Impact if no action:** Nothing changes while every account runs in Western Europe. A future account in another region gets slower chat events and tool replies.
- **Root question:** How does a workspace object run near the sandbox of its workspace?
- **Options:**
  - **A.** Add a location hint to each account in the provider account settings, with `weur` as the default. Pass the hint of the org's account when a new workspace object, org-image object, or computer-stop object is created. Effort: Medium.
  - **B.** Keep `weur` for every workspace and accept the latency for accounts in other regions. Effort: Small.
- **Left out:** A move of existing workspace objects, because Cloudflare keeps an object where it was first created, and no org changes its account.
- **Wider fix:** A, because it ties the place of each workspace object to its account.
- **Previous examples:** Commit `d05c47df6` planned the D1 database in Western Europe to be near Boat's machines.
- **Recommendation:** A. It costs little once an account in another region exists, and the latency hits every runner message.
- **Action:** fix after merge, apply A, in the change that adds the first account outside Western Europe, because the fixed hint is right until then.
