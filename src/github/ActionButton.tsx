import type { LucideIcon } from 'lucide-react'
import { Button } from '@firna/ui/button'
import { control, touchControl } from '../../docs/mockups/src/design/metrics'

/**
 * A compact labelled Firna button, as the mockups draw it: 26 px high in the
 * dense desktop layout, and 44 px high with `touch` on a phone.
 */
export function ActionButton(props: {
  children: string
  onPress: () => void
  icon?: LucideIcon
  touch?: boolean
}) {
  const size = props.touch ? touchControl : control
  return (
    <Button
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
      tone="secondary"
    >
      {props.children}
    </Button>
  )
}
