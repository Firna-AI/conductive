import { Button } from '@firna/ui/button'
import { ArrowDown } from 'lucide-react'
import { useControlSizes } from '../common/touch'
import styles from './ChatPane.module.css'

/** The spoken name of the button that shows the bottom of the chat. */
export const toBottomLabel = 'Scroll to bottom'

/**
 * The round button that floats above the footer of the chat while the
 * reader reads higher up. A press shows the bottom of the chat, with the
 * newest message. A phone gives it the touch size of its controls.
 */
export function ToBottomButton(props: { onPress: () => void }) {
  const control = useControlSizes()
  return (
    <div className={styles.toBottom}>
      <Button
        accessibilityLabel={toBottomLabel}
        boxSize={control.height}
        icon={ArrowDown}
        onPress={props.onPress}
        shape="circle"
        size="sm"
        tone="secondary"
      />
    </div>
  )
}
