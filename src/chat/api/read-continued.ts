import type { ChatEvent } from '../../shared/chat-events'
import { record, text } from './json'

export function readContinued(
  source: Record<string, unknown>,
): Extract<ChatEvent, { type: 'workspace.continued' }> {
  const member = record(source.member, 'member')
  return {
    type: 'workspace.continued',
    sessionId: text(source.sessionId),
    member: {
      id: text(member.id),
      githubLogin: text(member.githubLogin),
      displayName:
        member.displayName === null ? null : text(member.displayName),
      avatarUrl: member.avatarUrl === null ? null : text(member.avatarUrl),
    },
    branch: text(source.branch),
    baseBranch: text(source.baseBranch),
  }
}
