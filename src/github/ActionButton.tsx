import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import {
  TintedTheme,
  type ButtonTint,
} from '../../docs/mockups/src/components/common/tint'
import { control, touchControl } from '../../docs/mockups/src/design/metrics'

/**
 * A compact labelled Firna button, as the mockups draw it: 26 px high in the
 * dense desktop layout, and 44 px high with `touch` on a phone. The `tint`
 * of a tinted bar fills the button in the tone of that bar. Without a tint,
 * the button takes the outline tone. `busy` shows that its write runs: the
 * button shows a spinner in place of its icon, and takes no press.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  icon?: LucideIcon
  touch?: boolean
  tint?: ButtonTint | null
  busy?: boolean
  disabled?: boolean
}) {
  const size = props.touch ? touchControl : control
  return (
    <TintedTheme tint={props.tint}>
      <Button
        busy={props.busy}
        disabled={props.disabled}
        icon={props.icon}
        labelStyle={{
          fontSize: size.labelSize,
          fontWeight: size.labelWeight,
          lineHeight: size.labelSize + 4,
        }}
        numberOfLines={1}
        onPress={props.onPress}
        size="sm"
        style={{ height: size.height, paddingHorizontal: 10 }}
        tone={props.tint ? 'primary' : 'secondary'}
      >
        {props.children}
      </Button>
    </TintedTheme>
  )
}
