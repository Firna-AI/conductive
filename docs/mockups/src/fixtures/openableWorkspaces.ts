/** The workspaces that the workspace screen can show open. */

import { savedCartsOnBranch } from './branches'
import { activatedCouponTotals, couponTotals } from './importedWorkspaces'
import { checkoutAutocomplete, savedCarts, type Workspace } from './workspaces'

export const openableWorkspaces = [
  'checkout-autocomplete',
  'saved-carts',
  'saved-carts-branch',
  'coupon-totals',
  'coupon-totals-activated',
] as const

export type OpenableWorkspace = (typeof openableWorkspaces)[number]

export const openableWorkspaceRecords: Readonly<
  Record<OpenableWorkspace, Workspace>
> = {
  'checkout-autocomplete': checkoutAutocomplete,
  'saved-carts': savedCarts,
  'saved-carts-branch': savedCartsOnBranch,
  'coupon-totals': couponTotals,
  'coupon-totals-activated': activatedCouponTotals,
}
