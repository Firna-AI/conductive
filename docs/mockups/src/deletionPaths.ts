/**
 * The catalogue paths of the request of an account deletion that screens
 * link to: on the Account page, and in the operator section.
 */
export const deletionPaths = {
  account: 'app/account/deletion',
  confirm: 'app/account/deletion/confirm',
  requested: 'app/account/deletion/requested',
  operatorList: 'app/operator/deletions',
  // The page of each person on the Deletions tab, with their request.
  requesterKai: 'app/operator/user/deletion',
  requesterNoor: 'app/operator/user/deletion/noor-a',
  requesterRhea: 'app/operator/user/deletion/rho-9',
} as const

/**
 * The pages that the deletion request of a General page opens: the
 * question, the page that Cancel returns to, and the section after the
 * request. A screen supplies them only for the default General page, so
 * the question never lies over other facts of the account. Without them,
 * the controls of the request have no link.
 */
export type DeletionPages = {
  question: string
  cancel: string
  requested: string
}

/** The pages of the deletion request of the default General page. */
export const generalDeletionPages: DeletionPages = {
  question: deletionPaths.confirm,
  cancel: deletionPaths.account,
  requested: deletionPaths.requested,
}
