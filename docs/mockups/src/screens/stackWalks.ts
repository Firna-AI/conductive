import { defineWalk } from './walks'

const several = 'app/secret-requests/several'

/**
 * The stack of three requests in a browser, and one walk through its
 * answers: Allow of the count, whose call waits, then Deny of the late
 * request of the preview deploy, a value for MAPBOX_TOKEN, and the chat
 * with no request left. Each other answer of these stacks draws no link.
 */
export const threeRequestsWalk = defineWalk({
  view: 'browser',
  states: {
    start: {
      page: `${several}/waiting-and-late`,
      props: { conversation: 'secret-waiting-late' },
      answers: [{ request: 'secret-run-count', allow: 'answered' }],
    },
    answered: {
      page: `${several}/answered`,
      props: { conversation: 'secret-stack-answered' },
      answers: [{ request: 'secret-run-preview', deny: 'oneLeft' }],
    },
    oneLeft: {
      page: `${several}/answered`,
      slug: 'one-left',
      props: { conversation: 'secret-stack-one-left' },
      answers: [{ request: 'secret-run-mapbox', value: 'value' }],
    },
    value: {
      page: `${several}/answered`,
      slug: 'value',
      props: { conversation: 'secret-stack-value', overlay: 'value-sheet' },
      answers: [{ request: 'secret-run-mapbox', allow: 'done' }],
    },
    done: {
      page: `${several}/answered`,
      slug: 'done',
      props: { conversation: 'secret-stack-done' },
      answers: [],
    },
  },
})

/**
 * The card that hides the two older requests for the same secret: its
 * Deny ends the three requests, and its Allow allows the three.
 */
export const askedAgainWalk = defineWalk({
  view: 'browser',
  states: {
    start: {
      page: `${several}/asked-again`,
      props: { conversation: 'secret-asked-again' },
      answers: [
        { request: 'secret-run-third', deny: 'denied', allow: 'allowed' },
      ],
    },
    denied: {
      page: `${several}/asked-again`,
      slug: 'denied',
      props: { conversation: 'secret-asked-again-denied' },
    },
    allowed: {
      page: `${several}/asked-again`,
      slug: 'allowed',
      props: { conversation: 'secret-asked-again-allowed' },
    },
  },
})

/**
 * A late request and a command on the Mac in a browser, which cannot
 * answer the command. The walk moves through the stack only, so the
 * answers of the late request draw no link.
 */
export const macCommandWalk = defineWalk({
  view: 'browser',
  states: {
    start: {
      page: `${several}/mac-command`,
      props: { conversation: 'mac-waiting-secret' },
      answers: [],
    },
  },
})

/**
 * Four commands on the Mac in the Mac app. Each command keeps the links of
 * its own results, as a command of `mac-app/commands` does.
 */
export const macRequestsWalk = defineWalk({
  view: 'mac',
  states: {
    start: {
      page: 'mac-app/requests',
      props: { conversation: 'mac-waiting-many' },
    },
  },
})

/**
 * The same late request and command in the Mac app, which answers both.
 * The walk moves through the stack only, so no answer draws a link.
 */
export const commandAndSecretWalk = defineWalk({
  view: 'mac',
  states: {
    start: {
      page: 'mac-app/command-and-secret',
      props: { conversation: 'mac-waiting-secret' },
      answers: [],
    },
  },
})

/** The walks of the stacks of requests above the composer. */
export const stackWalks = [
  threeRequestsWalk,
  askedAgainWalk,
  macCommandWalk,
  macRequestsWalk,
  commandAndSecretWalk,
]
