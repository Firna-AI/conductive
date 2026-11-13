import type { PersonKey } from './members'
import { checkoutAutocomplete, savedCarts } from './workspaces'

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

/**
 * A long script on one line: each checkout test file in Safari on its own,
 * to find the one that hangs. It wraps over many lines, so its request
 * scrolls.
 */
export const safariByFile: MacCommandRequest = {
  command: [
    'set -euo pipefail',
    'export PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright"',
    ...[
      'address-autocomplete',
      'address-fallback',
      'billing-address',
      'card-details',
      'coupon-codes',
      'delivery-slots',
      'gift-cards',
      'guest-checkout',
      'order-summary',
      'payment-errors',
      'saved-addresses',
      'shipping-rates',
    ].map(
      (file) =>
        `npx playwright test tests/checkout/${file}.spec.ts --project=webkit --workers=1 --retries=0 --reporter=line --output=test-results/${file} || echo "FAILED ${file}" >> test-results/failed.txt`,
    ),
    'cat test-results/failed.txt 2>/dev/null || echo "Every checkout file passed in Safari"',
  ].join('; '),
  folder: '~/code/storefront',
  reason:
    'Run each checkout test file in Safari on its own, to find the one that hangs.',
  limit: '10 minutes',
  longerBecause: 'The 12 files take up to 40 seconds each.',
}

/** Short commands that wait with the long script. */
export const waitingWithScript: readonly MacCommandRequest[] = [
  {
    command: 'sw_vers',
    folder: '~/code/storefront',
    reason: 'Read the macOS version for the bug report.',
    limit: '60 seconds',
  },
  {
    command:
      'defaults read /Applications/Safari.app/Contents/Info CFBundleShortVersionString',
    folder: '~/code/storefront',
    reason: 'Read the Safari version for the bug report.',
    limit: '60 seconds',
  },
  {
    command: 'git status --short',
    folder: '~/code/storefront',
    reason: 'Check that the Mac has the same branch as the cloud computer.',
    limit: '60 seconds',
  },
]

/** The output of the Safari test, which goes back to the agent. */
export const safariOutput = [
  '> storefront@2.4.0 test:safari',
  '✓ checkout › suggests addresses (2.4s)',
  '✓ checkout › fills the address fields (1.9s)',
  '2 passed (14.2s)',
].join('\n')

/** How long the Safari test ran on the Mac. */
export const safariDuration = '16s'

/** A page, packed and encoded, that the long command unpacks. */
const packedPage = [
  'H4sICB3p9GoCA2dyaWQxMS1tYWMuaHRtbACtXNty27gZvs9ToNqLtJ2I5lEk5cNMVtnUns3BG2/dmb2DSEjCmiJYELSs9extH6CP2CfpD5KgLFrORPk5mrENkPzw4cd/BCif',
  'doWjKzUOrs40z9JRvPl+YjlI2gzml6crZmiJFlRWTJ1PqrUYhzBtVJtM3bx6u+Pc/EwLvkfPF9O50KmTI6h53RN5ZLnU/vPV3ORbh83PFWrqTOx7eLhdMX4cqWmrl235jS5W0pR5en',
  '0BzuBDztNRCbk9IeFD5/gdCFyNV7QNc+20w9UiTdjWhQZG5fbUrH1m9c378m1FORX9qBev3l9ybJ7pnhCySdWsddvSpqX45JJvjgtaJpqmhMfhk15WWR0O11k7OFU/xinXLJEcZFPY',
  'fxqnf/5ylKieNy78feqVHyxHSfAieVqWhY0YeM5UxvG8lOa8WU+5sCqrG8fszw9XdJi6s',
].join('')

/**
 * A long always-allowed command: a script that unpacks a page into a new
 * folder and opens it. This Mac shows its first three lines.
 */
export const longAllowed = `set -e; T=$(mktemp -d); echo '${packedPage}' | base64 -d | gunzip > "$T/grid.html"; open "$T/grid.html"`

/** The commands that always run on this Mac without asking. */
export const alwaysAllowed = [
  'git status',
  longAllowed,
  'npm run lint',
  'sw_vers',
] as const

/** The time left in the window that allows every command, as mm:ss. */
export const allowAllLeft = '14:32'

/** What a grant until Stop shows in place of the time left. */
export const untilStop = 'Until you stop'

/**
 * The workspaces whose commands all run on this Mac without asking: one
 * with the time left of its 15 minutes, and one until the user stops it.
 */
export const allowedWorkspaces: readonly {
  name: string
  left: string | null
}[] = [
  { name: checkoutAutocomplete.name, left: allowAllLeft },
  { name: savedCarts.name, left: null },
]

/** The always-allowed command that the change states of This Mac remove. */
export const removedCommand = 'npm run lint'

/** What the Mac says when it made a change of a permission but could not save it. */
export const notSavedMessage =
  'This permission change is active, but the Mac could not save it. Try again.'

/** What the Mac says when it could not make a change of a permission. */
export const failedMessage =
  'The Mac could not change this permission. Try again.'
