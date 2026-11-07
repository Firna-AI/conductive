import { CircleSlash, X } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/chat/LostUpdate.module.css'
import {
  unavailableText,
  type UnavailableData,
} from '../../../docs/mockups/src/components/chat/lostCopy'
import { useStore } from '../../app/store'
import { useNow } from '../../app/time'
import { formatAgo } from '../../chat/state/format'
import { IconButton } from '../ui/actions'
import type {
  HeaderNotice,
  HeaderNotices,
  HeaderReportKind,
} from './header-notices'

const words: Readonly<Record<HeaderReportKind, UnavailableData>> = {
  'workspace.title': 'title',
  'start.updated': 'start-steps',
}

function Bars(props: {
  notices: HeaderNotices
  shown: readonly HeaderNotice[]
}) {
  const now = useNow(30_000)
  return props.shown.map((notice) => (
    <div className={styles.bar} key={notice.kind} role="status">
      <CircleSlash aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>{unavailableText(words[notice.kind])}</span>
      <span className={styles.ago}>{formatAgo(notice.at, now)}</span>
      <IconButton
        icon={X}
        label="Dismiss"
        onPress={() => props.notices.dismiss(notice.kind)}
        quiet
      />
    </div>
  ))
}

/**
 * The notices of a failed repair under the workspace header: the mockups'
 * `LostUpdateBar` with a Dismiss that works. Each names the data that is
 * out of date and the time since its repair failed.
 */
export function HeaderNoticeBars(props: { notices: HeaderNotices }) {
  const shown = useStore(props.notices.shown)
  if (shown.length === 0) return null
  return <Bars notices={props.notices} shown={shown} />
}
