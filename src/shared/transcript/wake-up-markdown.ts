import {
  cancelledFromText,
  cancelledUnnamed,
  memberCancelled,
  notStarted,
  pendingWakeUpsCopy,
  pendingWakeUpTitle,
  wakeUpText,
  wakeUpWords,
  type WakeUpMiss,
} from '../../../docs/mockups/src/components/chat/wakeUpCopy'
import type { SessionWakeUpEvent } from '../generated/SessionWakeUpEvent'
import type { WakeUp } from '../generated/WakeUp'
import type { WakeUpFailure } from '../generated/WakeUpFailure'
import { sessionLink } from '../session-link'
import { utcWakeUpTime } from '../wake-up-time'
import { plainText } from './markdown-code'
import type { ChatReaders } from './turn-words'

function memberName(id: string, readers: ChatReaders): string | null {
  const member = readers.members.find((entry) => entry.id === id)
  return member ? plainText(member.displayName ?? member.githubLogin) : null
}

function miss(
  reason: WakeUpFailure,
  readers: ChatReaders,
  orgName: string | null,
): WakeUpMiss {
  switch (reason.kind) {
    case 'sender-unavailable':
    case 'login-not-shared':
      return { kind: 'next-message' }
    case 'login-unavailable': {
      const { owner } = reason
      return {
        kind: 'reconnect',
        owner:
          owner?.type === 'org'
            ? { type: 'org', name: plainText(orgName ?? 'the org') }
            : {
                type: 'personal',
                name:
                  (owner && memberName(owner.userId, readers)) ??
                  'the session starter',
              },
        agent: reason.agent === 'claude' ? 'Claude' : 'Codex',
      }
    }
    default:
      return reason
  }
}

export function wakeUpMarkdown(
  event: Exclude<SessionWakeUpEvent, { type: 'session.wake-up-scheduled' }>,
  readers: ChatReaders,
  links: { origin: string; orgId: string },
  orgName: string | null,
): string {
  if (event.type === 'session.wake-up-fired') return wakeUpText(event.text)
  const at = utcWakeUpTime(event.at)
  const { outcome } = event
  if (outcome.kind === 'could-not-start')
    return `_${notStarted(at, miss(outcome.reason, readers, orgName))}_`
  const { source } = outcome
  if (source.kind === 'session') {
    const link = sessionLink(
      links.origin,
      links.orgId,
      source.workspaceId,
      source.sessionId,
    )
    return `_${cancelledFromText(at, `<${link}>`)}_`
  }
  const name = memberName(source.memberId, readers)
  return `_${name ? memberCancelled(name, at) : cancelledUnnamed(at)}_`
}

export function pendingWakeUpsMarkdown(wakeUps: readonly WakeUp[]): string {
  if (wakeUps.every(({ at }) => Number.isFinite(new Date(at).getTime())))
    return pendingWakeUpsCopy(wakeUps)
  return [
    `## ${wakeUpWords.region}`,
    ...wakeUps.flatMap(({ atUtc, text }) => [
      `_${pendingWakeUpTitle(atUtc)}_`,
      text,
    ]),
  ].join('\n\n')
}
