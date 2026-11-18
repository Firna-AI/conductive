import type { WorkspaceEvent } from '../../shared/events'
import { FAKE_IDS } from './core'
import { workspaceFixtures } from './workspaces'
import { asks, cal, SECRET_TURN, step } from './secret-requests'

/**
 * A short turn of Cal around the records of a state: his message, the start
 * of the turn, the tool call line of the agent, the records, the final
 * answer, and the end. Its records then fold with its work, as in a real
 * turn. The events come in the order of their times, so a late answer that
 * comes after the end of the turn follows it.
 */
export function secretTurn(
  at: number,
  records: readonly [WorkspaceEvent, number][],
): [WorkspaceEvent, number][] {
  const sessionId = FAKE_IDS.session
  const turnId = SECRET_TURN
  const { message } = workspaceFixtures()
  const sent = {
    ...message,
    id: 'dev-secrets-message',
    sessionId,
    text: 'Deploy a preview, and check the addresses that failed.',
    createdAt: at,
  }
  const tool = {
    id: 'dev-secrets-run',
    kind: 'run' as const,
    target: `conductive secrets run -- ${asks.vercel.command}`,
    detail: null,
    omittedDetailBytes: 0,
  }
  const answer = 'Deployed the preview. The address check needs the database.'
  const turn: [WorkspaceEvent, number][] = [
    [{ type: 'message.accepted', message: sent }, at],
    [
      {
        type: 'turn.started',
        sessionId,
        turnId,
        senderId: cal.id,
        choice: message.choice,
        startedAt: at + step,
        messageIds: [sent.id],
      },
      at + step,
    ],
    [
      {
        type: 'tool.updated',
        sessionId,
        turnId,
        tool: { ...tool, state: 'running' },
      },
      at + 2 * step,
    ],
    [
      {
        type: 'tool.updated',
        sessionId,
        turnId,
        tool: { ...tool, state: 'done' },
      },
      at + 10 * step,
    ],
    [
      {
        type: 'assistant.delta',
        sessionId,
        turnId,
        messageId: 'dev-secrets-answer',
        text: answer,
      },
      at + 12 * step,
    ],
    [
      {
        type: 'assistant.completed',
        sessionId,
        turnId,
        messageId: 'dev-secrets-answer',
        text: answer,
        userMessageIds: [sent.id],
      },
      at + 13 * step,
    ],
    [
      {
        type: 'turn.completed',
        sessionId,
        turnId,
        state: 'finished',
        durationMs: 14 * step,
        userMessageIds: [sent.id],
        files: [],
        omittedFileCount: 0,
      },
      at + 14 * step,
    ],
  ]
  return [...turn, ...records].sort((a, b) => a[1] - b[1])
}
