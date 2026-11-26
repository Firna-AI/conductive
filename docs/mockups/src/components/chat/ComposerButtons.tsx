import { Button } from '@firna/ui/button'
import { ArrowUp, Square } from 'lucide-react'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { noop } from '../../../../../src/ui/noop'
import {
  useControlSizes,
  useTouch,
} from '../../../../../src/ui/components/common/touch'

/** Send, which is off while the box is empty or the message waits. */
export function SendButton(props: { draft: string; blocked?: boolean }) {
  const control = useControlSizes()
  const off = props.draft === '' || props.blocked === true
  return (
    <Button
      accessibilityLabel="Send"
      boxSize={control.height}
      disabled={off}
      icon={ArrowUp}
      onPress={noop}
      shape="square"
      size="sm"
      tone={off ? 'secondary' : 'primary'}
    />
  )
}

/**
 * Stop, which ends the running turn. A phone shows only its icon, and its
 * spoken name stays "Stop", so the model and the login label keep their
 * room in the bar (secrets decision 16 G). A computer keeps the word.
 */
export function StopButton() {
  const control = useControlSizes()
  if (!useTouch()) {
    return (
      <actionButton.Component icon="square" moklyInstance="stop-agent">
        Stop
      </actionButton.Component>
    )
  }
  return (
    <Button
      accessibilityLabel="Stop"
      boxSize={control.height}
      icon={Square}
      onPress={noop}
      shape="square"
      size="sm"
      tone="secondary"
    />
  )
}
