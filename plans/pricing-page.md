# Pricing page

Status: Active. On branch `calummoore/billing-brainstorm`, no pull request yet. The pull request that completes the work deletes this plan, as the `plans` skill says.

Conductive is free with no limits, and the app's own Boat account pays for
every cloud computer (decisions 45, 80, and 81). On 10 November 2026 the
user asked for billing. A brainstorm on that day chose the approach: a
monthly price for each member, with cloud hours included and a price for
each extra hour, and a free plan with a workspace limit (decisions 250 to
252). The user chose the scope of this change on the same day: agree the
pricing, and add a pricing page to the marketing site. The page sells
nothing yet. It says that Conductive stays free until billing starts.

This change adds no Stripe account, checkout, billing tab, usage records,
plan limits in the app, or Terms for paid plans. Later changes add them,
as "Later changes" says. The brainstorm notes and their sources are in
`.context/billing-brainstorm/notes.md`.

Contract owners:

- `docs/protocol/pricing.md`, a new protocol doc from Milestone 2.
- [Orgs and members](../docs/protocol/orgs-and-members.md).
- [Marketing site](../docs/architecture/marketing-site.md).
- The [marketing site README](../src/marketing/README.md).
- The [mockups README](../docs/mockups/README.md).

## Decisions

Decisions 250 to 252 are the answered items of the brainstorm. Decisions
253 and 254 are open. The numbers start at 250, because other open
branches use numbers up to 241.

### 250. Choose what an org pays for

- **Severity:** High. **Effort:** Large.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/orgs-and-members.md:47`
- **Background:** The app's own Boat account pays for every cloud computer (decision 80). The product is free with no limits (decisions 45 and 81). A default cloud computer costs the app about $0.036 an hour.
- **Problem:** No requirement says what an org pays for.
- **Impact if no action:** The operator pays every cost and earns nothing.
- **Root question:** What does an org pay for when it uses Conductive?
- **Options:**
  - **A.** The operator invoices each approved org by hand. Effort: Medium.
  - **B.** A flat monthly price for each member, with compute included and fair-use limits. Effort: Large.
  - **C.** A price for each member with included compute and a charge for extra use. Effort: Large.
  - **D.** Orgs pay only for machine time, with prepaid credits or a monthly bill. Effort: Large.
- **Left out:** A Boat key for each org, because decision 80 reversed it. Resold model use, because each session runs on its starter's own login (decision 24). A plan for each user, because the user chose the org as the payer (decision 27 B). A price for each workspace, because agents create workspaces in bursts and bills are hard to predict. Billing without a provider (decision 26). Staying free, because it fails the goal.
- **Wider fix:** None. This is a design question.
- **Previous examples:** Decisions 23, 25, 26, and 27 of 5 November 2026 in `plans/boat-native-remote-workspaces.md`. Commit `2506398` drew billing screens, and commit `967b916` removed them. Firna-AI/ciproxy PR #14 built Stripe subscriptions in Rust.
- **Recommendation:** B. Compute is cheap enough to include, and limits protect the shared start pool.
- **Action:** ask the user, because the options trade a simple price against fairness to light users.
- **Chosen:** C, by the user on 10 November 2026: "charge 2x outside the sub for the usage, maybe only $10 included", with three paid plans near $20 to $30, $50 to $60, and $200. The agent recommended B. Decision 253 sets the numbers.

### 251. Choose who may use Conductive without paying

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/waitlist.md:17`
- **Background:** The waitlist is the only control on cost today (decision 160). App access is final. Conductor Cloud gave no free cloud use.
- **Problem:** No requirement says who gets free use, or whether payment can replace the waitlist.
- **Impact if no action:** The plans cannot define the free use or the sign-up.
- **Root question:** Who may use Conductive without paying, and how do new people get in?
- **Options:**
  - **A.** Keep the waitlist. Each new org gets a trial, then needs a paid plan. Effort: Small.
  - **B.** Keep the waitlist, and add a free plan with limits. Effort: Medium.
  - **C.** Replace the waitlist with a card at sign-up and a trial. Effort: Medium.
  - **D.** Open sign-up with a free plan with limits. Effort: Large.
