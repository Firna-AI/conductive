# Provider assignment

This service selects the fixed provider account of a new org. Create org
calls it after it checks repositories, before its D1 insert and first build.
It changes no existing org, workspace, or saved resource account.

The D1 singleton `provider_assignment_settings` stores raw percentage
weights. It starts with `boat` at 100%. Its actor and time start empty.
`provider_assignment_events` keeps raw changes with an operator and time.
The [operator API](../operator/providers.md) commits each actual change and
its event in one D1 batch. An equal effective distribution keeps the raw
setting, actor, time, and event list unchanged.

The shared [account reader](../sandbox/accounts.ts) reads JSON text from
the `SANDBOX_PROVIDER_ACCOUNTS` secret. It always pins `boat` to
`BOAT_API_KEY` and `BOAT_ORG_ID`. Invalid entries produce a fixed safe
warning. They expose no credential and do not remove other valid entries.

Effective weights include only configured IDs, in sorted order. They
normalize positive shares to integer percentages with largest remainder
rounding. Equal remainders use account ID order. When no share remains,
Boat receives 100%. Recovery writes a fixed warning. It changes no raw
setting or audit record.

The draw hashes one fresh random token. Its first 48 bits select one point
in the effective distribution. A configured operator choice skips the draw.
An absent choice means By weights. A stale or malformed operator choice
uses the weights with a fixed safe warning. A non-operator choice is
ignored before parsing.

Unknown accounts on saved orgs and resources never use these assignment
fallbacks. Their provider lookup raises `ProviderAccountError` before any
provider request.

## Development

Run `npm run test -- worker/provider-assignment worker/app-api/feature-org.test.ts`.
The tests use local D1 and deterministic random tokens.

### Key code

- [selection.ts](selection.ts): account selection and effective saved weights.
- [weights.ts](weights.ts): configured shares, rounding, and safe recovery.
- [data.ts](data.ts): the raw D1 setting reader.
- [feature-org.ts](../app-api/feature-org.ts): selection before org creation.
- [org-provider-account.ts](../data/org-provider-account.ts): the fixed org account reader.

### Related docs

- [Provider accounts](../lifecycle/provider-accounts.md)
- [The account of an org](../../docs/protocol/workspaces-and-sandboxes.md#the-account-of-an-org)
