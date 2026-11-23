import { memo, useContext } from 'react'
import {
  WakeUpEndLine,
  WakeUpLine,
} from '../../../docs/mockups/src/components/chat/WakeUpLines'
import {
  wakeUpTime,
  type ReaderClock,
} from '../../../docs/mockups/src/components/chat/wakeUpCopy'
import type { TranscriptItem } from '../../shared/transcript/transcript'
import type { ChatReaders } from '../../shared/transcript/turn-words'
import { ChatText, SessionLinkText, useChatParts } from '../links/LinkedText'
import { ChatClock, useNow } from '../ui/clock'
import { wakeUpEndWords } from './wake-up-words'

/**
 * How often the words of a time read the clock again. The words change
 * only at midnight, such as "tomorrow at 09:00" to "today at 09:00".
 */
const minute = 60_000

/**
 * The clock of the reader for the words of the time of a wake-up: the time
 * now, read again each minute while the part shows, and the time zone of
 * the chat.
 */
export function useReaderClock(): ReaderClock {
  const clock = useContext(ChatClock)
  const now = useNow(clock, true, minute)
  return { now, timeZone: clock.timeZone }
}

/**
 * The text that an agent set for a wake-up, as the chat draws the text of a
 * message: its code, its links, and its chips, also the chips of the files
 * that it names.
 */
export const WakeUpText = memo(function WakeUpText(props: { text: string }) {
  const parts = useChatParts(props.text, { mentions: true })
  return <ChatText parts={parts} />
})

type WakeUpItem = Extract<TranscriptItem, { kind: 'wake-up' }>
type EndedNotice = Extract<
  WakeUpItem['notice'],
  { type: 'session.wake-up-ended' }
>

/**
 * The end line of a wake-up that ended with no turn, with its time in the
 * local time of the reader. A cancel through the workspace tools shows the
 * chip of the sending session after its words.
 */
function EndLine(props: { notice: EndedNotice; readers: ChatReaders }) {
  const { notice, readers } = props
  const clock = useReaderClock()
  const time = wakeUpTime(notice.at, clock)
  const { outcome } = notice
  const text = wakeUpEndWords(outcome, time, readers)
  if (outcome.kind === 'could-not-start') {
    return <WakeUpEndLine end="not-started" text={text} />
  }
  const { source } = outcome
  return (
    <WakeUpEndLine
      end="cancelled"
      session={
        source.kind === 'session' ? (
          <SessionLinkText
            sessionId={source.sessionId}
            workspaceId={source.workspaceId}
          />
        ) : undefined
      }
      text={text}
    />
  )
}

/**
 * A wake-up at its place in the chat: the line that its fire adds, with the
 * lead "Wake-up:" and the text of the agent, or the end line of a wake-up
 * that ended with no turn. Neither is a message of a member, and neither
 * folds.
 */
export function WakeUpItemLine(props: {
  item: WakeUpItem
  readers: ChatReaders
}) {
  const { notice } = props.item
  if (notice.type === 'session.wake-up-fired') {
    return <WakeUpLine text={<WakeUpText text={notice.text} />} />
  }
  return <EndLine notice={notice} readers={props.readers} />
}
