import type { ParityFeature } from '../model'

export const plansAndPricingFeatures: readonly ParityFeature[] = [
  {
    id: 'bring-your-own-subscriptions-and-keys',
    area: 'plans-and-pricing',
    name: 'Bring your own subscriptions and keys',
    status: 'available',
    note: 'Model use goes to your Claude subscription, ChatGPT plan, or Anthropic or OpenAI API key. Conductive does not resell model use.',
  },
  {
    id: 'pro-plan',
    area: 'plans-and-pricing',
    name: 'Pro plan',
    status: 'not-planned',
    note: 'Conductive is free and has no paid plans. Model use goes to your own Claude or ChatGPT login or API key.',
  },
  {
    id: 'team-plan',
    area: 'plans-and-pricing',
    name: 'Team plan',
    status: 'not-planned',
    note: 'Conductive has no paid team plans. Teams with app access use free orgs, roles, and shared workspaces.',
  },
  {
    id: 'enterprise-plan',
    area: 'plans-and-pricing',
    name: 'Enterprise plan',
    status: 'not-planned',
    note: 'Conductive has no paid plans or support agreements. Teams with app access use free orgs and roles.',
  },
  {
    id: 'no-fee-for-cloud-compute',
    area: 'plans-and-pricing',
    name: 'No fee for cloud compute',
    status: 'available',
    note: 'Cloud computers have no fee. Conductive is free and has no paid plans.',
  },
  {
    id: 'pricing-page',
    area: 'plans-and-pricing',
    name: 'Pricing page',
    status: 'not-planned',
    note: 'Conductive is free and has no paid plans, so it has no pricing page.',
  },
  {
    id: 'plan-and-billing-pages',
    area: 'plans-and-pricing',
    name: 'Plan and billing pages',
    status: 'not-planned',
    note: 'Conductive is free and has no plans or billing. An org needs no payment details.',
  },
]
