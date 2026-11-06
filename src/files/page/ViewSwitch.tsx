import { SegmentedControl } from '@firna/ui/segmented'
import { Code, Eye } from 'lucide-react'
import type { FileMode } from '../navigation'
import { useControlSizes } from '../ui/layout'

/** The switch between the rendered Markdown and its source. */
export function ViewSwitch(props: {
  mode: FileMode
  onChange: (mode: FileMode) => void
}) {
  const { field } = useControlSizes()
  return (
    <SegmentedControl
      accessibilityLabel="Show"
      iconOnly
      onChange={props.onChange}
      options={[
        { label: 'Preview', value: 'preview', icon: Eye },
        { label: 'Source', value: 'source', icon: Code },
      ]}
      size={field}
      value={props.mode}
    />
  )
}
