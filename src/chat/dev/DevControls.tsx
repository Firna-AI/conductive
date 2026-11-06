import type { ChatEvent } from '../../shared/chat-events'
import { ActionButton } from '../ui/actions'
import type { DevBackend } from './dev-backend'
import {
  choices,
  optionNames,
  optionValue,
  type DevOptions,
} from './dev-options'
import { failStart, makeReady, stopSandbox } from './dev-sandbox'
import { writeTitle } from './dev-sessions'
import styles from './DevPage.module.css'

/** Opens the page again with one option changed. */
function navigate(options: DevOptions, name: keyof DevOptions, value: string) {
  const params = new URLSearchParams()
  for (const key of optionNames) {
    params.set(key, key === name ? value : optionValue(options, key))
  }
  window.location.search = params.toString()
}

/**
 * Sends a short turn whose two text parts arrive out of order. The chat
 * holds the later part until the gap fills, so the text reads in order.
 */
function outOfOrder(backend: DevBackend): void {
  const sessionId = backend.open[0]?.id
  if (!sessionId) return
  const context = { sessionId, turnId: `dev-order-${backend.stream.last}` }
  const messageId = `${context.turnId}-text`
  const part = (text: string): ChatEvent => ({
    ...context,
    type: 'assistant.delta',
    messageId,
    text,
  })
  backend.stream.emit({
    ...context,
    type: 'turn.started',
    senderId: 'dev',
    choice: backend.open[0].choice,
    startedAt: backend.clock.now(),
    messageIds: [],
  })
  backend.timers.push(
    backend.stream.emitOutOfOrder(
      part('The parts arrived out of order, '),
      part('and the chat kept their order.'),
    ),
  )
  backend.timers.push(
    window.setTimeout(() => {
      backend.stream.emit({
        ...context,
        type: 'turn.completed',
        state: 'finished',
        durationMs: 2_000,
        files: [],
        userMessageIds: [],
      })
    }, 2_500),
  )
}

/** The options of the page, and the live events that it can send. */
export function DevControls(props: {
  backend: DevBackend
  options: DevOptions
  log: readonly string[]
}) {
  const { backend, options } = props
  const actions: [string, () => void][] = [
    ['Make the sandbox ready', () => makeReady(backend)],
    ['Stop the sandbox', () => stopSandbox(backend)],
    ['Fail the start', () => failStart(backend)],
    ['Agent writes the title', () => writeTitle(backend, 'Saved carts')],
    ['Drop the connection', () => backend.stream.drop()],
    ['Resend the last event', () => backend.stream.resendLast()],
    ['Send parts out of order', () => outOfOrder(backend)],
  ]
  return (
    <aside aria-label="Development controls" className={styles.panel}>
      <h2 className={styles.heading}>Chat development page</h2>
      {optionNames.map((name) => (
        <label className={styles.field} key={name}>
          <span className={styles.label}>{name}</span>
          <select
            className={styles.select}
            onChange={(event) =>
              navigate(options, name, event.currentTarget.value)
            }
            value={optionValue(options, name)}
          >
            {choices[name].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      ))}
      <h2 className={styles.heading}>Live events</h2>
      <div className={styles.actions}>
        {actions.map(([label, run]) => (
          <ActionButton key={label} onPress={run}>
            {label}
          </ActionButton>
        ))}
      </div>
      <ul aria-label="App callbacks" className={styles.log}>
        {props.log.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ul>
    </aside>
  )
}
