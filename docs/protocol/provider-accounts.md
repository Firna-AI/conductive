# Provider accounts

This doc holds the requirements and the decisions in force for the
provider account of each org and for the regions of the provider accounts.
It belongs to [Workspaces and sandboxes](workspaces-and-sandboxes.md).
[The provider](workspaces-and-sandboxes.md#the-provider) gives the
providers and the accounts of the app. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number and an e2b
decision number name dated records, as
[Workspaces and sandboxes](workspaces-and-sandboxes.md) says.

## The account of an org

- Each org runs on one provider account for its whole life
  (e2b decision 222). Each workspace, build, and refresh of the org uses that
  account.
- An org from before the second provider runs on `boat`.
- No org and no workspace moves to another account. A move by an operator
  was dropped for now (e2b decision 222). The choice of an operator at create
  puts a test org on each provider instead.
- A standby on E2B for all orgs, with a switch, an automatic failover, or
  an overflow by capacity, was rejected (e2b decision 222). Reason: one
  account for each org needs one org image and one build at a time, with
  no second copy on the other provider.
- An org gets its account once, when it is created, before its first
  build starts.
- When an operator creates an org, the operator can choose its account,
  as [Orgs](orgs-and-members.md#orgs) says. Otherwise, the app draws the
  account from the weights.
- The weights give the chance, in percent, that a new org gets each
  account. They add up to 100%, and they start at 100% for `boat`.
- Only a configured account can have a weight. A configured account is an
  account whose credentials the Worker holds.
- An operator sets the weights on the
  [Providers tab](operator-section.md#the-providers-tab) of the operator
  section. A change of the weights moves no org.

## Regions

- A region is the place where the machines of a provider account run.
  Each account runs its sandboxes and its org images in one region.
- An account can be in any region. The EU is not a requirement for a
  provider or for an account.
- A rule that keeps every sandbox in the EU was rejected. Reason: no
  user, contract, or law needs the EU.
- A review of a new provider weighs the region as a preference. It counts
  the latency to the users and to the app's servers, and the change to the
  legal pages. A region outside the EU does not rule a provider out.
- Before a real org runs on an account in a new region, the Privacy page
  of the site names the countries of that region. For a region outside
  the European Economic Area, the page also names the protection of the
  transfer from the UK. Until then, the weight of the account stays at 0%,
  and only test orgs run on it.
