import { productName } from '../../../../../src/shared/brand'

/**
 * The words of Update the app, which shows when the server refuses the
 * version of a phone app. They name no store, because each platform has
 * its own.
 */
export const updateAppCopy = {
  title: 'Update the app',
  text: `A newer version of ${productName} is ready. Update to continue.`,
  action: 'Update',
} as const

/** The words of the page of a phone app that starts without a connection. */
export const offlineCopy = {
  title: "You're offline",
  text: 'Check the connection, then try again.',
  action: 'Try again',
} as const
