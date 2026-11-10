# Pricing

This doc holds the requirements and the decisions in force for the plans
and the prices of Conductive, and for its pricing page. Billing has not
started. So this doc says what holds now, and what holds when billing
starts. The terms are those of the
[architecture doc](../architecture.md#terms). A decision number names a
dated record, as [Decision numbers](../architecture.md#decision-numbers)
says. The [marketing mockups](../mockups/marketing-site.md#the-pricing-page)
draw the page at `marketing/pricing`, and that mockup is its visual spec.

## Before billing starts

- Conductive is free until billing starts, as the user chose on
  10 November 2026. Nobody pays until they choose a plan.
- Billing has no start date. The pricing page gives none.
- The site and the app have no checkout. The app has no billing tab, no
  plan for each org, and no record of the hours of each org.
- The app enforces no limit of the plans.
- The plans, the cloud hours, and the extra hours of this doc apply when
  billing starts. Until then, the pricing page shows them.
- A page with no prices until billing starts was rejected, because the
  user asked for the pricing page now.

## Who pays

- When billing starts, each org pays for its members and for all its
  compute, as the user chose for decision 27 B. A plan for each user was
  rejected, because the org is the payer.
- Each org then has one plan. It pays a monthly price for each member, with
  cloud hours included, and a price for each extra hour (decision 250).
- Reason: the user asked for a subscription with some use included, and a
  charge for the use past it. Invoices by hand, a flat price with fair-use
  limits, and a price for use alone were rejected.
- A price for each workspace was rejected, because agents create
  workspaces in bursts, so its bills are hard to predict.
- The [waitlist](waitlist.md) stays when billing starts, and the free plan
  gives free use (decision 251). A trial, a card at sign-up, and an open
  sign-up were rejected. Reason: the user chose a free plan with a limit
  of workspaces, and decision 160 keeps the waitlist.

## The plans

The plans apply when billing starts (decision 253). Each price is for one
month, in US dollars.

| Plan | Price | Cloud hours each month | Workspaces that are not archived | Extra hours |
| --- | --- | --- | --- | --- |
| Free | $0 | 20 for the org | Up to 3 | None |
| Plus | $20 for each member | 275 for each member | No limit | $0.07 each |
| Pro | $50 for each member | 700 for each member | No limit | $0.07 each |
| Ultra | $200 for each member | 2,750 for each member | No limit | $0.07 each |

- Each person gets one free org.
- Free limits only its workspaces and its hours. No plan limits the cloud
  computers that run at once.
- Reason: the user chose to limit only the free plan. A limit at once on
  every plan was rejected for that reason.
- Archived workspaces do not count toward the limit of Free. Reason: an
  archived workspace has no running cloud computer. Archive stops its cloud
  computer, which keeps its files at no cost until the app deletes it 14
  days after the Archive, as [Archive](workspace-life.md#archive) says.
- Each paid plan includes cloud hours worth about half its price at the
  app's cost. Reason: the user's sketch included about $10 of use in a plan
  of about $20.
- Other hour counts, other prices of an extra hour, and plans without Pro
  were rejected.
- A higher price for each member of a larger org, and prepaid packs of
  hours, were not chosen. Unlimited hours were rejected, because the user
  asked for a charge for use past the included hours.
- The plans have no Enterprise plan. Reason: Enterprise plans stay Under
  consideration on the [comparison page](conductor-comparison.md).
- Prices are monthly only. Reason: yearly plans bring refunds and changes
  that the first billing change does not need.
- Prices are in US dollars. Reason: every competitor and the costs of the
  provider use them. Prices in pounds for UK buyers were rejected
  (decision 254).

## Cloud hours

- Every cloud computer has 4 vCPU and 8 GB, as
  [The provider](workspaces-and-sandboxes.md#the-provider) says. So each
  cloud hour is an hour of a computer of that size.
- The cloud hours of all members of an org form one pool. Every cloud
  computer of the org uses that pool.
- The pool counts every minute that a cloud computer of the org runs. This
  includes the cloud computers of workspaces, and the builds and the
  refreshes of the org image. It also includes the short restarts near
  day 14 of a stop.
- Reason: the org pays for all its compute, and one rule is the easiest
  for an org to check.
- A cloud computer stops after 30 minutes without activity, unless an
  agent turn runs, as [Stop and resume](workspace-life.md#stop-and-resume)
  states. A stopped cloud computer uses no hours.

## Extra hours

- An org on a paid plan can use more hours than its pool. Each extra hour
  costs $0.07 (decision 253). Reason: it is twice the app's cost, as the
  user's sketch asked.
- An admin of the org sets a monthly limit of extra hours. The org pays for
  extra hours up to that limit.
- Free has no extra hours.

## Seller and tax

- Firna Ltd sells Conductive to businesses and to consumers (decision 252).
  Reason: single developers are a main group of buyers.
- Sales to businesses only were rejected. Stripe Managed Payments as the
  merchant of record, for 3.5% more, was rejected too. Paddle and Polar
  were left out, because the user chose Stripe for decision 26.
- When billing starts, Stripe Billing takes the payments (decisions 26 A
  and 252).
- Firna uses no Stripe Tax (decision 254). The operator works out and
  files the tax by hand, from the country of each customer in Stripe.
- Prices exclude tax. Tax can come on top of a price. So the pricing page
  says "Prices exclude VAT and sales tax." It does not say that checkout
  adds the tax, because nothing adds it by itself.
- Decision 254 rejected these options:
  - the UK price with VAT beside each price
  - prices that include any tax
  - a price with the tax of the country of each visitor
  - a table of the totals with the VAT of each EU country
- Reason: the user chose to add no tax by itself. The user accepted the
  risk that UK and EU consumer rules ask for consumer prices with VAT.

### Planned tax rules

These rules are planned. They apply when billing starts, to a UK seller
that is VAT registered, as Firna Ltd is. The operator applies them by
hand. An accountant should confirm them before the first sale.

- UK buyers, consumers and businesses, pay 20% UK VAT. A UK business
  reclaims it. The VAT goes on Firna's UK VAT return.
- An EU business with a valid VAT number pays no VAT on the invoice. The
  invoice says "reverse charge", and the buyer accounts for the VAT. Stripe
  Checkout can collect the number.
- An EU consumer pays the VAT of their own country from the first sale. A
  UK seller has no threshold for these sales. Firna registers for the EU
  non-Union OSS scheme in one EU country, and files one EU return each
  quarter. The operator finds the rate by hand. The billing country and
  the card country in Stripe give the two pieces of location evidence.
- A buyer in another country pays no UK VAT, because the sale happens
  where the buyer is. Most places tax a foreign seller only after a
  threshold, such as $100,000 of sales in one US state. Some start sooner.
  Switzerland taxes the first Swiss sale once the seller's sales in the
  whole world pass CHF 100,000. The operator tracks the thresholds by hand.
- Services that Firna buys from abroad, such as Boat, fall under the
  reverse charge on Firna's own UK VAT return.
- VAT that Firna does not add on top of a price is still due. Firna then
  pays it from the price, as UK VAT is one sixth of a price with VAT.

## The pricing page

- The page lives at `https://conductive.build/pricing`, on the
  [marketing site](../architecture/marketing-site.md). Visitors need no
  sign-in.
- The page has no note that Conductive is free until billing starts, as
  the user chose on 10 November 2026.
- The page shows each plan with its price, what the price covers, and what
  the plan includes. A line under the plans says that the prices are
  monthly, in US dollars, and gives the tax line.
- The page then says how cloud hours count. It gives:
  - the size of each cloud computer
  - the one pool of the org
  - the rule that every minute of every cloud computer counts
  - the stop after 30 minutes without activity, unless an agent turn runs
  - the price of an extra hour, and its monthly limit
- The page offers no way to choose or buy a plan. No plan has an action,
  and no plan is marked as the best. Reason: billing has not started, and
  no decision ranks a plan.
- The page ends with the last call to action of the site. Its main action,
  "Sign up", starts the GitHub sign-in, and a new account then waits for
  app access. Its second action, "Download for Mac", leads to the Mac app
  section of the home page.
- Each price is a fixed number in US dollars. The page never gives a price
  as a multiple of the provider's price. Reason: user-facing text never
  names Boat, as [The provider](workspaces-and-sandboxes.md#the-provider)
  says.
- The page names the agents as
  [Names in the product](agents-and-sessions.md#names-in-the-product) says.
- The page and its mockup show the same plans, prices, hours, and words.
- The page is static content. It runs no script, sets no cookie, has no
  tracking, and reads no user data.
- The Worker serves the page as it serves the other pages of the site,
  with the same methods and response headers.
- The browser title of the page names the page and the product.
- The page follows the colour scheme of the visitor. Its content fits the
  width of the page at each width from 320 px, so it never scrolls
  sideways.

## Entry points

- The desktop header and the Product column of the footer link the page.
- On the page, the header marks Pricing as the current page, for sight and
  for screen readers.
- The phone header keeps its links, because it has no free width. A phone
  reaches the page from the footer.

## Planned changes

These changes are planned. None is built yet. Each is a separate change,
with its own design.

- Billing:
  - Stripe Checkout, the Customer Portal, and signed Stripe events.
  - The plan of each org, and a billing tab.
  - Terms for paid plans.
  - The consumer pages of decision 35 D. They are a refund policy, a
    cancellation policy, and a contact page with the business details.
    They also add the EU function to withdraw from a contract, and
    agreement to the terms at checkout.
  - Checkout collects the billing address, so that the operator sees the
    country of each customer.
- Usage: the hours of each org and the charge for extra hours. This uses
  the existing record of every cloud computer of each org.
- Plan limits in the app: the 3 workspaces and the 20 hours of Free.

The designs of those changes answer these questions:

- What an org keeps when it does not pay or cancels, as closed decision 38
  asked.
- How the bill follows a member who joins or leaves in the middle of a
  month, as closed decision 40 asked.
- The start limits for each member, as closed decision 34 asked.
- The registration of Firna for the EU OSS scheme.
- A larger Boat plan, when paying orgs need more starts or more machines
  at once. Paid plans have no limit at once. So the shared capacity of the
  provider account of each org is its only cap, as it is for every org
  today.
