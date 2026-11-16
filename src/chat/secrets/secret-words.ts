import type { MessageSender } from '../../shared/generated/MessageSender'
import {
  deniedNote,
  endedLine,
  grantNote,
  lateAnswerNote,
  lifetimeHint,
  lifetimeLabels,
} from '../../../docs/mockups/src/components/chat/secretRunCopy'
import { personName } from '../../app/people'
import type {
  SecretRequest,
  SecretRequestEnd,
  SecretRunGrant,
  SecretValueLifetime,
  SecretWorkspaceEvent,
} from '../../shared/secret-requests'

type RunEvent = Extract<SecretWorkspaceEvent, { type: 'secrets.run' }>

/**
 * A member as the words of a request name them: `subject` starts a
 * sentence, and `object` follows a word. The person signed in reads "You"
 * and "you".
 */
function whoOf(
  person: MessageSender | null,
  viewerId: string | null,
): { subject: string; object: string } {
  if (person !== null && person.id === viewerId) {
    return { subject: 'You', object: 'you' }
  }
  const name = person ? personName(person) : null
  return { subject: name ?? 'A member', object: name ?? 'a member' }
}

/** The names of the mockup words for each lifetime of a value. */
const mockupLifetimes = {
  '15-minutes': 'minutes',
  workspace: 'workspace',
  save: 'saved',
} as const

/** The choices of how long the values of a request last, in their order. */
export const lifetimeChoices = (
  ['15-minutes', 'workspace', 'save'] as const
).map((value) => ({ value, label: lifetimeLabels[mockupLifetimes[value]] }))

/** The line under the choices: what the chosen one does. */
export function lifetimeLine(
  lifetime: SecretValueLifetime,
  names: string,
  org: string,
): string {
  return lifetimeHint(mockupLifetimes[lifetime], names, org)
}

/** The names of a request that the org has no secret for. */
export function missingNames(request: SecretRequest): string[] {
  return request.secrets
    .filter((secret) => secret.secretId === null)
    .map((secret) => secret.name)
}

/**
 * What a member's Allow gave, as the end of an answered request shows it.
 * The words are those of `lateAllowedLabel` of the mockups, which takes a
 * grant of the mockup people.
 */
export function allowedLabel(lifetime: SecretValueLifetime | null): string {
  switch (lifetime) {
    case null:
      return 'Allowed for this session'
    case '15-minutes':
      return 'Value for 15 minutes'
    case 'workspace':
      return 'Value for this workspace'
    case 'save':
      return 'Saved as a secret'
  }
}

/**
 * What ended a request with no answer. The mockups give the words of an
 * Archive and of a suspension of the org. A suspension of the owner and a
 * close of the session follow their pattern.
 */
function endedWords(cause: SecretRequestEnd, org: string): string {
  switch (cause) {
    case 'archived':
      return endedLine('archive', org)
    case 'org-suspended':
      return endedLine('suspension', org)
    case 'owner-suspended':
      return 'It ended when the owner of the workspace was suspended.'
    case 'session-closed':
      return 'It ended when the session was closed.'
  }
}

/**
 * The line under a request that ended: why it ended with no answer, or who
 * answered it late and what followed (secrets decision 10 B). A request
 * that a member answered in time shows its answer at the end of its names
 * only. Until the app knows whether the late answer told the agent, the
 * line says only who answered.
 */
export function endLine(
  request: SecretRequest,
  viewerId: string | null,
  org: string,
): string | null {
  if (request.state === 'not-answered') {
    return request.endedBy ? endedWords(request.endedBy, org) : null
  }
  if (!request.late) return null
  const who = whoOf(request.answeredBy, viewerId).subject
  if (request.state === 'denied') return lateAnswerNote(who, 'denied')
  if (request.state !== 'allowed') return null
  const { notice } = request
  if (notice?.state === 'sent') return lateAnswerNote(who, 'turn')
  if (notice?.state === 'not-sent' && notice.reason !== 'login-unavailable') {
    return lateAnswerNote(who, 'next-message')
  }
  return `${who} answered.`
}

