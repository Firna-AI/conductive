/**
 * The catalogue paths of the states that only the phone apps have, in the
 * `phone-app` folder of the catalogue.
 */
export const phonePaths = {
  // Sign-in in the system browser, its legal pages in the in-app browser,
  // Update the app, and offline.
  signIn: 'phone-app/sign-in',
  signInAsk: 'phone-app/sign-in/ask',
  signInWaiting: 'phone-app/sign-in/waiting',
  signInFailed: 'phone-app/sign-in/failed',
  signInEnded: 'phone-app/sign-in/ended',
  browserTerms: 'phone-app/browser/terms',
  browserPrivacy: 'phone-app/browser/terms/privacy',
  update: 'phone-app/update',
  offline: 'phone-app/offline',
  // The ask for notices, the lock screen, and the in-app browser.
  notices: 'phone-app/notices',
  noticesSystem: 'phone-app/notices/system',
  noticesSystemPreferences: 'phone-app/notices/system/preferences',
  noticesDenied: 'phone-app/notices/denied',
  noticesNotNow: 'phone-app/notices/denied/not-now',
  noticesOn: 'phone-app/notices/denied/on',
  lockScreen: 'phone-app/lock-screen',
  browser: 'phone-app/browser',
  browserTool: 'phone-app/browser/tool',
  browserToolLog: 'phone-app/browser/tool/log',
  browserToolEmptyLog: 'phone-app/browser/tool/log-empty',
  browserToolMenu: 'phone-app/browser/tool/menu',
  browserOpening: 'phone-app/browser/opening',
  browserDesktop: 'phone-app/browser/desktop',
} as const
