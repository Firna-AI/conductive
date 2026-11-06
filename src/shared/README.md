# Shared contracts

These modules define the browser API and the runner protocol.
They use JSON values and plain TypeScript types.
They import no Cloudflare types, provider SDKs, or test fixtures.
Dates use Unix milliseconds. IDs and model names are opaque strings.

Each area owns its paths and payloads. Import from that area directly.
`api.ts` keeps the existing sign-in and org paths and common records.
`EmptyRequest` means an empty JSON object, including DELETE requests.
`repositoryPath` names one repository of an org. PUT adds it and DELETE
removes it. Each request sends `EmptyRequest` and returns the current list.

`runner.ts` defines the versioned handshake, commands, numbered events,
confirmations, and resend rules. Its comments state the delivery contract.
`runner-transport.ts` defines the injectable socket boundary.
Runner commands carry each message sender's login. Browser response types do not.
An uploaded attachment reaches the runner as a path, after the backend puts it there.

`files.ts` defines full trees, tree updates, and branch changes.
A full tree contains paths relative to the repository root.
A move names its old path and its new entry.
A directory move includes updates for its descendants.
Tree revisions increase within a runner connection.
Each connection starts with a full tree.
Branch changes include committed, staged, unstaged, and untracked work.
`runner-files.ts` defines file read and diff commands and their matching results.
The backend sets the read limit. The sample limit in the fixtures is not product policy.
Read and diff results do not enter the stored chat event stream.

`events.ts` defines the browser stream. Its event numbers span all sessions
and runner connections of one workspace. A reconnect uses the last stored number.
The history response gives the point after which live events continue.

The machine and preview hostnames remain deployment settings.
The git credential payload is not defined yet.
[GitHub tokens](../../docs/protocol/access-and-security.md#github-tokens) states its rule.

## Key code

- [Org contracts](orgs.ts) carry custom initials and GitHub repository choices for org creation.
- [Account contracts](account.ts) include the repository list available before an org exists.
- [Org settings](org-settings.ts) carry the base image software for the Cloud computer tab.
- [Base image](base-image.ts) records the software labels, their primary source, and the source check date.
- [Browser fakes](../test-support/README.md) use these response types.
- [Runner fakes](../../worker/test-support/README.md) use these message types.
- [Migrations](../../migrations/README.md) define the D1 tables and reserved ranges.
