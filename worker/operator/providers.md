# Provider weights

This page belongs to the [operator backend](README.md). The
[Providers tab](../../docs/protocol/operator-section.md#the-providers-tab)
holds the requirements.

`operatorProvidersPath()` in
[`src/shared/operator-providers.ts`](../../src/shared/operator-providers.ts)
returns `/api/operator/providers`.
GET and PUT use the normal app gate, then the shared operator identity check.
Another signed-in user gets 403 `operator_required` with the existing message.

GET returns `OperatorProvidersResponse`:

- `accounts` lists only configured IDs, in ID order.
- Each account has `id`, its effective integer percentage as `weight`, and `orgs`.
- `orgs` counts every stored org on that account, including deleted orgs.
- A configured account with no org has zero.
- `updatedAt` is the last actual change time in Unix milliseconds, or null.
- `operator` gives that operator's GitHub ID and login, or null.
- The account configurations and credentials never enter the reply.

The same GET supplies Create org with its configured choices.
The shared [assignment service](../provider-assignment/README.md) owns
effective distribution recovery. GET and assignment use the same percentages.
An existing org or saved resource never receives that recovery fallback.

PUT takes `UpdateOperatorProvidersRequest`, with a `weights` object.
Its keys are configured account IDs. Values are whole percentages from 0
through 100. Omitted configured IDs have zero weight. The total is 100.
Invalid distributions get 400 `invalid_input` with one recovery instruction.
The reply has the same shape as GET.

`provider_assignment_settings` keeps the raw distribution and current actor/time.
`provider_assignment_events` retains each actual change with its actor/time.
The update compares canonical effective weights with the current setting.
An equal distribution changes nothing, including raw weights and actor/time.
A changed distribution uses a compare-and-swap D1 batch for the event and setting.
After a concurrent write, it reads again and applies the requested distribution
unless that distribution is already current. A failed write rolls back both records.
Operator deletion sets its references to null and keeps the event.

`OperatorOrgSummary` and `OperatorOrgDetail` include the persisted
`providerAccount`. Their reads retain a missing configuration ID too.
Normal member org replies still give no provider field.

## Key code

- [providers-route.ts](providers-route.ts): GET and PUT dispatch after the app gate.
- [providers.ts](providers.ts): input parsing, effective reads, and update retries.
- [providers-data.ts](providers-data.ts): consistent setting/actor and org count reads.
- [Assignment data](../provider-assignment/data.ts): the atomic conditional event and setting write.
- [Browser reader](../../src/app/api/read-operator-providers.ts): shared response decoding.

## Development

Run `npm run test -- worker/operator/providers.test.ts worker/operator/providers-atomic.test.ts src/app/api/read-operator-providers.test.ts`.
The route tests use local D1 and the real request gate.
They cover operators, configured IDs, counts, repeats, concurrent equal updates,
invalid distributions, and batch rollback.
