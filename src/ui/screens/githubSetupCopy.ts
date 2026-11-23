import { productName } from '../brand'

/**
 * The words of the page that the browser shows after an install of the
 * GitHub App that started in the Mac app. GitHub can show a request in
 * place of an install, when an owner of the GitHub account must approve
 * it. The page of the Worker and its mockup share these words.
 */
export const githubSetupCopy = {
  installed: {
    title: 'The GitHub App is installed',
    text: `Go back to the ${productName} app on your Mac to continue.`,
  },
  requested: {
    title: 'Install request sent',
    text: `After an owner of the GitHub account approves it, go back to the ${productName} app on your Mac.`,
  },
} as const

/** What GitHub did: an install or a change of one, or a request for one. */
export type GitHubSetupOutcome = keyof typeof githubSetupCopy
