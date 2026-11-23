import { CircleAlert, Hourglass, TimerOff, type LucideIcon } from 'lucide-react'
import {
  StatusText,
  type StatusTone,
} from '../../../../../src/ui/components/common/StatusText'
import { stateLabels } from './ownComputerCopy'
import {
  computerState,
  type ComputerState,
  type OwnComputer,
} from './ownComputer'

/** The glyph and the colour of each state, so that no state is colour alone. */
const looks: Readonly<
  Record<ComputerState, { tone: StatusTone; busy?: true; icon?: LucideIcon }>
> = {
  waiting: { tone: 'neutral', icon: Hourglass },
  expired: { tone: 'warning', icon: TimerOff },
  offline: { tone: 'muted' },
  building: { tone: 'active', busy: true },
  'build-failed': { tone: 'danger', icon: CircleAlert },
  full: { tone: 'warning' },
  connected: { tone: 'success' },
}

/**
 * The state of an own computer as a glyph and a word, such as "Connected"
 * or "Building · 4m 12s". A first build that runs gives its time.
 */
export function ComputerStatus(props: { computer: OwnComputer }) {
  const state = computerState(props.computer)
  const { now } = props.computer.builds
  const time =
    state === 'building' && now?.kind === 'building' ? ` · ${now.elapsed}` : ''
  return <StateText label={`${stateLabels[state]}${time}`} state={state} />
}

/**
 * A state as a glyph and the words that the caller gives. A quiet state,
 * such as a state that no computer has, takes the muted colour and no
 * spinner.
 */
export function StateText(props: {
  state: ComputerState
  label: string
  quiet?: boolean
}) {
  const look = looks[props.state]
  return (
    <StatusText
      busy={props.quiet ? undefined : look.busy}
      icon={look.icon}
      label={props.label}
      tone={props.quiet ? 'muted' : look.tone}
    />
  )
}
