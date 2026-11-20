import { useEffect, useMemo } from 'react'
import { AllowAllBar } from '../../chat/device/AllowAllBar'
import { useOrgServices } from '../context'
import { useThisMac, useThisMacState, type ThisMac } from '../mac/this-mac'
import type { WorkspaceContext } from './features'

function MacBar(props: { context: WorkspaceContext; mac: ThisMac }) {
  const { mac } = props
  const services = useOrgServices(props.context.org.id)
  const clock = useMemo(() => ({ now: services.now }), [services])
  const state = useThisMacState(mac)
  const { stream } = props.context
  useEffect(() => {
    mac.open()
  }, [mac])
  useEffect(() => {
    // The history of the stream comes in one burst, so one read follows it.
    let queued = false
    let active = true
    const stop = stream.subscribe((envelope) => {
      if (envelope.shell?.type !== 'workspace.updated' || queued) return
      queued = true
      queueMicrotask(() => {
        queued = false
        if (active) void mac.controller.refresh()
      })
    })
    return () => {
      active = false
      stop()
    }
  }, [stream, mac])
  return (
    <AllowAllBar
      clock={clock}
      controller={mac.controller}
      state={state}
      workspaceId={props.context.workspace.id}
    />
  )
}

/**
 * The bar of the Mac app at the top of the workspace while every command
 * of the workspace runs on this Mac without asking: the time left of the
 * 15 minutes, and Stop, then the result of the last Stop. It reads the
 * settings of this Mac that the window shares, from `useThisMac`, so a
 * start from the Capabilities control or from a create shows at once. The
 * Worker records a `workspace.updated` event with each change of a Mac
 * command, so the settings of the Mac read again after such an event. This
 * holds also while a file shows in place of the chat. A browser has no
 * Mac, so the bar draws nothing and sends no request.
 */
export function WorkspaceMacBar(props: { context: WorkspaceContext }) {
  const mac = useThisMac()
  if (!mac) return null
  return <MacBar context={props.context} mac={mac} />
}