- **Left out:** None.
- **Wider fix:** None. This is a design question.
- **Previous examples:** Decisions 22 C and 25 D of 5 November 2026. Decisions 160 and 161 added the waitlist.
- **Recommendation:** A. The waitlist guards the start pool, and a trial lets a team try Conductive.
- **Action:** ask the user, because C and D change the waitlist decision in force.
- **Chosen:** B, by the user on 10 November 2026: "free plan could include max workspaces". Agent call: the waitlist stays, because decision 160 stays in force and the user did not ask to change it. The agent recommended A. Decision 253 sets the limits of the free plan.

### 252. Choose who sells Conductive, and to whom

- **Severity:** Medium. **Effort:** Medium.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `src/marketing/terms.ts:51`
- **Background:** For decision 26 the user chose Stripe Billing with Stripe Tax, so Firna Ltd is the seller and files the taxes. For decision 35 the user chose Privacy and Terms pages only.
- **Problem:** Consumers bring withdrawal and cancellation rights and EU VAT duties that business buyers do not.
- **Impact if no action:** The billing change cannot scope its legal pages, its checkout, or its tax registrations.
- **Root question:** Who sells Conductive, and who can buy it?
- **Options:**
  - **A.** Firna sells to businesses and consumers through Stripe Billing and Stripe Tax, with the consumer pages of decision 35 D. Effort: Medium.
  - **B.** Firna sells to businesses only, with a tax ID at checkout (decision 35 E). Effort: Small.
  - **C.** Stripe Managed Payments makes Stripe the merchant of record, for 3.5% more. Effort: Medium.
- **Left out:** Paddle or Polar as merchant of record, because the user chose Stripe over them for decision 26.
- **Wider fix:** None. This is a design question.
- **Previous examples:** Decisions 26 and 35 of 5 November 2026.
- **Recommendation:** A. Single developers are a main group of buyers.
- **Action:** ask the user, because the options trade tax and legal work against who can buy.
- **Chosen:** A, by the user on 10 November 2026. The user said that Firna is VAT registered in the UK. "Tax" under "Design" gives the VAT rules.

### 253. Agree the plans and prices

