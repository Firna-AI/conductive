import { useEffect } from 'react'
import { AllowAllBar } from '../device/AllowAllBar'
import { useMacSettings } from '../device/mac-settings'
import type { Clock } from '../ui/clock'
import type { DevBackend } from './dev-backend'

/**
 * The banner of the Mac app over the workspace, as the app shell will place
 * it. It reads the Mac's settings again after each change of the Mac.
 */
export function DevMacBanner(props: { backend: DevBackend; clock: Clock }) {
  const { backend } = props
  const { controller, state } = useMacSettings(backend.client)
  useEffect(
    () => backend.mac.listen(() => void controller.refresh()),
    [backend, controller],
  )
  return (
    <AllowAllBar
      clock={props.clock}
      controller={controller}
      state={state}
      workspaceId={backend.target.workspaceId}
    />
  )
}
