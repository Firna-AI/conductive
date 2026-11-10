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
    status: 'planned',
    note: 'Paid plans with included cloud hours and charges for extra use are planned. Conductive is free today.',
    due: null,
  },
  {
    id: 'team-plan',
    area: 'plans-and-pricing',
    name: 'Team plan',
    status: 'planned',
    note: 'Paid team plans with shared cloud hours are planned. Teams with app access use free orgs and shared workspaces today.',
    due: null,
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
    note: 'Cloud computers have no separate fee today. The coming Free, Plus, Pro, and Ultra plans each include cloud hours, as the pricing page shows.',
  },
  {
    id: 'plan-and-billing-pages',
    area: 'plans-and-pricing',
    name: 'Plan and billing pages',
    status: 'planned',
    note: 'The pricing page shows the coming plans. A billing tab in the app is planned, and Conductive stays free until billing starts.',
    due: null,
  },
]
