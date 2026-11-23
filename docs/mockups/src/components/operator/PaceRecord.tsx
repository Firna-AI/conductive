import { DetailList } from '../../../../../src/ui/components/settings/DetailList'
import { paceText } from './migrationCopy'
import type { Pace } from './migrationModel'

/** The saved pace of one provider account, by its ID. */
export type AccountPace = { id: string; pace: Pace }

/**
 * The pace of a finished job as part of its record: one fact for each
 * account, its ID with its starts in each hour and its machines at once,
 * as text. It has no field and no Save pace, because a finished job takes
 * no change. The caller gives the saved pace, never a typed one. It imports
 * no fixture, so the app can use it too.
 */
export function PaceRecord(props: { paces: readonly AccountPace[] }) {
  return (
    <DetailList
      rows={props.paces.map((item) => ({
        term: item.id,
        value: paceText(item.pace),
      }))}
    />
  )
}
