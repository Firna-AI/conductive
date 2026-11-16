import { productName } from '../../docs/mockups/src/brand'
import { waitlistText } from './access-copy'

/**
 * The plans of Conductive, the price of an extra hour, and the words of the
 * pricing page. The site and its mockups read this one module, so both show
 * the same plans, numbers, and words. Every price is in US cents for each
 * month, and the words show it in US dollars.
 */

/**
 * The free plan: one free org for each person, with cloud hours for the
 * whole org and a limit on the workspaces that are not archived. It has no
 * extra hours.
 */
type FreePlan = {
  readonly kind: 'free'
  readonly name: string
  /** The cloud hours of the org each month. */
  readonly orgHours: number
  /** The most workspaces of the org that are not archived. */
  readonly workspaceLimit: number
}

/**
 * A paid plan: a price for each member, and the cloud hours that each member
 * adds to the one pool of the org. It has no limit on workspaces or on cloud
 * computers at once, and it can use extra hours.
 */
type PaidPlan = {
  readonly kind: 'paid'
  readonly name: string
  /** The price of each member each month, in US cents. */
  readonly memberCents: number
  /** The cloud hours of each member each month. */
  readonly memberHours: number
}

export type PricingPlan = FreePlan | PaidPlan

const free: FreePlan = {
  kind: 'free',
  name: 'Free',
  orgHours: 20,
  workspaceLimit: 3,
}

const plus: PaidPlan = {
  kind: 'paid',
  name: 'Plus',
  memberCents: 2000,
  memberHours: 275,
}

const pro: PaidPlan = {
  kind: 'paid',
  name: 'Pro',
  memberCents: 5000,
  memberHours: 700,
}

const ultra: PaidPlan = {
  kind: 'paid',
  name: 'Ultra',
  memberCents: 20000,
  memberHours: 2750,
}

/** The plans in the order of the page: Free, then each paid plan by price. */
export const pricingPlans: readonly PricingPlan[] = [free, plus, pro, ultra]

/** The price of each extra hour of a paid plan, in US cents. */
const extraHourCents = 7

/** The size of every cloud computer, which an hour of the plans buys. */
const computerSize = { vcpus: 4, memoryGb: 8 } as const

const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dollarsAndCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const counts = new Intl.NumberFormat('en-US')

const names = new Intl.ListFormat('en-US', { type: 'conjunction' })

/**
 * A price in US cents as words: whole dollars without cents, such as "$20",
 * and any other price with two decimals, such as "$0.07".
 */
function priceWords(cents: number): string {
  const format = cents % 100 === 0 ? wholeDollars : dollarsAndCents
  return format.format(cents / 100)
}

/** A number of hours as words, with a comma for thousands, such as "2,750". */
function hoursWords(hours: number): string {
  return counts.format(hours)
}

/** The words of one plan on the page. */
type PlanCopy = {
  readonly name: string
  /** The price, such as "$20". */
  readonly price: string
  /** What the price covers, such as "per member per month". */
  readonly unit: string
  /** What the plan includes, one short line each, the hours first. */
  readonly facts: readonly string[]
}

/** The name, the price, and the facts of a plan, as the page shows them. */
export function planCopy(plan: PricingPlan): PlanCopy {
  if (plan.kind === 'free') {
    return {
      name: plan.name,
      price: priceWords(0),
      unit: 'per month',
      facts: [
        `${hoursWords(plan.orgHours)} cloud hours a month for the org`,
        `Up to ${plan.workspaceLimit} workspaces, not counting archived ones`,
        'One free org for each person',
      ],
    }
  }
  return {
    name: plan.name,
    price: priceWords(plan.memberCents),
    unit: 'per member per month',
    facts: [
      `${hoursWords(plan.memberHours)} cloud hours a month for each member`,
      'Unlimited workspaces',
      'Unlimited cloud computers at once',
      `Extra hours at ${priceWords(extraHourCents)} each`,
    ],
  }
}

/** The members of the example of one pool. */
const poolMembers = 3

/** One rule of how cloud hours count: a short title and its sentences. */
type HoursRule = { readonly title: string; readonly text: string }

/** How cloud hours count, in the order of the page. */
const hoursRules: readonly HoursRule[] = [
  {
    title: 'One pool for the org',
    text: `The hours of every member go into one pool that your whole org shares. An org of ${poolMembers} members on ${plus.name} shares ${hoursWords(poolMembers * plus.memberHours)} hours a month.`,
  },
  {
    title: 'Every minute counts',
    text: "Hours count while any cloud computer of your org runs. Builds and refreshes of the org's image count too. So do the short restarts near day 14 of a stop, which keep the files of a stopped computer.",
  },
  {
    title: 'Idle computers stop',
    text: 'A cloud computer stops after 30 minutes without activity, unless an agent is at work. A stopped computer uses no hours.',
  },
  {
    title: 'Extra hours',
    text: `Paid plans can use more hours than their pool. Each extra hour costs ${priceWords(extraHourCents)}, up to a monthly limit that an org admin sets. ${free.name} has no extra hours.`,
  },
]

/**
 * The words of the pricing page. The site and the mockup draw the same
 * words, each in its own markup. The tax line says only that the prices
 * exclude tax, because no checkout adds the tax by itself.
 */
export const pricingPageCopy = {
  documentTitle: `Pricing – ${productName}`,
  description: `${productName} plans with cloud hours included: ${names.format(pricingPlans.map((plan) => plan.name))}.`,
  label: 'Pricing',
  title: 'Plans with cloud hours included.',
  lead: 'Each workspace runs on its own cloud computer. Your plan includes the hours that those computers run each month.',
  currency: 'All prices are monthly, in US dollars.',
  tax: 'Prices exclude VAT and sales tax.',
  hours: {
    label: 'Cloud hours',
    title: 'How cloud hours count.',
    text: `Each cloud computer has ${computerSize.vcpus} vCPU and ${computerSize.memoryGb} GB of memory. Two computers that run for one hour use two hours.`,
    rules: hoursRules,
  },
  closing: {
    title: 'Every plan gives each task its own cloud computer.',
    text: waitlistText,
  },
} as const

/** The words of the links of the header and the footer to the page. */
export const pricingLinkText = 'Pricing'
