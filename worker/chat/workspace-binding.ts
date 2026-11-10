import { HttpError } from '../http'

export class ChatWorkspaceBinding {
  id: string | null = null
  private readonly matchesObject: (id: string) => boolean

  constructor(matchesObject: (id: string) => boolean) {
    this.matchesObject = matchesObject
  }

  bind(workspaceId: string): void {
    if (
      !this.matchesObject(workspaceId) ||
      (this.id && this.id !== workspaceId)
    ) {
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    }
    this.id = workspaceId
  }
}
