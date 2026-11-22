# Provider accounts

This doc holds the requirements and the decisions in force for the
provider account of each org and of each workspace, and for the regions of
the provider accounts. It belongs to
[Workspaces and sandboxes](workspaces-and-sandboxes.md).
[The provider](workspaces-and-sandboxes.md#the-provider) gives the
providers and the accounts of the app. [Switch account](switch-account.md)
holds the switch of an org to another account by an operator. The terms
are those of the [architecture doc](../architecture.md#terms). A decision
number and an e2b decision number name dated records, as
[Workspaces and sandboxes](workspaces-and-sandboxes.md) says. A switch
decision number names a decision of the change that adds Switch account,
as that doc says.

## The account of an org

- Each org runs on one provider account at a time, the account of the org
  (e2b decision 222). Its new workspaces, its builds, and its refreshes use
  that account. The one exception is the
  [switch build](switch-account.md#the-switch-build).
- An org from before the second provider runs on `boat`.
- An org gets its first account when it is created, before its first
  build starts.
- When an operator creates an org, the operator can choose its account,
  as [Orgs](orgs-and-members.md#orgs) says. Otherwise, the app draws the
  account from the weights.
- An operator can later switch the org to another configured account, as
  [Switch account](switch-account.md) says. The account of the org changes
  when the build on the new account succeeds (switch decision 1 B).
- A standby on E2B for all orgs was rejected (e2b decision 222). This
  covers a switch of every org at once, an automatic failover, and an
  overflow by capacity. Reason: each org then needs one current org image
  and one build at a time, with no second copy to keep current on the
  other provider.
- The weights give the chance, in percent, that a new org gets each
  account. They add up to 100%, and they start at 100% for `boat`.
- Only a configured account can have a weight. A configured account is an
  account whose credentials the Worker holds.
- An operator sets the weights on the
  [Providers tab](operator-section.md#the-providers-tab) of the operator
  section. A change of the weights moves no org.

## The account of a workspace

- A new workspace starts on the account of its org at its create
  (switch decision 1 B). This holds for each new workspace: from the app,
  as a sub-workspace, from an agent tool, and for an automation run.
- A workspace keeps its account for each action on its sandbox. These
  actions include a resume, the restart near day 14 of a stop, Continue, a
  repository change, Archive, and Restore. No sandbox moves to another
  account.
- Reason: the user asked that a switch changes only the account of new
  workspaces. So after a switch, an org can have workspaces on two
  accounts.
- Try again after a failed first start makes a new sandbox, as
  [A failed first start](create-a-workspace.md#a-failed-first-start)
  says. That sandbox starts on the account of the org at the time of Try
  again. Reason: the old account may have no refreshed image.

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
  and only test orgs run on it. This also holds for a switch, as
  [The switch](switch-account.md#the-switch) says.
