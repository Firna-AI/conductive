import { SegmentedControl } from '@firna/ui/segmented'
import type { LucideIcon } from 'lucide-react'
import { Code, Eye, File, FileDiff } from 'lucide-react'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import styles from './FilePage.module.css'

/**
 * A view of the tab of a file: the changes of the file against the base
 * branch, the rendered Markdown, the source of the Markdown, or the
 * current file.
 */
export type FileTabMode = 'changes' | 'preview' | 'source' | 'file'

/** The views that the switch of a tab offers, and the view that shows. */
export type FileSwitch = {
  modes: readonly FileTabMode[]
  shown: FileTabMode
}

const segments: Readonly<
  Record<FileTabMode, { label: string; icon: LucideIcon }>
> = {
  changes: { label: 'Changes', icon: FileDiff },
  preview: { label: 'Preview', icon: Eye },
  source: { label: 'Source', icon: Code },
  file: { label: 'File', icon: File },
}

/**
 * The views of a file, in the order of the switch. A changed file has
 * Changes first. A Markdown file has Preview and Source, and each other
 * file has File. A file with one view shows no switch.
 */
export function fileModes(
  changed: boolean,
  markdown: boolean,
): readonly FileTabMode[] {
  const current: FileTabMode[] = markdown ? ['preview', 'source'] : ['file']
  return changed ? ['changes', ...current] : current
}

/**
 * The switch between the views of one tab: the changes of a changed
 * file, and the current file. A Markdown file shows its current state
 * rendered or as its source. In the header each segment shows its icon,
 * with its name as a tooltip and an accessible name. On a phone the switch
 * sits in its own bar below the header, with the names and no icons, so
 * the path keeps its room in the header.
 */
export function ViewSwitch(props: FileSwitch & { bar?: boolean }) {
  const { field } = useControlSizes()
  if (props.modes.length < 2) return null
  const control = (
    <SegmentedControl
      accessibilityLabel="Show"
      iconOnly={!props.bar}
      onChange={noop}
      options={props.modes.map((mode) => ({
        value: mode,
        label: segments[mode].label,
        icon: props.bar ? undefined : segments[mode].icon,
      }))}
      size={field}
      value={props.shown}
    />
  )
  return props.bar ? <div className={styles.bar}>{control}</div> : control
}
