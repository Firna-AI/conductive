import type { PersonKey } from './members'

/**
 * The Mac of the person signed in. The Mac app registers it as a device
 * while it is awake and the app is open (decision 62).
 */
export const thisMac: { name: string; owner: PersonKey } = {
  name: "Cal's MacBook Pro",
  owner: 'cal',
}

/**
 * A command that an agent asks to run on the Mac of the person who sent
 * the turn. The time limit is 60 seconds by default and 120 at most. A
 * longer limit, up to 30 minutes, comes with its reason.
 */
export type MacCommandRequest = {
  command: string
  folder: string
  reason: string
  limit: string
  /** Why the agent asks for more than the usual time limit. */
  longerBecause?: string
}

/** What happened to a command on the Mac, as the chat shows it. */
export type MacCommandState = 'waiting' | 'denied' | 'done' | 'unavailable'

export const safariTest: MacCommandRequest = {
  command: 'npm run test:safari -- checkout',
  folder: '~/code/storefront',
  reason:
    'Run the checkout test in Safari, which the cloud computer does not have.',
  limit: '60 seconds',
}

export const safariSuite: MacCommandRequest = {
  command: 'npm run test:safari',
  folder: '~/code/storefront',
  reason: 'Run every end-to-end test in Safari before the merge.',
  limit: '10 minutes',
  longerBecause: 'The whole Safari suite takes about 6 minutes.',
}

/** The output of the Safari test, which goes back to the agent. */
export const safariOutput = [
  '> storefront@2.4.0 test:safari',
  '✓ checkout › suggests addresses (2.4s)',
  '✓ checkout › fills the address fields (1.9s)',
  '2 passed (14.2s)',
].join('\n')

/** How long the Safari test ran on the Mac. */
export const safariDuration = '16s'

/** The commands that always run on this Mac without asking. */
export const alwaysAllowed = ['git status', 'npm run lint', 'sw_vers'] as const

/** The time left in the window that allows every command, as mm:ss. */
export const allowAllLeft = '14:32'
