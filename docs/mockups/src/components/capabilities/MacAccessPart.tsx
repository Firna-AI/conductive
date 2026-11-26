import { Switch } from '@firna/ui/switch'
import { failedMessage, stoppedResult } from '../../fixtures/mac'
import { noop } from '../../../../../src/ui/noop'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  ChangeOutcome,
  type ChangeStatus,
} from '../../../../../src/ui/components/mac/ChangeOutcome'
import {
  macAccessWords,
  thisMacWords,
} from '../../../../../src/ui/components/capabilities/capabilitiesCopy'
import type { CapabilityPart } from '../../../../../src/ui/components/capabilities/CapabilitiesPanel'

/**
 * A start of the grant until Stop that failed: the Mac did not start it,
 * or the start found this Mac not available (Mac access decision 3 A).
 */
export type FailedStart = 'not-started' | 'not-reached'

/**
 * The switch of Mac access, which is personal (Mac access decision 7). It
 * is `on` while this Mac has a grant until Stop for the workspace, and off
 * in each other state. `fifteen-minutes` is the switch while the 15
 * minutes of the workspace run, and `stopped` is the switch after a
 * switch-off, which is a Stop. After a start that failed, the switch shows
 * the cause. `not-available` is the switch while the page cannot read the
 * settings of this Mac, such as during a reconnect, and `not-reached` is
 * the same switch after a start that found this Mac not available. In New
 * workspace, `on` means that the create starts the grant.
 */
export type MacAccessView =
  'on' | 'off' | 'fifteen-minutes' | 'stopped' | 'not-available' | FailedStart

/** The result under the switch: a start that failed, or a Stop. */
type SwitchResult = { status: ChangeStatus; title: string; message: string }

/** The cause of each start that failed, which the part and the notice show. */
export const startCauses: Readonly<Record<FailedStart, string>> = {
  'not-started': failedMessage,
  'not-reached': thisMacWords.notAvailable,
}

/**
 * The result under the switch in each state that shows one: Not started
 * with the cause of a start that failed, or the Stop of a switch-off that
 * the Mac made and saved.
 */
const switchResults: Partial<Record<MacAccessView, SwitchResult>> = {
  stopped: { status: 'done', ...stoppedResult },
  'not-started': {
    status: 'failed',
    title: thisMacWords.notStarted,
    message: startCauses['not-started'],
  },
  'not-reached': {
    status: 'failed',
    title: thisMacWords.notStarted,
    message: startCauses['not-reached'],
  },
}

/**
 * Whether the page cannot read the settings of this Mac. The switch is
 * then off and disabled, so it never claims a grant that may not exist.
 */
function unread(view: MacAccessView): boolean {
  return view === 'not-available' || view === 'not-reached'
}

/** The switch of this Mac, which starts or stops the grant at once. */
function MacAccessSwitch(props: { view: MacAccessView }) {
  const { field } = useControlSizes()
  return (
    <Switch
      accessibilityLabel={macAccessWords.title}
      disabled={unread(props.view)}
      onValueChange={noop}
      size={field === 'lg' ? 'md' : 'sm'}
      value={props.view === 'on'}
    />
  )
}

/**
 * The Mac access part, which only the Mac app shows (Mac access decision
 * 7): one switch, with no hint. Each member sees the switch of their own
 * Mac. On starts a grant until Stop of the workspace on this Mac, also
 * while the 15 minutes run, and off stops it, as Stop does. Agents can
 * always ask to run commands on the Mac, so the part shows only short
 * results. The result of the last start or Stop shows under the switch
 * until the next start or Stop. The switch stays, so the result needs no
 * Try again. While the page cannot read the settings of this Mac, the
 * part says that this Mac is not available, unless a result already says
 * why.
 */
export function macAccessPart(view: MacAccessView): CapabilityPart {
  const result = switchResults[view]
  return {
    key: 'mac-access',
    title: macAccessWords.title,
    hint: view === 'not-available' ? thisMacWords.notAvailableHint : undefined,
    control: <MacAccessSwitch view={view} />,
    content: result ? (
      <ChangeOutcome
        message={result.message}
        status={result.status}
        title={result.title}
      />
    ) : null,
  }
}
