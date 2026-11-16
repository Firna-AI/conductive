# Org secrets

This folder stores the encrypted secrets of an org and their persistent
grants. The browser settings routes use it. Secrets stay separate from
the env vars that each cloud computer gets at start.

## Storage and access

`org_secrets` holds one record per secret. Its name is unique in its org.
The encryption context binds each value to its org and secret ID.
Metadata reads never select the ciphertext. The creator ID stays as an
opaque attribution ID after account removal. A removed account has no
display record in replies.

Workspace pre-approvals and session approvals reference secret IDs.
Their foreign keys enforce the org of both the secret and workspace.
Deleting a secret deletes both kinds of grant. Sessions live in Durable
Object storage, so their approval rows carry the workspace and session IDs.

The settings API uses the existing member and admin permission helpers.
Each SQL write repeats its membership, suspension, and role checks.
List, create, Replace, and all-agents replies return metadata only.
Reveal uses `POST /api/orgs/:orgId/secrets/:secretId/reveal` with the common
Origin and org write gates. Only an admin can reveal one value.
The reply holds only `value`. Secret metadata includes `lastReveal`, with
`revealedByUserId`, `revealedBy`, and `revealedAt`, or null.
One SQL statement records the reveal and reads its ciphertext,
so an overlapping Replace cannot change which value the record names.

`org_secret_reveals` keeps the org, secret ID, secret name, value version,
admin ID, and time of each reveal. Its org foreign key deletes the records
when the org is purged. Secret and admin IDs are opaque, so deleting a
secret or account keeps the records. No reveal record holds a value.
The last reveal in metadata joins the secret's current value version.
Replace increments that version only when it replaces the value.
Description and all-agents changes keep the version and last reveal.

Secret requests and temporary values are not wired here.

## Key code

- [data.ts](data.ts): `listSecrets`, `readSecret`, and the encryption context.
- [access.ts](access.ts): the creator and admin rights and guarded SQL access.
- [writes.ts](writes.ts): secret creation, replacement, deletion, and the all-agents mark.
- [reveals.ts](reveals.ts): `recordSecretReveal`, the guarded reveal record and ciphertext read.
- [capabilities-data.ts](capabilities-data.ts): workspace capabilities and session approval metadata.
- [capabilities-writes.ts](capabilities-writes.ts): workspace pre-approvals and removal of session approvals.
- [capabilities-input.ts](capabilities-input.ts): capability request parsing and create defaults.
- [Settings routes](../app-api/secrets.ts) and
  [capability routes](../app-api/capabilities.ts): the signed-in browser API.

## Development

Run `npm run test -- worker/app-api/secrets.test.ts worker/app-api/secrets-reveal.test.ts worker/app-api/secrets-reveal-lifetime.test.ts worker/app-api/capabilities.test.ts worker/app-api/create-capabilities.test.ts worker/lifecycle/create-capabilities.test.ts worker/devices/mac-access.test.ts` from the repository root.

See [Secrets](../../docs/protocol/secrets.md) and
[Secret requests](../../docs/protocol/secret-requests.md) for the requirements.
