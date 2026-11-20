/**
 * The words of the Capabilities control of New workspace and of a
 * workspace (secrets decisions 6 and 8). The app and the mockups take them
 * from here.
 */

/** The label of the icon on hover, and the title of the control. */
export const capabilitiesLabel = 'Capabilities'

/** The line under the title: what the control holds. */
export const capabilitiesIntro = {
  create: 'What agents in the new workspace can use.',
  workspace: 'What agents in this workspace can use.',
} as const

export const secretsPartWords = {
  title: 'Secrets',
  hint: 'Agents use a pre-approved secret with no question.',
  manage: 'Manage secrets',
  allAgents: 'All agents',
  add: 'Add a secret',
  sessions: 'Allowed in sessions',
  values: 'Values for this workspace',
  remove: 'Remove',
} as const

/** The line of an org without secrets. */
export function noSecrets(org: string): string {
  return `${org} has no secrets yet.`
}

/** What a session approval says: its session, who allowed it, and when. */
export function approvalDetail(
  session: string,
  who: string,
  when: string,
): string {
  return `${session} · by ${who}, ${when}`
}

/** What a value for the workspace says: who gave it, and when. */
export function valueDetail(who: string, when: string): string {
  return `Given by ${who}, ${when}`
}

/**
 * The shared switch of Mac access. `hint` is its hint in a browser, and in
 * the Mac app while the switch is on, where the line of this Mac shows
 * under it.
 */
export const macAccessWords = {
  title: 'Mac access',
  hint: 'Lets agents ask to run commands on the Mac of the member who sent the message.',
} as const

/** The label of the line of this Mac. */
const thisMacLine = 'Allow all commands on this Mac'

/**
 * The words of this Mac in the Mac access part (Mac access decisions 1 to
 * 5). In the Mac app, turning the switch on also starts a grant until Stop
 * of the workspace on this Mac, and the line of this Mac starts or stops
 * that grant. A browser cannot start a grant, so it shows `browserNote` in
 * place of the line.
 */
export const thisMacWords = {
  /** The hint of the switch in the Mac app while the switch is off. */
  offHint: `${macAccessWords.hint} When you turn it on, this Mac also allows all commands until you stop.`,
  line: thisMacLine,
  /** What the line allows, in New workspace and in a workspace. */
  lineHint: {
    create:
      'Commands from the new workspace run without asking, until you stop.',
    workspace:
      'Commands from this workspace run without asking, until you stop.',
  },
  /** The title of the result of a start that failed. */
  notStarted: 'Not started',
  /** Why a start failed when it found this Mac not available. */
  notAvailable:
    'This Mac is not available, so each command still asks first. Try again once it connects.',
  browserNote: `To allow all commands on your Mac, use ${thisMacLine} in the Mac app.`,
  /** The notice in a new workspace whose grant did not start. */
  noticeTitle: 'Could not allow all commands on this Mac',
  tryAgain: 'Try again',
  tryAgainLabel: 'Try again to allow all commands on this Mac',
} as const
