import type {
  MemberGrant,
  SecretGrant,
  ValueLifetime,
} from '../../fixtures/secretRequests'

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
  /**
   * The label of the command that the run call sends (secrets decision
   * 11 D). Nothing checks that the agent runs it.
   */
  claimedCommand: 'Command the agent says it will run',
  allowed: 'Allowed',
  denied: 'Denied',
  notAnswered: 'Not answered',
  /** The phone action that opens the sheet of a value. */
  giveValue: 'Give a value',
  /** The line of a late request: why it is in the chat, and what Allow does. */
  late: 'The agent stopped waiting. Allow tells it in a new turn.',
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
 * What followed the answer of a late request: a turn that told the agent,
 * nothing until the next message, because that turn cannot run, or a Deny,
 * which sends nothing (secrets decision 10 B).
 */
export type LateOutcome = 'turn' | 'next-message' | 'denied'

/**
 * The line of a late request after its answer. `who` starts the sentence:
 * "You" for the person who answered, and the name of that member for the
 * others.
 */
export function lateAnswerNote(who: string, outcome: LateOutcome): string {
  switch (outcome) {
    case 'turn':
      return `${who} answered, and a new turn told the agent.`
    case 'next-message':
      return `${who} answered. The agent learns of it at the next message.`
    case 'denied':
      return `${who} denied it.`
  }
}

/**
 * The line of a late Allow whose turn waits for the login of the starter,
 * which is gone: who answered, and the action that gets the agent going
 * again (item 12 C of the mockups). `starter` is "you" for the viewer.
 */
export function reconnectNote(
  who: string,
  starter: string,
  agent: string,
): string {
  const action =
    starter === 'you' ? `you connect ${agent}` : `${starter} connects ${agent}`
  return `${who} answered. The agent learns of it when ${action} again.`
}

/** The note of a request that a member denied while the agent waited. */
export function deniedNote(who: string): string {
  return `${who} denied it. The command did not run.`
}

/**
 * The line of a late Allow in the chat, which is also the text that its
 * turn gives the agent (secrets decision 10 B): the member who answered,
 * each secret, and what the answer gives, never a value. The chat names
 * the viewer "You", and the agent gets the name of the member. The names
 * of the secrets go between `lead` and `tail`.
 */
export function lateAnswerWords(
  grant: MemberGrant,
  who: string,
  count: number,
  org: string,
): { lead: string; tail: string } {
  if (grant.kind === 'session') {
    return { lead: `${who} allowed`, tail: 'for this session.' }
  }
  switch (grant.lifetime) {
    case 'minutes':
      return { lead: `${who} gave`, tail: 'for 15 minutes.' }
    case 'workspace':
      return { lead: `${who} gave`, tail: 'for this workspace.' }
    case 'saved':
      return {
        lead: `${who} saved`,
        tail: `as ${count === 1 ? 'a secret' : 'secrets'} of ${org}.`,
      }
  }
}
