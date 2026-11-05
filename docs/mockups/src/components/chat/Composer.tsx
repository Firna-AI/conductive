import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { ArrowUp, Bot, Square } from 'lucide-react'
import { control } from '../../design/metrics'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import styles from './Composer.module.css'

export type ComposerState = {
  agent: string
  /** An agent turn runs, so a message steers it. */
  running: boolean
  draft: string
}

/**
 * The message box under the chat. It names the agent of the workspace.
 * While a turn runs, a message steers the turn, and Stop ends it.
 */
export function Composer(props: ComposerState) {
  const placeholder = props.running
    ? `Steer ${props.agent} while it works`
    : `Message ${props.agent}`
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        <InputFrame
          accessibilityLabel="Message"
          focusIndicator="none"
          maxLines={8}
          multiline
          numberOfLines={2}
          onChangeText={noop}
          placeholder={placeholder}
          size={control.field}
          value={props.draft}
          variant="seamless"
        />
        <div className={styles.bar}>
          <span className={styles.agent}>
            <Bot size={14} />
            {props.agent}
          </span>
          <span className={styles.spacer} />
          {props.running ? (
            <ActionButton icon={Square}>Stop</ActionButton>
          ) : null}
          <Button
            accessibilityLabel="Send"
            boxSize={control.height}
            disabled={props.draft === ''}
            icon={ArrowUp}
            onPress={noop}
            shape="square"
            size="sm"
            tone={props.draft === '' ? 'secondary' : 'primary'}
          />
        </div>
      </div>
      {props.running && props.draft !== '' ? (
        <span className={styles.hint}>
          {props.agent} reads this at its next step.
        </span>
      ) : null}
    </div>
  )
}
