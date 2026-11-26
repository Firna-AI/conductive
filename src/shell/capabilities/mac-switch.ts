import { useMemo } from 'react'
import { thisMacWords } from '../../ui/components/capabilities/capabilitiesCopy'
import { useServices } from '../../app/services'
import type { SettingsChange } from '../../chat/device/device-api'
import {
  controlOf,
  grantRuns,
  resultTitle,
  stoppedMessage,
  type ChangeResult,
} from '../../chat/device/settings-results'
import type { MacSettingsState } from '../../chat/device/settings-view'
import { useNow } from '../../chat/ui/clock'
import { useThisMacState, type ThisMac } from '../mac/this-mac'
import type { MacSwitchView, SwitchResult } from './MacAccessPart'

/**
 * What shows under the switch from the result of the last change of the
 * grant: a start that failed, with its cause, or a Stop. A start that found
 * this Mac not available says that each command still asks first. A Stop
 * that the Mac made and saved does not show while a grant runs again,
 * because it belongs to an earlier grant. The result of a Keep shows on
 * the bar only.
 */
function switchResult(
  result: ChangeResult | undefined,
  running: boolean,
): SwitchResult | null {
  if (result === undefined) return null
  const { change, outcome } = result
  if (change.action === 'start-workspace-until-stop') {
    if (outcome.status !== 'failed') return null
    const message = result.unreached
      ? thisMacWords.notAvailable
      : outcome.message
    return { status: 'failed', title: thisMacWords.notStarted, message }
  }
  if (change.action !== 'stop-workspace') return null
  const title = resultTitle(result)
  if (outcome.status !== 'done') {
    return { status: outcome.status, title, message: outcome.message }
  }
  return running ? null : { status: 'done', title, message: stoppedMessage }
}

/**
 * Whether a change of the grant that waits ends with a grant until Stop: a
 * start, or a Keep of the 15 minutes. A Stop and an Extend do not.
 */
function endsUntilStop(action: SettingsChange['action']): boolean {
  return action === 'start-workspace-until-stop' || action === 'keep-workspace'
}

/** The page cannot read the settings of this Mac now. */
function unread(state: MacSettingsState): boolean {
  return (
    state.kind === 'unavailable' ||
    state.kind === 'failed' ||
    state.kind === 'kept'
  )
}

/**
 * The switch of Mac access in the control of a workspace, from the settings
 * of this Mac that the window shares, or null in a browser. It is on only
 * while the current settings list a grant until Stop of the workspace, so
 * it is off while the 15 minutes run. Kept settings, after a read that
 * failed, never turn it on, because a grant that they list may have ended.
 * While the page cannot read the settings, the switch is off and disabled,
 * and its note says that this Mac is not available, unless a result says
 * why. On starts the grant until Stop through the pairing of now, also
 * while the 15 minutes run, and off stops the grant.
 *
 * While a change of the grant waits, the switch shows the grant that the
 * change ends with. A waiting start or Keep shows it on, so a switch-off
 * can take that change back. A waiting Stop or Extend shows it off, and the
 * switch takes no switch-on, because a start does not go while another
 * change of the grant waits.
 */
export function useMacSwitch(
  mac: ThisMac | null,
  workspaceId: string,
): MacSwitchView | null {
  const services = useServices()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const state = useThisMacState(mac)
  const grants =
    state?.kind === 'ready'
      ? state.settings.workspaceWindows.filter(
          (grant) => grant.workspaceId === workspaceId,
        )
      : []
  const now = useNow(
    clock,
    grants.some((grant) => grant.expiresAt !== null),
  )
  if (mac === null || state === null) return null
  const key = controlOf({ action: 'stop-workspace', workspaceId })
  const waits = Object.hasOwn(state.waiting, key) ? state.waiting[key] : null
  const last = Object.hasOwn(state.results, key)
    ? state.results[key]
    : undefined
  const result = switchResult(
    last,
    grants.some((grant) => grantRuns(grant, now)),
  )
  const on =
    waits === null
      ? grants.some((grant) => grant.expiresAt === null)
      : endsUntilStop(waits)
  const away = waits === null && unread(state) && result === null
  return {
    on,
    disabled: waits === null ? state.kind !== 'ready' : !on,
    note: away ? thisMacWords.notAvailableHint : null,
    result,
    change: (next) => {
      void (next ? mac.start(workspaceId, 'control') : mac.stop(workspaceId))
    },
  }
}
