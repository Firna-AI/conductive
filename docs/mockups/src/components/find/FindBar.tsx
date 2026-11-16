import { InputFrame } from '@firna/ui/input'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { noop } from '../../noop'
import { IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { ShortcutTip } from '../common/ShortcutTip'
import { useControlSizes, useTouch } from '../common/touch'
import { findButtons, findCount, findFieldLabel } from './findCopy'
import type { FindState } from './findMarks'
import styles from './FindBar.module.css'

/**
 * The find bar at the top of the shown tab, above the scroll box of the
 * tab, so it does not scroll with the text: the field, the count, Previous,
 * Next, and Close, together at the start of the bar. The field has the
 * focus, as after Find and after Enter in the field. A view runs no script,
 * so the bar draws the focus.
 *
 * The count is a live region, such as "3 of 17", or "No matches". An empty
 * field shows no count. Previous and Next are off while the field finds no
 * match. On desktop their tooltips give the keys of Find previous and Find
 * next. On a phone the field takes the width that the buttons leave.
 */
export function FindBar(props: { find: FindState }) {
  const { find } = props
  const { field } = useControlSizes()
  const phone = useTouch()
  const count = find.query === '' ? undefined : find.count
  const none = count === undefined || count.total === 0
  return (
    <div
      aria-label={findFieldLabel}
      className={classes(styles.bar, phone && styles.phone)}
      role="search"
    >
      <div className={styles.field}>
        <InputFrame
          accessibilityLabel={findFieldLabel}
          active
          onChangeText={noop}
          placeholder={findFieldLabel}
          prefixIcon={Search}
          size={field}
          value={find.query}
        />
      </div>
      <span className={styles.count} role="status">
        {count ? findCount(count.place, count.total) : ''}
      </span>
      <ShortcutTip
        command="find-previous"
        label={findButtons.previous}
        off={none}
      >
        <IconButton
          disabled={none}
          icon={ChevronUp}
          label={findButtons.previous}
        />
      </ShortcutTip>
      <ShortcutTip command="find-next" label={findButtons.next} off={none}>
        <IconButton
          disabled={none}
          icon={ChevronDown}
          label={findButtons.next}
        />
      </ShortcutTip>
      <IconButton icon={X} label={findButtons.close} />
    </div>
  )
}
