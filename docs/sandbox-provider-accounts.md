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

- Each org runs on one account at a time, as
  [The account of an org](protocol/provider-accounts.md#the-account-of-an-org)
  says. A new org gets its account from the weights of the operator
  section, or from the choice of an operator. An operator can later switch
  the org to another account, as
  [Switch account](protocol/switch-account.md) says.
- Each workspace keeps the account that it started on. So after a switch,
  one org can have workspaces on two accounts.
- Only a configured account can have a weight, be chosen, or get a switch.
  The weights start at 100% for `boat`. So a new `e2b` account gets no org
  until an operator changes the weights, chooses `e2b`, or switches an org
  to it.
- Keep each account configured while an org, a workspace, or an org image
  uses it. Each call for a workspace or an org image goes to the account
  that its record names. So these calls fail while that account is not
  configured.
- After a switch, the older org image on the old account keeps that
  account in use until the org is deleted. So does each workspace whose
  sandbox is still there.
- Each account runs in one region. Boat runs in the EU, in Germany,
  Finland, and France. E2B runs in the United States, as
  [The app's E2B account](#the-apps-e2b-account) says. The Privacy page
  names only the EU countries today. So the `e2b` account needs the steps
  that [Regions](protocol/provider-accounts.md#regions) gives before a
  real org runs on it.

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
- The key needs `exec` to start and read the detached attachment download
  commands. The cloud computer uses a one-use token to read each file from
  the machine host.

## The app's E2B account

Every cloud computer of the orgs on `e2b` runs in the app's own E2B
project, in E2B's default cluster, `e2b.app`. E2B's
[region table](https://docs.e2b.dev/faq/egress-ip-ranges) places that
cluster in the Google Cloud region `us-west1`, in the United States. The
same page says that E2B can run sandboxes in more than one Google Cloud
region, and can change their place over time. The Worker reads the
account from the Worker secret `SANDBOX_PROVIDER_ACCOUNTS`.

1. Make an E2B project that holds only the app's sandboxes, templates, and
   snapshots. Keep other E2B work in other projects.
2. Ask E2B support for the settings that
   [Before a real org runs on E2B](#before-a-real-org-runs-on-e2b) lists.
3. Make an API key of that project.
4. Build the E2B template of the app in that project, and note its ID.
5. Write the value of `SANDBOX_PROVIDER_ACCOUNTS` to a file outside the
   repository, such as `~/sandbox-accounts.json`. The value is JSON text,
   with the `e2b` entry:

   ```json
   { "e2b": { "kind": "e2b", "apiKey": "<E2B API key>", "domain": "e2b.app", "templateId": "<template ID>" } }
   ```

6. Set the secret from that file:
   `npx wrangler secret put SANDBOX_PROVIDER_ACCOUNTS < ~/sandbox-accounts.json`.
   When its input is not a terminal, Wrangler reads the value from the
   input. So the value goes into no command line and no shell history.
7. Delete the file.

- The value holds an API key. Keep it in a Worker secret. Never put it in
  the `vars` of `wrangler.jsonc`, in Git, or in a log.
- `domain` is the domain of the cluster of the project: `e2b.app` for
  E2B's default cluster. Another cluster has its own domain, which E2B
  gives with the cluster. `templateId` is the ID of the template of the
  fourth step.
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

Do the steps of this section before a real org runs on E2B. One step is a
change of the Privacy page: it names the United States, and the
protection of the transfer from the UK, as
[Regions](protocol/provider-accounts.md#regions) says. That protection
comes from the documents below. Until then:

- Keep the weight of `e2b` at 0% on the Providers tab.
- Put only test orgs on `e2b`, with the account choice of Create org or
  with Switch account on the page of an org.

No code enforces these steps. The operator keeps them.

Ask E2B for these documents:

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

A workspace on E2B also needs two settings of the project from E2B
support:

1. Filesystem-only pauses and snapshots. E2B refuses them until support
   turns them on.
2. A sandbox disk of 51 GB, as Boat's default size has. Confirm with
   support which plan and project settings supply this size for tests.

The project needs no EU cluster. E2B gives its EU cluster only after the
project has a payment method and support turns the cluster on.

Move the project to E2B Pro before a real org runs on E2B. E2B's current
[Billing and limits](https://docs.e2b.dev/billing) gives the plan limits
for disk capacity, sandbox runtime, and the number of sandboxes at once.
