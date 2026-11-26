import { useState } from 'react'
import { Button } from '@firna/ui/button'
import actions from '../../ui/components/common/actions.module.css'
import { useControlSizes } from '../../ui/components/common/touch'
import {
  ToolButton,
  type ComposerTool,
} from '../../chat/components/ComposerTools'
import { Sheet } from '../ui/Sheet'
import { useViewport } from '../ui/viewport'

/**
 * The icon of a tool on a phone, whose press opens the control as a sheet.
 * Escape and a press on the dim area close the sheet, and the focus goes
 * back to the icon.
 */
function SheetToolButton(props: { tool: ComposerTool; disabled: boolean }) {
  const { tool } = props
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const shown = open && !props.disabled
  const Icon = tool.icon
  return (
    <>
      <Button
        accessibilityLabel={tool.label}
        boxSize={control.height}
        disabled={props.disabled}
        expanded={shown}
        hasPopup="dialog"
        iconNode={<Icon className={actions.icon} size={15} />}
        onPress={() => setOpen(true)}
        shape="square"
        size="sm"
        tone="plain"
      />
      {shown ? (
        <Sheet close={() => setOpen(false)} title={tool.label}>
          {tool.render(true)}
        </Sheet>
      ) : null}
    </>
  )
}

/**
 * A tool in the bar of the prompt box of an automation, such as
 * Capabilities. A computer opens its control above the icon, from its
 * start, as the bar of a composer does. A phone keeps the icon in the bar,
 * because the bar holds only the icon and the model picker, and opens the
 * control as a sheet. While `disabled`, as while a save runs, the icon takes
 * no press.
 */
export function PromptTool(props: { tool: ComposerTool; disabled: boolean }) {
  const phone = useViewport() === 'phone'
  if (phone) {
    return <SheetToolButton disabled={props.disabled} tool={props.tool} />
  }
  return (
    <ToolButton
      disabled={props.disabled}
      placement="above-start"
      tool={props.tool}
    />
  )
}
