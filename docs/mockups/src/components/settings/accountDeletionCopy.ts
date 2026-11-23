import { productName } from '../../../../../src/shared/brand'

/**
 * The words of the account deletion request at the end of General, from
 * decision 4 A of the universal Expo app plan. Only the mockups draw them
 * so far. The words hold under each open question of the plan: they name
 * no time until the deletion, no withdrawal, nothing about orgs and
 * workspaces, nothing about the use of the account until the deletion,
 * and no email.
 */
export const accountDeletionCopy = {
  title: 'Delete account',
  description: `Ask ${productName} to delete your account. A deletion can't be undone.`,
  /** The button of the section, in the words of decision 4 A. */
  request: 'Request account deletion',
  question: 'Request account deletion?',
  questionText: (login: string) =>
    `${productName} deletes the account @${login} after your request. You can't undo the deletion.`,
  cancel: 'Cancel',
  /** The confirming action, short so that it fits half of a phone sheet. */
  confirm: 'Request deletion',
  /** The state beside the title after the request. */
  requested: 'Requested',
  requestedText: (day: string) =>
    `You requested the deletion of your account on ${day}.`,
  /** The title of the notice of a request that did not reach the server. */
  failed: "Your request wasn't sent",
} as const
