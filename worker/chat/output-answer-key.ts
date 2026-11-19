import type { HeldOutput } from '../../src/shared/output-sanitizer'

export function answerOutputStream(
  event: Pick<HeldOutput['event'], 'sessionId' | 'turnId' | 'messageId'>,
): string {
  return JSON.stringify([event.sessionId, event.turnId, event.messageId])
}
