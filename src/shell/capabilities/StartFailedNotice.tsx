import { useEffect, type ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { thisMacWords } from '../../../docs/mockups/src/components/capabilities/capabilitiesCopy'
import { Notice } from '../../../docs/mockups/src/components/common/Notice'
import { keptCapabilities } from '../../app/capabilities-model'
import { useStore, valueOf, type Readable } from '../../app/store'
import { controlOf } from '../../chat/device/settings-results'
import { ActionButton } from '../../chat/ui/actions'
import { useOrgModel } from '../context'
import { useThisMac, useThisMacState, type StartPlace } from '../mac/this-mac'

const noPlaces: Readonly<Record<string, StartPlace>> = {}

const noStarts: Readable<Readonly<Record<string, StartPlace>>> = {
  get: () => noPlaces,
  subscribe: () => () => undefined,
}

/**
 * The notice over the composer of a new workspace whose grant until Stop
 * did not start on this Mac after the create. New workspace in the Mac app
 * starts the grant once the create gives the new workspace its ID, and its
 * control closes at the create, so the notice names the cause, and Try
 * again repeats the start on this Mac. Mac access stays on. The line in the
 * Capabilities of the workspace shows the same result. A start from that
 * control, a Stop, and Mac access that goes off end the notice: when the
 * Capabilities of the workspace show Mac access off, the result of its
 * last start or Stop goes. `ThisMac.forget` then also takes back a start, a
 * Keep, or an Extend of its grant that waits. A browser has no Mac, so it
 * shows nothing.
 */
export function useStartFailedNotice(
  orgId: string,
  workspaceId: string,
): ReactNode {
  const mac = useThisMac()
  const state = useThisMacState(mac)
  const starts = useStore(mac?.starts ?? noStarts)
  const model = keptCapabilities(useOrgModel(orgId), workspaceId)
  const off = valueOf(useStore(model.grants.store))?.macAccess === false
  useEffect(() => {
    if (off) mac?.forget(workspaceId)
  }, [mac, off, workspaceId])
  if (mac === null || state === null || off) return null
  if (!Object.hasOwn(starts, workspaceId) || starts[workspaceId] !== 'create') {
    return null
  }
  const key = controlOf({ action: 'stop-workspace', workspaceId })
  const result = Object.hasOwn(state.results, key)
    ? state.results[key]
    : undefined
  if (
    result?.change.action !== 'start-workspace-until-stop' ||
    result.outcome.status !== 'failed'
  ) {
    return null
  }
  return (
    <Notice
      action={
        <ActionButton
          accessibilityLabel={thisMacWords.tryAgainLabel}
          busy={state.busy.includes(key)}
          onPress={() => void mac.start(workspaceId, 'create')}
        >
          {thisMacWords.tryAgain}
        </ActionButton>
      }
      body={
        result.unreached ? thisMacWords.notAvailable : result.outcome.message
      }
      icon={CircleAlert}
      title={thisMacWords.noticeTitle}
      tone="danger"
    />
  )
}
