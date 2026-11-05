/**
 * The plans of the app, as the user set them on 5 November 2026. The org
 * pays for its plan. Every workspace runs on the one standard machine, and
 * each member's agents use that member's own Claude and OpenAI accounts.
 */

import { poolHours, seatPrice } from './billing'
import { freePlan } from './limits'

export const planKeys = ['free', 'team'] as const

export type PlanKey = (typeof planKeys)[number]

export type Plan = {
  key: PlanKey
  name: string
  price: string
  /** What the price counts, such as each member of the org. */
  unit: string
  /** What the plan gives the org, one short line each. */
  includes: readonly string[]
}

export const plans: Readonly<Record<PlanKey, Plan>> = {
  free: {
    key: 'free',
    name: 'Free',
    price: '$0',
    unit: 'per month',
    includes: [
      'One org',
      `Up to ${freePlan.workspaces} workspaces`,
      `${freePlan.minutes} minutes of compute a month`,
      'Build the cloud computer by hand',
    ],
  },
  team: {
    key: 'team',
    name: 'Team',
    price: `$${seatPrice}`,
    unit: 'per member per month',
    includes: [
      `Each member adds about ${poolHours(1)} hours of compute a month, shared by the org`,
      'More use at cost plus 10%',
      'The cloud computer refreshes after pushes to the default branch',
      'Invite members by their GitHub login',
      'Reassign workspaces between members',
    ],
  },
}

/** The one machine size that every workspace runs on. */
export const standardMachine = { cpus: 4, memoryGb: 8 } as const
