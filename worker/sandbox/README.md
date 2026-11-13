# Sandbox provider

This area owns the provider accounts, the lookup of the client of each
account, and the Boat transport. Boat is the only provider kind.
Production has one account, `boat`, with the app's one Boat key.
Every sandbox and every saved snapshot of every org lives in the app's own
Boat organization. The key does not keep the orgs apart, so each caller
authorizes its org and its resource before it asks for a provider, as
[Provider accounts](#provider-accounts) says.

The transport creates the API URL and headers from fixed routes.
It sends `X-Boat-Org` with the organization ID of its account on every
API request, `BOAT_ORG_ID` for `boat`. A change of the active Boat organization
of the key's user then moves no work of the app.
It forwards no browser cookie.

`SandboxProvider.privatePort(sandboxId, port, mode)` calls only the fixed host
route. It requires explicit localhost or network mode and private access.
It parses the provider URL into a `PrivatePort`: a server-only origin and the
[port credential](#port-credentials) that the client builds.
`SandboxProvider.desktop(sandboxId)` calls only the fixed desktop route.
It returns a typed ready URL or a starting result. Ready URLs require HTTPS
and a fragment token. The feature layer maps starting into its public response.
Both methods use the same `BoatTransport` as commands, lifecycle, and file reads.
The transport validates sandbox ID segments and centralizes errors and the organization pin.

`SandboxProvider.runCommand` and `SandboxProvider.startCommand` both call `POST /sandboxes/{id}/commands`.
`runCommand` waits for the command, with a 600 second Boat timeout and a 610 second request timeout.
`startCommand` starts a detached command, with a 30 second request timeout.
`SandboxProvider.getCommandStatus` reads detached output from byte offsets, with the same 30 second timeout.

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

The `boat` account, `DEFAULT_PROVIDER_ACCOUNT` in
[account-identity.ts](account-identity.ts), always uses `BOAT_API_KEY` and
`BOAT_ORG_ID`. The optional `SANDBOX_PROVIDER_ACCOUNTS` map of the trusted
Worker environment adds other accounts, each with its kind, API key, and
organization ID. It cannot replace `boat`. Production does not set it.
Tests set it for a second Boat organization.

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
   `snapshot.read`, `snapshot.write`, `file.read`, `host`, and `desktop`.
4. Limit the key to one environment. Give it a lifetime of 365 days, and
   plan its replacement before that date.

Boat's `ci` preset deletes only the sandboxes that its own key created, so
the key needs custom actions. The fixed routes in [routes.ts](routes.ts) set
the actions. A new route can need a new action.
To replace the key, put the new key in the Worker secret. The new key must
reach the same organization, because the sandboxes and the org images
stay there.

## Response byte limits

[Response limits](response-limits.md) gives the byte budget of each fixed
route, and the errors of a response that passes its budget.

## Response failures

[Response failures](response-limits.md#response-failures) gives the errors
and cancellation rules when a response passes its byte budget.

## File reads

`SandboxProvider.fileInfo(sandboxId, path)` reads metadata without file content.
It uses the existing fixed `GET /sandboxes/{id}/files/info` route.
It returns the validated absolute path, byte size, and directory flag.
The adapter preserves typed provider errors, including 404 `not_found` and 503 `unavailable`.
Attachment delivery uses this method to check files that the cloud computer already received.

`SandboxProvider.readFile(sandboxId, path, maxBytes)` takes the backend's file byte limit.
It returns a file result or a size result.
The file result has the path, size, encoding, and content.
The size result has the exact reported file size and the caller's limit.

The adapter calls `GET /sandboxes/{id}/files` with the path and base64 encoding.
The budget is the sum of these values:

- Four bytes for each complete or partial group of three permitted file bytes.
- The UTF-8 byte length of the documented JSON envelope, with two-space formatting.

The envelope includes the JSON-escaped requested path and the largest safe integer size.
It also includes the response type, encoding, booleans, and empty content field.
The transport sends file content through the [shared bounded JSON reader](../http/README.md#bounded-json-reader).
Its byte collector counts each `Uint8Array.byteLength` before keeping the chunk.
When the next chunk crosses the budget, it cancels the stream and discards that chunk.
The shared JSON reader decodes and parses only after the complete body fits.

After a successful file content overflow or a typed provider error, the adapter calls `GET /sandboxes/{id}/files/info` with the same path.
It checks Boat's flat metadata response.
It checks the path in both file and metadata responses.
The metadata request uses the 1 MiB response budget.
The [primary file reference](https://docs.boat.dev/api/reference/agent/read-sandbox-file)
and [metadata reference](https://docs.boat.dev/api/reference/agent/get-sandbox-file-info)
define these two routes.

The metadata fallback returns the size result only when valid metadata gives a size above `maxBytes`.
Otherwise, the read fails with a safe error:

- After a successful file content overflow, valid metadata with a size at or below `maxBytes` gives the `invalid_response` provider error with status 502.
- After a successful file content overflow, a metadata failure gives its own safe error.
- After a typed provider error, that error stays when the metadata is valid or the metadata failure is a typed provider error.
- After a typed provider error, an oversized metadata reply gets the generic response error.

The [Files backend](../files/README.md) checks decoded byte counts and converts file content for browser responses.
Provider failures use safe typed errors.
Upstream error messages never reach the browser.

## Attachment downloads

Attached files reach the sandbox through detached commands.
The cloud computer downloads each file from a one-use route on the machine host.
The command checks its size before an atomic move to the repository path.
The provider needs `exec` for these commands.
[Chat attachment delivery](../chat/attachments.md#dispatch) owns the download tokens, access checks, command, and polling.

## Development

Run `npm run test -- worker/files worker/sandbox` from the repository root with Node 24.
Tests use [FakeBoat and local storage](../test-support/README.md).
`FakeBoat.addAccount` gives the fake server a second organization with its own key, for a second account.
The transport tests use counted streams to check exact budgets and early cancellation.

### Provider contract suite

[provider-contract.test.ts](provider-contract.test.ts) runs one shared set of
`SandboxProvider` assertions against the Boat adapter. The shared modules
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

`createBoatContractFixture` in [boat-contract.test-support.ts](boat-contract.test-support.ts)
is the Boat driver. With [boat-contract-replies.test-support.ts](boat-contract-replies.test-support.ts),
it turns each `ContractReply` into `FakeBoat` replies. A failure without its
own provider code or retry wait gets `provider_code` and 3 seconds.

Boat routes, headers, bodies, byte budgets, input checks, `fork`, and
`hydrated` stay in the Boat tests beside the adapter. The suite leaves out
`fork`, because no production code calls it. The lifecycle tests keep the
replay of a lost create, and the Files tests keep the production 5 MiB limit.

A new adapter needs a factory and a driver that turn the same `ContractReply`
values into replies of its own fake server, with the same failure defaults.
Its entry calls each `register…Contract` function with that factory. Its wire
tests stay beside the adapter.

### Key Code

- [provider.ts](provider.ts) defines the server's sandbox and file read interface, with `PrivatePort` and `PortCredential`.
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
- [file-read.ts](file-read.ts) validates file metadata, parses file content replies, and runs the metadata fallback.
- [file-read.test.ts](file-read.test.ts) checks size results and safe errors from the metadata fallback.

See the [access requirements](../../docs/protocol/isolation.md#orgs-and-workspaces),
the [rules of the app's Boat key](../../docs/protocol/isolation.md#the-apps-boat-key),
and the [file requirements](../../docs/protocol/workspace-tools.md#files-and-changes).
