# Sandbox provider

This area owns the provider accounts, the lookup of the client of each
account, and the Boat and E2B adapters. Both implement lifecycle, snapshots,
commands, bounded file transfers, and private ports. E2B leaves desktop and fork unsupported.
The app keeps one provider account for the life of each org.
Each account uses the app's own provider project. A key does not keep orgs apart, so each caller
authorizes its org and its resource before it asks for a provider, as
[Provider accounts](#provider-accounts) says.

The Boat transport creates the API URL and headers from fixed routes.
It sends `X-Boat-Org` with the organization ID of its account on every
API request, `BOAT_ORG_ID` for `boat`. A change of the active Boat organization
of the key's user then moves no work of the app.
It forwards no browser cookie.
File writes also send a signed PUT to the exact address that the fixed
upload-grant route returns. That transfer sends no provider credential or org header.

`BoatClient.privatePort(sandboxId, port, mode)` calls only the fixed host
route. It requires explicit localhost or network mode and private access.
It parses the provider URL into a `PrivatePort`: a server-only origin and the
[port credential](#port-credentials) that the client builds.
`BoatClient.desktop(sandboxId)` calls only the fixed desktop route.
It returns a typed ready URL or a starting result. Ready URLs require HTTPS
and a fragment token. The feature layer maps starting into its public response.
Both methods use the same `BoatTransport` as commands, lifecycle, and file reads.
The transport validates sandbox ID segments and centralizes errors and the organization pin.

`BoatClient.runCommand` and `BoatClient.startCommand` both call `POST /sandboxes/{id}/commands`.
`runCommand` waits for the command, with a 600 second Boat timeout and a 610 second request timeout.
`startCommand` starts a detached command, with a 30 second request timeout.
`BoatClient.getCommandStatus` reads detached output from byte offsets, with the same 30 second timeout.

## Port credentials

A `PortCredential` tells the proxies how to reach one private port:

- `headers`: the trusted request headers that the port needs, ready to send.
- `stripCookies`: the cookie names that the proxies drop from browser
  cookies and from upstream `Set-Cookie` headers.
- `stripHeaders`: the header names that the proxies drop from the upstream
  request and from the reply.
- `stripQueryParameters`: the query names that the proxies drop from the
  upstream URL and from each rewritten redirect.

The Boat client puts the token of the port URL only in the header
`Cookie: _port_auth=<token>`. It strips the `_port_auth` cookie and the
`_token` and `_port_auth` query names, and it names no header to strip.
The E2B client uses the `e2b-traffic-access-token` header.
It strips traffic, access, and routing headers through the port credential.
Its localhost mode uses the private TCP relay and registers the exact shared preview alias.
No credential goes to the browser. The
[preview backend](../previews/README.md) applies the credential.

## Provider accounts

Each D1 record of a sandbox or a saved snapshot stores its provider
account, as the lifecycle page
[Provider accounts](../lifecycle/provider-accounts.md) says.
Ask for the client of that stored account:

- Call `orgProviderForAccount(env, userId, orgId, fetch, accountId)` when
  the caller still needs the membership check. It returns 404
  `org_not_found` for a user who is not a member of the org.
- Trusted feature code calls `providerForAccount(env, fetch, accountId)`
  after it authorizes its workspace, its build, or its cleanup lease.

Both return `SandboxProvider`. Neither gives a key to its caller.
The caller checks ownership before it passes a sandbox or saved snapshot ID.
Allocation cleanup passes the internal `cleanup` mode to the provider factory.
On E2B, this mode recovers identity without create, connect, or guest setup.
Only `ProviderAllocationAbsent` proves that no allocation can still appear.
Boat construction and its existing create replay behavior stay the same.

The `boat` account, `DEFAULT_PROVIDER_ACCOUNT` in
[account-identity.ts](account-identity.ts), always uses `BOAT_API_KEY` and
`BOAT_ORG_ID`. The optional `SANDBOX_PROVIDER_ACCOUNTS` Worker secret is JSON text.
A Boat entry has `kind`, `apiKey`, and `orgId`.
An E2B entry has `kind`, `apiKey`, `domain`, and `templateId`.
[The E2B account](#the-apps-e2b-account) gives its setup.
The parser retains valid entries and warns safely about malformed entries.
It always replaces a supplied `boat` entry with the pinned credentials.

An account that the Worker does not configure throws `ProviderAccountError`
before any provider request. That error is not a `ProviderError`, so no
cleanup counts the record of an unknown account as already removed.
Each switch over the provider kind is exhaustive. So the type check finds
each place that a new kind must handle.

## The app's Boat account

The Worker reads two values. The root [Get started](../../README.md#get-started)
says where to set them.

- `BOAT_API_KEY`: an API key for the app's own Boat organization. It is the
  only Boat credential, and a Worker secret.
- `BOAT_ORG_ID`: the ID of that organization. It is not a secret.

Make the organization and the key once, in the Boat dashboard:

1. Use a Boat organization that holds only the app's sandboxes and saved
   snapshots. Keep other Boat work in other organizations.
2. Read its `id` once with `GET /orgs`, using an operator credential with
   `account.read`. Set `BOAT_ORG_ID` to that value. The
   [organization reference](https://docs.boat.dev/api/reference/account/list-organizations)
   defines the reply. The [scope reference](https://docs.boat.dev/api-keys/scopes)
   gives the lookup permission.
3. Select that organization in the dashboard. Make an API key with Custom
   actions, and add these actions:
   `sandbox.create`, `sandbox.read`, `sandbox.update`, `sandbox.stop`,
   `sandbox.resume`, `sandbox.fork`, `sandbox.delete`, `exec`,
   `snapshot.read`, `snapshot.write`, `file.read`, `file.write`, `host`, and `desktop`.
4. Limit the key to one environment. Give it a lifetime of 365 days, and
   plan its replacement before that date.

Boat's `ci` preset deletes only the sandboxes that its own key created, so
the key needs custom actions. The fixed routes in [routes.ts](routes.ts) set
the actions. A new route can need a new action.
To replace the key, put the new key in the Worker secret. The new key must
reach the same organization, because the sandboxes and the org images
stay there.

## The app's E2B account

Put each E2B entry in the JSON `SANDBOX_PROVIDER_ACCOUNTS` Worker secret.
Use the same JSON text in `.dev.vars` for local development.
The `domain` is the trusted EU suffix supplied by E2B support.
It gives the API host `api.<domain>` and the sandbox port hosts.
The `templateId` names the app's prepared template.
The API key stays inside the Worker.
The E2B client also needs D1 and `BOAT_KEY_ENCRYPTION_KEY` for durable state and traffic-token encryption.

Ask E2B for EU access, filesystem-only pause and snapshots, and the required disk size.
Use E2B Pro before real org use. Get E2B's written consent before real org use.
The [deployment guide](../../docs/deployment.md) gives the deployment inputs and requirements.
The [E2B README](e2b/README.md) gives its fixed control routes and recovery rules.

## Response byte limits

The adapters use the [shared bounded readers](../http/README.md#bounded-json-reader).
The Worker counts received bytes and cancels an overflowing body.
The exact budget passes. Content-Length does not set the budget.
Control replies and errors use 1 MiB. Commands use 18 MiB.
File reads use the caller's decoded byte limit.
[Response limits](response-limits.md) gives the byte budget of each fixed
Boat route, and the errors of a response that passes its budget.
[The E2B client](e2b/README.md#response-budgets) gives its implemented route budgets.

## Response failures

Both adapters return safe typed errors without copying provider message text.
An oversized control reply uses `sandbox_response_too_large` with HTTP 502.
[Response failures](response-limits.md#response-failures) gives the errors
and cancellation rules when a Boat response passes its byte budget, with its
command and file fallback rules.
[The E2B client](e2b/README.md#response-budgets) gives its control error mapping.

## File reads

The [Boat file reader](boat-transport.md#file-reads) returns bytes or the reported size above the caller's limit.
The [E2B file reader](e2b/README.md#commands-and-files) uses Stat and bounded binary download, then returns base64.
Both preserve the caller's decoded byte limit and exact size result.

## File writes

`SandboxProvider.writeFile(sandboxId, path, body, sizeBytes)` is an internal streamed write.
The caller authorizes the workspace and its actual sandbox before calling it.
Each adapter creates missing parent folders.
It replaces an existing file only after the upload completes.
The [Boat file writer](boat-transport.md#file-writes) streams bytes through a signed upload grant.
The [E2B file writer](e2b/README.md#commands-and-files) stages a protected file beside the destination, then replaces the destination atomically.
It streams counted octets to the fixed envd route, and validates the reply path and complete input consumption without buffering the file.

## Development

Run `npm run test -- worker/files worker/sandbox` from the repository root with Node 24.
Tests use [FakeBoat, FakeE2b, and local storage](../test-support/README.md).
`FakeBoat.addAccount` gives the fake server a second organization with its own key, for a second account.
The transport tests use counted streams to check exact budgets and early cancellation.

### Provider contract suite

[provider-contract.test.ts](provider-contract.test.ts) runs one shared set of
`SandboxProvider` assertions against the Boat and E2B adapters. The shared modules
call only the public provider methods. They compare the values and the
typed errors that callers use:

- `registerLifecycleContract` and `registerSnapshotContract` in
  [contract-lifecycle.test-support.ts](contract-lifecycle.test-support.ts).
- `registerCommandContract` in [contract-commands.test-support.ts](contract-commands.test-support.ts).
- `registerFileContract` in [contract-files.test-support.ts](contract-files.test-support.ts).
- `registerPortContract` in [contract-ports.test-support.ts](contract-ports.test-support.ts).
- `registerErrorContract` in [contract-errors.test-support.ts](contract-errors.test-support.ts).

Each function takes a `ProviderContractFactory` from
[contract-fixture.test-support.ts](contract-fixture.test-support.ts). Each
call of the factory gives a new `ProviderContractFixture`: the provider, a
secret that no error may show, the expected `PrivatePort`, `given(reply)`
for the normalized `ContractReply` of the next calls, and
`createIdentities()` for the idempotency keys that the creates sent.
Await `given(reply)`. A driver can use it to prepare its D1 records.

`createBoatContractFixture` in [boat-contract.test-support.ts](boat-contract.test-support.ts)
is the Boat driver. With [boat-contract-replies.test-support.ts](boat-contract-replies.test-support.ts),
it turns each `ContractReply` into `FakeBoat` replies. A Boat failure without its own provider code or retry wait gets `provider_code` and 3 seconds.
The E2B driver uses documented stable machine codes and the same retry default.
Its code mapping keeps the Boat-specific error assertions unchanged.

Boat routes, headers, bodies, byte budgets, input checks, `fork`, and
`hydrated` stay in the Boat tests beside the adapter. The suite leaves out
`fork`, because no production code calls it. The lifecycle tests keep the
replay of a lost create, and the Files tests keep the production 5 MiB limit.

A new adapter needs a factory and a driver that turn the same `ContractReply`
values into replies of its own fake server, with the same failure defaults.
Its entry calls the implemented `register…Contract` functions with that factory. Its wire
tests stay beside the adapter. Both entries register lifecycle, snapshots, commands, files, ports, and all error contracts.
The Boat-specific create test keeps the exact two-request idempotency assertion.

### Key Code

- [provider.ts](provider.ts) defines the server's sandbox and file read/write interface, with `PrivatePort` and `PortCredential`.
- [The E2B client](e2b/README.md#key-code) owns envd, commands, protected env setup, identity-only cleanup, and private ports.
- [boat.ts](boat.ts) forwards provider operations to the Boat helpers. It builds the Boat port credential.
- [provider-contract.test.ts](provider-contract.test.ts) runs the [provider contract suite](#provider-contract-suite) with the Boat driver, `createBoatContractFixture` in [boat-contract.test-support.ts](boat-contract.test-support.ts). Its port case checks the Boat port credential that `privatePort` returns.
- [client.ts](client.ts) gives the client of an account with `providerForAccount`, and after the membership check with `orgProviderForAccount`.
- [accounts.ts](accounts.ts) defines the provider kind, the account configuration, and `ProviderAccountError`.
- [account-identity.ts](account-identity.ts) holds `DEFAULT_PROVIDER_ACCOUNT`, the `boat` account.
- [accounts.test.ts](accounts.test.ts) checks that each account uses its own organization and key, that `boat` stays pinned, and that an unknown account fails before any request.
- [routes.ts](routes.ts) holds the fixed Boat route list.
- [transport.ts](transport.ts) owns request headers and response handling.
- [transport-body.test.ts](transport-body.test.ts) checks normal and command byte limits and safe overflow messages.
- [transport-error-body.test.ts](transport-error-body.test.ts) checks the shared error budget and provider error mapping.
- [file-response.ts](file-response.ts) calculates the file content budget.
- [The shared readers](../http/bounded-body.ts) collect bounded bytes and decode and parse complete JSON bodies.
- [file-read.ts](file-read.ts) parses file replies and runs the metadata fallback.
- [file-read.test.ts](file-read.test.ts) checks size results and safe errors from the metadata fallback.
- [file-write.ts](file-write.ts) validates upload grants and runs the internal file write.
- [file-write-body.ts](file-write-body.ts) counts streamed bytes without buffering the file.
- [file-write.test.ts](file-write.test.ts), [file-write-failure.test.ts](file-write-failure.test.ts), and [file-write-response.test.ts](file-write-response.test.ts) check bytes, path binding, credential separation, safe failures, and response budgets.

See the [access requirements](../../docs/protocol/isolation.md#orgs-and-workspaces),
the [rules of the app's Boat key](../../docs/protocol/isolation.md#the-apps-boat-key),
and the [file requirements](../../docs/protocol/workspace-tools.md#files-and-changes).
