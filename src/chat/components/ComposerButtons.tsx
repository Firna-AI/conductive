import { Button } from '@firna/ui/button'
import { Square } from 'lucide-react'
import {
  useControlSizes,
  useTouch,
} from '../../../docs/mockups/src/components/common/touch'
import { ActionButton } from '../ui/actions'

/**
 * Stop, which ends the running turn, with a spinner while the stop runs. A
 * phone shows only its icon, and its spoken name stays "Stop", so the model
 * and the login label keep their room in the bar (secrets decision 16 G). A
 * computer keeps the word, and names the key of Stop the agent.
 */
export function StopButton(props: { stopping: boolean; onStop: () => void }) {
  const control = useControlSizes()
  const phone = useTouch()
  if (!phone) {
    return (
      <ActionButton
        busy={props.stopping}
        icon={Square}
        onPress={props.onStop}
        shortcut="stop-agent"
      >
        Stop
      </ActionButton>
    )
  }
  return (
    <Button
      accessibilityLabel="Stop"
      boxSize={control.height}
      busy={props.stopping}
      icon={Square}
      onPress={props.onStop}
      shape="square"
      size="sm"
      tone="secondary"
    />
  )
}
