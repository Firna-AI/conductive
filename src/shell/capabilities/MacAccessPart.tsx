import { Switch } from '@firna/ui/switch'
import { macAccessWords } from '../../ui/components/capabilities/capabilitiesCopy'
import type { CapabilityPart } from '../../ui/components/capabilities/CapabilitiesPanel'
import { useControlSizes } from '../../ui/components/common/touch'
import {
  ChangeOutcome,
  type ChangeStatus,
} from '../../ui/components/mac/ChangeOutcome'

/** The result under the switch: a start that failed, or a Stop. */
export interface SwitchResult {
  status: ChangeStatus
  title: string
  message: string | null
}

/**
 * The switch of Mac access of this Mac, which only the Mac app shows (Mac
 * access decision 7). In a workspace, on starts a grant until Stop of the
 * workspace on this Mac, and off stops it. In New workspace, it is a
 * choice of the draft, and the create starts the grant.
 */
export interface MacSwitchView {
  on: boolean
  /** The switch takes no change, such as while this Mac shows no settings. */
  disabled: boolean
  /** The muted line under the switch, such as that this Mac is not available. */
  note: string | null
  result: SwitchResult | null
  change: (on: boolean) => void
}

function MacAccessSwitch(props: { view: MacSwitchView }) {
  const { field } = useControlSizes()
  const { view } = props
  return (
    <Switch
      accessibilityLabel={macAccessWords.title}
      disabled={view.disabled}
      onValueChange={view.change}
      size={field === 'lg' ? 'md' : 'sm'}
      value={view.on}
    />
  )
}

/**
 * The Mac access part: one switch at the end of its title, with no hint.
 * Each member sees the switch of their own Mac. Under it, a muted line can
 * say that this Mac is not available, and the result of the last start or
 * Stop shows until the next start or Stop. The switch stays, so a result
 * needs no Try again.
 */
export function macAccessPart(view: MacSwitchView): CapabilityPart {
  const { result } = view
  return {
    key: 'mac-access',
    title: macAccessWords.title,
    hint: view.note ?? undefined,
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
