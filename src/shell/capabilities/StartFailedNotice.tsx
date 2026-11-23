import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { thisMacWords } from '../../ui/components/capabilities/capabilitiesCopy'
import { Notice } from '../../ui/components/common/Notice'
import { useStore, type Readable } from '../../app/store'
import { controlOf } from '../../chat/device/settings-results'
import { ActionButton } from '../../chat/ui/actions'
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
 * again repeats the start on this Mac. The switch of Mac access in the
 * Capabilities of the workspace shows off, with the same result. A start
 * from that switch and a Stop end the notice. A browser has no Mac, so it
 * shows nothing.
 */
export function useStartFailedNotice(workspaceId: string): ReactNode {
  const mac = useThisMac()
  const state = useThisMacState(mac)
  const starts = useStore(mac?.starts ?? noStarts)
  if (mac === null || state === null) return null
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
