import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { Caption } from '@firna/ui/typography'
import { ArrowUp, Bot, Square } from 'lucide-react'
import { noop } from '../../noop'
import styles from './Composer.module.css'

export type ComposerState = {
  agent: string
  /** An agent turn runs, so a message steers it. */
  running: boolean
  draft: string
}

/** The message box under the chat. While a turn runs it steers the turn. */
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
          value={props.draft}
          variant="seamless"
        />
        <div className={styles.bar}>
          <span className={styles.agent}>
            <Bot size={15} />
            <Caption>{props.agent}</Caption>
          </span>
          <div className={styles.actions}>
            {props.running ? (
              <Button icon={Square} onPress={noop} size="sm" tone="secondary">
                Stop
              </Button>
            ) : null}
            <Button
              accessibilityLabel="Send"
              disabled={props.draft === ''}
              icon={ArrowUp}
              onPress={noop}
              shape="circle"
              size="sm"
              tone="primary"
            />
          </div>
        </div>
      </div>
      {props.running && props.draft !== '' ? (
        <div className={styles.hint}>
          <Caption>{props.agent} reads this at its next step.</Caption>
        </div>
      ) : null}
    </div>
  )
}
