import { readDeviceRecord } from '../../src/shared/device-read'
import type { AppEnv } from '../env'
import { readDeviceValue } from '../devices/storage'
import { Workspace as DeviceTestWorkspace } from '../devices/test-worker.test-support'
import { ChatStore } from './store'

export { default } from '../devices/test-worker.test-support'

export class Workspace extends DeviceTestWorkspace {
  private readonly pending: Promise<unknown>[]
  private readonly storage: DurableObjectStorage

  constructor(
    context: DurableObjectState,
    env: AppEnv & { WORKSPACES: DurableObjectNamespace },
  ) {
    const pending: Promise<unknown>[] = []
    const waitUntil = context.waitUntil.bind(context)
    context.waitUntil = (work) => {
      pending.push(work)
      waitUntil(work)
    }
    super(context, env)
    this.pending = pending
    this.storage = context.storage
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.endsWith('/__test/device-cleanup'))
      return super.fetch(request)
    await Promise.all(this.pending.splice(0))
    const workspaceId = url.pathname.split('/workspaces/')[1]?.split('/')[0]
    if (!workspaceId) throw new Error('The workspace ID is missing.')
    const lifecycle = await new ChatStore(this.storage, Date.now).read(
      workspaceId,
      async (view) => ({
        sessions: await view.sessions(),
        turns: await view.turns(),
        commands: await view.pending(),
      }),
    )
    const requests = await Promise.all(
      [
        ...(await this.storage.list({ prefix: 'devices:v1:request:' })).keys(),
      ].map(async (key) =>
        readDeviceRecord(await readDeviceValue(this.storage, key)),
      ),
    )
    return Response.json({ lifecycle, requests })
  }
}
