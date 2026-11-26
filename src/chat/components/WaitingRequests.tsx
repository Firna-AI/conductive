import { Fragment } from 'react'
import pane from '../../ui/components/chat/ChatPane.module.css'
import { secretRunWords } from '../../ui/components/chat/secretRunCopy'
import type { WaitingItem } from '../secrets/session-secrets'

/**
 * The requests of the session that wait for an answer, just above the
 * composer: the Mac commands and the requests for secrets while their tool
 * calls wait, the oldest first. Each one keeps its own choices, so every
 * request that waits has a way to answer it. A long command or many
 * requests scroll inside the region, so the composer stays in view.
 */
export function WaitingRequests(props: { items: readonly WaitingItem[] }) {
  if (props.items.length === 0) return null
  const items = [...props.items].sort((a, b) => a.createdAt - b.createdAt)
  return (
    <div
      aria-label={secretRunWords.region}
      className={pane.requests}
      role="group"
    >
      {items.map((item) => (
        <Fragment key={item.key}>{item.node}</Fragment>
      ))}
    </div>
  )
}
