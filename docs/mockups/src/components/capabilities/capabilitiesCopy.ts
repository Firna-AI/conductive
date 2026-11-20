/**
 * The words of the Capabilities control of New workspace, of a workspace,
 * and of an automation (secrets decisions 6 and 8, and automation
 * capabilities decision 1). The app and the mockups take them from here.
 */

/** The label of the icon on hover, and the title of the control. */
export const capabilitiesLabel = 'Capabilities'

/** The line under the title: what the control holds. */
export const capabilitiesIntro = {
  create: 'What agents in the new workspace can use.',
  workspace: 'What agents in this workspace can use.',
  automation: 'What agents in each run can use.',
} as const

export const secretsPartWords = {
  title: 'Secrets',
  hint: 'Agents use a pre-approved secret with no question.',
  /** The hint of the part in the control of an automation. */
  automationHint:
    'Each run workspace starts with the checked secrets pre-approved, so agents use them with no question.',
  manage: 'Manage secrets',
  allAgents: 'All agents',
  add: 'Add a secret',
  session: 'This session',
  values: 'Values for this workspace',
  remove: 'Remove',
} as const

/** The line of an org without secrets. */
export function noSecrets(org: string): string {
  return `${org} has no secrets yet.`
}

/**
 * What an approval of the open session says: who allowed it, and when. The
 * title of its group names the session.
 */
export function approvalDetail(who: string, when: string): string {
  return `Allowed by ${who}, ${when}`
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
  /**
   * The hint of the line while the 15 minutes of the workspace run, with
   * their time left, such as "14:32". The line stays unchecked.
   */
  fifteenMinutesHint: (left: string) =>
    `${left} left of the 15 minutes. Check this to keep them until you stop.`,
  /** The hint of the line, off, while the page cannot read this Mac. */
  notAvailableHint: 'This Mac is not available.',
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

/**
 * The lines under the prompt of an automation, which every member reads.
 * The first names the secrets that each run workspace pre-approves, between
 * `lead` and `tail`. The hint follows it while the triggers have a pull
 * request trigger (automation capabilities decision 3 A).
 */
export const runSecretsWords = {
  lead: 'Runs can use',
  tail: 'with no question.',
  pullRequest:
    'Text in a pull request, such as a comment, can steer the agent to use these secrets.',
} as const
