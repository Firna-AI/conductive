# Sandbox provider accounts

This page belongs to [Deployment inputs](deployment.md). It gives the
provider accounts of a deployment, their inputs, and the steps before a
real org runs on E2B.
[The provider](protocol/workspaces-and-sandboxes.md#the-provider) states
the requirements.

The Worker runs each cloud computer in a provider account of the app. Each
account has an ID:

| Account | Provider | Inputs |
| --- | --- | --- |
| `boat` | Boat | `BOAT_API_KEY` and `BOAT_ORG_ID`. Every deployment has this account. |
| `e2b` | E2B | The `e2b` entry of the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`. It is optional. |

- Each org keeps one account for its whole life, as
  [The account of an org](protocol/workspaces-and-sandboxes.md#the-account-of-an-org)
  says. A new org gets its account from the weights of the operator
  section, or from the choice of an operator.
- Only a configured account can have a weight or be chosen. The weights
  start at 100% for `boat`. So a new `e2b` account gets no org until an
  operator changes the weights or chooses `e2b`.
- Keep each account configured while an org uses it. No call of an org
  goes to another account. So the calls of an org fail while its account
  is not configured.

## The app's Boat account

Every cloud computer of the orgs on `boat` runs in the app's own Boat
organization. No org has a Boat key, and the Worker stores no Boat key in
D1.

- `BOAT_API_KEY` is the only Boat credential. Set it as a Worker secret.
- `BOAT_ORG_ID` names that organization on every Boat call. It is not a
  secret. Set it in the `vars` of `wrangler.jsonc`, next to
  `MACHINE_ORIGIN`.
- Both are settings of the Worker only. The key never goes to the browser,
  into a sandbox, into a log, or into a saved snapshot, as
  [The app's Boat key](protocol/isolation.md#the-apps-boat-key) says.
- [The app's Boat account](../worker/sandbox/README.md#the-apps-boat-account)
  says how to make the organization and the key.
- The key must also allow the `file.write` action. The Worker uses it to
  copy each attached file into a sandbox. The primary orchestrator
  supplies that action at the next deployment.

## The app's E2B account

Every cloud computer of the orgs on `e2b` runs in the app's own E2B
project, in E2B's EU cluster. E2B's
[region table](https://docs.e2b.dev/faq/egress-ip-ranges) places that
cluster in the Google Cloud region `europe-west1`, in Belgium. The Worker
reads the account from the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`.

1. Make an E2B project that holds only the app's sandboxes, templates, and
   snapshots. Keep other E2B work in other projects.
2. Ask E2B support for the settings and the consent that
   [Before a real org runs on E2B](#before-a-real-org-runs-on-e2b) lists.
3. Make an API key of that project.
4. Build the E2B template of the app in that project, and note its ID.
5. Write the value of `SANDBOX_PROVIDER_ACCOUNTS` to a file outside the
   repository, such as `~/sandbox-accounts.json`. The value is JSON text,
   with the `e2b` entry:

   ```json
   { "e2b": { "kind": "e2b", "apiKey": "<E2B API key>", "domain": "<domain of the EU cluster>", "templateId": "<template ID>" } }
   ```

6. Set the secret from that file:
   `npx wrangler secret put SANDBOX_PROVIDER_ACCOUNTS < ~/sandbox-accounts.json`.
   When its input is not a terminal, Wrangler reads the value from the
   input. So the value goes into no command line and no shell history.
7. Delete the file.

- The value holds an API key. Keep it in a Worker secret. Never put it in
  the `vars` of `wrangler.jsonc`, in Git, or in a log.
- `domain` is the domain of the EU cluster, which E2B gives with the
  cluster. `templateId` is the ID of the template of the fourth step.
- The `boat` account always uses `BOAT_API_KEY` and `BOAT_ORG_ID`. An entry
  named `boat` in `SANDBOX_PROVIDER_ACCOUNTS` does not replace them.
- The key never goes to the browser, into a sandbox, into a log, or into a
  saved snapshot, as
  [The app's E2B key](protocol/isolation.md#the-apps-e2b-key) says.
- The Worker asks for private traffic at each create. So the default of
  the project for public traffic does not matter.
- Local development needs no E2B account. To test one, put the same JSON
  text in `.dev.vars`, in single quotes:
  `SANDBOX_PROVIDER_ACCOUNTS='<JSON text>'`. Git ignores `.dev.vars`.

## Before a real org runs on E2B

E2B's [terms](https://e2b.dev/terms) bar giving access to its service to
others without E2B's written consent, under "Prohibited Conduct", item 2.
Item 9 also bars a third-party application that uses the service without
consent. Until E2B consents in writing:

- Keep the weight of `e2b` at 0% on the Providers tab.
- Put only test orgs on `e2b`, with the account choice of Create org.

No code enforces these steps. The operator keeps them.

With the request for consent, ask E2B for these documents:

- A signed data processing agreement. E2B's
  [security page](https://e2b.dev/security) offers a template, and a
  signed copy from `trust@e2b.dev`.
- The list of its subprocessors.
- The transfer protections that apply to personal data that leaves the
  European Economic Area or the UK, such as standard contractual clauses
  with the UK Addendum.

E2B is FoundryLabs, Inc., a company in the United States. Its public pages
do not show that these documents are signed for this deployment. So the
legal pages claim no signed protection until the documents arrive.

A workspace on E2B also needs three settings of the project from E2B
support:

1. The EU cluster. E2B gives it after the project has a payment method.
2. Filesystem-only pauses and snapshots. E2B refuses them until support
   turns them on.
3. A sandbox disk of 51 GB, as Boat's default size has. E2B Pro gives
   20 GiB.

Move the project to E2B Pro before a real org runs on E2B. On Hobby, a
sandbox runs for at most 1 hour, and at most 20 run at once.
