import type { TerminalLine, TerminalTone } from '../../fixtures/terminal'
import { ActionButton } from '../common/actions'
import styles from './TerminalView.module.css'

const toneClass: Readonly<Record<TerminalTone, string>> = {
  prompt: styles.prompt,
  plain: styles.plain,
  muted: styles.muted,
  success: styles.success,
  accent: styles.accent,
}

/** Keys that a phone keyboard lacks, as a row above the keyboard. */
const extraKeys = [
  { label: 'Esc', name: 'Escape' },
  { label: 'Tab', name: 'Tab' },
  { label: 'Ctrl', name: 'Control' },
  { label: '↑', name: 'Up arrow' },
  { label: '↓', name: 'Down arrow' },
] as const

/**
 * A terminal session. With a prompt, the cursor waits after it; without one,
 * the cursor follows the output of the running command.
 */
export function TerminalView(props: {
  lines: readonly TerminalLine[]
  prompt?: string
  extraKeys: boolean
}) {
  return (
    <div className={styles.terminal}>
      <pre className={styles.screen} data-mokly-scroll="terminal">
        {props.lines.map((line, index) => (
          <div className={styles.line} key={index}>
            {line.map((segment, segmentIndex) => (
              <span className={toneClass[segment.tone]} key={segmentIndex}>
                {segment.text}
              </span>
            ))}
          </div>
        ))}
        <div className={styles.line}>
          {props.prompt ? (
            <span className={styles.prompt}>{props.prompt}</span>
          ) : null}
          <span aria-hidden className={styles.cursor} />
        </div>
      </pre>
      {props.extraKeys ? (
        <div className={styles.keys}>
          {extraKeys.map((key) => (
            <ActionButton accessibilityLabel={key.name} key={key.name}>
              {key.label}
            </ActionButton>
          ))}
        </div>
      ) : null}
    </div>
  )
}
