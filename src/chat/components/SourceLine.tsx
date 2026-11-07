import { LinkedLine } from '../../../docs/mockups/src/components/chat/LinkedLine'
import type { Session } from '../../shared/sessions'
import type { ChatSnapshot } from '../state/chat-snapshot'
import controls from '../ui/controls.module.css'
import type { TranscriptInsert } from './transcript-entries'

/**
 * The first line of a linked session: it names the session that it started
 * from, as a link that opens that session, also from the history. Without
 * the record of that session, no line shows.
 */
export function sourceInsert(
  snapshot: ChatSnapshot,
  session: Session | null,
  onOpen: (sessionId: string) => void,
): TranscriptInsert | null {
  const sourceId = session?.sourceSessionId ?? null
  if (sourceId === null) return null
  const source = [...snapshot.sessions, ...snapshot.history].find(
    (item) => item.id === sourceId,
  )
  if (!source) return null
  return {
    key: 'source',
    after: null,
    node: (
      <LinkedLine
        link={
          <button
            className={controls.bare}
            onClick={() => onOpen(source.id)}
            type="button"
          >
            {source.title}
          </button>
        }
      />
    ),
  }
}
