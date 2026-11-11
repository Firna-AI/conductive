/**
 * The sessions from Conductor after the activation of Coupon totals at
 * checkout. Activation restored the agent memory of each one. Each opens
 * as an ordinary session tab that links back to its old document, and its
 * chat shows only the new turns, never the old ones.
 */

import { defaultChoice, type AgentChoice } from './agents'
import { oldSessions, openOldSession, type OldSession } from './conductorImport'
import type { ChatItem } from './conversations'
import { codex } from './workspaces'

/**
 * How a session from Conductor continues: with the agent's memory, or,
 * when it cannot resume, fresh from its old chat.
 */
export type ResumeOutcome = 'memory' | 'fallback'

/**
 * The first line of a session from Conductor after the activation of its
 * workspace, as a chat item. It continues with the agent's memory, or it
 * could not resume and started fresh from its old chat. `title` names the
 * old session, whose document `to` opens, where the mockups draw it.
 */
export type ResumedLineItem = {
  kind: 'resumed'
  id: string
  title: string
  outcome: ResumeOutcome
  to?: string
}

/**
 * The session of each drawn outcome. Apply coupons before tax resumes with
 * the memory of Claude. Coupon edge cases in tests ran on Codex, could not
 * resume, and starts fresh. The mockups draw no outcome for the third one.
 */
export const resumedSessions: Readonly<Record<ResumeOutcome, OldSession>> = {
  memory: openOldSession,
  fallback: oldSessions[0],
}

/** The model of a session from Conductor, which keeps its agent. */
export function resumedChoice(session: OldSession): AgentChoice {
  return session.agent === 'codex' ? codex : defaultChoice
}

/** Where activation puts the old chat of a session in the cloud computer. */
function oldChatPath(session: OldSession): string {
  const name = session.title.toLowerCase().split(' ').join('-')
  return `.context/conductor/${name}.md`
}

const fallbackFile = oldChatPath(resumedSessions.fallback)

/**
 * The chat of each drawn session after its first new turn. The resumed
 * one remembers the coupon step that its old chat moved before tax. The
 * fresh one names its old chat in its first message, and reads it first.
 */
export const resumedConversations: Readonly<
  Record<ResumeOutcome, readonly ChatItem[]>
> = {
  memory: [
    {
      kind: 'resumed',
      id: 'resumed',
      title: resumedSessions.memory.title,
      outcome: 'memory',
    },
    {
      kind: 'user',
      id: 'ask',
      text: 'Show the coupon saving as its own line on the receipt.',
    },
    {
      kind: 'tool',
      id: 'read',
      tool: 'read',
      target: 'src/basket/receipt.ts',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'edit',
      tool: 'edit',
      target: 'src/basket/receipt.ts',
      detail: '+12 −2',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'test',
      tool: 'run',
      target: 'npm test -- receipt',
      detail: '6 passed',
      status: 'done',
    },
    {
      kind: 'agent',
      id: 'done',
      blocks: [
        'The receipt now shows the coupon saving as its own line, above VAT. It reads `computeTotals`, which takes the coupon off before tax since our change, so the line matches the total.',
      ],
    },
    {
      kind: 'turn-end',
      id: 'turn-end',
      duration: '1m 48s',
      files: [
        {
          path: 'src/basket/receipt.ts',
          change: 'modified',
          added: 12,
          removed: 2,
        },
      ],
    },
  ],
  fallback: [
    {
      kind: 'resumed',
      id: 'resumed',
      title: resumedSessions.fallback.title,
      outcome: 'fallback',
    },
    {
      kind: 'user',
      id: 'ask',
      text: `Our earlier chat is in \`${fallbackFile}\`. Add a case for a coupon that expires during checkout.`,
    },
    {
      kind: 'tool',
      id: 'read-chat',
      tool: 'read',
      target: fallbackFile,
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'edit',
      tool: 'edit',
      target: 'src/basket/totals.test.ts',
      detail: '+18',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'test',
      tool: 'run',
      target: 'npm test -- totals',
      detail: '15 passed',
      status: 'done',
    },
    {
      kind: 'agent',
      id: 'done',
      blocks: [
        'I read our earlier chat first. It covered a coupon larger than the basket and two coupons on one line. I added a case for a coupon that expires during checkout: the total drops the coupon, and the basket says why.',
      ],
    },
    {
      kind: 'turn-end',
      id: 'turn-end',
      duration: '2m 31s',
      files: [
        {
          path: 'src/basket/totals.test.ts',
          change: 'modified',
          added: 18,
          removed: 0,
        },
      ],
    },
  ],
}
