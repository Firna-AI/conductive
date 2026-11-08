import { expect } from 'vitest'

import { createApp } from '../application'
import { heldOperation } from '../lifecycle/platform-test-storage'
import { realRuntimeFixture } from '../lifecycle/real-runtime-test-support'
import { runningRuntimeWorkspace } from '../lifecycle/runtime-lifecycle-test-support'
import { SESSION_COOKIE } from '../security/cookies'
import { sign } from '../security/crypto'

export async function activityRaceFixture(bundle: string) {
  const fixture = await realRuntimeFixture(bundle)
  try {
    const workspace = await runningRuntimeWorkspace(fixture)
    await workspace.actor.tickRunnerAccess()
    await fixture.closeConnections()
    await expect
      .poll(
        async () => (await workspace.actor.readLifecycle())?.runnerConnected,
        {
          timeout: 10000,
        },
      )
      .toBe(false)
    const session = await sign(
      {
        sessionId: 'runtime-browser-session',
        expiresAt: 4_000_000_000_000,
      },
      'session',
      fixture.env.SESSION_SIGNING_KEY,
    )
    const app = createApp()
    return {
      ...fixture,
      ...workspace,
      request: (path: string, body: unknown) =>
        new Request(`${fixture.env.APP_ORIGIN}${path}`, {
          method: 'POST',
          headers: {
            Origin: fixture.env.APP_ORIGIN ?? '',
            Cookie: `${SESSION_COOKIE}=${session}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }),
      send: (request: Request) =>
        app.fetch(request, { ...fixture.env, OPERATOR_GITHUB_IDS: '11' }),
    }
  } catch (error) {
    await fixture.dispose()
    throw error
  }
}

/** The real bounded parser must pull this stream before it can receive bytes. */
export function heldActivityBody(base: Request, value: unknown) {
  const held = heldOperation()
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined
  let released = false
  const body = new ReadableStream<Uint8Array>(
    {
      start(stream) {
        controller = stream
      },
      pull: () => held.wait(),
    },
    { highWaterMark: 0 },
  )
  const init = { body, duplex: 'half' as const }
  return {
    request: new Request(base, init),
    reading: held.entered,
    release() {
      if (released) return
      released = true
      if (!controller) throw new Error('Missing held activity body')
      controller.enqueue(new TextEncoder().encode(JSON.stringify(value)))
      controller.close()
      held.release()
    },
  }
}
