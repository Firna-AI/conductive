/**
 * The workspaces that Cal imports from Conductor into Acme, in the Mac app.
 * The import creates each one in the section Import from Conductor when
 * its own upload ends, with its name, its branch, and its old sessions,
 * and with no cloud computer. So each one is inactive until a member
 * activates it.
 */

import { defaultChoice } from './agents'
import { workspaceLink, type Workspace } from './workspaces'

/**
 * A workspace that Cal moved from Conductor Cloud to the Conductor Mac app,
 * so it keeps its cloud name. Its branch keeps the name that Conductor gave
 * it. It is the newest workspace of Acme after the import.
 */
export const couponTotals: Workspace = {
  key: 'coupon-totals',
  name: 'Coupon totals at checkout',
  number: 403,
  link: workspaceLink('Qm3vZ8tKcW1yHn5RbX2pLd7sJf4gTa9eUo6iVr0wYk8'),
  branch: 'calummoore/karachi-v7',
  repository: 'storefront',
  section: 'conductor',
  choice: defaultChoice,
  status: 'inactive',
  updated: '1m',
  owner: 'cal',
  from: 'conductor',
}

/**
 * A workspace that was always local in Conductor. It has no cloud name, so
 * it takes the title of its pull request.
 */
export const webhookSignatures: Workspace = {
  key: 'webhook-signatures',
  name: 'Check webhook signatures',
  number: 404,
  link: workspaceLink('Hc7nUq2xBv9mKe4tRz1sLp8dWf3aJy6oNg5iEb0hQr2'),
  branch: 'calummoore/hanoi-v1',
  repository: 'billing-service',
  section: 'conductor',
  choice: defaultChoice,
  status: 'inactive',
  updated: '1m',
  owner: 'cal',
  from: 'conductor',
}

/**
 * Coupon totals at checkout after its activation succeeded. It is the same
 * workspace, with the same key. Its own record marks the activation, so
 * that the archived example of an activated workspace never comes from its
 * Archive alone.
 */
export const activatedCouponTotals: Workspace = {
  ...couponTotals,
  status: 'ready',
  activated: true,
}

/** The workspaces of the first import, in the order of the import list. */
export const importedWorkspaces: readonly Workspace[] = [
  couponTotals,
  webhookSignatures,
]
