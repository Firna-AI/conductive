import { useEffect, useMemo } from 'react'
import { useServices } from '../../app/services'
import { AllowAllBar } from '../../chat/device/AllowAllBar'
import { useMacSettings } from '../../chat/device/mac-settings'
import { useMacApp } from '../mac/mac-app'
import type { WorkspaceContext } from './features'

function MacBar(props: { context: WorkspaceContext }) {
  const services = useServices()
  const clock = useMemo(() => ({ now: services.now }), [services])
  const { controller, state } = useMacSettings(services.api)
  const { stream } = props.context
  useEffect(() => {
    // The history of the stream comes in one burst, so one read follows it.
    let queued = false
    let active = true
    const stop = stream.subscribe((envelope) => {
      if (envelope.shell?.type !== 'workspace.updated' || queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        if (active) void controller.refresh()
      })
    })
    return () => {
      active = false
      stop()
    }
  }, [stream, controller])
  return (
    <AllowAllBar
      clock={clock}
      controller={controller}
      state={state}
      workspaceId={props.context.workspace.id}
    />
  )
}

/**
 * The bar of the Mac app at the top of the workspace while every command
 * of the workspace runs on this Mac without asking: the time left of the
 * 15 minutes, and Stop, then the result of the last Stop. The Worker
 * records a `workspace.updated` event with each change of a Mac command,
 * so the settings of the Mac read again after such an event. This holds
 * also while a file shows in place of the chat. A browser has no Mac, so
 * the bar draws nothing and sends no request.
 */
export function WorkspaceMacBar(props: { context: WorkspaceContext }) {
  if (!useMacApp()) return null
  return <MacBar context={props.context} />
}
