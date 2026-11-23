/**
 * The catalogue paths of the states that only the phone apps have, in the
 * `phone-app` folder of the catalogue.
 */
export const phonePaths = {
  // Sign-in in the system browser, Update the app, and offline.
  signIn: 'phone-app/sign-in',
  signInAsk: 'phone-app/sign-in/ask',
  signInWaiting: 'phone-app/sign-in/waiting',
  signInFailed: 'phone-app/sign-in/failed',
  signInEnded: 'phone-app/sign-in/ended',
  update: 'phone-app/update',
  offline: 'phone-app/offline',
  // The ask for notices, the lock screen, and the in-app browser.
  notices: 'phone-app/notices',
  noticesSystem: 'phone-app/notices/system',
  noticesSystemPreferences: 'phone-app/notices/system/preferences',
  noticesDenied: 'phone-app/notices/denied',
  noticesOn: 'phone-app/notices/denied/on',
  lockScreen: 'phone-app/lock-screen',
  browser: 'phone-app/browser',
  browserTool: 'phone-app/browser/tool',
  browserOpening: 'phone-app/browser/opening',
  browserDesktop: 'phone-app/browser/desktop',
} as const
