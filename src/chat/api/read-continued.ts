import type { ChatEvent } from '../../shared/chat-events'
import type { MessageSender } from '../../shared/generated/MessageSender'
import { record, text } from './json'
import { label } from './read-changed-file'

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

/**
 * The note of Continue in one session. `branch` and `baseBranch` stay the
 * real names, and the optional labels hide each secret value in them. A
 * note without a label, such as one from an older Worker, reads as before.
 */
export function readContinued(
  source: Record<string, unknown>,
): Extract<ChatEvent, { type: 'workspace.continued' }> {
  const displayBranch = label(source.displayBranch)
  const displayBaseBranch = label(source.displayBaseBranch)
  return {
    type: 'workspace.continued',
    sessionId: text(source.sessionId),
    member: readMember(source.member),
    branch: text(source.branch),
    ...(displayBranch === undefined ? {} : { displayBranch }),
    baseBranch: text(source.baseBranch),
    ...(displayBaseBranch === undefined ? {} : { displayBaseBranch }),
  }
}

/** The note of a repository change in one session. */
export function readRepositoryChanged(
  source: Record<string, unknown>,
): Extract<ChatEvent, { type: 'workspace.repository-changed' }> {
  const repository = record(source.repository, 'repository')
  const displayBranch = label(source.displayBranch)
  const displayBaseBranch = label(source.displayBaseBranch)
  return {
    type: 'workspace.repository-changed',
    sessionId: text(source.sessionId),
    member: readMember(source.member),
    repository: {
      id: text(repository.id),
      fullName: text(repository.fullName),
    },
    branch: text(source.branch),
    ...(displayBranch === undefined ? {} : { displayBranch }),
    baseBranch: text(source.baseBranch),
    ...(displayBaseBranch === undefined ? {} : { displayBaseBranch }),
  }
}
