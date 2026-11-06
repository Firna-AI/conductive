# The backend does not use Rust and Postgres

- **Severity:** Low. **Effort:** Large. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Fix after merge.
- **Added:** 2026-11-06, from `calummoore/conductor-alternative-architecture`, plan decision 61, option E.
- **Location:** `worker/`, `migrations/`, and `wrangler.jsonc`.
- **Reason:** The user chose on 6 November 2026 to ship the first usable release on the Cloudflare stack, and to move to Rust and Postgres after it.

- **Terms:**
  - **Durable Object:** a small stateful Cloudflare server. The app runs one for each workspace, for the live chat and the agent runner's connection.
  - **Contracts:** the API types, the runner messages, and the database tables that Milestone 4a fixes, so that one side can change without the other.
- **Background:**
  - The backend is a TypeScript Cloudflare Worker with D1 and Durable Objects, as plan decision 1 chose.
  - The user's usual backend is Rust with Postgres. The shared `rust`, `databases`, and `shared-types` skills describe that setup.
  - The web app stays React and TypeScript, and the agent runner stays in Node, because the agent SDKs are TypeScript.
- **Problem:** The backend uses a stack that differs from the user's usual one.
- **Impact if no action:** The team keeps two backend stacks, and the shared Rust and Postgres skills do not apply to this backend.
- **Root question:** How does the backend move to Rust and Postgres without a break for the web app and the agent runner?
- **Options:**
  - **A.** Keep the Cloudflare stack. Effort: Small.
  - **B.** Keep the Worker and the Durable Objects, and replace D1 with Postgres through Cloudflare Hyperdrive. Effort: Medium.
  - **C.** A Rust API server with Postgres for all requests and data. Durable Objects stay only for the live connections. Effort: Large.
  - **D.** One Rust server with Postgres for everything, including the live connections, as one container in the EU, with TypeScript types generated from Rust. Effort: Large.
- **Left out:** Rust compiled for Workers, because its tools are thinner and it gives neither a normal Rust server nor the usual Postgres setup.
- **Wider fix:** D.
- **Previous examples:** The `rust`, `databases`, and `shared-types` skills.
- **Recommendation:** D. One Rust server keeps one backend to run, and the contracts of Milestone 4a fix its boundaries with the web app and the runner.
- **Action:** fix after merge, apply D, because the user chose on 6 November 2026 to move after the first usable release.
