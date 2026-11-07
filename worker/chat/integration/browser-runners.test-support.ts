import { routes } from '../../../src/app/router'
import { isRecord } from '../../http'
import { sandboxProvider } from '../../sandbox/client'
import type { OuterRuntime } from './outer-runtime.test-support'
import { BrowserRunnerAgent } from './browser-runner-agent.test-support'
import { BrowserRunnerTransport } from './browser-runner-transport.test-support'
import { OUTER_ORG } from './outer-seed.test-support'

interface Runtime {
  workspaceId: string
  sandboxId: string
  token: string
  agent: BrowserRunnerAgent
  transport: BrowserRunnerTransport
}

export function browserRunners(fixture: OuterRuntime) {
  const runtimes = new Map<string, Runtime>()
  const errors: string[] = []
  const fetch = fixture.boat.fetch
  const fail = (error: unknown) => {
    errors.push(
      error instanceof Error ? error.message : 'The fake runner failed.',
    )
  }
  const capture = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    if (!response.ok || request.method !== 'POST') return
    const payload: unknown = await request.json()
    if (!isRecord(payload) || !isRecord(payload.env)) return
    const env = payload.env
    if (env.CONDUCTIVE_DISK_KEEPALIVE === '1') return
    if (
      typeof env.CONDUCTIVE_WORKSPACE_ID !== 'string' ||
      typeof env.WORKSPACE_TOKEN !== 'string'
    )
      return
    const result: unknown = await response.json()
    if (
      !isRecord(result) ||
      !isRecord(result.sandbox) ||
      typeof result.sandbox.id !== 'string'
    )
      return
    const workspaceId = env.CONDUCTIVE_WORKSPACE_ID
    let runtime = runtimes.get(workspaceId)
    if (!runtime) {
      const transport = new BrowserRunnerTransport(
        fixture,
        workspaceId,
        env.WORKSPACE_TOKEN,
        (command) => agent.command(command),
      )
      const agent = new BrowserRunnerAgent(
        (event) => transport.emit(event),
        (message) => transport.send(message),
      )
      runtime = {
        workspaceId,
        sandboxId: result.sandbox.id,
        token: env.WORKSPACE_TOKEN,
        agent,
        transport,
      }
      runtimes.set(workspaceId, runtime)
    }
    runtime.sandboxId = result.sandbox.id
    runtime.token = env.WORKSPACE_TOKEN
    void runtime.transport.start(runtime.token).catch(fail)
  }
  fixture.boat.fetch = async (request) => {
    const input = request.clone()
    const response = await fetch(request)
    await capture(input, response.clone())
    return response
  }
  return {
    status: () => ({
      errors,
      workspaces: [...runtimes.values()].map((runtime) => ({
        workspaceId: runtime.workspaceId,
        sandboxId: runtime.sandboxId,
        workspaceUrl: `${fixture.env.APP_ORIGIN}${routes.workspace(OUTER_ORG, runtime.workspaceId)}`,
        sandboxState: fixture.boat.states.get(runtime.sandboxId),
        ...runtime.transport.status(),
        ...runtime.agent.status(),
      })),
    }),
    async stop(workspaceId: string) {
      const runtime = runtimes.get(workspaceId)
      if (!runtime) throw new Error('The fake workspace is not available.')
      await sandboxProvider(fixture.env, fixture.boat.fetch).stop(
        runtime.sandboxId,
      )
      runtime.agent.stop()
      await runtime.transport.stop()
      return {
        workspaceId,
        sandboxId: runtime.sandboxId,
        sandboxState: fixture.boat.states.get(runtime.sandboxId),
      }
    },
    async reconnect(workspaceId: string) {
      const runtime = runtimes.get(workspaceId)
      if (!runtime) throw new Error('The fake workspace is not available.')
      await runtime.transport.stop()
      await runtime.transport.start(runtime.token)
      return runtime.transport.status()
    },
    async close() {
      fixture.boat.fetch = fetch
      for (const runtime of runtimes.values()) runtime.agent.stop()
      await Promise.all(
        [...runtimes.values()].map((runtime) => runtime.transport.stop()),
      )
    },
  }
}

export type BrowserRunners = ReturnType<typeof browserRunners>
