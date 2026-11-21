import type { ChatEvent } from '../../shared/chat-events'
import type { MessageSender } from '../../shared/generated/MessageSender'
import { record, text } from './json'

/** The member whom a note of the app names, as the note keeps it. */
export function readMember(value: unknown): MessageSender {
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
