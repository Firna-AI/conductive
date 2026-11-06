import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { onTestFinished, vi } from 'vitest'
import type { FakeApiServer } from '../test-support/fake-api'
import type { FetchLike } from './api/files-client'

/**
 * Test kit of the mounted Files screens, for test files that run in
 * happy-dom. Tests only.
 */

/**
 * Mounts React nodes in a detached container, as the mounted GitHub tests
 * do. The test ends with an unmount, unless it unmounted already.
 *
 * happy-dom runs each animation frame as an immediate task, and a spinner
 * updates React on each frame, so `act` would never settle while one shows.
 * Frames never run here, so a spinner stays still.
 */
export function mountRoot() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  const container = document.createElement('div')
  const root = createRoot(container)
  let mounted = true
  const unmount = (): void => {
    if (!mounted) return
    mounted = false
    act(() => root.unmount())
  }
  onTestFinished(() => {
    unmount()
    vi.unstubAllGlobals()
  })
  return {
    container,
    render(node: ReactNode): void {
      act(() => root.render(node))
    },
    unmount,
  }
}

/**
 * A fetch of the fake API whose replies reach the screens only when the
 * test releases them inside `act`, as a slow network delivers them.
 */
export function heldFetch(server: FakeApiServer) {
  const held: (() => void)[] = []
  const replies: Promise<Response>[] = []
  const fetch: FetchLike = (input, init) => {
    const answer = server.fetch(input, init)
    const delivered = new Promise<void>((resolve) => {
      held.push(resolve)
    })
    const reply = delivered.then(() => answer)
    replies.push(reply)
    return reply
  }
  const release = async (): Promise<void> => {
    const released = replies.splice(0)
    for (const deliver of held.splice(0)) deliver()
    await Promise.all(released)
  }
  return { fetch, release }
}
