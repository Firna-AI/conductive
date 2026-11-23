import {
  linkText,
  messageText,
} from '../../entries/components/chat/MessageText.mockup'
import { agents } from '../../fixtures/agents'
import type { ChatItem } from '../../fixtures/conversations'
import type { PersonKey } from '../../fixtures/members'
import { orgWithLogin } from '../../fixtures/orgLogins'
import {
  readerZones,
  wakeUpNow,
  type WakeUpItem,
  type WakeUpMissCause,
} from '../../fixtures/wakeUps'
import { instanceKey } from '../../instanceKey'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { ScreenLink } from '../common/ScreenLink'
import { PendingWakeUp, PendingWakeUps } from './PendingWakeUps'
import { whoOf } from './SecretRun'
import { WakeUpEndLine, WakeUpLine } from './WakeUpLines'
import {
  cancelledFromLead,
  cancelledUnnamed,
  cancelWakeUpLabel,
  memberCancelled,
  notStarted,
  wakeUpTime,
  wakeUpWords,
  type ReaderClock,
  type WakeUpMiss,
} from './wakeUpCopy'

type PendingItem = Extract<WakeUpItem, { state: 'pending' }>

/** Whether a chat item is a wake-up that waits for its time. */
export function isPendingWakeUp(item: ChatItem): item is PendingItem {
  return item.kind === 'wake-up' && item.state === 'pending'
}

/** The clock of a reader: the now of the mockups, in the zone of `viewer`. */
function clockOf(viewer: PersonKey): ReaderClock {
  return { now: wakeUpNow, timeZone: readerZones[viewer] }
}

/**
 * Why a wake-up could start no turn, as its words name it for `viewer`:
 * the starter of a personal login is "you" for that starter, and the org
 * login names the org.
 */
function missOf(miss: WakeUpMissCause, viewer: PersonKey): WakeUpMiss {
  if (miss.kind !== 'reconnect') return miss
  const { login } = miss
  const agent = agents[miss.agent].name
  if (login.type === 'org') {
    return {
      kind: 'reconnect',
      owner: { type: 'org', name: orgWithLogin.name },
      agent,
    }
  }
  const name = whoOf(login.starter, viewer).object
  return { kind: 'reconnect', owner: { type: 'personal', name }, agent }
}

/**
 * A pending wake-up, with Cancel, which leads to the page after a Cancel.
 * A read-only workspace, such as an archived one, shows no Cancel. Its text
 * shows as the chat shows the text of a message.
 */
function PendingCard(props: {
  item: PendingItem
  viewer: PersonKey
  readOnly?: boolean
}) {
  const { item } = props
  const time = wakeUpTime(item.at, clockOf(props.viewer))
  const cancel = props.readOnly ? undefined : (
    <ScreenLink asChild to={paths.wakeUpCancelled}>
      <ActionButton accessibilityLabel={cancelWakeUpLabel(time)}>
        {wakeUpWords.cancel}
      </ActionButton>
    </ScreenLink>
  )
  return (
    <PendingWakeUp
      cancel={cancel}
      open={item.open}
      text={
        <messageText.Component
          mentions
          moklyInstance={`wake-up-text-${instanceKey(item.id)}`}
          text={item.text}
        />
      }
      time={time}
    />
  )
}

/**
 * The pending wake-ups of a chat, soonest first, which the chat shows at
 * the top of its footer. A `readOnly` chat shows them without Cancel.
 */
export function PendingWakeUpList(props: {
  items: readonly PendingItem[]
  viewer: PersonKey
  readOnly?: boolean
}) {
  const items = [...props.items].sort((a, b) => a.at - b.at)
  return (
    <PendingWakeUps>
      {items.map((item) => (
        <PendingCard
          item={item}
          key={item.id}
          readOnly={props.readOnly}
          viewer={props.viewer}
        />
      ))}
    </PendingWakeUps>
  )
}

/**
 * A wake-up at its place in the transcript, as `viewer` reads it: the line
 * that starts or joins a turn, or the line of its end with no turn. The
 * line of a Cancel says "You" to the member who pressed it, and names no
 * member who left the org. A cancel through the workspace tools names the
 * sending session with its chip, as a stop from a session does. A pending
 * one shows as its card.
 */
export function WakeUpView(props: { item: WakeUpItem; viewer: PersonKey }) {
  const { item, viewer } = props
  switch (item.state) {
    case 'pending':
      return <PendingCard item={item} viewer={viewer} />
    case 'fired':
      return (
        <WakeUpLine
          text={
            <messageText.Component
              mentions
              moklyInstance="wake-up-text"
              text={item.text}
            />
          }
        />
      )
    case 'cancelled': {
      const time = wakeUpTime(item.at, clockOf(viewer))
      if ('from' in item) {
        return (
          <WakeUpEndLine
            end="cancelled"
            session={
              <linkText.Component
                href={item.from}
                moklyInstance="wake-up-session"
              />
            }
            text={cancelledFromLead(time)}
          />
        )
      }
      const text =
        item.by === undefined
          ? cancelledUnnamed(time)
          : memberCancelled(whoOf(item.by, viewer).subject, time)
      return <WakeUpEndLine end="cancelled" text={text} />
    }
    case 'not-started': {
      const time = wakeUpTime(item.at, clockOf(viewer))
      const text = notStarted(time, missOf(item.miss, viewer))
      return <WakeUpEndLine end="not-started" text={text} />
    }
  }
}
