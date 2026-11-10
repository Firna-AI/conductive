import type { ParityFeature } from '../model'

export const plansAndPricingFeatures: readonly ParityFeature[] = [
  {
    id: 'bring-your-own-subscriptions-and-keys',
    area: 'plans-and-pricing',
    name: 'Bring your own subscriptions and keys',
    status: 'available',
    note: 'Model use goes to your Claude subscription or API key, or your OpenAI API key. Conductive does not resell model use.',
  },
  {
    id: 'pro-plan',
    area: 'plans-and-pricing',
    name: 'Pro plan',
    status: 'different',
    note: 'Conductive has no paid tiers. New users get app access through approval, an invite, or open sign-up.',
  },
  {
    id: 'team-plan',
    area: 'plans-and-pricing',
    name: 'Team plan',
    status: 'different',
    note: 'Teams with app access get free orgs, member roles, and shared workspaces. Conductive has no central billing.',
  },
  {
    id: 'enterprise-plan',
    area: 'plans-and-pricing',
    name: 'Enterprise plan',
    status: 'considering',
    note: 'Enterprise provisioning, support agreements, and additional controls are under consideration. Conductive is free today.',
  },
  {
    id: 'no-fee-for-cloud-compute',
    area: 'plans-and-pricing',
    name: 'No fee for cloud compute',
    status: 'available',
    note: 'Cloud computers have no separate fee for users with app access. Your model provider bills agent use.',
  },
  {
    id: 'plan-and-billing-pages',
    area: 'plans-and-pricing',
    name: 'Plan and billing pages',
    status: 'different',
    note: 'Conductive has no paid plans or billing pages. New users get app access through approval, an invite, or open sign-up.',
  },
]
