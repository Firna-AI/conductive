# Provider accounts and Switch account

This guide belongs to [the operator section](README.md). It gives the
Providers tab, the account choice of Create org, and the Provider account
box of the page of an org, with Switch account and Stop switch.
[Provider accounts](../../../docs/protocol/provider-accounts.md) and
[Switch account](../../../docs/protocol/switch-account.md) give the
requirements.

## Provider accounts

- The Providers tab reads `GET /api/operator/providers` when it opens. The
  reply lists every configured account in ID order, with its weight for new
  orgs and its orgs, and the last change with its operator. A failed read
  shows Try again and no weight, because a weight that did not load is not
  the default.
- Two accounts share one slider. One account gets a line that it gets every
  new org, and no control. Three or more accounts get a whole-percent field
  each, and a line with the total. The tab names each account by its ID.
- Save weights sends `PUT` with `{weights}`, a whole percent for every
  account. It is on only while the weights differ from the saved ones and
  add up to 100%, and it ignores presses while the save runs. The reply
  shows at once, with "Changed on" and its operator. A failed save keeps the
  weights that the operator chose and shows that they were not saved.
- The Orgs tab gives the account of each org in an Account column, and a
  phone gives it in a second line under the name. The page of an org gives
  it in its Provider account box. Each shows the ID that the reply gives,
  also an ID that the settings no longer hold.
- Create org of an operator reads the same accounts for its Provider account
  choice: By weights, the default, and every configured ID. Only an
  operator's screen sends that read, and only a chosen account goes into
  the create as `providerAccount`. The create does not wait for the read.
  While it runs, a spinner takes the place of the choice, and a failed read
  shows Try again.
- `operator_required` on any of these reads or writes takes the section and
  the choice away, as on the other tabs.

## Switch account

- The Provider account box of the page of an org sits between Details and
  Workspaces. It gives the account, the switch that waits, builds, or
  failed, the last switch, and the workspaces on each account while the
  org has workspaces on more than one, from the switch fields of the org
  detail. [The page of the org](../../../docs/protocol/switch-account.md#the-page-of-the-org)
  gives the rules.
- The page reads the configured accounts when it opens, with the read of
  the Providers tab. Switch account offers each account other than the
  account of the org. While that read runs, the box offers no switch. A
  failed read shows Try again in the box. With no other account, a line
  says that the account of the org is the only configured one.
- While a switch waits or builds, Stop switch takes the place of Switch
  account, and it needs no read of the accounts. After a failed switch
  build, Switch account takes the primary colour.
- Switch account and its question require `switchAvailable: true` in the
  org detail. A false or absent value hides them. The Provider account box
  keeps its other fields and Stop switch. The activation variable and its
  release sequence live in the [operator API guide](../../../worker/operator/README.md#activation-and-rollback).
- The question of a new switch takes the wait from `switchWaitReason` and
  `runningJob`, the wait of a new switch build now. The box takes the wait
  of a switch that waits from its record. A build or a refresh that runs
  gets the offer to end it, off by default. While a switch waits for Lift,
  the question of Lift says that Lift starts the switch build.
- A reply without the switch fields, from an older Worker, shows the
  account and offers no switch, because that Worker has no switch route.
- `account-switch.ts` turns the fields of the reply into the words of
  `switchCopy.ts`: times as the page writes them, a run length as the
  Cloud computer tab writes it, and the cause of a failed switch build in
  the words for the operator.
