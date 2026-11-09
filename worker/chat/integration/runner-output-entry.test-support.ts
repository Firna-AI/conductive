import { Workspace as ProductionWorkspace } from '../../workspace'

export class Workspace extends ProductionWorkspace {
  async storedRecords() {
    return [...(await this.ctx.storage.list<unknown>())]
  }

  // Fetch inspection leaves no test RPC call that can hold the object during eviction.
  override async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === '/inspect')
      return Response.json(await this.storedRecords())
    return super.fetch(request)
  }
}
