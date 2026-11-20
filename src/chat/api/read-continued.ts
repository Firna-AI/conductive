import type { ChatEvent } from '../../shared/chat-events'
import type { MessageSender } from '../../shared/generated/MessageSender'
import { oneOf, record, text } from './json'

type TurnContinued = Extract<ChatEvent, { type: 'turn.continued' }>

function readMember(value: unknown): MessageSender {
  const member = record(value, 'member')
  return {
    id: text(member.id),
    githubLogin: text(member.githubLogin),
    displayName: member.displayName === null ? null : text(member.displayName),
    avatarUrl: member.avatarUrl === null ? null : text(member.avatarUrl),
  }
}

export function readContinued(
  source: Record<string, unknown>,
): Extract<ChatEvent, { type: 'workspace.continued' }> {
  return {
    type: 'workspace.continued',
    sessionId: text(source.sessionId),
    member: readMember(source.member),
    branch: text(source.branch),
    baseBranch: text(source.baseBranch),
  }
}

/** The note of a repository change in one session. */
export function readRepositoryChanged(
  source: Record<string, unknown>,
): Extract<ChatEvent, { type: 'workspace.repository-changed' }> {
  const repository = record(source.repository, 'repository')
  return {
    type: 'workspace.repository-changed',
    sessionId: text(source.sessionId),
    member: readMember(source.member),
    repository: {
      id: text(repository.id),
      fullName: text(repository.fullName),
    },
    branch: text(source.branch),
    baseBranch: text(source.baseBranch),
  }
}

const readNext = oneOf<TurnContinued['next']>({
  turn: true,
  reconnect: true,
  message: true,
})

/**
 * The line after a turn that a provider stop ended. With `next: 'turn'`,
 * `turnId` names the continuation turn. Each other `next` has no turn, so
 * its line reads with none. A `next` that this app does not know throws,
 * so the chat skips the line, as an older app does.
 */
export function readTurnContinued(
  source: Record<string, unknown>,
): TurnContinued {
  const fields = {
    type: 'turn.continued',
    sessionId: text(source.sessionId),
    previousTurnId: text(source.previousTurnId),
  } as const
  const next = readNext(source.next)
  return next === 'turn'
    ? { ...fields, next, turnId: text(source.turnId) }
    : { ...fields, next, turnId: null }
}
