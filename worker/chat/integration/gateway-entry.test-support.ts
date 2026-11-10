import { Workspace as ProductionWorkspace } from '../../workspace'
import { workspaceRuntime } from '../../lifecycle/runtime'
import { record, string } from '../inputs'

export class Workspace extends ProductionWorkspace {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/inspect')
      return Response.json([...(await this.ctx.storage.list())])
    if (url.pathname === '/check') {
      const workspaceId = await this.chat.store.workspaceId()
      if (!workspaceId) throw new Error('The workspace is missing.')
      const value: unknown = await request.json()
      const result = await workspaceRuntime(this.env)
        .workspace(workspaceId)
        .checkTurnToken(string(record(value).token))
      return Response.json(result)
    }
    if (url.pathname === '/issue') {
      const workspaceId = await this.chat.store.workspaceId()
      const token = workspaceId
        ? await this.chat.runLifecycle(() =>
            this.chat.turnTokens.forRunningTurn(
              workspaceId,
              url.searchParams.get('turnId') ?? '',
            ),
          )
        : null
      return Response.json({ token })
    }
    return super.fetch(request)
  }
}
