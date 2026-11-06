import type { ChatEvent, ToolCall } from '../../shared/chat-events'
import type { UserMessage } from '../../shared/messages'
import type { Clock } from '../ui/clock'
import type { DevStream } from './dev-stream'

interface Turn {
  turnId: string
  sessionId: string
  answers: string[]
  timers: number[]
  tool: ToolCall | null
  startedAt: number
}

const tool = (
  id: string,
  kind: ToolCall['kind'],
  target: string,
): ToolCall => ({
  id,
  kind,
  target,
  detail: null,
  state: 'running',
})

/**
 * A scripted agent for the development page. Each turn thinks, writes, runs
 * three tool calls, answers every message that it read, and ends. A message
 * during a turn steers it, and Stop ends it as stopped.
 */
export class DevAgent {
  private readonly stream: DevStream
  private readonly clock: Clock
  private readonly turns = new Map<string, Turn>()
  private count = 0
  /** Called after the first answer of a turn, as the title request is. */
  onAnswer: (sessionId: string) => void = () => {}

  constructor(stream: DevStream, clock: Clock) {
    this.stream = stream
    this.clock = clock
  }

  running(sessionId: string): string | null {
    return this.turns.get(sessionId)?.turnId ?? null
  }

  start(sessionId: string, messages: readonly UserMessage[]): string {
    this.count += 1
    const turnId = `dev-turn-${this.count}`
    const turn: Turn = {
      turnId,
      sessionId,
      answers: messages.map((message) => message.id),
      timers: [],
      tool: null,
      startedAt: this.clock.now(),
    }
    this.turns.set(sessionId, turn)
    const context = { sessionId, turnId }
    const answer = `dev-answer-${this.count}`
    const steps: [number, () => ChatEvent][] = [
      [
        0,
        () => ({
          ...context,
          type: 'turn.started',
          senderId: messages[0]?.sender.id ?? 'you',
          choice: messages[0].choice,
          startedAt: turn.startedAt,
          messageIds: turn.answers,
        }),
      ],
      [600, () => ({ ...context, type: 'turn.thinking' })],
      [
        1_600,
        () => ({
          ...context,
          type: 'assistant.delta',
          messageId: `${answer}-plan`,
          text: 'I will read ',
        }),
      ],
      [
        1_900,
        () => ({
          ...context,
          type: 'assistant.delta',
          messageId: `${answer}-plan`,
          text: 'the files that this touches first.',
        }),
      ],
      ...this.toolSteps(
        turn,
        2_400,
        tool('read', 'read', 'src/app/checkout/AddressForm.tsx'),
        null,
      ),
      ...this.toolSteps(
        turn,
        3_600,
        tool('search', 'search', 'usePlaces'),
        '2 results',
      ),
      ...this.toolSteps(
        turn,
        4_800,
        tool('edit', 'edit', 'src/app/checkout/AddressForm.tsx'),
        '+12 −3',
      ),
      [6_400, () => ({ ...context, type: 'turn.thinking' })],
      [
        7_200,
        () => ({
          ...context,
          type: 'assistant.delta',
          messageId: answer,
          text: 'Done. The form now ',
        }),
      ],
      [
        7_600,
        () => ({
          ...context,
          type: 'assistant.completed',
          messageId: answer,
          text: 'Done. The form now does what you asked, and its tests pass.',
          userMessageIds: turn.answers,
        }),
      ],
      [
        7_900,
        () => ({
          ...context,
          type: 'turn.completed',
          state: 'finished',
          durationMs: this.clock.now() - turn.startedAt,
          files: [
            {
              path: 'src/app/checkout/AddressForm.tsx',
              change: 'modified',
              added: 12,
              removed: 3,
            },
          ],
          userMessageIds: turn.answers,
        }),
      ],
    ]
    for (const [delay, event] of steps) {
      turn.timers.push(
        window.setTimeout(() => this.stream.emit(event()), delay),
      )
    }
    turn.timers.push(
      window.setTimeout(() => {
        this.turns.delete(sessionId)
        this.onAnswer(sessionId)
      }, 8_000),
    )
    return turnId
  }

  private toolSteps(
    turn: Turn,
    at: number,
    call: ToolCall,
    detail: string | null,
  ): [number, () => ChatEvent][] {
    const context = { sessionId: turn.sessionId, turnId: turn.turnId }
    return [
      [
        at,
        () => {
          turn.tool = call
          return { ...context, type: 'tool.updated', tool: call }
        },
      ],
      [
        at + 900,
        () => {
          turn.tool = null
          return {
            ...context,
            type: 'tool.updated',
            tool: { ...call, detail, state: 'done' },
          }
        },
      ],
    ]
  }

  /** A message during a turn goes to the agent at once, and its answer covers it. */
  steer(message: UserMessage): string | null {
    const turn = this.turns.get(message.sessionId)
    if (!turn) return null
    turn.answers.push(message.id)
    this.stream.emit({ type: 'message.accepted', message })
    this.stream.emit({
      type: 'message.sent',
      sessionId: turn.sessionId,
      messageId: message.id,
      turnId: turn.turnId,
    })
    return turn.turnId
  }

  /** Stop: the running call shows as stopped, and the turn ends as stopped. */
  interrupt(sessionId: string): void {
    const turn = this.turns.get(sessionId)
    if (!turn) return
    for (const timer of turn.timers) window.clearTimeout(timer)
    this.turns.delete(sessionId)
    const context = { sessionId, turnId: turn.turnId }
    if (turn.tool) {
      this.stream.emit({
        ...context,
        type: 'tool.updated',
        tool: { ...turn.tool, state: 'stopped' },
      })
    }
    this.stream.emit({
      ...context,
      type: 'turn.completed',
      state: 'stopped',
      durationMs: this.clock.now() - turn.startedAt,
      files: [],
      userMessageIds: turn.answers,
    })
  }

  dispose(): void {
    for (const turn of this.turns.values()) {
      for (const timer of turn.timers) window.clearTimeout(timer)
    }
    this.turns.clear()
  }
}
