import type { SecretRunGrant } from '../../shared/generated/SecretRunGrant'
import type { MessageSender } from '../../shared/generated/MessageSender'
import type { Session } from '../../shared/generated/Session'
import {
  deniedNote,
  endedLine,
  grantNote,
  lateAnswerNote,
  reconnectNote,
  lifetimeHint,
  lifetimeLabels,
  type SessionLoginOwner,
} from '../../ui/components/chat/secretRunCopy'
import { loginOwnerName } from '../../app/login-owner'
import { personName } from '../../app/people'
import {
  lateAnswerParts as sharedLateAnswerParts,
  type LateAnswerPart,
} from '../../shared/secret-late-answer'
import type {
  SecretRequest,
  SecretRequestEnd,
  SecretValueLifetime,
  SecretWorkspaceEvent,
} from '../../shared/secret-requests'

type RunEvent = Extract<SecretWorkspaceEvent, { type: 'secrets.run' }>

/**
 * A member as the words of a request name them: `subject` starts a
 * sentence, and `object` follows a word. The person signed in reads "You"
 * and "you". `name` is null when the chat does not know the member.
 */
function whoNamed(
  id: string | null,
  name: string | null,
  viewerId: string | null,
): { subject: string; object: string } {
  if (id !== null && id === viewerId) {
    return { subject: 'You', object: 'you' }
  }
  return { subject: name ?? 'A member', object: name ?? 'a member' }
}

/** The member of a record as the words of a request name them. */
function whoOf(
  person: MessageSender | null,
  viewerId: string | null,
): { subject: string; object: string } {
  const name = person ? personName(person) : null
  return whoNamed(person?.id ?? null, name, viewerId)
}

/** The names of the shared words for each lifetime of a value. */
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

/**
 * What a member's Allow gave, as the end of an answered request shows it.
 * The words are those of the shared `lateAllowedLabel`, which takes the
 * generic `SecretGrant` from `src/ui/components/chat/secretGrant.ts`.
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
 * What ended a request with no answer. The shared `endedLine` gives the
 * words of an Archive and of a suspension of the org. A suspension of the
 * owner and a close of the session follow their pattern.
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
 * The login that a late request names when it is gone: the owner of the
 * login that the session keeps, and the name of its agent.
 */
export interface RecoveryLogin {
  owner: SessionLoginOwner
  agent: string
}

/**
 * The owner of the login that a session keeps, named by `loginOwnerName`,
 * as the session-login view names it. The session keeps `Session.login`
 * also after that login is gone, so the owner never follows the login that
 * a new message would take. The person signed in reads "you". An older
 * record without a login keeps the personal login of its starter.
 * `orgName` is the name of the org of the workspace, which owns its org
 * login.
 */
export function keptLoginOwner(
  session: Pick<Session, 'login' | 'startedBy'>,
  viewerId: string | null,
  orgName: string,
): SessionLoginOwner {
  const { login, startedBy } = session
  if (!login) {
    return { type: 'personal', name: whoOf(startedBy, viewerId).object }
  }
  const name = loginOwnerName(login, orgName, startedBy ? [startedBy] : [])
  if (login.type === 'org') return { type: 'org', name: name ?? orgName }
  return {
    type: 'personal',
    name: whoNamed(login.userId, name, viewerId).object,
  }
}

/**
 * The line under a request that ended: why it ended with no answer, or who
 * answered it late and what followed (secrets decision 10 B). A request
 * that a member answered in time shows its answer at the end of its names
 * only. When the login of the session is gone, the line names who connects
 * `login` again. Until the app knows whether the late answer told the
 * agent, the line says only who answered.
 */
export function endLine(
  request: SecretRequest,
  viewerId: string | null,
  org: string,
  login: RecoveryLogin | null = null,
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
  if (notice?.state === 'not-sent' && login) {
    return reconnectNote(who, login.owner, login.agent)
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

/**
 * The line of a late Allow, with "You" for the person signed in. The
 * shared words are the text that the agent gets too.
 */
export function lateAnswerParts(
  request: SecretRequest,
  viewerId: string | null,
  org: string,
): LateAnswerPart[] {
  return sharedLateAnswerParts(
    request,
    whoOf(request.answeredBy, viewerId).subject,
    org,
  )
}
