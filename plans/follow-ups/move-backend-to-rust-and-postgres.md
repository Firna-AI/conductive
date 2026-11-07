# Move the backend to Rust and Postgres

- **Severity:** Low. **Effort:** Large. **Confidence:** Medium. **Harder later:** Yes.
- **Kind:** Post-merge task.
- **Added:** 2026-11-06, from `calummoore/conductor-alternative-architecture`, plan decisions 61, 63, 71, 73, 74, and 75.
- **Location:** `worker/`, `migrations/`, `src/shared/`, and `wrangler.jsonc`, and a new Cargo workspace at the repository root.
- **Reason:** on 6 November 2026 the user started the Rust backend beside the TypeScript one, chose its shape, its database, and its host, and then parked it the same day, outside the plan.

- **Terms:**
  - **Durable Object:** a small stateful Cloudflare server. The app runs one for each workspace, for the live chat and the agent runner's connection.
  - **Live connections:** the sockets of the open chat tabs and of the agent runner in each cloud computer.
  - **Workspace owner:** the one server process that holds the live connections of a workspace. Today the Durable Object of the workspace is its owner.
  - **Contracts:** the API types, the runner messages, and the database tables that Milestone 4a fixed in `src/shared/` and `migrations/`.
  - **Edge Worker:** a thin Cloudflare Worker in front of the Rust server, as Mokly Cloud's `ts/worker` origin router is.
- **Background:**
  - The backend is a TypeScript Cloudflare Worker with one D1 database and one Durable Object for each workspace. The user's usual backend is Rust with Postgres, and the `rust`, `databases`, and `shared-types` skills describe it.
  - The user's product Mokly Cloud (`mokly-ai/mokly-cloud`) runs that stack: axum 0.8, tokio, tower-http, diesel 2.3 with Postgres, and utoipa, on GCP with GKE Autopilot, Cloud SQL Postgres, Secret Manager, Terraform, and Helm. Cloudflare holds DNS and TLS, and a `ts/worker` origin router sits at the edge. Its `mkc-test-pg` crate gives each test a disposable Postgres schema.
  - The user's decisions, all of 6 November 2026:
    - Decision 61 E: ship on the Cloudflare stack first, and move to Rust and Postgres after the first usable release. Left out: Rust compiled for Workers, because its tools are thinner and it gives neither a normal Rust server nor the usual Postgres setup.
    - Decision 63 D: the agent runner is a Node program now. With the backend move, it becomes a Rust runner that handles the connection, the numbered events and their resends, the file watching, and git. A small Node helper runs only the Claude Agent SDK and the Codex SDK, because those exist only in TypeScript and Python. The two talk over JSON lines.
    - Decision 71: keep one D1 database and one Durable Object for each workspace for now. The user first asked for a database for each org, then chose to settle it in the Rust design.
    - Decision 73 C: Mokly Cloud's layout. A thin edge Worker serves the static app, the marketing site, and the preview domain. One Rust server behind it serves the API, the data, the GitHub webhooks, the machine host, and the live connections. Rejected: A, one Rust server for everything with Cloudflare only for DNS and TLS. Rejected: B, a Rust API with the Durable Objects kept for the live connections, because two backend stacks stay.
    - Decision 74: keep every org in one Postgres database. Rejected: one schema for each org, one database for each org, and one Neon project for each org.
    - Decision 75 A: run on GCP as Mokly Cloud does, with GKE Autopilot and Cloud SQL Postgres in an EU region, Terraform, and Helm. Rejected: B, Cloud Run, because a socket lasts at most 60 minutes and each workspace is harder to route to its owner. Rejected: C, Fly.io, because it is a new provider for the user.
    - The same day, the user parked the Rust work and moved it out of the plan into this item.
  - The agent's design calls of 6 November 2026, which the user can override:
    - Use axum, tokio, tower-http, diesel, and utoipa, as Mokly Cloud does.
    - Put the Cargo workspace at the repository root, with its crates under `crates/` and the prefix `cnd-`: `cnd-api`, `cnd-config`, `cnd-db` for the diesel schema and migrations, `cnd-domain`, `cnd-store-interface`, `cnd-store-pg`, and `cnd-test-pg`. The npm package stays as it is.
    - Each query that reads org records takes the org ID, in the Postgres store crate, because one database holds every org.
    - The Rust server serves the contracts of `src/shared/` as they are. Types generated from Rust replace them only at the switch, as the `shared-types` skill says.
    - One server process owns the live connections of each workspace, through a lease row in Postgres. The other processes forward that workspace's sockets to the owner, because the chat order depends on one owner.
    - The Rust checks run in their own CI job and their own command, not in `npm run check`, because they need Rust and Postgres.
- **Task:** build the Rust backend in these steps. Each step can run in its own workspace once the steps that it depends on have merged.
  1. Rust workspace, Postgres schema, and server core. Add the Cargo workspace and its crates, the Postgres schema for every D1 table with diesel migrations, a health route and the OpenAPI document, a Postgres test harness with a disposable schema for each test, the Rust CI job, and the commands in `AGENTS.md`.
  2. Sign-in, orgs, and members, after step 1. Port GitHub sign-in, the signed sessions, the request gate with its `Origin` rules of decision 60, orgs, members, invitations, roles, Delete org, and Restore. Test each route against the contracts.
  3. Boat client and workspace lifecycle, after step 1. Port the Boat client with its fixed routes, the bounded body reads of decision 65, the app's Boat key from a secret (decision 80), and the workspace lifecycle: create, the start steps, stop, resume, the idle stop, and the image builds.
  4. Live connections, after step 2. Give each workspace one owner process through a lease in Postgres. Store the chat events in Postgres with their numbers and the resend rules, and apply the 30-second access rule of decision 70.
  5. Feature backends, after steps 2, 3, and 4. Port the files backend, the terminal, previews, and desktop backend, the GitHub banner backend, the agent tools, and the desktop sign-in.
  6. Edge Worker, after step 2. Reduce the Worker to an origin router that serves the static app, the marketing site, and the preview domain, and forwards the API, the sockets, and the machine host to the Rust server.
  7. GCP infrastructure, after step 1. Add Terraform for GKE Autopilot, Cloud SQL Postgres, and Secret Manager in an EU region, and a Helm chart for the Rust server. Deploy a staging environment, and smoke-test it.
  8. Rust agent runner, after step 4, as decision 63 D says.
  9. The switch, after steps 5 to 8. Generate the TypeScript types from Rust and replace `src/shared/`. Move the data from D1 when a deployment holds data, and switch the web app to the Rust backend.
- **Impact if no action:** The team keeps a backend stack that differs from its usual one, and the shared Rust and Postgres skills do not apply to it.
- **Needs:** the user's word to start. Step 7 also needs the user's GCP project.
- **Done when:** the web app and the agent runner run against the Rust server on GCP, the Worker is only the edge router, and `src/shared/` holds types generated from Rust.
