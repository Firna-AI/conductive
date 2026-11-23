/**
 * The catalogue paths of the request of an account deletion that screens
 * link to: on the Account page, and in the operator section.
 */
export const deletionPaths = {
  account: 'app/account/deletion',
  confirm: 'app/account/deletion/confirm',
  requested: 'app/account/deletion/requested',
  operatorList: 'app/operator/deletions',
  operatorUser: 'app/operator/user/deletion',
} as const
