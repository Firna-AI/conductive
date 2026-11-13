import type { SecretGrant, ValueLifetime } from '../../fixtures/secretRequests'

/**
 * The words of a run with secrets: the request card above the composer,
 * the late request in the chat, and the result at its place. No text holds
 * a value. The app and the mockups take them from here.
 */
export const secretRunWords = {
  deny: 'Deny',
  allow: 'Allow',
  allowSession: 'Allow for this session',
  reason: 'Reason',
  running: 'Running',
  denied: 'Denied',
  notAnswered: 'Not answered',
  /** The phone action that opens the sheet of a value. */
  giveValue: 'Give a value',
  /** The line of a late request: why it is in the chat, and what Allow does. */
  late: 'The agent stopped waiting. Allow sends it a message.',
  /** The spoken name of the region of the requests above the composer. */
  region: 'Requests that wait for an answer',
} as const

/**
 * The line of a request that ended with no answer, because its workspace
 * was archived or its org was suspended.
 */
export function endedLine(
  cause: 'archive' | 'suspension',
  org: string,
): string {
  return cause === 'archive'
    ? 'It ended when the workspace was archived.'
    : `It ended when ${org} was suspended.`
}

/**
 * The line of a request that also names secrets of the org: one Allow
 * gives them the approval of the session too.
 */
export function storedAlso(names: string): string {
  return `Allow also allows ${names} for this session.`
}

/** The line under the name of a secret that the org does not have. */
export function notInOrg(org: string): string {
  return `${org} has no secret with this name.`
}

/** The spoken name of the value field of a temporary request. */
export function valueLabel(name: string): string {
  return `Value of ${name}`
}

/** The choices of how long the value of a temporary request lasts. */
export const lifetimeLabels: Readonly<Record<ValueLifetime, string>> = {
  minutes: '15 minutes',
  workspace: 'This workspace',
  saved: 'Save as secret',
}

/**
 * The line under the choices, which says what the chosen one does. Save
 * gives the new secret the reason of the agent as its description (item
 * 8 A of the mockups).
 */
export function lifetimeHint(
  lifetime: ValueLifetime,
  name: string,
  org: string,
): string {
  switch (lifetime) {
    case 'minutes':
      return 'This session can use it for 15 minutes.'
    case 'workspace':
      return 'Each session of this workspace can use it until the workspace is archived.'
    case 'saved':
      return `Adds ${name} to the secrets of ${org}, with the reason as its description. This session can use it.`
  }
}

/**
 * What let a run use its secrets, as the note of its card. `who` is "you"
 * for the person who answered, and the name of that member for the others.
 */
export function grantNote(grant: SecretGrant, who: string): string {
  switch (grant.kind) {
    case 'all-agents':
      return 'Available to all agents'
    case 'pre-approved':
      return 'Pre-approved for this workspace'
    case 'session':
      return `Allowed for this session by ${who}`
    case 'value':
      if (grant.lifetime === 'saved') return `Saved as a secret by ${who}`
      return grant.lifetime === 'minutes'
        ? `Value from ${who}, for 15 minutes`
        : `Value from ${who}, for this workspace`
  }
}

/** The state of a late request that a member allowed, as a short label. */
export function lateAllowedLabel(grant: SecretGrant): string {
  if (grant.kind !== 'value') return 'Allowed for this session'
  return {
    minutes: 'Value for 15 minutes',
    workspace: 'Value for this workspace',
    saved: 'Saved as a secret',
  }[grant.lifetime]
}

/**
 * The note of a late request after its answer. `who` starts the sentence:
 * "You" for the person who answered, and the name of that member for the
 * others. An Allow sent a message, and a Deny sent none.
 */
export function lateAnswerNote(who: string, allowed: boolean): string {
  if (!allowed) return `${who} denied it.`
  return `A message from ${who === 'You' ? 'you' : who} told the agent.`
}

/** The note of a request that a member denied while the agent waited. */
export function deniedNote(who: string): string {
  return `${who} denied it. The command did not run.`
}

/** The names of secrets as inline code, such as "`A` and `B`". */
function namesText(names: readonly string[]): string {
  const code = names.map((name) => `\`${name}\``)
  if (code.length < 2) return code.join('')
  return `${code.slice(0, -1).join(', ')} and ${code.at(-1)}`
}

/**
 * The message that a late answer sends in the session, in the name of the
 * member who answered. It names each secret and says that it is now
 * available. It never holds a value.
 */
export function lateAnswerMessage(
  names: readonly string[],
  grant: SecretGrant,
  org: string,
): string {
  const verb = names.length === 1 ? 'is' : 'are'
  const lead = `${namesText(names)} ${verb} now available`
  if (grant.kind !== 'value') return `${lead} in this session.`
  switch (grant.lifetime) {
    case 'minutes':
      return `${lead} in this session for 15 minutes.`
    case 'workspace':
      return `${lead} in this workspace.`
    case 'saved':
      return `${lead}, saved as a secret of ${org}.`
  }
}
