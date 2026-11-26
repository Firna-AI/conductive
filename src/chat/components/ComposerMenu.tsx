import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Button } from '@firna/ui/button'
import { Paperclip, Plus } from 'lucide-react'
import styles from '../../ui/components/chat/ComposerMenu.module.css'
import actions from '../../ui/components/common/actions.module.css'
import { useControlSizes, useTouch } from '../../ui/components/common/touch'
import { useMenuLayer } from '../../shell/ui/layers'
import type { MenuEntry } from '../../shell/ui/Menu'
import { MenuList } from '../../shell/ui/MenuList'
import { useDismiss } from '../../shell/ui/Overlay'
import { Sheet } from '../../shell/ui/Sheet'
import { ToolButton, type ComposerTool } from './ComposerTools'

/** The spoken name of the button of the menu, and of the menu. */
const menuLabel = 'More options'

/**
 * The one button of the bar of a phone composer, in place of the attach
 * button and the icons of the tools (secrets decision 16 G). Its menu opens
 * above it, as the menu of the model picker does, with Attach files and a
 * row for each tool, such as Capabilities. A tool opens its control as a
 * sheet, and the focus goes back to the button when the sheet closes. Later
 * tools of the composer join the menu. `attach` opens the file picker.
 */
function ComposerMenu(props: {
  attach: () => void
  tools: readonly ComposerTool[]
  disabled?: boolean
}) {
  const control = useControlSizes()
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState<string | null>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const shown = open && props.disabled !== true
  useDismiss(shown, anchor, close)
  useMenuLayer(shown, () => {
    close()
    return true
  })
  const tool = props.tools.find((item) => item.key === sheet)
  const entries: MenuEntry[] = [
    {
      kind: 'item',
      label: 'Attach files',
      icon: Paperclip,
      onSelect: props.attach,
    },
    ...props.tools.map((item): MenuEntry => ({
      kind: 'item',
      id: item.key,
      label: item.label,
      icon: item.icon,
      onSelect: () => setSheet(item.key),
    })),
  ]
  return (
    <span className={styles.anchor} ref={anchor}>
      <Button
        accessibilityLabel={menuLabel}
        boxSize={control.height}
        disabled={props.disabled}
        expanded={shown || tool !== undefined}
        hasPopup="menu"
        iconNode={<Plus className={actions.icon} size={17} />}
        onPress={() => setOpen((value) => !value)}
        shape="square"
        size="sm"
        tone="plain"
      />
      {shown ? (
        <MenuList
          close={close}
          entries={entries}
          label={menuLabel}
          placement="above-start"
        />
      ) : null}
      {tool ? (
        <Sheet close={() => setSheet(null)} title={tool.label}>
          {tool.render(true)}
        </Sheet>
      ) : null}
    </span>
  )
}

/**
 * The start of the bar of a composer. A computer shows `attachButton`,
 * then the icon of each tool, whose control opens above it. A phone shows
 * the + button of `ComposerMenu` in their place, while the host gives a
 * tool. While `disabled`, as while a create runs, the tools take no press.
 */
export function ComposerStart(props: {
  attach: () => void
  attachButton: ReactNode
  tools: readonly ComposerTool[]
  disabled?: boolean
}) {
  const phone = useTouch()
  if (phone && props.tools.length > 0) {
    return (
      <ComposerMenu
        attach={props.attach}
        disabled={props.disabled}
        tools={props.tools}
      />
    )
  }
  return (
    <>
      {props.attachButton}
      {props.tools.map((tool) => (
        <ToolButton
          disabled={props.disabled}
          key={tool.key}
          placement="above-start"
          tool={tool}
        />
      ))}
    </>
  )
}
