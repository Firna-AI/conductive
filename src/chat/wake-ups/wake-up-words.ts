import type { WakeUpEnd } from '../../shared/generated/WakeUpEnd'
import type { WakeUpFailure } from '../../shared/generated/WakeUpFailure'
import {
  cancelledFromLead,
  cancelledUnnamed,
  memberCancelled,
  notStarted,
  type WakeUpMiss,
} from '../../../docs/mockups/src/components/chat/wakeUpCopy'
import { personName } from '../../app/people'
import type { ChatReaders } from '../../shared/transcript/turn-words'
import { agentNames } from '../components/AgentMark'

/**
 * A member as an end line names them: `subject` starts the line, and
 * `object` follows a word. The person signed in reads "You" and "you". Null
 * for a member whom the chat does not know, such as one who left the org.
 */
function named(
  id: string,
  readers: ChatReaders,
): { subject: string; object: string } | null {
  if (id === readers.viewerId) return { subject: 'You', object: 'you' }
  const member = readers.members.find((item) => item.id === id)
  if (!member) return null
  const name = personName(member)
  return { subject: name, object: name }
}

/**
 * Why a wake-up could start no turn, by the action that gets the agent
 * going again, in the words of a late secret request (wake-up decision 4
 * B). A sender who left the org, or a starter who no longer shares the
 * login, gives the next message. A login that is gone names who connects
 * it again: "you" to its owner, the name of the owner to the others, or an
 * admin for the login of the org. An owner whom the chat does not know
 * reads "the session starter", as the copy names them.
 */
function missOf(
  reason: WakeUpFailure,
  readers: ChatReaders,
  orgName: string | null,
): WakeUpMiss {
  switch (reason.kind) {
    case 'sender-unavailable':
    case 'login-not-shared':
      return { kind: 'next-message' }
    case 'archived':
    case 'session-closed':
      return { kind: reason.kind }
    case 'login-unavailable': {
      const { owner } = reason
      const agent = agentNames[reason.agent]
      if (owner?.type === 'org') {
        const name = orgName ?? 'the org'
        return { kind: 'reconnect', owner: { type: 'org', name }, agent }
      }
      const name = owner ? named(owner.userId, readers)?.object : undefined
      return {
        kind: 'reconnect',
        owner: { type: 'personal', name: name ?? 'the session starter' },
        agent,
      }
    }
  }
}

/**
 * The words of the end line of a wake-up, for the reader, with `time` as
 * the words of its time. A Cancel names its member, "You" to that member,
 * and nobody for a member who left (wake-up decision 5 B). A cancel through
 * the workspace tools gives the words that come before the chip of its
 * session, as a stop through the tools does. A wake-up that could start no
 * turn names the action or the cause.
 */
export function wakeUpEndWords(
  end: WakeUpEnd,
  time: string,
  readers: ChatReaders,
): string {
  if (end.kind === 'could-not-start') {
    const miss = missOf(end.reason, readers, readers.orgName ?? null)
    return notStarted(time, miss)
  }
  const { source } = end
  if (source.kind === 'session') return cancelledFromLead(time)
  const who = named(source.memberId, readers)
  return who ? memberCancelled(who.subject, time) : cancelledUnnamed(time)
}
