import { useMemo } from 'react'
import { thisMacWords } from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import { useServices } from '../../app/services'
import type { MacSettingsState } from '../../chat/device/mac-settings'
import {
  controlOf,
  grantRuns,
  resultTitle,
  stoppedMessage,
  type ChangeResult,
} from '../../chat/device/settings-results'
import { useNow } from '../../chat/ui/clock'
import type { DeviceWorkspaceWindow } from '../../shared/device'
import { timeLeft } from '../../shared/transcript/command-words'
import { useThisMacState, type ThisMac } from '../mac/this-mac'
import type { LineResult, ThisMacLineView } from './ThisMacLine'

/** The grant of the workspace on this Mac while it runs, or null. */
function runningGrant(
  state: MacSettingsState,
  workspaceId: string,
  now: number,
): DeviceWorkspaceWindow | null {
  if (state.kind !== 'ready') return null
  return (
    state.settings.workspaceWindows.find(
      (grant) => grant.workspaceId === workspaceId && grantRuns(grant, now),
    ) ?? null
  )
}

/**
 * What shows under the line from the result of the last change of the
 * grant: a start that failed, with its cause, or a Stop. A start that found
 * this Mac not available says that each command still asks first. A Stop
 * that the Mac made and saved does not show while a grant runs again,
 * because it belongs to an earlier grant. A Keep and an Extend show on the
 * bar only.
 */
function lineResult(
  result: ChangeResult | undefined,
  running: boolean,
): LineResult | null {
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
 * The hint of the line: the time left while the 15 minutes run, and that
 * this Mac is not available while the page cannot read its settings,
 * unless a result under the line already says why.
 */
function lineHint(
  state: MacSettingsState,
  grant: DeviceWorkspaceWindow | null,
  result: LineResult | null,
  now: number,
): string {
  const unread = state.kind === 'unavailable' || state.kind === 'failed'
  if (unread && result === null) return thisMacWords.notAvailableHint
  if (grant !== null && grant.expiresAt !== null) {
    return thisMacWords.fifteenMinutesHint(timeLeft(grant.expiresAt, now))
  }
  return thisMacWords.lineHint.workspace
}

/**
 * The line of this Mac in the control of a workspace, from the settings of
 * this Mac that the window shares, or null in a browser. It is checked only
 * while the settings list a grant until Stop of the workspace. While the 15
 * minutes run, it stays unchecked, and its hint gives the time left. While
 * the page cannot read the settings, it shows unchecked and off, so it
 * never claims a grant that may not exist. A check starts the grant until
 * Stop through the pairing of now, also while the 15 minutes run, and an
 * uncheck stops the grant. `reveal` counts the switch-ons of the control.
 */
export function useWorkspaceLine(
  mac: ThisMac | null,
  workspaceId: string,
  reveal: number,
): ThisMacLineView | null {
  const services = useServices()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const state = useThisMacState(mac)
  const timed =
    state?.kind === 'ready' &&
    state.settings.workspaceWindows.some(
      (grant) => grant.workspaceId === workspaceId && grant.expiresAt !== null,
    )
  const now = useNow(clock, timed)
  if (mac === null || state === null) return null
  const key = controlOf({ action: 'stop-workspace', workspaceId })
  const grant = runningGrant(state, workspaceId, now)
  const last = Object.hasOwn(state.results, key)
    ? state.results[key]
    : undefined
  const result = lineResult(last, grant !== null)
  const busy = state.busy.includes(key)
  return {
    checked: grant !== null && grant.expiresAt === null,
    disabled: state.kind !== 'ready' || busy,
    busy,
    hint: lineHint(state, grant, result, now),
    result,
    reveal,
    change: (on) => {
      void (on ? mac.start(workspaceId, 'control') : mac.stop(workspaceId))
    },
  }
}
