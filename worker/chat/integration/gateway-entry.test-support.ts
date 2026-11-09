import { Workspace as ProductionWorkspace } from '../../workspace'

export class Workspace extends ProductionWorkspace {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
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