/** The note of a request that a member denied in time. */
export function deniedLine(
  request: SecretRequest,
  viewerId: string | null,
): string {
  return deniedNote(whoOf(request.answeredBy, viewerId).subject)
}

/**
 * What let one name of a run use its secret. `by` is the member whose
 * answer gave the grant, when the run comes from the answer of its request.
 */
function grantWords(
  grant: SecretRunGrant,
  by: string | null,
  saved: boolean,
): string {
  switch (grant.grant) {
    case 'all-agents':
      return grantNote({ kind: 'all-agents' }, '')
    case 'workspace':
      return grantNote({ kind: 'pre-approved' }, '')
    case 'session':
      if (saved) return by ? `Saved as a secret by ${by}` : 'Saved as a secret'
      return by ? `Allowed for this session by ${by}` : allowedLabel(null)
    case '15-minutes':
      return by
        ? `Value from ${by}, for 15 minutes`
        : allowedLabel('15-minutes')
    case 'workspace-value':
      return by
        ? `Value from ${by}, for this workspace`
        : allowedLabel('workspace')
  }
}

/**
 * The note of an allowed run: what let each name run. A run that one answer
 * allowed names the member who answered. Names with the same grant share
 * one note, and different grants each name their secrets.
 */
export function runNote(
  run: RunEvent,
  request: SecretRequest | null,
  viewerId: string | null,
): string {
  const asked = new Map(
    (request?.secrets ?? []).map((secret) => [secret.name, secret]),
  )
  const groups = new Map<string, string[]>()
  for (const grant of run.grants) {
    const secret = asked.get(grant.name)
    const by =
      request && secret ? whoOf(request.answeredBy, viewerId).object : null
    const saved = request?.lifetime === 'save' && secret?.secretId === null
    const words = grantWords(grant, by, saved)
    groups.set(words, [...(groups.get(words) ?? []), grant.name])
  }
  const notes = [...groups]
  if (notes.length === 1) return notes[0][0]
  return notes
    .map(([words, names]) => `${names.join(', ')}: ${words}`)
    .join(' · ')
}

/** A part of the line of a late answer: words, then the names in code. */
export interface LateAnswerPart {
  lead: string
  names: readonly string[]
  tail: string
}

/**
 * The line of a late Allow (secrets decision 10 B), with the words of
 * `lateAnswerWords` of the mockups: the member who answered, each secret,
 * and what the answer gives, never a value. A request that also names
 * secrets of the org says that they are allowed for the session too.
 */
export function lateAnswerParts(
  request: SecretRequest,
  viewerId: string | null,
  org: string,
): LateAnswerPart[] {
  const who = whoOf(request.answeredBy, viewerId).subject
  const all = request.secrets.map((secret) => secret.name)
  const missing = missingNames(request)
  const stored = all.filter((name) => !missing.includes(name))
  const also = {
    lead: `${who} also allowed`,
    names: stored,
    tail: 'for this session.',
  }
  switch (request.lifetime) {
    case null:
      return [{ lead: `${who} allowed`, names: all, tail: 'for this session.' }]
    case '15-minutes':
      return [
        { lead: `${who} gave`, names: missing, tail: 'for 15 minutes.' },
        ...(stored.length > 0 ? [also] : []),
      ]
    case 'workspace':
      return [
        { lead: `${who} gave`, names: missing, tail: 'for this workspace.' },
        ...(stored.length > 0 ? [also] : []),
      ]
    case 'save': {
      const kind = missing.length === 1 ? 'a secret' : 'secrets'
      return [
        { lead: `${who} saved`, names: missing, tail: `as ${kind} of ${org}.` },
        ...(stored.length > 0 ? [also] : []),
      ]
    }
  }
}