- **Severity:** High. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/pricing.md`, new in Milestone 2.
- **Background:**
  - Decision 250 chose monthly plans for each member, with included cloud hours and a price for each extra hour.
  - The user's sketch: three paid plans near $20 to $30, $50 to $60, and $200, about $10 of use included, and extra use at twice the app's cost.
  - Every cloud computer has 4 vCPU and 8 GB. Boat charges the app $0.036 for each hour of one.
  - Competitors charge $0.33 to $0.48 for an hour of a machine of that size: Amp $0.33, GitHub Codespaces $0.36 for 4 cores, and Paradev $0.48.
  - Paradev charges $20, $60, and $200 for each user. Its $20 plan includes no cloud hours. Its $60 plan includes 150 hours, and its $200 plan 500 hours. Amp charges $20 and $200, with about 375 and 4,000 hours at this size, and its paid plans also include model credits. Conductor Cloud charged $50 for one person and $60 for each team member.
  - The $20 Boat plan gives the whole app 100 machines at once and 200 starts a day. That is the limit at once of five Ultra members under these options, so sales need a larger Boat plan.
  - Boat's larger plans cost $100, $500, and $2,000 a month. They give 300, 1,000, and 2,000 machines at once, and 840, 1,680, and 2,400 starts a day. Each plan's price comes back as machine hours at $0.036, so a larger plan costs nothing more when the app uses its hours.
  - Two other costs grow with use. Each org image above the plan's allowance of saved images costs $1.68 a month. Each start above the plan's daily allowance costs $0.03 to $0.07.
- **Problem:** The pricing page needs exact plans, prices, hours, and limits.
- **Impact if no action:** The page cannot ship, and the billing change has no prices to build.
- **Root question:** What does each plan cost, what does it include, and how does an org pay for use past it? The options check widened it on 10 November 2026, because the way to pay for extra hours is open too.
- **Options:** Each option prices a paid plan for each member and each month, in US dollars. The org pays. The hours of the members of an org form one pool. Free has no extra hours. F, G, and H can each be combined with A or E.
  - **A.** Four plans. Free: one free org for each person, 3 workspaces that are not archived, 20 hours for the org, and 2 cloud computers at once. Plus: $20, 100 hours, and 5 at once. Pro: $50, 500 hours, and 10 at once. Ultra: $200, 2,500 hours, and 20 at once. Hours and the limit at once count for each member. Extra hours cost $0.10, up to a monthly limit that an admin sets. Effort: Small.
  - **B.** As A, but extra hours cost $0.07, twice the app's cost, as the user's sketch said. Effort: Small.
  - **C.** As A, but extra hours cost $0.25, nearer the market and still below Amp, Codespaces, and Paradev. Effort: Small.
  - **D.** As A, without the $50 plan: Free, Plus at $20, and Ultra at $200, as Amp does. Effort: Small.
  - **E.** Added by the options check. Each paid plan includes use worth half its price at the app's cost, as decision 23 B did. Plus is $20 with 275 hours. Pro is $50 with 700 hours. Ultra is $200 with 2,750 hours. Free and the limits at once stay as in A. Extra hours cost $0.07, twice the app's cost. When a member uses every included hour, the app keeps about 43% of the price after fees. With the org image of a one-member org, it keeps 35% to 44%. Starts above the allowance come on top. Effort: Small.
  - **F.** Added by the options check. Each paid plan has one price for an org with one member, and a higher price for each member of a larger org: Plus $20 or $30, Pro $50 or $60, and Ultra $200. Conductor Cloud used the pair $50 and $60. The bill changes when a second member joins, and the page shows two prices for each plan. Effort: Small.
  - **G.** Added by the options check. An admin buys extra hours in advance, in packs such as 100 hours for $10, with an optional top-up. The org then has no unpaid bill and needs no monthly limit. Work waits when the hours run out and the top-up is off. Effort: Small.
  - **H.** Added by the options check. The free plan gets no automatic refresh of the org image, as decision 25 D chose, because each refresh takes a start from the shared pool. Effort: Small.
- **Left out:** Unlimited hours on a plan, because the user asked for a charge past the included use. A price written as a multiple of the app's cost, because B and E give the same price as a fixed number that buyers can check.
- **Wider fix:** None. This is a design question.
- **Previous examples:** Decision 23 B of 5 November 2026: $30 for each member with $15 of compute, then the provider's price plus 10%. Decision 25 D: a free account with one org, 3 workspaces, and 600 minutes a month.
- **Related:** Decision 254 sets how the page shows tax on these prices. The follow-up item `plans/follow-ups/idle-org-daily-refresh.md` covers the refreshes of H for every idle org.
- **Recommendation:** E. The first recommendation was A. E follows the user's sketch: half of each price as use at the app's cost, and extra hours at twice the cost. It keeps about 43% of each price at full use, and more at normal use, and it brings Plus near Amp's 375 hours for $20.
- **Action:** ask the user, because only the user sets prices.

### 254. Choose how the pricing page shows tax

- **Severity:** Medium. **Effort:** Small.
- **Source:** Design.
- **Category:** Docs or spec.
- **Location:** `docs/protocol/pricing.md`, new in Milestone 2.
- **Terms:**
  - **Reverse charge:** the rule under which a business buyer abroad pays the VAT itself, so that the seller's invoice shows none.
- **Background:**
  - Firna Ltd is VAT registered in the UK, and sells through Stripe Billing and Stripe Tax (decision 252).
  - UK buyers pay 20% UK VAT. EU consumers pay the VAT of their own country. A business buyer abroad pays none on the invoice, under the reverse charge.
  - The CMA's price guidance of November 2025 says that a price for UK consumers must include VAT. EU consumer law also asks for the price with taxes, in Article 7(4)(c) of Directive 2005/29/EC.
  - The guidance counts a price on a web page as an invitation to purchase, also before anyone can buy.
  - Competitors show US dollar prices without tax. Cursor adds a line that its prices exclude tax.
  - The pages of the site run no script.
- **Problem:** The page must show prices that business buyers and consumers in many countries can read. The UK and EU rules need a total with VAT for consumers.
- **Impact if no action:** The page cannot ship, or it shows UK and EU consumers a price without VAT.
- **Root question:** What total price does each buyer see before checkout: a consumer in the UK or the EU, a business, or a buyer in another country? The options check widened it on 10 November 2026, because EU law asks for the total too.
- **Options:**
  - **A.** Prices without tax, and one line: "Prices exclude VAT and sales tax. Checkout adds the tax for your country." Risk: the UK and EU rules want the total price for consumers. Effort: Small.
  - **B.** As A, and the page also shows the UK price with VAT of each paid plan and of an extra hour, such as "$24 with UK VAT". The line also says that EU consumers pay the VAT of their country. Effort: Small.
  - **C.** Prices include any tax, so that each buyer pays the shown price. Firna pays the VAT from the price. It keeps $16.67 of each $20 from UK buyers, and $15.75 to $17.09 from EU consumers. Effort: Small.
  - **D.** The Worker fills in the price with tax for the country of the visitor, as it fills in other values of each request. A location guess can be wrong. The Privacy page must then describe the use of the country, and the site needs a table of VAT rates. Effort: Medium.
  - **E.** Added by the options check. UK buyers see fixed pound prices that include VAT, and other buyers see US dollar prices without tax. One Stripe price can hold a pound amount with its own tax setting. There are two price lists to keep in step, and the margin in pounds moves with the exchange rate. Effort: Small.
  - **F.** Added by the options check. As B, and a folded table gives the total with VAT in each EU country, with no script. The 27 rates must stay in step with Stripe Tax, and a stale rate shows a wrong total. Effort: Medium.
- **Left out:** A pricing table that Stripe hosts, because it needs a script. Prices for business buyers only, because decision 252 A sells to consumers too. No prices until billing starts, because it fails the goal of this change.
- **Wider fix:** None. This is a design question.
- **Previous examples:** None found.
- **Related:** Decision 253 sets the prices.
- **Recommendation:** B. It keeps the dollar prices that buyers compare across tools, and it gives UK consumers the total that the UK rule needs. F can follow for EU consumers. A lawyer should confirm the words, because the display of prices is consumer law.
- **Action:** ask the user, because it trades a simple page against the consumer rules and Firna's income.

## Design

### The page

- The page lives at `conductive.build/pricing`. It shows the plans of
  decision 253, the price of extra hours, and the tax line of
  decision 254.
- It says when hours count: while any cloud computer of the org runs.
  This includes image builds, image refreshes, and the short restarts
  near day 14 that keep a stopped disk. A cloud computer stops after 30
  minutes without activity.
- It says that Conductive stays free until billing starts, and that
  nobody pays until they choose a plan. It gives no date.
- Its actions are the actions of the site: Sign up and Download for Mac,
  with the waitlist sentence under the last call to action.

### Tax

These rules apply to a UK seller that is VAT registered (decision 252).
An accountant should confirm them before the first sale.

- UK buyers, consumers and businesses, pay 20% UK VAT. A UK business
  reclaims it. The VAT goes on Firna's UK VAT return.
- An EU business with a valid VAT number pays no VAT on the invoice. The
  invoice says "reverse charge", and the buyer accounts for the VAT.
  Stripe Checkout collects and checks the number.
- An EU consumer pays the VAT of their own country from the first sale.
  A UK seller has no threshold for these sales. Firna registers for the
  EU non-Union OSS scheme in one EU country, and files one EU return each
  quarter. Stripe Tax finds the rate and keeps two pieces of location
  evidence.
- A buyer in another country pays no UK VAT, because the sale happens
  where the buyer is. Most places tax a foreign seller only after a
  threshold, such as $100,000 of sales in one US state. Some start
  sooner. Switzerland taxes the first Swiss sale once the seller's sales
  in the whole world pass CHF 100,000. Stripe Tax tracks the thresholds.
- Services that Firna buys from abroad, such as Boat, fall under the
  reverse charge on Firna's own UK VAT return.

### Design calls

The agent made these calls on 10 November 2026. The user can change each
one.

- The org pays for its members and its compute, as the user chose for
  decision 27 B. Reason: decision 80 removed the only reason that
  superseded it.
- Stripe Billing with Stripe Tax takes the payments, as the user chose
  for decisions 26 A and 252 A.
- Prices are in US dollars. Reason: every competitor and the provider's
  costs use them. Option E of decision 254 would add pound prices for UK
  buyers.
- Every minute of every cloud computer of an org counts toward its
  hours. Reason: decision 27 B makes the org pay for all its compute, and
  one rule is the easiest to check.
- Prices are monthly only. Reason: yearly plans bring refunds and
  changes that the first billing change does not need.
- The page has no Enterprise plan. Reason: the comparison row of
  Enterprise plans stays Under consideration.
- Archived workspaces do not count toward the free limit. Reason: they
  have no cloud computer and cost nothing, as option B of decision 41
  said.
- The page shows a round price for each hour, never a multiple of the
  provider's price. Reason: user-facing text never names Boat.
- The desktop header and the Product column of the footer link the page.
- The site and the mockup read the plans from one module under
  `src/marketing/`, as the comparison page reads its rows.
- The comparison rows Pro plan, Team plan, and Plan and billing pages
  become Planned, with "No date yet". Reason: decision 250 is a recorded
  user decision that includes them. The row No fee for cloud compute stays
  Available while use is free, and its note names the coming plans.

### Later changes

Each needs its own plan:

- Billing: Stripe Checkout, the Customer Portal, signed Stripe events, the
  plan of each org, a billing tab, and the consumer pages of decision
  35 D.
- Usage: one record of every cloud computer, as
  `plans/follow-ups/computer-ledger.md` says, the hours of each org, and
  the charge for extra hours.
- Plan limits in the app: workspaces, hours, and machines at once.

Questions for those plans: what an unpaid or cancelled org keeps (closed
decision 38), seat changes in the middle of a month (closed decision 40),
start limits for each member (closed decision 34), the EU OSS
registration, and a larger Boat plan when paying orgs need more starts
or more machines at once.

## Milestone 1: Mockups

Tags: mockup

Depends on: none

Draw the pricing page at desktop and phone sizes, and add Pricing to the
header and the footer of the marketing mockups.

- [ ] Add one module under `src/marketing/` with the plans of
      decision 253, the price of extra hours, and the tax line of
      decision 254.
- [ ] Draw the pricing page in `docs/mockups/`, with its plans, the
      hours rules, the tax line, the free-until-billing sentence, and the
      site actions.
- [ ] Add Pricing to the desktop header and to the Product column of the
      footer in the marketing mockups.
- [ ] Run `npm run mockups:check`. Smoke-test the page at 320 px and at
      desktop width in both colour schemes.
- [ ] Update the design and the TODOs of this plan for each problem that
      the mockups show.

## Milestone 2: Documentation and protocol

Depends on: 1

State the plans and the page as requirements.

- [ ] Add `docs/protocol/pricing.md` with the plans, the extra hours, the
      tax line, the free-until-billing rule, and the decisions in force.
- [ ] Link it from `docs/architecture.md` and from `README.md`.
- [ ] Update the free-product lines of
      `docs/protocol/orgs-and-members.md`.
- [ ] Update `docs/architecture/marketing-site.md` and
      `src/marketing/README.md` with the new page and links.
- [ ] Read the Terms and Privacy pages in full. Update each sentence that
      restates a changed fact, such as "It has no plans and no billing."
- [ ] Check each relative link of each changed Markdown file.

## Milestone 3: Pricing page

Tags: ui

Depends on: 2

Build the page and its links on the marketing site.

- [ ] Add the Astro page for `/pricing`, which reads the module of
      Milestone 1.
- [ ] Add Pricing to the desktop header and to the Product column of the
      footer.
- [ ] Check that the Worker serves the page with the security headers of
      the site, and add or extend the tests of the served pages.
- [ ] Run `npm run site:build`, and check the page at 320 px and at
      desktop width in both colour schemes.

## Milestone 4: Comparison rows

Depends on: 2

- [ ] Update the rows of `src/marketing/from-conductor/areas/plans-and-pricing.ts`
      as the design calls say.

## Milestone 5: Verification, commit, review, and pull request

Depends on: 1, 2, 3, and 4

- [ ] Run the targeted tests and `npm run check`.
- [ ] Commit with Conventional Commits and push the branch.
- [ ] Review the complete local diff against `origin/main` with the
      `implementation-review` skill after the push. Report the findings,
      then apply the fix rule: fix the `fix now` findings, record
      follow-up items under `plans/follow-ups/` for the rest, re-review
      once, and report.
- [ ] Delete this plan when the `plans` skill says, under "Deleting the
      plan".
- [ ] Open the pull request. Its description gives the decisions and the
      design calls of this plan with their dates, a permalink to this
      plan, and the follow-up items that the change adds.

## Post-merge follow-up (non-blocking)

- [ ] Open `conductive.build/pricing` on the deployment, on a phone and on
      a desktop, and check the links of the header and the footer.
