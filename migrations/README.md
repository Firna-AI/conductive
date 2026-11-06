# Migrations

D1 applies SQL files in filename order. Each filename starts with a full
date, hour, and minute: `YYYYMMDDHHMM_description.sql`.
Never change a migration that has merged or has been applied to a shared database.

`202611060000_worker_core.sql` creates sign-in and the first org records.
`202611060100_contracts.sql` adds the tables used by the feature backends.
It keeps existing rows and gives each existing org its General section.
`202611072100_email_invitations.sql` discards the pending invitations by GitHub login.
It then adds invitations by email, each user's verified emails, and the durable matches of invitations to users.

Chat history, sessions, runner event cursors, start steps, and banner state
belong to workspace Durable Object storage. They have no D1 tables.
Stored secrets use ciphertext columns. The browser reads only metadata.
The git credential helper uses the GitHub user token of the turn's sender, as
[GitHub tokens](../docs/protocol/access-and-security.md#github-tokens) says.
The older comment on `github_connections` in `202611060100_contracts.sql`
stays, because a merged migration does not change.

## Reserved ranges

Each milestone owns the complete inclusive range below.
Use a free minute in that range for each new migration.
These reservations keep concurrent branches from choosing the same prefix.
UI and wiring milestones normally need no migration. Their ranges stay reserved.

| Milestone | Inclusive prefix range |
| --- | --- |
| 4a Contracts | `202611060100`–`202611060159` |
| 5 Lifecycle | `202611070000`–`202611070059` |
| 6 App shell | `202611070100`–`202611070159` |
| 7r Runner | `202611070200`–`202611070259` |
| 7 Chat backend | `202611070300`–`202611070359` |
| 8 Chat UI | `202611070400`–`202611070459` |
| 8i Chat wiring | `202611070500`–`202611070559` |
| 16a First deployment | `202611070600`–`202611070659` |
| 9 Files backend | `202611070700`–`202611070759` |
| 10 Files UI | `202611070800`–`202611070859` |
| 11 Tools backend | `202611070900`–`202611070959` |
| 12 Tools UI | `202611071000`–`202611071059` |
| 13 GitHub backend | `202611071100`–`202611071159` |
| 14 GitHub UI | `202611071200`–`202611071259` |
| 15 Agent tools | `202611071300`–`202611071359` |
| 15a Members backend | `202611071400`–`202611071459` |
| 15c Members UI | `202611071500`–`202611071559` |
| 15i Feature wiring | `202611071600`–`202611071659` |
| 15d Marketing | `202611071700`–`202611071759` |
| 15e Mac app | `202611072000`–`202611072059` |
| 16 Deployment | `202611071800`–`202611071859` |
| 17 Verification | `202611071900`–`202611071959` |

## Key code

- [The test harness](../worker/test-support/harness.ts) applies every SQL
  migration in filename order to a fresh local D1 database.
- [Shared contracts](../src/shared/) define the browser and runner payloads.
- Run `npm run db:migrate` to apply the migrations to local development storage.
