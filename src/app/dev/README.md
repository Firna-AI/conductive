# Development backend

The development backend keeps the app's fake API state and preview options.
[The development fake](../dev-fake.md) describes its options, uploads, and file copies.
[Run it](../README.md#run-it) gives the commands and the limits of its chat.

`settings-routes.ts` uses the shared `savedSkillsRepositorySettings` rule
for the skills source and its named trust grant. Source replacement clears
trust unless the same request grants it to that replacement. Saves of
scripts or env vars keep the pair. Trust changes start no simulated build.

The operator Overview includes sample long runs from `fixtures/operator.ts`
under `src/test-support/`. Their start and activity times stay fixed across
refreshes. Org and owner status marks follow Suspend and Lift.
The Orgs search finds each sample cloud computer ID.

The fake org detail sets `switchAvailable: true`. Switch account stays
available locally while production admission is off. `?operator=1&switches=1`
shows the full sample switch flow.
